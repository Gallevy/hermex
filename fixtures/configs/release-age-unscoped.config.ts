import type { HermexConfigInput } from '../../src/config/types.ts';
import base from './release-age.config.ts';

export default {
  ...base,
  rules: {
    ...base.rules,
    // No package-specific entry — an explicit catch-all governs everyone at
    // 'warn', the same outcome the old empty `enforceOn` produced (checked,
    // never mandatory), but authored rather than implicit, so this case
    // stays the "release-age is on, nothing enforced" path even though
    // release-age.config.ts's own `['**']` baseline would do the same thing
    // by default.
    'no-outdated-packages': [{ severity: 'warn', patterns: ['**'] }],
  },
} satisfies HermexConfigInput;
