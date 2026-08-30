import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

export default {
  ...base,
  includes: ['no-such-directory/**/*.{tsx,jsx,ts,js}'],
} satisfies HermexConfigInput;
