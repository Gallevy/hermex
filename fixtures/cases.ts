import type { FixtureCase } from '../scripts/output-review.ts';

/**
 * The output-review matrix: every case `pnpm run test:output` runs, diffs
 * against `tests/__output_baselines__/`, and lists in the PR comment.
 *
 * Adding a case is one entry here plus (usually) one config in
 * `./configs/`. Nothing else knows the list — the runner, the CI matrix and
 * the comment all read it from this file.
 *
 * `cwd` is relative to `fixtures/`. `{OUT}` in an argument is replaced with
 * a per-case scratch directory outside the repo, so a case that writes a
 * file never leaves one behind. `proves` is what a reviewer is being asked
 * to confirm — it is printed next to the output, so write it for someone
 * who did not read this file.
 */
export const cases: FixtureCase[] = [
  // ── scan, human ──────────────────────────────────────────────────────────
  {
    name: 'scan-human-default',
    proves:
      'Baseline human output: the sections a repo gets with no output config of its own.',
    cwd: '.',
    args: ['scan'],
    expectExit: 0,
  },
  {
    name: 'scan-human-all-sections',
    proves:
      'Every human section rendered at once, including details and patterns, which the default config leaves off.',
    cwd: '.',
    args: ['scan', '--config', 'configs/all-sections.config.ts'],
    expectExit: 0,
  },
  {
    name: 'scan-human-charts',
    proves:
      'The bar-chart renderer: bar scaling and label alignment for packages, components and patterns.',
    cwd: '.',
    args: ['scan', '--config', 'configs/charts.config.ts'],
    expectExit: 0,
  },
  {
    name: 'scan-human-minimal',
    proves:
      'Section toggles actually suppress output — every section off except the summary (#63).',
    cwd: '.',
    args: ['scan', '--config', 'configs/minimal.config.ts'],
    expectExit: 0,
  },

  // ── scan, json ───────────────────────────────────────────────────────────
  {
    name: 'scan-json',
    proves:
      'The full JSON contract: summary.patternCounts (#80), every owned package in packages[], de-duplicated components (#78, #79), subjectCount on violations (#83), and the compliance block (#55).',
    cwd: '.',
    args: ['scan', '--format', 'json'],
    expectExit: 0,
  },
  {
    name: 'scan-json-toggles',
    proves:
      'JSON honours output.* the same way human output does — disabled sections must not reappear in the payload (#63).',
    cwd: '.',
    args: ['scan', '--format', 'json', '--config', 'configs/minimal.config.ts'],
    expectExit: 0,
  },

  // ── comply ───────────────────────────────────────────────────────────────
  {
    name: 'comply-human-pass',
    proves:
      'A repo that satisfies every rule: the clean verdict wording and exit 0.',
    cwd: 'repos/compliant',
    args: ['comply'],
    expectExit: 0,
  },
  {
    name: 'comply-human-fail',
    proves:
      'The rules table on a failing repo: row ordering, severity badges, the error/warning tally, and exit 1.',
    cwd: '.',
    args: ['comply'],
    expectExit: 1,
  },
  {
    name: 'comply-human-warn-only',
    proves:
      'Warn and info findings are reported but do not fail the build — verdict wording plus exit 0.',
    cwd: '.',
    args: ['comply', '--config', 'configs/warn-only.config.ts'],
    expectExit: 0,
  },
  {
    name: 'comply-json',
    proves: 'The compliance block as machine-readable output on a failing repo.',
    cwd: '.',
    args: ['comply', '--format', 'json'],
    expectExit: 1,
  },
  {
    name: 'comply-summary-file',
    proves:
      'The markdown a consumer pastes into a PR comment or job summary — ANSI-free, rules + flagged packages + verdict.',
    cwd: '.',
    args: ['comply', '--summary-file', '{OUT}/summary.md'],
    writes: ['summary.md'],
    expectExit: 1,
  },
  {
    name: 'comply-release-age',
    proves:
      'The flagged-packages table, against a recorded registry: an overdue package with no in-window target (#26), one with a real target, and one merely coming due.',
    cwd: '.',
    args: ['comply', '--config', 'configs/release-age.config.ts'],
    registry: true,
    expectExit: 1,
  },
  {
    name: 'comply-overrides',
    proves:
      'Repo-scoped overrides re-scope severities: one rule downgraded to warn, one switched off and gone from the table.',
    cwd: '.',
    args: ['comply', '--config', 'configs/overrides.config.ts'],
    expectExit: 1,
  },

  // ── lock-file parity ─────────────────────────────────────────────────────
  // Same manifest, same source, same resolved tree in three lock formats.
  // The three stdout payloads must be identical to each other; the runner
  // checks that on top of the per-case baselines.
  {
    name: 'lockfile-npm',
    proves: 'package-lock.json produces the same inventory as its siblings.',
    cwd: 'repos/lockfile-npm',
    args: ['scan', '--format', 'json'],
    expectExit: 0,
  },
  {
    name: 'lockfile-yarn',
    proves: 'yarn.lock produces the same inventory as its siblings.',
    cwd: 'repos/lockfile-yarn',
    args: ['scan', '--format', 'json'],
    expectExit: 0,
  },
  {
    name: 'lockfile-pnpm',
    proves: 'pnpm-lock.yaml produces the same inventory as its siblings.',
    cwd: 'repos/lockfile-pnpm',
    args: ['scan', '--format', 'json'],
    expectExit: 0,
  },

  // ── error and colour paths ───────────────────────────────────────────────
  {
    name: 'parse-errors',
    proves:
      'The parse-error report, scoped to a repo of nothing but an unparseable file so the block is not buried (#13).',
    cwd: '.',
    args: ['scan', '--config', 'configs/parse-errors.config.ts'],
    expectExit: 0,
  },
  {
    name: 'comply-color',
    proves:
      'The coloured path a developer actually sees in a terminal. Captured raw, so escape sequences are part of the diff.',
    cwd: '.',
    args: ['comply'],
    env: { NO_COLOR: null, FORCE_COLOR: '3' },
    keepAnsi: true,
    expectExit: 1,
  },
  {
    name: 'comply-no-color-flag',
    proves:
      '--no-color wins over FORCE_COLOR, so the CI-facing output carries no escape sequences even on a colour-capable runner.',
    cwd: '.',
    args: ['comply', '--no-color'],
    env: { NO_COLOR: null, FORCE_COLOR: '3' },
    keepAnsi: true,
    expectExit: 1,
  },
];
