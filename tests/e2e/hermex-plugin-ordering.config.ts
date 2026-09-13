import type { HermexConfigInput } from '../../src/config/types.ts';

/**
 * Detection order and severity order deliberately disagree here, which is
 * what makes this fixture able to prove the sort actually happens (#147).
 *
 * hermex's own rules run first and contribute `warn` then `info`; the plugin
 * runs last and contributes the only `error`. Unsorted, the list would come
 * back warn → info → error. Sorted once on the way into `AggregatedReport`,
 * it comes back error → warn → info, with the plugin's finding at the top.
 *
 * Both rules name files that do not exist in `fixtures/`, so they fire on
 * every run without depending on fixture content.
 */
export default {
  includes: ['patterns/**/*.{tsx,jsx,ts,js}'],
  rules: {
    'require-files': [
      { severity: 'warn', patterns: ['.editorconfig'] },
      { severity: 'info', patterns: ['.nvmrc-absent'] },
    ],
  },
  plugins: [
    {
      name: 'late-linter',
      hooks: {
        onRunComplete(ctx) {
          ctx.violations.add({
            ruleId: 'no-debugger',
            severity: 'error',
            message: 'debugger statement',
          });
        },
      },
    },
  ],
} satisfies HermexConfigInput;
