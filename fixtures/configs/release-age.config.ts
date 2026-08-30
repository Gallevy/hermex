import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

export default {
  ...base,
  releaseAge: {
    enabled: true,
    registry:
      process.env['HERMEX_FIXTURE_REGISTRY'] ?? 'https://registry.npmjs.org',
    cacheDisabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
    enforceOn: ['moment', 'react-dom'],
  },
} satisfies HermexConfigInput;
