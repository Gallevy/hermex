import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

export default {
  ...base,
  releaseAge: {
    cacheDisabled: true,
  },
  rules: {
    ...base.rules,
    // Everything else installed still gets checked, advisory-only, via the
    // implicit `['**']` baseline — no need to author it explicitly.
    'no-outdated-packages': [{ severity: 'error', patterns: ['moment', 'react-dom'] }],
  },
} satisfies HermexConfigInput;
