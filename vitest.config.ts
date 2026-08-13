import {
  defineConfig,
  configDefaults,
  coverageConfigDefaults,
} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Agent tooling checks the whole repo out into nested working copies.
    // Without this, vitest discovers their test files too and runs a stale
    // copy of the suite against the current source — locally that turned a
    // clean run into 67 failures across 400 files.
    exclude: [...configDefaults.exclude, '**/.claude/**', '**/.agents/**'],
    coverage: {
      provider: 'v8',
      // Coverage measures the published package. `scripts/` is repo tooling
      // that ships to nobody, and letting it into the denominator moves the
      // number for reasons that have nothing to do with hermex's own
      // quality — the output-review runner alone dragged the total down 12
      // points the moment a test imported one function from it.
      //
      // An `exclude` rather than `include: ['src/**']`: the latter also
      // pulls in src files no test ever loads, which is a different (and
      // much lower) number that would break comparison against main for
      // reasons unrelated to this change.
      exclude: [...coverageConfigDefaults.exclude, 'scripts/**'],
      reporter: ['text', 'lcov', 'json-summary', 'json'],
    },
  },
});
