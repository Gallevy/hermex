import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Turns on the release-age policy, which is the only part of hermex that
 * reaches the network. `HERMEX_FIXTURE_REGISTRY` points it at the offline
 * registry `scripts/output-review.ts` serves from
 * `fixtures/registry/timelines.ts`; without the env var it falls back to
 * the real registry so the config is still runnable by hand.
 *
 * The cache is disabled deliberately: a warm `~/.hermex` entry from an
 * earlier run against the real registry would otherwise decide the output.
 */
export default {
  ...base,
  releaseAge: {
    enabled: true,
    registry:
      process.env['HERMEX_FIXTURE_REGISTRY'] ?? 'https://registry.npmjs.org',
    cacheDisabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
    // Without `enforceOn`, only packages with measured usage are looked up
    // at all, which in this repo is `react` alone — `moment` and
    // `react-dom` are installed but never imported. Naming them here makes
    // all three targets *and* splits them across both severity tiers, since
    // a looked-up package that does not match `enforceOn` is advisory:
    //
    //   moment     enforced, overdue          → mandatory failure
    //   react-dom  enforced, coming due       → advisory "N days remaining"
    //   react      not enforced, overdue      → warning, does not fail comply
    enforceOn: ['moment', 'react-dom'],
  },
} satisfies HermexConfigInput;
