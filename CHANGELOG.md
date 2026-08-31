# hermex

## 3.0.0

### Major Changes

- [#173](https://github.com/Gallevy/hermex/pull/173) [`2837621`](https://github.com/Gallevy/hermex/commit/2837621fa7bd234effcd83048ac2795fc188e32a) Thanks [@Gallevy](https://github.com/Gallevy)! - `releaseAge.enforceOn` is now a plain glob list of the packages that are mandatory, with no special case for the empty one, and release-age enrichment covers every installed package the repo owns rather than only the ones it renders as JSX components.
  
  **Reporting.** Enrichment previously required `usageCount > 0` or an `enforceOn` match. `usageCount` counts JSX component rendering, which has nothing to do with whether an installed version is stale, so every dependency consumed as functions or hooks was silently exempt from the check: it appeared in `packages[]` with a version and a blank Target cell, beside component-shaped siblings carrying full advisory rows ([#171](https://github.com/Gallevy/hermex/issues/171)). Every installed package now gets a Target. The cost is one registry request per installed dependency rather than per rendered one.
  
  **Enforcement.** `enforceOn` decides severity and nothing else:
  
  | `enforceOn` | Mandatory (`error`) | Advisory (`warn`) |
  | --- | --- | --- |
  | `[]` (the default) | nothing | every installed package |
  | `['**']` | every installed package | nothing |
  | `['@my-org/*']` | `@my-org/…` | everything else |
  
  **Breaking — repos that leave `enforceOn` empty.** An empty list previously meant "enforce everything", inverting the meaning of a list that names the mandatory packages. It now matches nothing and enforces nothing, so release age can no longer fail `comply` until you name something. A repo relying on the old default will see `comply` stop failing on overdue dependencies — a silent loosening, so check this before upgrading. To keep the old behaviour:
  
  ```ts
  releaseAge: { enforceOn: ['**'] }
  ```
  
  Use `['**']`, not `['*']`: these are micromatch globs and a single `*` stops at the `/` in a scoped name, so `['*']` would enforce `react` while leaving `@my-org/ui` advisory.
  
  `isReleaseAgeTarget` is removed from the public API; the target set is now every entry in `packages[]` with a non-null `version`.

- [#126](https://github.com/Gallevy/hermex/pull/126) [`d5f456d`](https://github.com/Gallevy/hermex/commit/d5f456da15d81f2981646f572f35c2b9456390ed) Thanks [@Gallevy](https://github.com/Gallevy)! - Renamed every rule id to kebab-case and standardized the require-x/no-x naming convention (`detect_files` → `no-files`, `require_files` → `require-files`, `require_packages` → `require-packages`, `forbid_packages` → `no-packages`, `require_scripts` → `require-scripts`, `require_package_fields` → `require-package-fields`, `forbid_package_fields` → `no-package-fields`, `engine_version` → `require-engine-version`, `codeowners` → `require-codeowners`).
  
  Config authors must update `hermex.config.ts` to use the new rule keys under `rules` and `overrides[].rules`. The JSON output's `ruleViolations` entries carry a `ruleId` field instead of `type`, using the new ids.

- [#150](https://github.com/Gallevy/hermex/pull/150) [`d9b7ce6`](https://github.com/Gallevy/hermex/commit/d9b7ce607f17d5cf4de6a675afca22bfb9f5600b) Thanks [@Gallevy](https://github.com/Gallevy)! - Removed the unused `packages.internal` config option and its `[int]` marker in package output.
  
  Config authors using `packages.internal` in `hermex.config.ts` must remove it — the key is no longer part of the schema. The `internal` field is also gone from the `PackageDistribution` and `PackageInventoryEntry` exported types.

- [#155](https://github.com/Gallevy/hermex/pull/155) [`d86818a`](https://github.com/Gallevy/hermex/commit/d86818aa84dbe8c45cadb7181ab75453e047379a) Thanks [@Gallevy](https://github.com/Gallevy)! - `hermex.config.ts` is now validated strictly: a config file with no default export throws instead of silently loading as an all-defaults config, and any config object (root or nested — `rules`, `overrides[].rules`, `output`, `releaseAge`, etc.) carrying an unrecognized key throws instead of silently dropping it.
  
  Both were previously silent failures: a misspelled rule key parsed cleanly and enforced nothing, and a config file that forgot `export default` did the same. Both now fail loudly at load time, naming the offending key or the missing export.
  
  Config authors should check `hermex.config.ts` (and any files referenced by `overrides[].rules`) for stray or misspelled keys before upgrading — anything not in the documented schema will now throw.

### Minor Changes

- [#157](https://github.com/Gallevy/hermex/pull/157) [`70fe046`](https://github.com/Gallevy/hermex/commit/70fe046fd733ae64964bd9ba3482384a6b929e79) Thanks [@Gallevy](https://github.com/Gallevy)! - Fix `summary.patternCounts` so it partitions cleanly against the totals it should explain: renamed `imports.aliased` to `imports.named.aliased` (still counted alongside `imports.named`, not subtracted from it — `totalUsagePatterns` counts aliased imports separately too) and added a `usage.props` bucket so props analysis is no longer missing from the pattern breakdown. `imports.aliased` consumers must switch to `imports.named.aliased`.

- [#176](https://github.com/Gallevy/hermex/pull/176) [`ff4f120`](https://github.com/Gallevy/hermex/commit/ff4f120c8987635886ff49b36d325be915065cf0) Thanks [@Gallevy](https://github.com/Gallevy)! - New `parser` config option selects the AST front-end. It defaults to `'swc'` — unchanged behaviour for every existing config — and adds an opt-in `'oxc-experimental'` that parses with [oxc-parser](https://oxc.rs/) instead of `@swc/core`.
  
  Only the parse step is swapped. oxc's ESTree AST is normalized into the node vocabulary the analyzers already read, so the same visitor, the same pattern analyzers and the same report generator run under either front-end — there is no second copy of the analysis to keep in sync. `tests/oxc-parser/parity.test.ts` asserts the two produce identical `UsageReport`s over every source file in `fixtures/` plus ~70 per-analyzer snippets, and the e2e suite diffs a full `scan --format json` run between them. `tests/oxc-parser/analysis.test.ts` asserts the oxc path positively, so parity cannot pass by both front-ends finding nothing.
  
  Measured on the fixture corpus (41 files, 200 rounds, ms/pass): the parser plus its native binding drops from ~27 MB installed to ~3 MB, about 9x smaller. That is the reason to reach for it today.
  
  Scans are currently *slower* end to end — 14.0 → 18.3 ms/pass — and the breakdown says why. oxc's parse is genuinely faster (11.7 → 7.7 ms, ~1.5x), but normalizing its AST into the analyzers' node shape costs 7.0 ms, more than that saves, and the analysis walk is a further 1.3 ms slower because the normalized tree carries more fields than SWC's native one (63.3k vs 51.9k) for `visitChildren` to iterate. Both costs come from normalization being an eager deep copy; removing it means teaching the analyzers to read oxc's AST directly. The option is experimental and opt-in for exactly that reason, and a run using it prints a notice naming the parser.
  
  The normalization is deliberately faithful to SWC rather than to ESTree, including where SWC sees less: a class method's body is not analyzed under `swc` (SWC stores the function in an untyped `function` field that the visitor skips), and `oxc-experimental` reproduces that instead of quietly analyzing more than the default parser does. Widening it is a change to the analysis, and belongs in its own change.

### Patch Changes

- [#154](https://github.com/Gallevy/hermex/pull/154) [`3b8ff8e`](https://github.com/Gallevy/hermex/commit/3b8ff8ecafd2ae3e9b480a878cde6b515867ea19) Thanks [@Gallevy](https://github.com/Gallevy)! - `allVersions` in lockfile resolution output is now sorted by semver instead of lexicographically, so a package resolved at `1.9.0` and `1.10.0` reports `["1.9.0", "1.10.0"]` instead of `["1.10.0", "1.9.0"]`. Non-semver version strings (git URLs, `file:` links, workspace protocol) are collated last, in stable lexicographic order.

- [#146](https://github.com/Gallevy/hermex/pull/146) [`293e14e`](https://github.com/Gallevy/hermex/commit/293e14e64aad58c7177eb1fe75d6f171834abd20) Thanks [@Gallevy](https://github.com/Gallevy)! - Sort ruleViolations by severity (error, then warn, then info) across every surface — the rules table, --summary-file, and --format json — so a failing row is never buried among passing ones

- [#134](https://github.com/Gallevy/hermex/pull/134) [`48e7711`](https://github.com/Gallevy/hermex/commit/48e77114a17ba4144435bfaaa2bfd615e7f33cdc) Thanks [@Gallevy](https://github.com/Gallevy)! - `--format json` now honours the `output.*` section toggles instead of always dumping the full report ([#63](https://github.com/Gallevy/hermex/issues/63), [#91](https://github.com/Gallevy/hermex/issues/91)). `output.packages: false` omits `packages`, `output.components: false` omits `components`, and `output.versus: false` omits `versus` — the keys are dropped entirely rather than emitted empty, so disabling a section actually shrinks the file (`components[]` and `packages[]` are the bulk of a stored scan). `summary.patternCounts` drops when `output.patterns` and `output.details` are both false, since both of those human sections render that same array.
  
  `version`, the `summary` counters, `ruleViolations` and `compliance` are never gated: they are the machine-readable verdict, and `comply` prints rules in human mode regardless of `output.rules`, so honouring it here would make the JSON lossier than the terminal output it mirrors. `output.summary` has no clean JSON counterpart — the human Summary table shows derived metrics that share only `filesAnalyzed` with the serialized counters.
  
  Default output is unchanged — every section is enabled by default, so this only takes effect for a config that explicitly opts a section out. `packages`, `components`, `versus` and `summary.patternCounts` on the exported `HermexScanResult` type become optional, matching the fields a config can now remove.

<!--
Everything below this line was generated by semantic-release from conventional
commit subjects. Entries above it are authored as changesets — see
CONTRIBUTING.md for how to add one.
-->

## [2.11.1](https://github.com/Gallevy/hermex/compare/v2.11.0...v2.11.1) (2026-08-13)


### Bug Fixes

* correct npm root resolution and sort scan output; add the output review ([#90](https://github.com/Gallevy/hermex/issues/90)) ([#94](https://github.com/Gallevy/hermex/issues/94)) ([497104a](https://github.com/Gallevy/hermex/commit/497104a5fc705698846b1e6038c119e6c1fb9722))

# [2.11.0](https://github.com/Gallevy/hermex/compare/v2.10.0...v2.11.0) (2026-08-13)


### Features

* move patterns[] under summary as summary.patternCounts ([#80](https://github.com/Gallevy/hermex/issues/80)) ([#89](https://github.com/Gallevy/hermex/issues/89)) ([efe1c07](https://github.com/Gallevy/hermex/commit/efe1c076dd8063df1e2c9b22f164a93145557306))

# [2.10.0](https://github.com/Gallevy/hermex/compare/v2.9.0...v2.10.0) (2026-08-13)


### Features

* report every owned package in packages[] and de-duplicate components ([#78](https://github.com/Gallevy/hermex/issues/78), [#79](https://github.com/Gallevy/hermex/issues/79)) ([#85](https://github.com/Gallevy/hermex/issues/85)) ([30e93e7](https://github.com/Gallevy/hermex/commit/30e93e7ee6e202bb795e9a5b98171749e1a8373a))

# [2.9.0](https://github.com/Gallevy/hermex/compare/v2.8.1...v2.9.0) (2026-08-12)


### Features

* report forbid_packages hits in ruleViolations ([#77](https://github.com/Gallevy/hermex/issues/77)) ([#82](https://github.com/Gallevy/hermex/issues/82)) ([5de4e3a](https://github.com/Gallevy/hermex/commit/5de4e3a95b52efd9633fb89590b0c687963966bf))

## [2.8.1](https://github.com/Gallevy/hermex/compare/v2.8.0...v2.8.1) (2026-08-12)


### Bug Fixes

* unify package inventory so every rule sees the same package list ([#75](https://github.com/Gallevy/hermex/issues/75)) ([#76](https://github.com/Gallevy/hermex/issues/76)) ([1f40ccb](https://github.com/Gallevy/hermex/commit/1f40ccbd4c5fe8fec4ab9b9e2d09b6808f043ec1))

# [2.8.0](https://github.com/Gallevy/hermex/compare/v2.7.0...v2.8.0) (2026-08-09)


### Features

* support severity 'off' and downgrades in overrides (ESLint-like) ([#74](https://github.com/Gallevy/hermex/issues/74)) ([60e7953](https://github.com/Gallevy/hermex/commit/60e7953e086c0f035396e8c9cbd90ecc43b6a0f7))

# [2.7.0](https://github.com/Gallevy/hermex/compare/v2.6.8...v2.7.0) (2026-08-09)


### Features

* repo-scoped rule overrides ([#73](https://github.com/Gallevy/hermex/issues/73)) ([d4c64c0](https://github.com/Gallevy/hermex/commit/d4c64c075136ac173e1efc6e9c986cad85a1eefc))

## [2.6.8](https://github.com/Gallevy/hermex/compare/v2.6.7...v2.6.8) (2026-08-05)


### Bug Fixes

* canonicalize aliased named imports to their export name ([#70](https://github.com/Gallevy/hermex/issues/70)) ([244dbc0](https://github.com/Gallevy/hermex/commit/244dbc077316a22756172c4d021ebd5bc847915e))

## [2.6.7](https://github.com/Gallevy/hermex/compare/v2.6.6...v2.6.7) (2026-08-05)


### Bug Fixes

* component usage aggregation is first-writer-wins by name, mis-attributing shared names ([#68](https://github.com/Gallevy/hermex/issues/68)) ([13c4afb](https://github.com/Gallevy/hermex/commit/13c4afb065d0a3c18b75f9d9b523cb33e679dd1d))

## [2.6.6](https://github.com/Gallevy/hermex/compare/v2.6.5...v2.6.6) (2026-08-05)


### Bug Fixes

* JSX in attribute values is never visited ([#64](https://github.com/Gallevy/hermex/issues/64)) ([#65](https://github.com/Gallevy/hermex/issues/65)) ([0b12235](https://github.com/Gallevy/hermex/commit/0b122359661bcbb50ab212ba9a78ecb95c3a410a))

## [2.6.5](https://github.com/Gallevy/hermex/compare/v2.6.4...v2.6.5) (2026-07-29)


### Bug Fixes

* scope: root no longer enforces transitive-only packages matched by enforceOn ([#62](https://github.com/Gallevy/hermex/issues/62)) ([d4fd458](https://github.com/Gallevy/hermex/commit/d4fd4583339db0610a0d217bfc04c26b17148d02))

## [2.6.4](https://github.com/Gallevy/hermex/compare/v2.6.3...v2.6.4) (2026-07-29)


### Bug Fixes

* suppress empty Rules/Packages sections instead of printing boilerplate ([#61](https://github.com/Gallevy/hermex/issues/61)) ([e370f23](https://github.com/Gallevy/hermex/commit/e370f23cd6ec0130d4c5c6befab5db6a3c705e6c))

## [2.6.3](https://github.com/Gallevy/hermex/compare/v2.6.2...v2.6.3) (2026-07-29)


### Bug Fixes

* keep package Notes stdout-only, always info severity ([#60](https://github.com/Gallevy/hermex/issues/60)) ([d17f7b1](https://github.com/Gallevy/hermex/commit/d17f7b12c6dbe413da4d48e3cdda31233d271f84))

## [2.6.2](https://github.com/Gallevy/hermex/compare/v2.6.1...v2.6.2) (2026-07-28)


### Bug Fixes

* notes-line icon/arrow formatting, render Rules as a table ([#59](https://github.com/Gallevy/hermex/issues/59)) ([72cdf7a](https://github.com/Gallevy/hermex/commit/72cdf7a065319c5068418ee7772b0e8c9d87fe81))

## [2.6.1](https://github.com/Gallevy/hermex/compare/v2.6.0...v2.6.1) (2026-07-28)


### Bug Fixes

* releaseAge root vs tree scope, yarn first-wins, table/summary drift ([#58](https://github.com/Gallevy/hermex/issues/58)) ([274c451](https://github.com/Gallevy/hermex/commit/274c4510de0f03e6541ca093f91b25ffebb3f7fd))

# [2.6.0](https://github.com/Gallevy/hermex/compare/v2.5.2...v2.6.0) (2026-07-26)


### Features

* expose official compliance status in scan/comply JSON ([#55](https://github.com/Gallevy/hermex/issues/55)) ([#56](https://github.com/Gallevy/hermex/issues/56)) ([883fc23](https://github.com/Gallevy/hermex/commit/883fc23f6d0a114e8959b9e829040d14ff8515a2))

## [2.5.2](https://github.com/Gallevy/hermex/compare/v2.5.1...v2.5.2) (2026-07-25)


### Bug Fixes

* recommend a compliant cross-tier release in the upgrades cell ([#54](https://github.com/Gallevy/hermex/issues/54)) ([201e114](https://github.com/Gallevy/hermex/commit/201e11488ef3b198cdd181eb10d3db9ad7024277))

## [2.5.1](https://github.com/Gallevy/hermex/compare/v2.5.0...v2.5.1) (2026-07-24)


### Performance Improvements

* precompile CODEOWNERS matchers in findOwningEntry (plan 038, rebuilt after conflict) ([#49](https://github.com/Gallevy/hermex/issues/49)) ([6a82a86](https://github.com/Gallevy/hermex/commit/6a82a863d5fbccd4e46d64b727087366a7f86e03))

# [2.5.0](https://github.com/Gallevy/hermex/compare/v2.4.2...v2.5.0) (2026-07-24)


### Features

* add requiredOwners option to the codeowners rule (plan 039) ([#48](https://github.com/Gallevy/hermex/issues/48)) ([6a8b398](https://github.com/Gallevy/hermex/commit/6a8b398c7ffeedea75697d94e8ea175ed16fcf31))

## [2.4.2](https://github.com/Gallevy/hermex/compare/v2.4.1...v2.4.2) (2026-07-24)


### Bug Fixes

* patch brace-expansion DoS (CVE-2026-13149) — no override needed, and dropped the picomatch override too ([#41](https://github.com/Gallevy/hermex/issues/41)) ([9bcf67e](https://github.com/Gallevy/hermex/commit/9bcf67e6cb25c69fe695dfd05244125543614753))

## [2.4.1](https://github.com/Gallevy/hermex/compare/v2.4.0...v2.4.1) (2026-07-24)


### Bug Fixes

* relax engines.node so consumers aren't forced onto Node 26 ([#39](https://github.com/Gallevy/hermex/issues/39)) ([09f46ac](https://github.com/Gallevy/hermex/commit/09f46acccafaac12b61391c95c9bc76c3fb48431))

# [2.4.0](https://github.com/Gallevy/hermex/compare/v2.3.0...v2.4.0) (2026-07-24)


### Features

* emit a title in comply --summary-file output ([#38](https://github.com/Gallevy/hermex/issues/38)) ([6fffb22](https://github.com/Gallevy/hermex/commit/6fffb22dcf69bf626f2e61943883146ce53ab8d9))

# [2.3.0](https://github.com/Gallevy/hermex/compare/v2.2.0...v2.3.0) (2026-07-24)


### Features

* render comply summary Packages section as a markdown table ([#37](https://github.com/Gallevy/hermex/issues/37)) ([b8429a7](https://github.com/Gallevy/hermex/commit/b8429a7f81feab112b7bd5bd9ea67293a27de03a))

# [2.2.0](https://github.com/Gallevy/hermex/compare/v2.1.0...v2.2.0) (2026-07-22)


### Bug Fixes

* bump upload-artifact/download-artifact to their current major versions ([5ba5e7c](https://github.com/Gallevy/hermex/commit/5ba5e7c5d48954afb071ed54679d706ad34f7b08))
* handle the coverage job's bootstrap PR gracefully ([c0c7266](https://github.com/Gallevy/hermex/commit/c0c72660c4a9a20912ab8f02f77af10154057ccf))


### Features

* report test coverage on pull requests, compared to main ([a88a5ff](https://github.com/Gallevy/hermex/commit/a88a5fff5d069e71ff2d6810039805f1f2edc57f))

# [2.1.0](https://github.com/Gallevy/hermex/compare/v2.0.3...v2.1.0) (2026-07-22)


### Bug Fixes

* clean up comply/scan progress and section formatting ([ab817e6](https://github.com/Gallevy/hermex/commit/ab817e6214e6174f0215249ed564dec291a16794))
* don't show a success glyph next to a deprecated-only package in the summary ([6677b78](https://github.com/Gallevy/hermex/commit/6677b78abed214862377c1a95d47361b34d49303))
* tighten --summary-file to error/warn severity, drop Rules/Packages duplication ([d8a1988](https://github.com/Gallevy/hermex/commit/d8a198804220f6f4bb33337b10819b2f24ed820a))


### Features

* add --summary-file for CI job summaries and PR comments ([#31](https://github.com/Gallevy/hermex/issues/31)) ([fde247c](https://github.com/Gallevy/hermex/commit/fde247cba0eff41eea6babc815a974bdaf54d114))

## [2.0.3](https://github.com/Gallevy/hermex/compare/v2.0.2...v2.0.3) (2026-07-22)


### Bug Fixes

* comply gate on minor/patch release-age breaches and preserve worstLevel on latest-fallback ([#28](https://github.com/Gallevy/hermex/issues/28), [#29](https://github.com/Gallevy/hermex/issues/29)) ([59770cc](https://github.com/Gallevy/hermex/commit/59770cc80554fd3b3053e536d5c13fa0481e4c4d))

## [2.0.2](https://github.com/Gallevy/hermex/compare/v2.0.1...v2.0.2) (2026-07-22)


### Bug Fixes

* fall back minCompliantVersion to latest when no in-window upgrade exists ([#26](https://github.com/Gallevy/hermex/issues/26)) ([ea4c217](https://github.com/Gallevy/hermex/commit/ea4c217213f049cf10f1b1b02e9f58aed145ec44))
* surface lockfile-only enforceOn deps in packageDistribution ([#27](https://github.com/Gallevy/hermex/issues/27)) ([a042651](https://github.com/Gallevy/hermex/commit/a042651dd437699814365fed3fb85d5f0475c09d))
* treat minCompliantVersion-via-latest-fallback as fully compliant, not mandatory ([21c8c72](https://github.com/Gallevy/hermex/commit/21c8c723a3add8555d91a2e815e26f04e00357ad))

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
