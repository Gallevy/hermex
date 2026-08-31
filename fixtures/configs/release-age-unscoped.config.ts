import type { HermexConfigInput } from '../../src/config/types.ts';
import base from './release-age.config.ts';

export default {
  ...base,
  releaseAge: { ...base.releaseAge, enforceOn: [] },
} satisfies HermexConfigInput;
