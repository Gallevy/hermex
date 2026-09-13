---
'hermex': major
---

refactor(no-outdated-packages)!: separate registry facts, rule verdict and display

`no-outdated-packages` was the only rule whose verdict was computed in the
registry layer and stored on the display object. Every other rule goes
facts → rule → violations → display; this one had the enricher stamp
`severity`, `scope` and `worstLevel` onto `PackageDistribution.releaseAge`,
and the Packages table read the verdict straight back off the package
instead of joining to violations the way the Flags column already does.

That mixing is why the field names were hard to fix: `ReleaseAgeEntry` was
three things at once, so no name could be honest about what it held.

**What moved**

- `PackageDistribution.releaseAge` is **facts only** now. `severity` and
  `worstLevel` are gone from it.
- The verdict lives on the violation as `overdueTier: 'minor' | 'major'`.
  It is derived from `upgrades` (which holds breached tiers only) rather
  than stored twice.
- `AvailableUpgrade.level` is **deleted** — it was a total function of
  `semverBump` on the same object.
- `installedVersion` → `measuredVersion`, on both the entry and the
  violation. The old name read as "the version you installed" while under
  `scope: 'tree'` it silently meant the worst offending nested copy.
- The four `minCompliant*` fields plus their negating boolean collapse into
  one `recommendedTarget: { version, releasedDaysAgo, semverBump?, inWindow }`.
  The old shape let `minCompliantVersion` hold a version that was *not*
  compliant, rescued only by `minCompliantInWindow: false` beside it.
- `advisoryBreaches[].level` → `advisoryBreaches[].tier`.

**Display**

Package rules now declare their columns through a registry
(`src/utils/package-columns.ts`), the counterpart to the existing badge
registry in `package-flags.ts`. `no-outdated-packages` contributes the
Installed / Minimum target pair through it, so `printPackagesTable` no
longer special-cases that rule by name. The Minimum target cell takes its
icon by joining the violation, which means a cell and its rules-table
counterpart cannot disagree.

Rendered output is unchanged.

**`--json` consumers.** `packages[].releaseAge` changes shape as above, and
`ruleViolations[]` entries for this rule carry `overdueTier` and
`measuredVersion` instead of `worstLevel` and `installedVersion`.
