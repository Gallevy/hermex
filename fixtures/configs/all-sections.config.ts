import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Every human section on at once. The default config turns `details` and
 * `patterns` off, so without this case those two renderers never appear in
 * a reviewed output at all.
 */
export default {
  ...base,
  output: {
    summary: 'log',
    packages: 'table',
    components: 'table',
    patterns: 'table',
    details: true,
    versus: true,
    rules: true,
  },
} satisfies HermexConfigInput;
