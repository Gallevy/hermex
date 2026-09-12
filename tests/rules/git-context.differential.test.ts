import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseRemoteUrl,
  readGitConfig,
  remoteSlug,
} from '../../src/rules/git-context';

/**
 * Differential tests: our `.git/config` reader against **real git**, on repo
 * layouts built by real git commands.
 *
 * hermex reads `.git/config` itself rather than spawning `git`, which buys a
 * ~500x faster lookup and drops the requirement that `git` be on PATH. The
 * cost of that choice is that we own the parsing, so these tests exist to
 * prove we agree with git wherever it matters — including the layouts that
 * are easy to get wrong (a linked worktree's `gitdir:`/`commondir` hop, a
 * submodule's gitdir pointer).
 *
 * `git` is not required to run the suite: without it these are skipped, and
 * the hand-written-config tests in git-context.test.ts still cover the
 * parser. CI runs ubuntu-only today, so on Windows and macOS these are the
 * check that the path handling is right.
 */

function gitAvailable(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const HAS_GIT = gitAvailable();

// Identity and safety flags every invocation needs: a sandboxed CI runner may
// have no user configured, and templates/hooks from the host must not leak in.
const GIT_FLAGS = [
  '-c',
  'user.email=test@example.com',
  '-c',
  'user.name=Test',
  '-c',
  'commit.gpgsign=false',
  '-c',
  'protocol.file.allow=always',
  '-c',
  'init.defaultBranch=main',
];

function git(args: string[], cwd: string): string {
  return execFileSync('git', [...GIT_FLAGS, ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/** What git itself says the origin URL is — the oracle these tests compare to. */
function gitRemoteUrl(cwd: string): string {
  return git(['remote', 'get-url', 'origin'], cwd);
}

/** What hermex says, going through the same path the rule uses. */
function hermexRemoteUrl(cwd: string): string | null {
  const config = readGitConfig(cwd);
  return config === null ? null : parseRemoteUrl(config, 'origin');
}

let root: string;

/** A repo created by real `git init`, with a real `git remote add`. */
function initRepo(name: string, url: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  git(['init', '-q', '.'], dir);
  git(['remote', 'add', 'origin', url], dir);
  return dir;
}

function commitSomething(dir: string): void {
  writeFileSync(join(dir, 'file.txt'), 'contents\n');
  git(['add', 'file.txt'], dir);
  git(['commit', '-q', '-m', 'initial'], dir);
}

beforeAll(() => {
  if (!HAS_GIT) return;
  root = mkdtempSync(join(tmpdir(), 'hermex-git-diff-'));
});

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe.skipIf(!HAS_GIT)('git-context agrees with real git', () => {
  // The URL spellings a real remote actually takes. Each is written by a real
  // `git remote add`, then read back both ways.
  const urls: [string, string, string][] = [
    ['scp-like ssh', 'git@github.com:acme/checkout-web.git', 'checkout-web'],
    [
      'https with .git',
      'https://github.com/acme/checkout-web.git',
      'checkout-web',
    ],
    [
      'https without .git',
      'https://github.com/acme/checkout-web',
      'checkout-web',
    ],
    ['ssh:// with port path', 'ssh://git@gitlab.com/team/sub/app.git', 'app'],
    ['deep path', 'https://gitlab.com/group/subgroup/project.git', 'project'],
    ['name containing .git', 'https://github.com/acme/digit.git', 'digit'],
  ];

  it.each(urls)('%s: reads the same URL git does', (name, url) => {
    const dir = initRepo(`url-${name.replace(/[^a-z]/gi, '')}`, url);
    expect(hermexRemoteUrl(dir)).toBe(gitRemoteUrl(dir));
  });

  it.each(urls)('%s: derives the expected slug', (name, url, slug) => {
    const dir = initRepo(`slug-${name.replace(/[^a-z]/gi, '')}`, url);
    expect(remoteSlug(hermexRemoteUrl(dir)!)).toBe(slug);
    expect(remoteSlug(gitRemoteUrl(dir))).toBe(slug);
  });

  it('reads a remote other than origin the same way git does', () => {
    const dir = initRepo(
      'other-remote',
      'https://example.com/acme/main-repo.git',
    );
    git(
      ['remote', 'add', 'upstream', 'https://example.com/upstream/fork.git'],
      dir,
    );

    const config = readGitConfig(dir)!;
    expect(parseRemoteUrl(config, 'upstream')).toBe(
      git(['remote', 'get-url', 'upstream'], dir),
    );
    // Adding a second remote must not disturb the first.
    expect(parseRemoteUrl(config, 'origin')).toBe(gitRemoteUrl(dir));
  });

  it('follows a real linked worktree through gitdir and commondir', () => {
    const main = initRepo('wt-main', 'git@github.com:acme/worktree-repo.git');
    commitSomething(main);

    const linked = join(root, 'wt-linked');
    git(['worktree', 'add', '-q', linked], main);

    // This is the layout a naive `<repo>/.git/config` read gets wrong: `.git`
    // is a file, and the config lives in the common directory two levels up.
    expect(hermexRemoteUrl(linked)).toBe(gitRemoteUrl(linked));
    expect(remoteSlug(hermexRemoteUrl(linked)!)).toBe('worktree-repo');
  });

  it('follows a real submodule gitdir pointer', () => {
    const upstream = initRepo(
      'sub-upstream',
      'https://example.com/acme/subdep.git',
    );
    commitSomething(upstream);

    const parent = initRepo(
      'sub-parent',
      'https://example.com/acme/parent.git',
    );
    commitSomething(parent);
    git(['submodule', 'add', '-q', upstream, 'vendor/subdep'], parent);

    const submodule = join(parent, 'vendor', 'subdep');
    // A submodule's `.git` is a file pointing at
    // `<parent>/.git/modules/<name>`, with no commondir hop.
    expect(hermexRemoteUrl(submodule)).toBe(gitRemoteUrl(submodule));
  });

  it('agrees after the remote URL is changed in place', () => {
    const dir = initRepo('set-url', 'https://example.com/acme/before.git');
    git(
      ['remote', 'set-url', 'origin', 'https://example.com/acme/after.git'],
      dir,
    );

    expect(hermexRemoteUrl(dir)).toBe(gitRemoteUrl(dir));
    expect(remoteSlug(hermexRemoteUrl(dir)!)).toBe('after');
  });

  it('agrees when the repo has no remote at all', () => {
    const dir = join(root, 'no-remote');
    mkdirSync(dir, { recursive: true });
    git(['init', '-q', '.'], dir);

    expect(hermexRemoteUrl(dir)).toBeNull();
    // git also refuses to name one, which is why a skip is the right answer.
    expect(() => gitRemoteUrl(dir)).toThrow();
  });

  /**
   * The one deliberate disagreement, and the reason it is deliberate.
   *
   * `git` walks up to the nearest enclosing repository, so from a
   * subdirectory it happily reports the *parent* repo's remote. For this rule
   * that would be a false positive: a monorepo's `packages/app`, or any
   * fixture repo checked into this repository, would be judged against a
   * remote that is not its own. hermex reads `<repoPath>/.git` and nothing
   * else, so it skips instead.
   */
  it('does not inherit a parent repo remote, where git would', () => {
    const parent = initRepo(
      'nested-parent',
      'https://example.com/acme/monorepo.git',
    );
    const nested = join(parent, 'packages', 'app');
    mkdirSync(nested, { recursive: true });

    // git, asked from inside the subdirectory, names the parent's remote.
    expect(gitRemoteUrl(nested)).toBe('https://example.com/acme/monorepo.git');
    // hermex declines, because `packages/app` has no `.git` of its own.
    expect(hermexRemoteUrl(nested)).toBeNull();
  });
});
