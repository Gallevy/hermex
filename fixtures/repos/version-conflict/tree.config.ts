import type { HermexConfigInput } from '../../../src/config/types.ts';
import base from './hermex.config.ts';

export default {
  ...base,
  rules: {
    ...base.rules,
    'release-age': [{ severity: 'error', patterns: ['react'], scope: 'tree' }],
  },
} satisfies HermexConfigInput;
