import type { HermexConfigInput } from '../../../src/config/types.ts';

/**
 * Deliberately the same rule set as `fixtures/hermex.config.ts` — the only
 * thing that differs is the repo underneath it. Keeping the rules identical
 * is what makes the `comply-pass` / `comply-fail` pair a real contrast:
 * every difference in their output comes from the repo, never from the
 * policy. If a rule is added to the primary config, add it here too and
 * satisfy it, or the pair stops proving anything.
 */
export default {
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
} satisfies HermexConfigInput;
