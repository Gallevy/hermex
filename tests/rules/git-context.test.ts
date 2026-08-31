import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  findGitConfig,
  parseRemoteUrl,
  remoteSlug,
} from '../../src/rules/git-context';

const tempDirs: string[] = [];

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'hermex-git-ctx-'));
  tempDirs.push(dir);
  return dir;
}

/** Git writes native separators; the pointer file uses forward slashes. */
function posix(p: string): string {
  return p.split('\\').join('/');
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('parseRemoteUrl', () => {
  const config = [
    '[core]',
    '\tbare = false',
    '[remote "origin"]',
    '\turl = git@github.com:acme/checkout-web.git',
    '\tfetch = +refs/heads/*:refs/remotes/origin/*',
    '[remote "upstream"]',
    '\turl = https://github.com/upstream/checkout-web.git',
    '[branch "main"]',
    '\tremote = origin',
    '',
  ].join('\n');

  it('reads the url of the named remote', () => {
    expect(parseRemoteUrl(config, 'origin')).toBe(
      'git@github.com:acme/checkout-web.git',
    );
  });

  it('reads a remote other than origin', () => {
    expect(parseRemoteUrl(config, 'upstream')).toBe(
      'https://github.com/upstream/checkout-web.git',
    );
  });

  it('returns null for a remote that is not configured', () => {
    expect(parseRemoteUrl(config, 'fork')).toBeNull();
  });

  it('returns null when there are no remotes at all', () => {
    expect(parseRemoteUrl('[core]\n\tbare = false\n', 'origin')).toBeNull();
  });

  // A `url` key in a later section must not be attributed to an earlier
  // remote — the section header is what scopes it.
  it('does not leak a url from a following section', () => {
    const leaky = [
      '[remote "origin"]',
      '\tfetch = +refs/heads/*:refs/remotes/origin/*',
      '[remote "other"]',
      '\turl = git@github.com:acme/other.git',
      '',
    ].join('\n');
    expect(parseRemoteUrl(leaky, 'origin')).toBeNull();
  });

  // Mirror remotes list several URLs; git fetches from the first, so
  // first-wins matches `git remote get-url` rather than `git config --get`,
  // which returns the last.
  it('takes the first url when a remote lists several', () => {
    const mirrored = [
      '[remote "origin"]',
      '\turl = https://first.example/acme/app.git',
      '\turl = https://second.example/acme/app.git',
      '',
    ].join('\n');
    expect(parseRemoteUrl(mirrored, 'origin')).toBe(
      'https://first.example/acme/app.git',
    );
  });

  it('ignores comment lines', () => {
    const commented = [
      '[remote "origin"]',
      '\t# url = https://commented.example/acme/wrong.git',
      '\t; url = https://commented.example/acme/also-wrong.git',
      '\turl = https://real.example/acme/right.git',
      '',
    ].join('\n');
    expect(parseRemoteUrl(commented, 'origin')).toBe(
      'https://real.example/acme/right.git',
    );
  });

  it('accepts the legacy dotted section form', () => {
    expect(
      parseRemoteUrl('[remote.origin]\n\turl = git@h:a/b.git\n', 'origin'),
    ).toBe('git@h:a/b.git');
  });

  // Section names are case-insensitive in git config; quoted subsection
  // names are not.
  it('matches the section name case-insensitively', () => {
    expect(
      parseRemoteUrl('[REMOTE "origin"]\n\turl = git@h:a/b.git\n', 'origin'),
    ).toBe('git@h:a/b.git');
  });

  it('treats a quoted subsection name as case-sensitive', () => {
    expect(
      parseRemoteUrl('[remote "Origin"]\n\turl = git@h:a/b.git\n', 'origin'),
    ).toBeNull();
  });

  it('handles CRLF line endings', () => {
    expect(
      parseRemoteUrl(
        '[remote "origin"]\r\n\turl = git@h:a/b.git\r\n',
        'origin',
      ),
    ).toBe('git@h:a/b.git');
  });

  it('returns null for a url key with an empty value', () => {
    expect(
      parseRemoteUrl('[remote "origin"]\n\turl = \n', 'origin'),
    ).toBeNull();
  });
});

describe('remoteSlug', () => {
  it.each([
    ['git@github.com:acme/checkout-web.git', 'checkout-web'],
    ['https://github.com/acme/checkout-web.git', 'checkout-web'],
    ['https://github.com/acme/checkout-web', 'checkout-web'],
    ['ssh://git@gitlab.com/team/sub/app', 'app'],
    ['ssh://git@gitlab.com/team/sub/app.git', 'app'],
    ['git@github.com:repo.git', 'repo'],
    ['https://github.com/acme/checkout-web.git/', 'checkout-web'],
    ['file:///srv/git/local-repo.git', 'local-repo'],
    // A repo legitimately named "digit" must not lose characters to the
    // trailing-".git" strip.
    ['https://github.com/acme/digit.git', 'digit'],
  ])('%s -> %s', (url, expected) => {
    expect(remoteSlug(url)).toBe(expected);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['/', 'slash'],
    ['///', 'slashes'],
  ])('returns null for %s (%s)', (url) => {
    expect(remoteSlug(url)).toBeNull();
  });
});

describe('findGitConfig', () => {
  it('finds the config when .git is a directory', () => {
    const dir = makeDir();
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, '.git', 'config'), '[core]\n');
    expect(findGitConfig(dir)).toBe(join(dir, '.git', 'config'));
  });

  it('returns null when there is no .git at all', () => {
    expect(findGitConfig(makeDir())).toBeNull();
  });

  it('returns null when .git is a directory with no config', () => {
    const dir = makeDir();
    mkdirSync(join(dir, '.git'));
    expect(findGitConfig(dir)).toBeNull();
  });

  // The linked-worktree layout: `.git` is a *file* pointing at a per-worktree
  // git directory, whose shared state (config included) lives in the common
  // directory named by `commondir`. A naive `<repo>/.git/config` read finds
  // nothing here, which is exactly why this case is tested.
  it('follows a gitdir pointer through commondir', () => {
    const root = makeDir();
    const mainGit = join(root, 'main', '.git');
    const wtGit = join(mainGit, 'worktrees', 'wt');
    mkdirSync(wtGit, { recursive: true });
    writeFileSync(join(mainGit, 'config'), '[core]\n');
    writeFileSync(join(wtGit, 'commondir'), '../..\n');

    const worktree = join(root, 'wt');
    mkdirSync(worktree);
    writeFileSync(join(worktree, '.git'), `gitdir: ${posix(wtGit)}\n`);

    expect(findGitConfig(worktree)).toBe(join(mainGit, 'config'));
  });

  // A submodule's .git file points straight at a git directory holding its
  // own config, with no commondir hop.
  it('uses the gitdir itself when there is no commondir', () => {
    const root = makeDir();
    const gitDir = join(root, 'modules', 'sub');
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, 'config'), '[core]\n');

    const sub = join(root, 'sub');
    mkdirSync(sub);
    writeFileSync(join(sub, '.git'), `gitdir: ${posix(gitDir)}\n`);

    expect(findGitConfig(sub)).toBe(join(gitDir, 'config'));
  });

  it('resolves a relative gitdir pointer against the repo', () => {
    const root = makeDir();
    const gitDir = join(root, 'real-git');
    mkdirSync(gitDir);
    writeFileSync(join(gitDir, 'config'), '[core]\n');

    const repo = join(root, 'repo');
    mkdirSync(repo);
    writeFileSync(join(repo, '.git'), 'gitdir: ../real-git\n');

    expect(findGitConfig(repo)).toBe(join(gitDir, 'config'));
  });

  it('returns null when .git is a file with no gitdir pointer', () => {
    const dir = makeDir();
    writeFileSync(join(dir, '.git'), 'not a pointer\n');
    expect(findGitConfig(dir)).toBeNull();
  });
});
