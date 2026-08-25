import fs from 'fs';
import path from 'path';

/**
 * Git facts read straight off disk — no `git` subprocess, and no requirement
 * that `git` be on PATH at all.
 *
 * Spawning was measured and rejected: on a Windows dev machine `git
 * --version` (which does no repository work whatsoever) costs ~43ms, the same
 * as a full `git remote get-url origin`, against ~0.08ms for reading the
 * config file. That cost is process creation, not git — so it cannot be tuned
 * away, only avoided, and it would have been a ~50% wall-clock regression on
 * a whole scan for the sake of one rule.
 *
 * The fidelity given up is negligible *for the questions asked here*:
 * `url.*.insteadOf` rewrites the host rather than the path (so it cannot
 * change a repo slug), and remotes are written into the local config by `git
 * clone`/`git remote add` rather than hiding behind `[includeIf]`. Every
 * parse failure returns null, which callers treat as "cannot tell" — never as
 * a violation.
 *
 * If a future rule needs richer git data, prefer another file read here
 * (`.git/HEAD`, `.git/refs/...`) over reaching for a subprocess, and resolve
 * it once through this module rather than per rule.
 */

// Keyed by repoPath, which is process.cwd() and constant for a run — so a
// second git-dependent rule costs no extra I/O, and there is nothing to
// invalidate. `undefined` means "not looked up yet"; a stored `null` means
// "looked up, and there is no config".
const configPathCache = new Map<string, string | null>();
const configContentCache = new Map<string, string | null>();

/**
 * Absolute path to the git config governing `repoPath`, or null.
 *
 * Deliberately does **not** walk up to a parent directory's `.git`: reading
 * `<repoPath>/.git` *is* the "am I a repository root" check. That keeps a
 * monorepo's `packages/app`, and every fixture repo checked into this
 * repository, from silently inheriting the outer repo's remote.
 */
export function findGitConfig(repoPath: string): string | null {
  const cached = configPathCache.get(repoPath);
  if (cached !== undefined) return cached;
  const resolved = resolveGitConfig(repoPath);
  configPathCache.set(repoPath, resolved);
  return resolved;
}

function resolveGitConfig(repoPath: string): string | null {
  const dotGit = path.join(repoPath, '.git');

  let stats: fs.Stats;
  try {
    stats = fs.statSync(dotGit);
  } catch {
    return null;
  }

  if (stats.isDirectory()) return existingFile(path.join(dotGit, 'config'));

  // `.git` is a *file* — a linked worktree or a submodule. It holds a
  // `gitdir:` pointer to the real git directory. This is not an exotic case:
  // it is what every `git worktree add` checkout looks like.
  let pointer: string;
  try {
    pointer = fs.readFileSync(dotGit, 'utf-8');
  } catch {
    return null;
  }

  const match = /^gitdir:\s*(.+)$/m.exec(pointer);
  if (!match) return null;
  const gitDir = path.resolve(repoPath, match[1].trim());

  // A linked worktree keeps only per-worktree state in its own git directory;
  // shared state — config included — lives in the common directory, named by
  // a `commondir` file (typically "../.."). A submodule has no `commondir`
  // and keeps its config in the git directory itself.
  let commonDir = gitDir;
  try {
    const raw = fs.readFileSync(path.join(gitDir, 'commondir'), 'utf-8').trim();
    if (raw) commonDir = path.resolve(gitDir, raw);
  } catch {
    // No commondir — fall through to the git directory itself.
  }

  return existingFile(path.join(commonDir, 'config'));
}

function existingFile(candidate: string): string | null {
  return fs.existsSync(candidate) ? candidate : null;
}

/** Contents of the git config governing `repoPath`, or null. Memoized. */
export function readGitConfig(repoPath: string): string | null {
  const cached = configContentCache.get(repoPath);
  if (cached !== undefined) return cached;

  const configPath = findGitConfig(repoPath);
  let content: string | null = null;
  if (configPath) {
    try {
      content = fs.readFileSync(configPath, 'utf-8');
    } catch {
      content = null;
    }
  }

  configContentCache.set(repoPath, content);
  return content;
}

// `[remote "origin"]` — the form git itself writes. Section names are
// case-insensitive; subsection names in this quoted form are case-sensitive.
const QUOTED_SECTION = /^\[\s*([\w.-]+)\s+"(.*)"\s*\]$/;
// `[remote.origin]` — the legacy dotted form, case-insensitive throughout.
const DOTTED_SECTION = /^\[\s*([\w-]+)\.([^\]]+?)\s*\]$/;

function isRemoteSection(line: string, remote: string): boolean {
  const quoted = QUOTED_SECTION.exec(line);
  if (quoted)
    return quoted[1].toLowerCase() === 'remote' && quoted[2] === remote;

  const dotted = DOTTED_SECTION.exec(line);
  if (dotted) {
    return (
      dotted[1].toLowerCase() === 'remote' &&
      dotted[2].toLowerCase() === remote.toLowerCase()
    );
  }

  return false;
}

/**
 * The first `url` under `[remote "<remote>"]`, or null.
 *
 * First-wins rather than last-wins: a mirror remote may list several URLs,
 * and the first is the one git fetches from — matching `git remote get-url`
 * rather than `git config --get`, which returns the last.
 */
export function parseRemoteUrl(content: string, remote: string): string | null {
  let inSection = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    if (line.startsWith('[')) {
      inSection = isRemoteSection(line, remote);
      continue;
    }
    if (!inSection) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;
    if (line.slice(0, eq).trim().toLowerCase() !== 'url') continue;

    const value = line.slice(eq + 1).trim();
    return value || null;
  }

  return null;
}

/**
 * The repository slug from a remote URL, or null.
 *
 * Handles the three forms in use — `git@host:org/repo.git`,
 * `https://host/org/repo.git` and `ssh://git@host/org/sub/repo` — by taking
 * the last path segment and dropping a trailing `.git`. The scp-like form has
 * no scheme, so `:` counts as a separator alongside `/`.
 */
export function remoteSlug(url: string): string | null {
  let rest = stripTrailingSlashes(url.trim());
  if (!rest) return null;

  if (rest.toLowerCase().endsWith('.git')) {
    rest = stripTrailingSlashes(rest.slice(0, -4));
  }

  const cut = Math.max(rest.lastIndexOf('/'), rest.lastIndexOf(':'));
  const slug = cut === -1 ? rest : rest.slice(cut + 1);
  return slug || null;
}

function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end--;
  return value.slice(0, end);
}
