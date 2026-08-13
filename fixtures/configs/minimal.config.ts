import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Every output section off except the summary. Regression cover for #63:
 * a section that is switched off must actually be absent, not rendered
 * empty or rendered anyway. Used twice — once as human output, once as
 * `--format json`, since the JSON payload has to honour the same toggles.
 */
export default {
  ...base,
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
