import type { HermexConfigInput } from '../src/config/types.ts';

export default {
  packages: {
    internal: ['@design-system/*'],
  },
  versus: [
    {
      name: 'Design System Migration',
      packages: ['@design-system/foundation', '@new-system/arc'],
    },
  ],
  rules: {
    detect_files: [
      {
        severity: 'error',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    forbid_packages: [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    require_files: [
      { severity: 'error', patterns: ['.nvmrc'] },
      { severity: 'warn', patterns: ['.editorconfig'] },
    ],
    require_packages: [
      {
        severity: 'error',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
    require_scripts: [
      {
        severity: 'error',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    require_package_fields: [{ severity: 'warn', patterns: ['engines', 'license'] }],
    engine_version: { severity: 'warn', range: '>=20', message: 'Minimum Node 20 required' },
  },
  output: {
    details: false,
    patterns: false,
  },
} satisfies HermexConfigInput;
