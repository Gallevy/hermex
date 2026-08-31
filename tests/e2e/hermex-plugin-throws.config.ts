import type { HermexConfigInput } from '../../src/config/types.ts';

/**
 * A plugin whose hook throws — the "oxlint isn't installed in this CI job"
 * shape. #102 decided this aborts the run rather than degrading it, so
 * `comply` must exit 2 and report neither pass nor fail.
 */
export default {
  includes: ['patterns/**/*.{tsx,jsx,ts,js}'],
  plugins: [
    {
      name: 'broken-linter',
      hooks: {
        onRunComplete() {
          throw new Error('spawn oxlint ENOENT');
        },
      },
    },
  ],
} satisfies HermexConfigInput;
