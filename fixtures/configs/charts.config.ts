import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

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
