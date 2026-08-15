# hermex - Examples Guide

Practical examples for configuring and running hermex v2.

## Getting Started

hermex is fully config-driven. All configuration lives in `hermex.config.ts` at your project root — there are no CLI flags.

```bash
npx hermex scan
```

## Minimal Config

```ts
// hermex.config.ts
import { defineConfig } from 'hermex';

export default defineConfig({});
```

Running `hermex scan` with no config (or an empty one) uses defaults: scans `**/*.{tsx,jsx,ts,js}`, excludes `node_modules/dist/build`, shows packages + components + summary.

## File Targeting

Control which files are analyzed via `includes` and `excludes`:

```ts
export default defineConfig({
  includes: ['src/**/*.{tsx,jsx}'],
  excludes: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.tsx',
    '**/*.stories.tsx',
  ],
});
```

## Internal Package Marking

Mark your own packages so they're visually separated in the packages table and skipped during release age checks:

```ts
export default defineConfig({
  packages: {
    internal: ['@myorg/*', '@company/design-system'],
    ignore: ['react', 'react-dom'], // exclude from output entirely
  },
});
```

Internal packages show an `[int]` badge in the packages table.

`ignore` is a *reporting* filter, not an uninstall: an ignored package is left out of the packages
table and is never flagged by `no-packages`, but it still counts as installed for
`require-packages` — otherwise ignoring a package would make a rule that requires it start failing.

## Versus — Migration Tracking

Track usage split between competing packages:

```ts
export default defineConfig({
  versus: [
    {
      name: 'Design System Migration',
      packages: ['@old/foundation', '@new/arc'],
    },
    {
      name: 'Icon Library',
      packages: ['@icons/heroicons', '@icons/feather'],
    },
  ],
});
```

Output shows a neutral bar split per group — no directional assumption, just usage percentages.

## Overrides — Repo-Scoped Rules

When one shared `hermex.config.ts` is reused across many repos, `overrides`
lets a subset of them get adjusted rules without forking the config. Each
entry checks the *current repo's* `package.json` `name` field against
`match` (micromatch patterns, same matching engine as `no-packages`);
when it matches, the entry's `rules` are upserted into the base `rules`
above, keyed by identity — a rule's `patterns` (or `range` for
`require-engine-version`).

- A rule whose `patterns` don't match any existing base rule is **added**.
- A rule whose `patterns` match an existing base rule **replaces** it
  (e.g. change its severity, message, or add a specific `patterns` set).
- A rule with severity **`'off'`** matched by `patterns` **removes** the
  base rule instead of replacing it with anything — like ESLint's
  per-rule `'off'`.

```ts
export default defineConfig({
  rules: {
    'require-packages': [
      { severity: 'error', patterns: ['typescript'] },
      { severity: 'error', patterns: ['@acme/shell'] },
    ],
  },
  overrides: [
    {
      // 30 repos that must additionally depend on @acme/telemetry — edit
      // this array to add/remove repos, no other config changes needed
      match: ['@acme/checkout', '@acme/billing'],
      rules: {
        'require-packages': [
          { severity: 'error', patterns: ['@acme/telemetry'] },
        ],
      },
    },
    {
      // legacy repo can't adopt @acme/shell yet — exempt it entirely
      match: ['@acme/legacy-app'],
      rules: {
        'require-packages': [{ severity: 'off', patterns: ['@acme/shell'] }],
      },
    },
    {
      // this repo isn't ready to fail CI over it yet — nudge instead
      match: ['@acme/in-progress-app'],
      rules: {
        'require-packages': [
          {
            severity: 'warn',
            patterns: ['@acme/shell'],
            message: '@acme/shell will become mandatory here soon',
          },
        ],
      },
    },
  ],
});
```

`@acme/checkout` ends up with all three `require-packages` rules
(`typescript` and `@acme/shell` from the base, `@acme/telemetry` from its
override — none of the `patterns` collide, so all are added).
`@acme/legacy-app` keeps the base `typescript` rule but loses `@acme/shell`
entirely (`'off'` matched it by `patterns` and removed it).
`@acme/in-progress-app` keeps `typescript` and gets `@acme/shell` at `warn`
instead of `error` (the override's `patterns: ['@acme/shell']` matched the
base rule with the same `patterns` and replaced it). A repo matching no
`match` pattern is completely unaffected. If `package.json` is missing or
has no `name`, no overrides can match.

