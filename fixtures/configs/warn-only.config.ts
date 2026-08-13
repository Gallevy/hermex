import type { HermexConfigInput } from '../../src/config/types.ts';
import base from '../hermex.config.ts';

/**
 * The same rules as the primary config, none of them at `error`. Nothing
 * here can fail a build, so `comply` must exit 0 while still printing every
 * finding — and the verdict has to say "compliant" without pretending the
 * repo is clean. That wording is the whole point of the case.
 */
export default {
  ...base,
  rules: {
    detect_files: [
      {
        severity: 'warn',
        patterns: ['jest.config.*', '.babelrc'],
        message: 'Use vitest + Vite',
      },
    ],
    forbid_packages: [
      { severity: 'warn', patterns: ['moment'], message: 'Use date-fns or dayjs' },
    ],
    require_files: [
      { severity: 'warn', patterns: ['.nvmrc'] },
      { severity: 'info', patterns: ['.editorconfig'] },
    ],
    require_packages: [
      {
        severity: 'info',
        patterns: ['typescript'],
        message: 'TypeScript is required',
      },
    ],
    require_scripts: [
      {
        severity: 'warn',
        patterns: ['build', 'test'],
        message: 'Required npm scripts',
      },
    ],
    require_package_fields: [{ severity: 'warn', patterns: ['engines', 'license'] }],
    engine_version: { severity: 'info', range: '>=20', message: 'Minimum Node 20 required' },
  },
} satisfies HermexConfigInput;
