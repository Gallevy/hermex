import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  minify: false,
  splitting: false,
  shims: true,
  skipNodeModulesBundle: true,
  treeshake: true,
});
