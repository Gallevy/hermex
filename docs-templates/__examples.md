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

```ts
export default defineConfig({
  rules: {
    forbid_files: [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
      { severity: 'warn', patterns: ['.eslintrc*'], message: 'Use oxlint' },
    ],
    require_files: [
      { severity: 'error', patterns: ['.nvmrc', 'vitest.config.*'] },
    ],
    allow_files: [{ severity: 'warn', patterns: ['.editorconfig'] }],
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
    forbid_files: [
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
