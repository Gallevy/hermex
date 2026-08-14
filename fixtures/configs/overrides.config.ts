import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * Repo-scoped rule adjustments. `match` is checked against the current
 * repo's package.json "name", which for the primary fixture repo is
 * `hermex-fixtures`, so both entries below apply and the rules table has to
 * show the *resolved* severities rather than the ones authored in the base
 * config:
 *
 * - `no-packages` on `moment` drops from error to warn.
 * - `require-files` on `.editorconfig` is switched off entirely and must
 *   disappear from the output, not appear greyed out.
 *
 * The remaining error-severity rules are left alone on purpose — an
 * override that made the repo compliant would prove the rules vanished, not
 * that they were re-scoped.
 */
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
