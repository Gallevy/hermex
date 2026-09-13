import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * `no-deprecated-packages` with `release-age` left empty — the #107 case.
 *
 * Deprecation used to be a by-product of release-age enrichment, so this
 * configuration detected nothing at all: turning release-age off silently
 * took deprecation with it. Here the registry is consulted for deprecation
 * alone, which is what the output proves — a `no-deprecated-packages` row
 * in the Rules table, carrying npm's own notice, on a run where release-age
 * never looked anything up.
 *
 * `comply` prints no Packages table without release-age data, by design: a
 * badge there is a cross-reference to the Rules row above it, not a second
 * finding, and `comply` is the gating view. `scan-human-default` is where
 * the Status column itself is reviewed.
 *
 * At `error`, so it also pins that deprecation can now fail `comply` on its
 * own rather than being display-only.
 */
export default {
  ...base,
  releaseAge: {
    cacheDisabled: true,
  },
  rules: {
    ...base.rules,
    'no-deprecated-packages': [{ severity: 'error', patterns: ['**'] }],
  },
} satisfies HermexConfigInput;
