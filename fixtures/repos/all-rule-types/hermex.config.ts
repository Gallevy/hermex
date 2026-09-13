import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * Every rule type hermex has, all firing at once, at three different
 * severities. The primary fixture repo only ever trips three of the eleven —
 * so without this repo the rules table has never been reviewed with an
 * `require-engine-version` row, a `require-codeowners` row, or either of the
 * package-field shapes in it, and nothing would catch a renderer that
 * mishandles `fieldPath` / `installedRange` / a long `matchedFiles` list.
 * `release-age` is the eleventh and only rule that never renders a Rules-table
 * row at all (its display is the Packages table) — this is the only case
 * that exercises it alongside the other ten in one run.
 *
 * Scoped to `src/` so `jest.config.js` is found by `no-files` without
 * also being parsed as source — and so `assets/logo.svg`, which exists
 * purely to breach `max-file-size`, is never parsed either.
 */
export default {
  includes: ['src/**/*.{tsx,jsx,ts,js}'],
  releaseAge: {
    cacheDisabled: true,
  },
  rules: {
    // react@18.3.1 is overdue on a major (19.0.0, breached) with a genuine
    // compliant target still in-window (19.1.0) — the eleventh rule type,
    // and the only one whose display lives in the Packages table rather
    // than the Rules table (see src/utils/print-rules.ts's renderer
    // dispatch).
    'release-age': [{ severity: 'error', patterns: ['react'] }],
    'no-files': [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    'require-files': [{ severity: 'error', patterns: ['.nvmrc'] }],
    // assets/logo.svg is 1410 bytes, so it clears the 1 KB ceiling. It is
    // written as a single line with no newline, which keeps its byte count
    // — and therefore the recorded size in this baseline — identical on
    // every checkout.
    'max-file-size': [
      {
        severity: 'warn',
        patterns: ['assets/**/*.svg'],
        maxSize: '1kb',
        message: 'Compress it or serve it from the CDN',
      },
    ],
    'no-packages': [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    'require-packages': [
      { severity: 'error', patterns: ['typescript'], message: 'TypeScript is required' },
    ],
    'require-scripts': [
      { severity: 'error', patterns: ['build', 'test'], message: 'Required npm scripts' },
    ],
    // Missing outright, so the violation reports the absence.
    'require-package-fields': [{ severity: 'warn', patterns: ['license'] }],
    // Present, so the violation reports the offending value — the other
    // half of the package-field renderer.
    'no-package-fields': [
      {
        severity: 'warn',
        patterns: ['publishConfig.registry'],
        message: 'Publish to the public registry',
      },
    ],
    // engines.node is ">=16", so this reports both ranges rather than the
    // "not specified" shape.
    'require-engine-version': { severity: 'error', range: '>=20', message: 'Minimum Node 20 required' },
    // CODEOWNERS covers two of the three scanned files, and one of those
    // belongs to a team outside `requiredOwners` — so this produces both
    // codeowners violations, unowned and wrong-owner, worded distinctly
    // ("have no owner" vs. "have the wrong owner"). #95 — both used to
    // print as "have no owner" regardless, since the old folded violation
    // shape had no field to distinguish them — was fixed as a side effect
    // of giving each atomic codeowners violation its own `reason`.
    'require-codeowners': {
      severity: 'info',
      requiredOwners: ['@org/platform'],
      message: 'Every file needs a platform owner',
    },
  },
  output: {
    components: false,
    patterns: false,
    versus: false,
  },
} satisfies HermexConfigInput;
