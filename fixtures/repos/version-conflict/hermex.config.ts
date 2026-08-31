import type { HermexConfigInput } from '../../../src/config/types.ts';

export default {
  releaseAge: {
    enabled: true,
    registry:
      process.env['HERMEX_FIXTURE_REGISTRY'] ?? 'https://registry.npmjs.org',
    cacheDisabled: true,
    thresholds: { patch: 30, minor: 45, major: 60 },
    enforceOn: ['react'],
    scope: 'root',
  },
  output: {
    components: false,
    patterns: false,
    versus: false,
  },
} satisfies HermexConfigInput;
