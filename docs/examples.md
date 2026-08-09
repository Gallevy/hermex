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
lets a subset of them get extra rules without forking the config. Each entry
checks the *current repo's* `package.json` `name` field against `match`
(micromatch patterns, same matching engine as `forbid_packages`); when it
matches, the entry's `rules` are merged into the base `rules` above.

```ts
export default defineConfig({
  rules: {
    require_packages: [{ severity: 'error', patterns: ['typescript'] }],
  },
  overrides: [
    {
      // whitelist of repos that must depend on @acme/shell — edit this
      // array to add/remove repos, no other config changes needed
      match: ['@acme/checkout', '@acme/billing', '@acme/shell-consumer-*'],
      rules: {
        require_packages: [
          {
            severity: 'error',
            patterns: ['@acme/shell'],
            message: '@acme/shell is mandatory for shell-integrated apps',
          },
        ],
      },
    },
  ],
});
```

A repo whose `package.json` name is `@acme/checkout` gets both
`require_packages` rules (`typescript` from the base config, `@acme/shell`
from the override) — rule lists are merged additively, not replaced, so the
base config's rules always still apply. A repo that doesn't match any
`match` pattern is completely unaffected; only the base `rules` apply. If
`package.json` is missing or has no `name`, no overrides can match.

Every rule type is mergeable this way (`detect_files`, `require_files`,
`forbid_packages`, `require_packages`, `require_scripts`,
`require_package_fields`, `forbid_package_fields`, `engine_version`). The
exception is `codeowners`, which only ever holds a single rule — a matching
override's `codeowners` replaces the base one instead of merging with it.

When more than one override entry matches the same repo, all of them apply,
in array order.

## Compliance Rules

### File Rules

File rules fall into two axes: **presence-triggered** (`detect_files`) and
**absence-triggered** (`require_files`). `detect_files` supports three
severities — `info` for pure tracking (never a violation-style concern,
just recorded), `warn` for a nudge, and `error` for a hard requirement
that a file must NOT be present.

```ts
export default defineConfig({
  rules: {
    detect_files: [
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
    require_files: [
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
    forbid_packages: [
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
    require_packages: [
      {
        severity: 'error',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
  },
});
```

Banned packages get a `[BANNED]` or `[RESTRICTED]` badge in the packages table and appear in the Compliance section.

### CODEOWNERS Rule

Requires every scanned file to have an owner in your `CODEOWNERS` file
(checked at `.github/CODEOWNERS`, `CODEOWNERS`, or `docs/CODEOWNERS`, in
that order):

```ts
export default defineConfig({
  rules: {
    codeowners: {
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
    codeowners: {
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
    require_scripts: [
      {
        severity: 'error',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    require_package_fields: [
      { severity: 'warn', patterns: ['engines', 'license', 'repository'] },
    ],
    forbid_package_fields: [
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
    engine_version: {
      severity: 'error',
      range: '>=20',
      message: 'Node 20+ required',
    },
  },
});
```

`forbid_package_fields` is the mirror of `require_package_fields`: it fires
when a field **is present** at the given dot-path (e.g. `scripts.preinstall`)
— optionally scoped further with `values` (micromatch patterns the field's
stringified value must match, same as `require_package_fields`'s `values`).
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

- **Exit `0`** — compliant: no `error`-severity rule violations, no `error`-severity banned packages, no `error`-severity release-age threshold breaches (minor/patch or major).
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
    "errorBannedPackageViolations": 0,
    "releaseAgeViolations": 0,        // enforced (severity 'error') + overdue
    "warningRuleViolations": 0,
    "warningBannedPackageViolations": 0
  }
}
```

- **`non-compliant`** — at least one mandatory (`error`) violation. Exactly `compliant === false`; the condition `comply` exits `1` on.
- **`warning`** — passes `comply` (exit `0`), but a `warn`-severity **rule** or **banned-package** violation is present. A non-enforced (`severity: 'warn'`) overdue release-age package or a not-yet-due `pendingUpgrade` is advisory data — it is **not** a warning and does **not** demote `compliant` → `warning`.
- **`compliant`** — no mandatory violations and nothing flagged at `warn`.

`status: 'warning'` never changes the exit code — it exists so dashboards and sheet syncs can surface a three-state signal that still agrees with `comply` on pass/fail.

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
    detect_files: [
      { severity: 'error', patterns: ['jest.config.*'], message: 'Use vitest' },
    ],
    require_files: [{ severity: 'error', patterns: ['.nvmrc'] }],
    forbid_packages: [
      { severity: 'warn', patterns: ['moment'], message: 'Use date-fns' },
    ],
    require_scripts: [{ severity: 'error', patterns: ['build', 'test'] }],
    engine_version: { severity: 'error', range: '>=20' },
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
