import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

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
