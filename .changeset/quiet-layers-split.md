---
'hermex': major
---

refactor(no-outdated-packages)!: make `packages[]` policy-free

`no-outdated-packages` was the only rule whose verdict was computed in the
registry layer and stored on the display object. Every other rule goes
facts → rule → violations → display; this one had the enricher stamp
`severity`, `scope` and `worstLevel` onto `PackageDistribution.releaseAge`,
and the Packages table read the verdict straight back off the package
instead of joining to violations the way the Flags column already does.

The practical consequence was that `packages[]` was a function of your
config: two repos with identical lockfiles but different thresholds got
different payloads, and the whole block vanished or changed shape depending
on which rules were switched on.

**`packages[].releaseAge` → `packages[].releases`, facts only.**

```jsonc
"releases": {
  "resolved": [
    {
      "version": "18.3.1",
      "isRoot": true,
      "newer": [
        { "version": "19.0.0", "releasedDaysAgo": 400, "semverBump": "major" },
        { "version": "19.1.0", "releasedDaysAgo": 10, "semverBump": "major", "isLatest": true }
      ]
    },
    { "version": "17.0.2", "isRoot": false, "newer": [ … ] }
  ],
  "latestVersion": "19.1.0",
  "latestReleasedDaysAgo": 10
}
```

Every resolved copy is listed, root and nested alike, with no judgment about
which ones count — that is the `scope` decision and it belongs to the rule.
This object is byte-identical whatever your thresholds, severity or scope
say, because none of them are inputs to producing it.

**The verdict moved to the violation**, which is the only place policy is
applied:

```jsonc
{
  "ruleId": "no-outdated-packages",
  "severity": "error",
  "packageName": "moment",
  "measuredVersion": "2.29.4",
  "overdueTier": "minor",
  "daysOverdue": 946,
  "scope": "root"
}
```

**Field-level changes:**

- `worstLevel` → `overdueTier` (`'minor' | 'major'`), on the violation
- `installedVersion` → `measuredVersion` — the old name read as "the version
  you installed" while under `scope: 'tree'` it meant the worst offending
  nested copy
- `breachReleasedDaysAgo` + `thresholdDays` → `daysOverdue`, the one number
  the two were only ever subtracted to produce
- `AvailableUpgrade.level` deleted — it was a total function of `semverBump`
- `minCompliantVersion` + `…ReleasedDaysAgo` + `…InWindow` + `…Bump` gone.
  The old shape let `minCompliantVersion` hold a version that was *not*
  compliant, rescued only by `minCompliantInWindow: false` beside it. The
  recommendation is now computed on demand and never stored.
- `advisoryBreaches` and `evaluatedVersions` gone from the payload; both are
  derived from `releases.resolved` plus the governing entry.

**`enrichFromRegistry` takes no policy at all** — no thresholds, no scope, no
severity. `assessPackage` (`src/rules/no-outdated-packages.ts`) is the single
place policy is applied, and both consumers call it: the rule to emit
violations, and the Packages table to render rows no violation covers (an
`'off'` entry still shows a recommendation).

**Display**: package rules declare their columns through a registry
(`src/utils/package-columns.ts`), the counterpart to the badge registry in
`package-flags.ts`. `printPackagesTable` no longer special-cases this rule by
name.

Rendered output is unchanged.
