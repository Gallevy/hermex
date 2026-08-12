# <!-- @package name --> - Examples Guide

Practical examples for configuring and running <!-- @package name --> v2.

## Getting Started

<!-- @package name --> is fully config-driven. All configuration lives in `hermex.config.ts` at your project root — there are no CLI flags.

```bash
npx <!-- @package name --> scan
```

## Minimal Config

```ts
// hermex.config.ts
import { defineConfig } from '<!-- @package name -->';

export default defineConfig({});
```

Running `<!-- @package name --> scan` with no config (or an empty one) uses defaults: scans `**/*.{tsx,jsx,ts,js}`, excludes `node_modules/dist/build`, shows packages + components + summary.

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

`forbid_packages` matches a package that is either imported in your scanned source **or** declared in
`package.json` under `dependencies`, `devDependencies`, `peerDependencies` or `optionalDependencies`.
Build-only tooling that is never imported — something run via `npx`, an npm script or a git hook — is
covered, so there is no need to spell it out as `forbid_package_fields: ['dependencies.x', 'devDependencies.x']`.
Packages excluded by `packages.ignore` are never flagged.

Every banned package appears in the Rules and Compliance sections. Those with measured usage also get a
`[BANNED]` or `[RESTRICTED]` badge in the packages table; a declared-but-unused package has no row there.

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
    engine_version: {
      severity: 'error',
      range: '>=20',
      message: 'Node 20+ required',
    },
  },
});
```

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
    enforceOn: ['@my-org/*'], // only these block `<!-- @package name --> comply`
  },
});
```

If `enforceOn` is omitted, every package's release age counts toward compliance (current behavior).

## Compliance Checking

`<!-- @package name --> scan` is purely informational and always exits `0`. Use `<!-- @package name --> comply` to gate CI on your rules and release-age policy — it runs the same analysis pipeline, reports every violation (it does not stop at the first one), then exits based on the result:

```bash
<!-- @package name --> comply
```

- **Exit `0`** — compliant: no `error`-severity rule violations, no `error`-severity banned packages, no `error`-severity release-age threshold breaches (minor/patch or major).
- **Exit `1`** — not compliant: at least one mandatory violation found.
- **Exit `2`** — hermex couldn't run the check at all (no files matched, or an internal error).

`warn` and `info`-severity violations are always reported but never fail the build — only `error`-severity violations are mandatory. `<!-- @package name --> comply` respects `output.format: 'json'` the same way `scan` does, so CI pipelines can parse the full report while still relying on the exit code as the pass/fail signal.

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
import { defineConfig } from '<!-- @package name -->';

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
