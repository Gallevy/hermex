import type { HermexConfigInput } from '../../../src/config/types.ts';

export default {
  releaseAge: {
    cacheDisabled: true,
  },
  rules: {
    'release-age': [{ severity: 'error', patterns: ['react'], scope: 'root' }],
  },
  output: {
    components: false,
    patterns: false,
    versus: false,
  },
} satisfies HermexConfigInput;
