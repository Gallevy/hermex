import { defineConfig } from 'tsdown';

// `typescript` here is the native tsgo binary preview (see package.json), which has no
// classic JS compiler API for rolldown-plugin-dts to `require`. Resolve its platform-specific
// native executable directly so `.d.ts` generation for the library entry can spawn it.
const tscPkgJsonUrl = import.meta.resolve('typescript/package.json');
const { default: getExePath } = await import(
  new URL('./lib/getExePath.js', tscPkgJsonUrl).href
);
const tsgoPath = getExePath();

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: 'esm',
    platform: 'node',
    target: 'node24',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    dts: false,
    splitting: false,
  },
  {
    entry: ['src/index.ts'],
    format: 'esm',
    platform: 'node',
    target: 'node24',
    outDir: 'dist',
    clean: false,
    sourcemap: false,
    dts: { tsgo: { path: tsgoPath } },
    splitting: false,
  },
]);
