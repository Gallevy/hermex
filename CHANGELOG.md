# [2.0.0-beta.5](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.4...v2.0.0-beta.5) (2026-07-04)


### Bug Fixes

* populate hasVersionConflict/allVersions for yarn and pnpm lockfiles ([19a4695](https://github.com/Gallevy/hermex/commit/19a4695dd3a0520a5383f2dd8ef2015acd97dacd)), closes [#15](https://github.com/Gallevy/hermex/issues/15)

# [2.0.0-beta.4](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.3...v2.0.0-beta.4) (2026-07-04)


### Features

* **releaseAge:** cache npm registry responses ([05d6dd2](https://github.com/Gallevy/hermex/commit/05d6dd2b29a5dcfa29378033f7e8e2d26bc28e22))

# [2.0.0-beta.3](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.2...v2.0.0-beta.3) (2026-07-04)


### Features

* ship library entry point with typed config and scan result ([d5296f2](https://github.com/Gallevy/hermex/commit/d5296f23f51316cb5ac3a164207f2ee1014102b9))

# [2.0.0-beta.2](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.1...v2.0.0-beta.2) (2026-07-04)


### Bug Fixes

* exclude prerelease versions from releaseAge minCompliantVersion/upgrades ([518962b](https://github.com/Gallevy/hermex/commit/518962b102eb53373db3e8a4abdda04ccc5ffc50)), closes [#20](https://github.com/Gallevy/hermex/issues/20)

# [2.0.0-beta.1](https://github.com/Gallevy/hermex/compare/v1.3.0-beta.4...v2.0.0-beta.1) (2026-07-03)


* feat(comply)!: add comply command and fix releaseAge/rules reporting ([6d7a232](https://github.com/Gallevy/hermex/commit/6d7a2323387569d4249db17ab324223b516a5fbb)), closes [#14](https://github.com/Gallevy/hermex/issues/14) [#18](https://github.com/Gallevy/hermex/issues/18) [#17](https://github.com/Gallevy/hermex/issues/17)


### BREAKING CHANGES

* forbid_files and allow_files rule types have been
removed. Use detect_files (with severity: 'warn'/'error') in place of
forbid_files, and require_files in place of allow_files.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

# [1.3.0-beta.4](https://github.com/Gallevy/hermex/compare/v1.3.0-beta.3...v1.3.0-beta.4) (2026-07-03)


### Bug Fixes

* JSX in .js files, absolute paths in output, stale --version ([2cbb495](https://github.com/Gallevy/hermex/commit/2cbb49522f88cdb7b63e58abdb3f1a02c138909a))

# [1.3.0-beta.3](https://github.com/Gallevy/hermex/compare/v1.3.0-beta.2...v1.3.0-beta.3) (2026-07-03)


### Bug Fixes

* move @semantic-release/github to devDependencies, remove unused @types/tmp ([7daa927](https://github.com/Gallevy/hermex/commit/7daa9273abfbf70798865e142653604feb7cb328))


### Features

* support HERMEX_REGISTRY_AUTH_TOKEN environment variable ([f8cb0c0](https://github.com/Gallevy/hermex/commit/f8cb0c06a0705be3431237623149f8024171562a))

# [1.3.0-beta.2](https://github.com/Gallevy/hermex/compare/v1.3.0-beta.1...v1.3.0-beta.2) (2026-06-27)


### Features

* --config flag, output.format json, fix js-yaml default import, replace defineConfig with import type pattern ([36699c4](https://github.com/Gallevy/hermex/commit/36699c40ee09081afc24925a9c31c87407385a35))

# [1.3.0-beta.1](https://github.com/Gallevy/hermex/compare/v1.2.0...v1.3.0-beta.1) (2026-06-27)


### Bug Fixes

* address all PR review comments ([3e26706](https://github.com/Gallevy/hermex/commit/3e26706993856ac23df4dfae9eebf8614b5b1743))
* address remaining PR review comments ([4cd7a99](https://github.com/Gallevy/hermex/commit/4cd7a991650a035ebf04d894c368d6b7fc4103c9))
* derive SWC parse options from file extension ([daadd80](https://github.com/Gallevy/hermex/commit/daadd8063d59a84496e578615b5f3cacddbd2a67))
* remove hardcoded DEFAULT_EXCLUDES from evaluator, require caller to pass config.excludes ([7714584](https://github.com/Gallevy/hermex/commit/7714584f6adc2361ef21301b41c49c07ad311d08))
* wire ignoreErrors from config into parseFile, remove noisy console.error ([7f13499](https://github.com/Gallevy/hermex/commit/7f134995a60f56049bfac294f8ddc5d797c43eae))


### Features

* additional compliance rule types ([56e2eba](https://github.com/Gallevy/hermex/commit/56e2eba61a20d83ce011f6d412776401a81ba524))
* compliance rules + banned packages ([61cc277](https://github.com/Gallevy/hermex/commit/61cc2773e6f11f0a8047759563de8991b0461dd8))
* config file system + internal package marking ([0569d7f](https://github.com/Gallevy/hermex/commit/0569d7fc0f46e0713eac4378d3321dd18cd78052))
* multiple version detection in lockfile ([ea07de5](https://github.com/Gallevy/hermex/commit/ea07de5d15910d6fa6340ac6bcd667ed7e55d5e2))
* release age + deprecated package detection ([ed7c3b5](https://github.com/Gallevy/hermex/commit/ed7c3b53e5e8941d0f7cc5b6d09b2e30587dda9b))
* upgrade to TypeScript 7 RC + replace tsup with esbuild ([dea350f](https://github.com/Gallevy/hermex/commit/dea350f95bad4bcb5f675ab25a45132e07ac29e7))
* versus package comparison + split tracking ([03a1b61](https://github.com/Gallevy/hermex/commit/03a1b613226a3a1a0174aa9cf956371cba2d955a))


### Reverts

* restore CHANGELOG.md to pre-merge state ([2eedcec](https://github.com/Gallevy/hermex/commit/2eedcec04025d0a993bca2783f969f3675cd8ff2))

# [1.2.0](https://github.com/Gallevy/hermex/compare/v1.1.2...v1.2.0) (2025-12-06)


### Features

* add --ignore-errors ([7469d92](https://github.com/Gallevy/hermex/commit/7469d9234d2071c360d9fc08232e417f272570f3))

## [1.1.2](https://github.com/Gallevy/hermex/compare/v1.1.1...v1.1.2) (2025-12-06)


### Bug Fixes

* --allow-packages & --ignore-packages ([cde1cab](https://github.com/Gallevy/hermex/commit/cde1cabd6d88a51c118a17f9d8b59db3136f1b5f))
* docs ([e5266c1](https://github.com/Gallevy/hermex/commit/e5266c16121c1f294973abba95296f9d49963316))
* lint ([a02bd48](https://github.com/Gallevy/hermex/commit/a02bd486d0a8a0c970083a286db3adec2cd27d39))
* lint ([de0fcf2](https://github.com/Gallevy/hermex/commit/de0fcf2ed233532e256e35e3b4b19c43b6f52e9c))

## [1.1.1](https://github.com/Gallevy/hermex/compare/v1.1.0...v1.1.1) (2025-12-06)


### Bug Fixes

* bin execution issue ([f844cd0](https://github.com/Gallevy/hermex/commit/f844cd0e1ee8b9aba271fb51f5739f4679a2b73c))

## [1.1.1-beta.1](https://github.com/Gallevy/hermex/compare/v1.1.0...v1.1.1-beta.1) (2025-12-06)


### Bug Fixes

* bin execution issue ([f844cd0](https://github.com/Gallevy/hermex/commit/f844cd0e1ee8b9aba271fb51f5739f4679a2b73c))

# [1.1.0](https://github.com/Gallevy/hermex/compare/v1.0.0...v1.1.0) (2025-12-06)


### Features

* add lock file detection ([a35bd77](https://github.com/Gallevy/hermex/commit/a35bd77ca243a0eb7fc049138c1305f67c121a7a))

# 1.0.0 (2025-12-05)


### Bug Fixes

* ci/cd flow ([cadfd5d](https://github.com/Gallevy/hermex/commit/cadfd5d8197e1d90c379ed72fbd3cbda99368f8a))
* trigger first semantic release ([51b986a](https://github.com/Gallevy/hermex/commit/51b986a8bf43b85cecb25922b19607965e7685ae))

# 1.0.0-beta.1 (2025-12-05)


### Bug Fixes

* ci/cd flow ([cadfd5d](https://github.com/Gallevy/hermex/commit/cadfd5d8197e1d90c379ed72fbd3cbda99368f8a))
* trigger first semantic release ([51b986a](https://github.com/Gallevy/hermex/commit/51b986a8bf43b85cecb25922b19607965e7685ae))

# 1.0.0-beta.1 (2025-12-05)


### Bug Fixes

* ci/cd flow ([cadfd5d](https://github.com/Gallevy/hermex/commit/cadfd5d8197e1d90c379ed72fbd3cbda99368f8a))
