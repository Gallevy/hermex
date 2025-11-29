import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"], // FIXME: We can use more modern format
  target: "node14", // FIXME: This should be updated to the latest LTS version
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  minify: false,
  splitting: false,
  shims: true,
  skipNodeModulesBundle: true,
  treeshake: true,
  // FIXME Why do we need to mark our dependencies as external, I don't want this duplication
  external: [
    "@swc/core",
    "@swc/types",
    "@yarnpkg/lockfile",
    "chalk",
    "cli-table3",
    "commander",
    "glob",
    "js-yaml",
    "ora",
    "simple-git",
    "tmp",
  ],
});
