import type { HermexConfigInput } from '../../../src/config/types.ts';
import base from './hermex.config.ts';

/**
 * `scope: 'tree'` — every resolved copy is enforced, so the ancient nested
 * react 17.0.2 becomes a mandatory failure rather than advisory context,
 * and the reported installed version is the worst copy rather than the
 * direct one. Everything else is identical to `./hermex.config.ts`, so the
 * diff between the two baselines is exactly what `scope` does.
 */
export default {
  ...base,
  releaseAge: { ...base.releaseAge, scope: 'tree' },
} satisfies HermexConfigInput;
