import type { HermexConfigInput } from '../../../src/config/types.ts';
import base from './hermex.config.ts';

export default {
  ...base,
  rules: {
    ...base.rules,
    'no-outdated-packages': [{ severity: 'error', patterns: ['react'], scope: 'tree' }],
  },
} satisfies HermexConfigInput;
