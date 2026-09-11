import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

export default {
  ...base,
  overrides: [
    {
      match: ['hermex-fixtures'],
      rules: {
        'no-packages': {
          severity: 'warn',
          patterns: ['moment'],
          message: 'Use date-fns or dayjs (scheduled for removal)',
        },
        'require-files': { severity: 'off', patterns: ['.editorconfig'] },
      },
    },
  ],
} satisfies HermexConfigInput;
