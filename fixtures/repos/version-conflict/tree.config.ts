import type { HermexConfigInput } from '../../../src/config/types.ts';
import base from './hermex.config.ts';

export default {
  ...base,
  releaseAge: { ...base.releaseAge, scope: 'tree' },
} satisfies HermexConfigInput;
