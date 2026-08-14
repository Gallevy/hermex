import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Scopes the scan to `fixtures/broken/` so the parse-error report is the
 * whole output instead of three lines buried above the packages table
 * (#13). Everything else is off for the same reason.
 */
export default {
  ...base,
  includes: ['broken/**/*.{tsx,jsx,ts,js}'],
  output: {
    summary: 'log',
    packages: false,
    components: false,
    patterns: false,
    details: false,
    versus: false,
    rules: false,
  },
} satisfies HermexConfigInput;
