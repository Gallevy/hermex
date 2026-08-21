import type { HermexConfigInput } from '../../src/config/types.ts';

/**
 * An inline plugin, written the way the docs recommend: a plain object, no
 * factory, and no bare-specifier imports — only `import type`, which Node
 * erases. That combination is what keeps a config loadable under `npx` in a
 * repo with no `node_modules` (#102).
 *
 * The plugin contributes one violation of each severity so the e2e run can
 * assert on rendering, the severity tally and the `comply` exit code without
 * depending on a real third-party tool being installed.
 */
export default {
  includes: ['patterns/**/*.{tsx,jsx,ts,js}'],
  plugins: [
    {
      name: 'fake-linter',
      hooks: {
        onRunComplete(ctx) {
          ctx.meta.set('files_seen', ctx.files.length);

          ctx.violations.add({
            ruleId: 'no-debugger',
            severity: 'error',
            message: 'debugger statement',
            location: { file: 'patterns/imports.tsx', line: 12 },
          });
          ctx.violations.add({
            ruleId: 'no-unused-vars',
            severity: 'warn',
            message: 'x is never read',
            files: ['patterns/imports.tsx'],
          });
          ctx.violations.add({
            ruleId: 'prefer-const',
            severity: 'info',
            message: 'let could be const',
          });
        },
      },
    },
  ],
} satisfies HermexConfigInput;
