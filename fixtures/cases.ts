import type { FixtureCase } from '../scripts/output-review.ts';

/**
 * The output-review matrix: every case `pnpm run test:output` runs, diffs
 * against a fresh build of the target branch, and lists in the PR comment.
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
    // Named rather than left to the reader: "the packages table is gone" is
    // the kind of absence a human skims straight past in a 40-line baseline.
    absent: ['📦 Packages', '⚛️ Components', '🔍 Rules', '⚖️ Versus'],
    expectExit: 0,
  },

  // ── scan, json ───────────────────────────────────────────────────────────
  {
    name: 'scan-json',
    proves:
      'The full JSON contract: summary.patternCounts (#80), every owned package in packages[], de-duplicated components (#78, #79), and the compliance block (#55).',
    cwd: '.',
    args: ['scan', '--format', 'json'],
    expectExit: 0,
  },
  {
    name: 'scan-json-toggles',
    proves:
      'What output.* toggles do to --format json: today, nothing (#91). The payload below is emitted with every section switched off, yet still carries packages, components, versus and ruleViolations in full. Pair it with scan-human-minimal to see the two formats diverge; when #91 lands, this baseline shrinking is the proof.',
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
    name: 'comply-all-rule-types',
    proves:
      'Every one of the nine rule types in one table, at three severities — the only case that renders engine_version, codeowners and both package-field shapes.',
    cwd: 'repos/all-rule-types',
    args: ['comply'],
    expectExit: 1,
  },
  {
    name: 'comply-all-rule-types-json',
    proves:
      'The machine-readable shape of every rule type: fieldPath and actualValue on package-field hits, installedRange/requiredRange on engine_version, matchedFiles on codeowners. Also where #95 is visible — the two codeowners entries are byte-identical apart from matchedFiles.',
    cwd: 'repos/all-rule-types',
    args: ['comply', '--format', 'json'],
    expectExit: 1,
  },
  {
    name: 'comply-summary-title',
    proves:
      '--summary-title replaces the default heading, so a consumer embedding the markdown can name it after the policy rather than the tool.',
    cwd: '.',
    args: [
      'comply',
      '--summary-file',
      '{OUT}/summary.md',
      '--summary-title',
      'Design System Compliance',
    ],
    writes: ['summary.md'],
    expectExit: 1,
  },
  {
    name: 'comply-exit-2',
    proves:
      'A pipeline failure (nothing matched `includes`) exits 2, not 1 — a consumer must be able to tell "could not run" from "not compliant".',
    cwd: '.',
    args: ['comply', '--config', 'configs/no-files.config.ts'],
    expectExit: 2,
  },
  {
    name: 'scan-no-files',
    proves:
      'The same pipeline failure under `scan` reports the problem and exits 0 — the deliberate asymmetry with comply-exit-2, kept visible so it cannot drift unnoticed.',
    cwd: '.',
    args: ['scan', '--config', 'configs/no-files.config.ts'],
    expectExit: 0,
  },

  // ── release-age scope ────────────────────────────────────────────────────
  // The same repo — react 18.3.1 at the root, react 17.0.2 nested under
  // legacy-widget — under both scopes. The diff between these two baselines
  // is exactly what `releaseAge.scope` does (#57).
  {
    name: 'release-age-root-scope',
    proves:
      'scope: root enforces only the direct copy, and still surfaces the overdue nested copy as an advisory breach rather than hiding it.',
    cwd: 'repos/version-conflict',
    args: ['comply'],
    registry: true,
    expectExit: 1,
  },
  {
    name: 'release-age-tree-scope',
    proves:
      'scope: tree enforces every resolved copy, so the nested version becomes the mandatory failure and the reported installed version follows it.',
    cwd: 'repos/version-conflict',
    args: ['comply', '--config', 'tree.config.ts'],
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
