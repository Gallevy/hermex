import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

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