`patterns` matching for upsert purposes is exact and order-independent (the
same set of strings), not a glob comparison — write the override's
`patterns` identically to the base rule you want to replace or cancel.

Every rule type supports this (`no-files`, `require-files`,
`no-packages`, `require-packages`, `require-scripts`,
`require-package-fields`, `no-package-fields`, `require-engine-version`). The
exception is `require-codeowners`, which only ever holds a single rule — any
matching override's `require-codeowners` replaces the base one outright, and
severity `'off'` clears it.

When more than one override entry matches the same repo, all of them apply,
in array order.

### `'off'` isn't override-only

Severity `'off'` works the same way directly inside the base `rules` block,
with no `overrides` involved at all — same as ESLint/oxlint, `'off'` just
disables a rule wherever it's written:

```ts
export default defineConfig({
  rules: {
    'require-packages': [
      { severity: 'error', patterns: ['typescript'] },
      { severity: 'off', patterns: ['@acme/shell'] }, // written, but disabled
    ],
  },
});
```

This repo only ever gets the `typescript` rule — the `@acme/shell` entry is
resolved away before it reaches anything that evaluates rules. It's the
same upsert-by-identity machinery `overrides` uses, just applied to the
base config against itself, so two rules sharing the same `patterns`
(or `range`, for `require-engine-version`) also collapse to the last one written,
last write wins — useful if you ever generate `rules` programmatically in
`hermex.config.ts` (it's plain TypeScript) rather than hand-authoring it.

## Compliance Rules

### File Rules

File rules fall into two axes: **presence-triggered** (`no-files`) and
**absence-triggered** (`require-files`). `no-files` supports three
severities — `info` for pure tracking (never a violation-style concern,
just recorded), `warn` for a nudge, and `error` for a hard requirement
that a file must NOT be present.

```ts
export default defineConfig({
  rules: {
    'no-files': [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
      { severity: 'warn', patterns: ['.eslintrc*'], message: 'Use oxlint' },
      {
        severity: 'info',
        patterns: ['orbis.config.*'],
        message: 'Orbis build toolchain detected',
      },
    ],
    'require-files': [
      { severity: 'error', patterns: ['.nvmrc', 'vitest.config.*'] },
      { severity: 'warn', patterns: ['.editorconfig'] },
    ],
  },
});
```

### Banned Packages

```ts
export default defineConfig({
  rules: {
    'no-packages': [
      {
        severity: 'error',
        patterns: ['moment'],
        message: 'Use date-fns or dayjs',
      },
      {
        severity: 'warn',
        patterns: ['lodash'],
        message: 'Use lodash-es or native JS',
      },
    ],
    'require-packages': [
      {
        severity: 'error',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
  },
});
```

`no-packages` matches any package your repo owns — one that is imported in your scanned source,
declared in `package.json` (`dependencies`, `devDependencies`, `peerDependencies` or
`optionalDependencies`), **or** recorded as a direct dependency by your lockfile. Build-only tooling
that is never imported — something run via `npx`, an npm script or a git hook — is covered, so there is
no need to spell it out as `'no-package-fields': ['dependencies.x', 'devDependencies.x']`.

Purely transitive dependencies are never flagged: they arrive through another package, so removing one
isn't something your repo can do. Packages excluded by `packages.ignore` are never flagged either.

Every banned package appears in the Rules and Compliance sections. Those with measured usage also get a
`[BANNED]` or `[RESTRICTED]` badge in the packages table, which since #78 lists every package the repo
owns — so a declared-but-unimported banned package now has a row there too.

In the JSON output, each hit is an ordinary entry in `ruleViolations` with `ruleId: "no-packages"` —
`patterns` carries the rule's globs, `packageName` the package that matched, and `matchedFiles` is empty
(a package isn't a file, and a declared-but-unimported one has none):

```jsonc
{
  "ruleId": "no-packages",
  "severity": "error",
  "patterns": ["moment"],
  "message": "Use date-fns or dayjs",
  "matchedFiles": [],
  "packageName": "moment"
}
```

A glob rule that matches several packages produces one entry per package, all sharing the same `patterns`.

### CODEOWNERS Rule

Requires every scanned file to have an owner in your `CODEOWNERS` file
(checked at `.github/CODEOWNERS`, `CODEOWNERS`, or `docs/CODEOWNERS`, in
that order):

```ts
export default defineConfig({
  rules: {
    'require-codeowners': {
      severity: 'error',
      message: 'Every scanned file must have a CODEOWNERS entry',
    },
  },
});
```

Ownership follows CODEOWNERS' own gitignore-style pattern matching, with
the last matching pattern in the file winning — same semantics as GitHub's
CODEOWNERS. A pattern with no owners listed (e.g. `src/generated/**` with
nothing after it) explicitly un-assigns ownership for files it matches,
even if an earlier pattern owned them. If no CODEOWNERS file is found at
all, this rule reports a single violation rather than silently passing.

Require a *specific* owner (not just "owned by someone"), useful for
critical paths that must be reviewed by a particular team:

```ts
export default defineConfig({
  rules: {
    'require-codeowners': {
      severity: 'error',
      requiredOwners: ['@org/platform-team'],
      message: 'Critical paths must be owned by @org/platform-team',
    },
  },
});
```

`requiredOwners` matches CODEOWNERS entries' owner strings exactly (as
written in the file, e.g. `@org/team` or `@individual`) — it does not
resolve GitHub team membership. Files with no CODEOWNERS coverage at all
are still reported as "unowned," separately from files owned by someone
who isn't in `requiredOwners`.

### Script and Field Requirements

```ts
export default defineConfig({
  rules: {
    'require-scripts': [
      {
        severity: 'error',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    'require-package-fields': [
      { severity: 'warn', patterns: ['engines', 'license', 'repository'] },
    ],
    'no-package-fields': [
      {
        severity: 'error',
        patterns: ['scripts.preinstall', 'scripts.postinstall'],
        message: 'Lifecycle install scripts are not allowed',
      },
      {
        severity: 'warn',
        patterns: ['license'],
        values: ['UNLICENSED', 'proprietary'],
        message: 'Package must not be marked unlicensed/proprietary',
      },
    ],
    'require-engine-version': {
      severity: 'error',
      range: '>=20',
      message: 'Node 20+ required',
    },
  },
});
```

`no-package-fields` is the mirror of `require-package-fields`: it fires
when a field **is present** at the given dot-path (e.g. `scripts.preinstall`)
— optionally scoped further with `values` (micromatch patterns the field's
stringified value must match, same as `require-package-fields`'s `values`).
Omitting `values` means "forbidden if present at all, regardless of value."

## Release Age (opt-in)

Fetches version timeline from the registry and flags packages that are behind:

```ts
export default defineConfig({
  releaseAge: {
    enabled: true,
    registry: 'https://registry.npmjs.org',
    // authToken: process.env.NPM_TOKEN,  // for private registries
    thresholds: {
      patch: 30, // flag if a patch has been available for 30+ days
      minor: 45, // flag if a minor has been available for 45+ days
      major: 60, // flag if a major has been available for 60+ days
      // patch: false,  // set to false to skip that level
    },
  },
});
```

Adds an `Upgrades` column to the packages table. Deprecated packages get a `[DEPRECATED]` badge regardless of whether release age is enabled.

Use `enforceOn` to scope which packages' release age counts toward compliance (see [Compliance Checking](#compliance-checking) below) — packages matching these glob patterns get `severity: 'error'`, everything else gets `severity: 'warn'`:

```ts
export default defineConfig({
  releaseAge: {
    enabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
    enforceOn: ['@my-org/*'], // only these block `hermex comply`
  },
});
```

If `enforceOn` is omitted, every package's release age counts toward compliance (current behavior).

`enforceOn` matches are checked against the lockfile directly, not just packages hermex found imported as components — so a CSS-only or side-effect-only dependency (e.g. `import '@my-org/styles/button.css'`) still gets checked and can still fail `hermex comply`, even though it never shows up in component usage.

`enforceOn` only decides *severity* (mandatory vs. advisory) for a package that's already being enforced under the current `scope` — it doesn't override `scope` itself. Under `scope: 'root'` (the default), a package matching `enforceOn` that's only ever pulled in transitively (never a direct dependency in your `package.json`) still can't fail `comply` — there's no root copy to hold accountable. It still shows up as advisory context (see below), it just doesn't block the build.

### Root vs. tree scope

hermex's lockfile parsing always resolves **complete** data for every package, for all three package managers (npm, yarn, pnpm): both the version your root `package.json` resolves to, and every distinct version found anywhere in the lockfile. `scope` then decides which of that data counts toward `comply` — it's a policy choice layered on top of already-complete data, not a limit on what hermex extracts:

```ts
export default defineConfig({
  releaseAge: {
    enabled: true,
    scope: 'root', // default — only the root-installed version can fail comply
    // scope: 'tree', // check every resolved copy; fail if any is overdue
    scopeExceptions: ['@vendor/pinned-*'], // these packages use the OPPOSITE scope
  },
});
```

- **`scope: 'root'`** (default) — only each package's direct/root-installed version is enforced. This matches how npm and pnpm (v9+) lockfiles already resolve dependencies. Nested duplicate copies pulled in by transitive dependencies never independently fail `comply`.
- **`scope: 'tree'`** — every resolved copy in the lockfile is enforced; `comply` fails if *any* installed copy is overdue.
- **`scopeExceptions`** — glob patterns (matched like `enforceOn`) naming packages that use the *opposite* of the configured `scope`. Useful when most of your tree should be checked exhaustively but a handful of packages have transitive pins you don't control down to the root, or vice versa.

**Root scope never hides nested duplicates from local output.** The human `--format human` table always shows a single **Installed** version (the exact copy the verdict was measured against — the enforced baseline, which under `scope: 'tree'` may be a nested copy rather than the root version) alongside the **Target** (recommended upgrade). When a package has multiple resolved versions, or an overdue nested copy the current scope doesn't enforce, that context is printed as a Notes line beneath the table — informational, not part of the pass/fail verdict. Notes are stdout-only: `--summary-file` (meant for a PR comment or CI check) only ever shows mandatory violations, so a reviewer never sees non-blocking context rendered as if it needed attention.

For **yarn**, root-version resolution works by reading the root `package.json`'s declared dependency range and matching it exactly against the corresponding entry in the already-parsed `yarn.lock` — yarn.lock itself retains no root/nested distinction, unlike npm's and pnpm's lockfile formats. If `package.json` can't be read, or a package isn't a direct dependency at all (purely transitive), hermex falls back to the highest resolved version found in the lockfile — but only for *display* (the `--format human` table, and `scan`'s Version column). That fallback is never treated as an enforced root version: under `scope: 'root'`, a package with no true root resolution can never fail `comply`, regardless of whether it matches `enforceOn`. Pre-v9 pnpm lockfiles (no `importers` field) are always treated as root-only regardless of `scope` — those legacy formats don't retain a root/nested distinction either.

## Compliance Checking

`hermex scan` is purely informational and always exits `0`. Use `hermex comply` to gate CI on your rules and release-age policy — it runs the same analysis pipeline, reports every violation (it does not stop at the first one), then exits based on the result:

```bash
hermex comply
```

- **Exit `0`** — compliant: no `error`-severity rule violations (banned packages included), no `error`-severity release-age threshold breaches (minor/patch or major).
- **Exit `1`** — not compliant: at least one mandatory violation found.
- **Exit `2`** — hermex couldn't run the check at all (no files matched, or an internal error).

`warn` and `info`-severity violations are always reported but never fail the build — only `error`-severity violations are mandatory. `hermex comply` respects `output.format: 'json'` the same way `scan` does, so CI pipelines can parse the full report while still relying on the exit code as the pass/fail signal.

### Reading compliance from the JSON

Both `hermex scan --format json` and `hermex comply --format json` emit a top-level `compliance` block — the **canonical, machine-readable verdict**. Read `compliance.status` rather than re-deriving a status from `packages` / `ruleViolations`, which is easy to get subtly wrong (e.g. treating a non-enforced overdue package or a not-yet-due pending upgrade as a failure).

```jsonc
"compliance": {
  "status": "compliant",   // "compliant" | "warning" | "non-compliant"
  "compliant": true,        // mirrors the `comply` exit code (0 ⇔ true)
  "counts": {
    "errorRuleViolations": 0,
    "releaseAgeViolations": 0,        // enforced (severity 'error') + overdue
    "warningRuleViolations": 0
  }
}
```

- **`non-compliant`** — at least one mandatory (`error`) violation. Exactly `compliant === false`; the condition `comply` exits `1` on.
- **`warning`** — passes `comply` (exit `0`), but a `warn`-severity **rule** violation is present. A non-enforced (`severity: 'warn'`) overdue release-age package or a not-yet-due `pendingUpgrade` is advisory data — it is **not** a warning and does **not** demote `compliant` → `warning`.
- **`compliant`** — no mandatory violations and nothing flagged at `warn`.

`status: 'warning'` never changes the exit code — it exists so dashboards and sheet syncs can surface a three-state signal that still agrees with `comply` on pass/fail.

The `counts` buckets are disjoint, so `errorRuleViolations + releaseAgeViolations` is the number of comply-failing violations — the same number the CLI prints as "N mandatory violations found".

Severity is the only thing that decides which bucket a rule violation lands in; the rule's `type` never does. An `error`-severity violation of any type counts toward `errorRuleViolations`, a `warn`-severity one toward `warningRuleViolations`, and an `info`-severity one toward neither while still appearing in `ruleViolations`.

### Reading the JSON output

`hermex scan --format json` and `hermex comply --format json` emit the same top-level shape:

| Field | What it holds |
|---|---|
| `version` | The hermex version that produced the report. |
| `summary` | Aggregate counts: `filesAnalyzed`, `totalImports`, `totalComponents`, `totalUsagePatterns`, plus `patternCounts` — per-pattern-type usage counts (`imports.named`, `usage.jsx`, …). |
| `packages` | Every package the repo owns — see below. Carries version, `declaredIn`, usage counts, and `releaseAge` when enrichment ran. |
| `components` | Every component found, with its source package, usage count and the files using it. The one place component names live. |
| `versus` | Head-to-head comparisons configured under `versus`. |
| `ruleViolations` | **Every rule hit, in one list** — `no-files`, `require-files`, `require-packages`, `no-packages`, `require-scripts`, `require-package-fields`, `no-package-fields`, `require-engine-version`, `require-codeowners`. Filter on `ruleId`. |
| `compliance` | The canonical verdict — see above. |

`ruleViolations` is the single source of truth for rule hits. Entries share a common shape (`ruleId`, `severity`, `patterns`, `message?`, `matchedFiles`) and add per-type fields where they apply: `packageName` for `no-packages`, `fieldPath`/`actualValue` for the package-field rules, `installedRange`/`requiredRange` for `require-engine-version`.

#### Trimming the JSON with `output.*`

The [output section toggles](#output-control) apply to `--format json` exactly as they do to the human printers. A section switched off is **omitted from the payload**, not emitted as an empty array — the point is a smaller file, and on a large repo `components[]` and `packages[]` are the bulk of it:

```ts
export default defineConfig({
  output: {
    format: 'json',
    components: false, // no `components` key at all
    packages: false, // no `packages` key at all
  },
});
```

| Config | Effect on the JSON |
|---|---|
| `output.packages: false` | omits `packages` |
| `output.components: false` | omits `components` |
| `output.versus: false` | omits `versus` |
| `output.patterns: false` **and** `output.details: false` | omits `summary.patternCounts` |
| `output.rules`, `output.summary` | **no effect** — see below |

`patternCounts` is the one field that answers to two toggles, because both human sections render that same array — the Patterns section as a table/chart, the Details section as a flat list. It therefore only drops when *both* are off; gating on `output.patterns` alone would strip it from the JSON while the terminal still printed it under Details. (`output.details` has no other effect on JSON — despite the name, that section prints pattern totals, not per-file records.)

`version`, the `summary` counters, `ruleViolations` and `compliance` are always emitted. They are the machine-readable verdict, and `comply` prints rules in human mode regardless of `output.rules`, so gating them here would make the JSON lossier than the terminal output it mirrors — a silent way to blind CI. `output.summary` has no counterpart either: the human Summary table shows derived metrics (package count, external components, total usages) that share only `filesAnalyzed` with the counters serialized here, so there is no JSON field it cleanly owns.

Because a disabled section is absent rather than empty, narrow before reading it — `result.components ?? []` — and note that `TypeScript`'s `HermexScanResult` marks exactly these fields optional.

#### What `packages[]` contains

Every package the repo **owns**: declared in `package.json` (any dependency bucket), recorded as a direct dependency by the lockfile, or imported by scanned source. Purely transitive dependencies are excluded — they arrive through another package, so this stays your own dependency surface rather than the whole lockfile.

```jsonc
{
  "packageName": "moment",
  "version": "2.29.4",           // null when declared but not installed
  "declaredIn": ["devDependencies"],  // empty for a phantom/lockfile-only dep
  "usageCount": 0,                    // component usage — see the caveat below
  "componentCount": 0,
  "percentage": 0,
  "internal": false,
  "hasVersionConflict": false,
  "allVersions": ["2.29.4"]
}
```

**`usageCount` measures component usage, not imports.** A package imported and called as a function (`lodash`, `moment`, `axios`) reads `0` while still being a real dependency — so use the *presence of a row* to answer "does this repo depend on X?", not `usageCount > 0`. Per-import detail is not currently in the output.

Before v3, `packages[]` held only packages with measured component usage, which made it empty for any project without JSX and silently omitted every function-only dependency.

Component **names** are not on these rows — they live in `components[]`, keyed by `source`. To list one package's components: `components.filter(c => c.source === pkg.packageName)`.

### CI Job Summary / PR Comment

`--summary-file <path>` writes a concise, ANSI-free markdown summary (title, rules, flagged packages, verdict) to `<path>`, suitable for posting as a GitHub Actions job summary or a PR comment — the same file can be reused verbatim for both surfaces, no need to generate it twice:

```bash
hermex comply --summary-file summary.md
hermex comply --summary-file summary.md --summary-title "Custom Heading"  # default: "Hermex Compliance Report"
```

Because `hermex comply` exits non-zero on violations, and GitHub Actions `run:` steps default to `bash -eo pipefail` (errexit is already on), a step that's expected to sometimes fail will otherwise kill the job before later steps (like posting the comment) can run. Rather than wrapping the command in `set +e` / `set -e` and manually capturing `exit_code=$?`, use `continue-on-error` and read the step's `outcome` later:

```yaml
- name: Run comply
  id: comply
  run: hermex comply --summary-file summary.md
  continue-on-error: true

- name: Post/update PR comment
  run: cat summary.md >> "$GITHUB_STEP_SUMMARY" # and/or post via your comment action of choice

- name: Fail the job if not compliant
  if: steps.comply.outcome == 'failure'
  run: exit 1
```

`steps.comply.outcome` is readable in any step that follows, so the pass/fail signal from the exit code is preserved without any manual exit-code plumbing.

## Output Control

All output sections are toggled in config, not via CLI flags:

```ts
export default defineConfig({
  output: {
    summary: 'log', // 'log' | false
    packages: 'table', // 'table' | 'chart' | false
    components: 'table', // 'table' | 'chart' | false
    patterns: false, // hide patterns section
    details: false, // hide per-file details
    versus: true, // show versus section
    rules: true, // show compliance section
  },
});
```

These are not human-format-only: `packages`, `components`, `patterns` and `versus` also drop the matching field from `--format json` — see [Trimming the JSON with `output.*`](#trimming-the-json-with-output).

## Full Example

```ts
import { defineConfig } from 'hermex';

export default defineConfig({
  includes: ['src/**/*.{tsx,jsx,ts,js}'],
  excludes: ['**/node_modules/**', '**/dist/**', '**/*.test.*'],

  packages: {
    internal: ['@myorg/*'],
    ignore: [],
  },

  versus: [
    { name: 'UI Library', packages: ['@mui/material', '@chakra-ui/react'] },
  ],

  rules: {
    'no-files': [
      { severity: 'error', patterns: ['jest.config.*'], message: 'Use vitest' },
    ],
    'require-files': [{ severity: 'error', patterns: ['.nvmrc'] }],
    'no-packages': [
      { severity: 'warn', patterns: ['moment'], message: 'Use date-fns' },
    ],
    'require-scripts': [{ severity: 'error', patterns: ['build', 'test'] }],
    'require-engine-version': { severity: 'error', range: '>=20' },
  },

  releaseAge: {
    enabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
  },

  output: {
    summary: 'log',
    packages: 'table',
    components: 'table',
    patterns: 'table',
    versus: true,
    rules: true,
  },
});
```
