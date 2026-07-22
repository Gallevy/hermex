## [2.0.1](https://github.com/Gallevy/hermex/compare/v2.0.0...v2.0.1) (2026-07-22)


### Bug Fixes

* compute overdue days from the release that breached the threshold, not the upgrade target ([#24](https://github.com/Gallevy/hermex/issues/24)) ([91929b8](https://github.com/Gallevy/hermex/commit/91929b873e76c14d32c853489b8dee71a5065058)), closes [#14](https://github.com/Gallevy/hermex/issues/14)
* parse pnpm peer-suffixed dependency versions with @pnpm/dependency-path ([#25](https://github.com/Gallevy/hermex/issues/25)) ([6e8c904](https://github.com/Gallevy/hermex/commit/6e8c90495ea704e95b30afa9ab2161d6d915fb0d))

# [2.0.0](https://github.com/Gallevy/hermex/compare/v1.2.0...v2.0.0) (2026-07-21)


* feat(comply)!: add comply command and fix releaseAge/rules reporting ([6d7a232](https://github.com/Gallevy/hermex/commit/6d7a2323387569d4249db17ab324223b516a5fbb)), closes [#14](https://github.com/Gallevy/hermex/issues/14) [#18](https://github.com/Gallevy/hermex/issues/18) [#17](https://github.com/Gallevy/hermex/issues/17)


### Bug Fixes

* address all PR review comments ([3e26706](https://github.com/Gallevy/hermex/commit/3e26706993856ac23df4dfae9eebf8614b5b1743))
* address remaining PR review comments ([4cd7a99](https://github.com/Gallevy/hermex/commit/4cd7a991650a035ebf04d894c368d6b7fc4103c9))
* compute minCompliantVersion for every semver bump tier ([#21](https://github.com/Gallevy/hermex/issues/21)) ([7fbbeaa](https://github.com/Gallevy/hermex/commit/7fbbeaa01940e1cbe53c266f9c5f1999800caea7))
* derive SWC parse options from file extension ([daadd80](https://github.com/Gallevy/hermex/commit/daadd8063d59a84496e578615b5f3cacddbd2a67))
* exclude prerelease versions from releaseAge minCompliantVersion/upgrades ([518962b](https://github.com/Gallevy/hermex/commit/518962b102eb53373db3e8a4abdda04ccc5ffc50)), closes [#20](https://github.com/Gallevy/hermex/issues/20)
* JSX in .js files, absolute paths in output, stale --version ([2cbb495](https://github.com/Gallevy/hermex/commit/2cbb49522f88cdb7b63e58abdb3f1a02c138909a))
* move @semantic-release/github to devDependencies, remove unused @types/tmp ([7daa927](https://github.com/Gallevy/hermex/commit/7daa9273abfbf70798865e142653604feb7cb328))
* populate hasVersionConflict/allVersions for yarn and pnpm lockfiles ([19a4695](https://github.com/Gallevy/hermex/commit/19a4695dd3a0520a5383f2dd8ef2015acd97dacd)), closes [#15](https://github.com/Gallevy/hermex/issues/15)
* remove hardcoded DEFAULT_EXCLUDES from evaluator, require caller to pass config.excludes ([7714584](https://github.com/Gallevy/hermex/commit/7714584f6adc2361ef21301b41c49c07ad311d08))
* route parse-error diagnostics to stderr under output.format json ([#23](https://github.com/Gallevy/hermex/issues/23)) ([19f988d](https://github.com/Gallevy/hermex/commit/19f988dd008e5d3e3df7e99e632426dcca9e4ff8))
* skip .d.ts/.d.mts/.d.cts files instead of parsing them ([#22](https://github.com/Gallevy/hermex/issues/22)) ([ab68b88](https://github.com/Gallevy/hermex/commit/ab68b886779c3257feeba35884a4e51f02db99a4))
* unwrap SWC argument/element expression wrappers in pattern analyzers ([d3e2656](https://github.com/Gallevy/hermex/commit/d3e265665a1fcce6e327b9178f156e4340484398))
* wire ignoreErrors from config into parseFile, remove noisy console.error ([7f13499](https://github.com/Gallevy/hermex/commit/7f134995a60f56049bfac294f8ddc5d797c43eae))


### Features

* --config flag, output.format json, fix js-yaml default import, replace defineConfig with import type pattern ([36699c4](https://github.com/Gallevy/hermex/commit/36699c40ee09081afc24925a9c31c87407385a35))
* add defineConfig export documented in examples but never implemented ([#19](https://github.com/Gallevy/hermex/issues/19)) ([1e5d110](https://github.com/Gallevy/hermex/commit/1e5d1108403d251891d0e2c202f1dc8d110f9064))
* additional compliance rule types ([56e2eba](https://github.com/Gallevy/hermex/commit/56e2eba61a20d83ce011f6d412776401a81ba524))
* compliance rules + banned packages ([61cc277](https://github.com/Gallevy/hermex/commit/61cc2773e6f11f0a8047759563de8991b0461dd8))
* config file system + internal package marking ([0569d7f](https://github.com/Gallevy/hermex/commit/0569d7fc0f46e0713eac4378d3321dd18cd78052))
* improve human-readable output — CLI format flag, color safety, severity icons ([7828e05](https://github.com/Gallevy/hermex/commit/7828e051a6deaa4747c1845ed79d0ef46a954946))
* multiple version detection in lockfile ([ea07de5](https://github.com/Gallevy/hermex/commit/ea07de5d15910d6fa6340ac6bcd667ed7e55d5e2))
* populate ComponentUsage.files with the files using each component ([5c6c333](https://github.com/Gallevy/hermex/commit/5c6c333860f1b6a6b21ff54c365cec75b5ea6c4c))
* release age + deprecated package detection ([ed7c3b5](https://github.com/Gallevy/hermex/commit/ed7c3b53e5e8941d0f7cc5b6d09b2e30587dda9b))
* **releaseAge:** cache npm registry responses ([05d6dd2](https://github.com/Gallevy/hermex/commit/05d6dd2b29a5dcfa29378033f7e8e2d26bc28e22))
* **rules:** codeowners coverage rule — unowned scanned files fail comply ([d605ed9](https://github.com/Gallevy/hermex/commit/d605ed9c228027ff9c073afd0d09e0ad7f8b1e70))
* **rules:** forbid_package_fields, dot-path fields, and value assertions ([7a35675](https://github.com/Gallevy/hermex/commit/7a356752b1d553fec57c4e7355759dc9c3d9bd7a))
* ship library entry point with typed config and scan result ([d5296f2](https://github.com/Gallevy/hermex/commit/d5296f23f51316cb5ac3a164207f2ee1014102b9))
* support HERMEX_REGISTRY_AUTH_TOKEN environment variable ([f8cb0c0](https://github.com/Gallevy/hermex/commit/f8cb0c06a0705be3431237623149f8024171562a))
* upgrade to TypeScript 7 RC + replace tsup with esbuild ([dea350f](https://github.com/Gallevy/hermex/commit/dea350f95bad4bcb5f675ab25a45132e07ac29e7))
* versus package comparison + split tracking ([03a1b61](https://github.com/Gallevy/hermex/commit/03a1b613226a3a1a0174aa9cf956371cba2d955a))


### Reverts

* restore CHANGELOG.md to pre-merge state ([2eedcec](https://github.com/Gallevy/hermex/commit/2eedcec04025d0a993bca2783f969f3675cd8ff2))


### BREAKING CHANGES

* forbid_files and allow_files rule types have been
removed. Use detect_files (with severity: 'warn'/'error') in place of
forbid_files, and require_files in place of allow_files.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

# [2.0.0-beta.10](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.9...v2.0.0-beta.10) (2026-07-21)


### Features

* improve human-readable output — CLI format flag, color safety, severity icons ([7828e05](https://github.com/Gallevy/hermex/commit/7828e051a6deaa4747c1845ed79d0ef46a954946))

# [2.0.0-beta.9](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.8...v2.0.0-beta.9) (2026-07-11)


### Features

* add defineConfig export documented in examples but never implemented ([#19](https://github.com/Gallevy/hermex/issues/19)) ([1e5d110](https://github.com/Gallevy/hermex/commit/1e5d1108403d251891d0e2c202f1dc8d110f9064))

# [2.0.0-beta.8](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.7...v2.0.0-beta.8) (2026-07-10)


### Bug Fixes

* compute minCompliantVersion for every semver bump tier ([#21](https://github.com/Gallevy/hermex/issues/21)) ([7fbbeaa](https://github.com/Gallevy/hermex/commit/7fbbeaa01940e1cbe53c266f9c5f1999800caea7))
* route parse-error diagnostics to stderr under output.format json ([#23](https://github.com/Gallevy/hermex/issues/23)) ([19f988d](https://github.com/Gallevy/hermex/commit/19f988dd008e5d3e3df7e99e632426dcca9e4ff8))
* skip .d.ts/.d.mts/.d.cts files instead of parsing them ([#22](https://github.com/Gallevy/hermex/issues/22)) ([ab68b88](https://github.com/Gallevy/hermex/commit/ab68b886779c3257feeba35884a4e51f02db99a4))

# [2.0.0-beta.7](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.6...v2.0.0-beta.7) (2026-07-10)


### Bug Fixes

* unwrap SWC argument/element expression wrappers in pattern analyzers ([d3e2656](https://github.com/Gallevy/hermex/commit/d3e265665a1fcce6e327b9178f156e4340484398))


### Features

* **rules:** codeowners coverage rule — unowned scanned files fail comply ([d605ed9](https://github.com/Gallevy/hermex/commit/d605ed9c228027ff9c073afd0d09e0ad7f8b1e70))
* **rules:** forbid_package_fields, dot-path fields, and value assertions ([7a35675](https://github.com/Gallevy/hermex/commit/7a356752b1d553fec57c4e7355759dc9c3d9bd7a))

# [2.0.0-beta.6](https://github.com/Gallevy/hermex/compare/v2.0.0-beta.5...v2.0.0-beta.6) (2026-07-10)


### Features

* populate ComponentUsage.files with the files using each component ([5c6c333](https://github.com/Gallevy/hermex/commit/5c6c333860f1b6a6b21ff54c365cec75b5ea6c4c))

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
