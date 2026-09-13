import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

export default {
  ...base,
  rules: {
    'no-files': [
      {
        severity: 'warn',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    'no-packages': [
      { severity: 'warn', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    'require-files': [
      { severity: 'warn', patterns: ['.nvmrc'] },
      { severity: 'info', patterns: ['.editorconfig'] },
    ],
    'require-packages': [
      {
        severity: 'info',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
    'require-scripts': [
      {
        severity: 'warn',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    'require-package-fields': [{ severity: 'warn', patterns: ['engines', 'license'] }],
    'require-engine-version': { severity: 'info', range: '>=20', message: 'Minimum Node 20 required' },
  },
} satisfies HermexConfigInput;
