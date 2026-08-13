import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * `scope: 'root'` — the default. Only the direct dependency's own
 * resolution (react 18.3.1) counts toward the verdict; the nested
 * react 17.0.2 that `legacy-widget` resolves for itself is still surfaced,
 * as an advisory breach, because an overdue nested copy must never be
 * silently invisible just because it cannot be fixed from here (#57).
 *
 * `./tree.config.ts` is the same repo under `scope: 'tree'`. The pair is
 * the only place the scope setting visibly changes a verdict.
 */
export default {
  releaseAge: {
    enabled: true,
    registry:
      process.env['HERMEX_FIXTURE_REGISTRY'] ?? 'https://registry.npmjs.org',
    cacheDisabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
    // Keeps `legacy-widget` — which no recorded timeline covers — out of
    // the lookup entirely, so this case reports a scope difference rather
    // than a registry miss.
    enforceOn: ['react'],
    scope: 'root',
  },
  output: {
    components: false,
    patterns: false,
    versus: false,
  },
} satisfies HermexConfigInput;
