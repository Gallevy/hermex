import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * `includes` that match nothing. The pipeline bails before analysis, which
 * `comply` reports as exit **2** — pipeline failure, distinct from exit 1
 * (non-compliant). A consumer that treats any non-zero exit as "policy
 * violation" would report a clean repo as failing, so the two codes need to
 * stay distinguishable and reviewed.
 *
 * `scan` takes the same path and exits 0. That asymmetry is deliberate but
 * easy to break, which is why both halves are cases.
 */
export default {
  ...base,
  includes: ['no-such-directory/**/*.{tsx,jsx,ts,js}'],
} satisfies HermexConfigInput;
