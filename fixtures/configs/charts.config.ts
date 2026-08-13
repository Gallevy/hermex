import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * The bar-chart renderer instead of tables, for all three sections that
 * can render either way. Bar widths are derived from the largest value in
 * each section, so this is the case that catches scaling and label
 * alignment regressions.
 */
export default {
  ...base,
  output: {
    summary: 'log',
    packages: 'chart',
    components: 'chart',
    patterns: 'chart',
    details: false,
    versus: true,
    rules: true,
  },
} satisfies HermexConfigInput;
