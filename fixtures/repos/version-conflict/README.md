# `repos/version-conflict/`

One package resolved at **two versions in the same lockfile**: react 18.3.1
at the root, react 17.0.2 pulled in under `legacy-widget`.

## What it proves

The only fixture where `releaseAge.scope` changes the verdict
([#57](https://github.com/Gallevy/hermex/issues/57)). Two cases run the same
repo under the two scopes, so the diff between their baselines *is* the
definition of the setting:

| Config | Scope | The nested react 17.0.2 is |
| --- | --- | --- |
| `hermex.config.ts` | `root` (the default) | surfaced as an **advisory** breach — reported, but does not decide the verdict |
| `tree.config.ts` | `tree` | a **mandatory** failure, and the reported installed version follows the worst copy |

`root` still surfaces the nested copy rather than hiding it: an overdue
transitive dependency must never be invisible just because it cannot be
fixed from this manifest.

`tree.config.ts` spreads `hermex.config.ts` and changes only `scope`, so
nothing else can account for a difference between the two outputs.

## Determinism

`enforceOn` is `['react']` alone, so react is the only mandatory package
and the verdict belongs to it. `legacy-widget` is looked up as well — since
[#171](https://github.com/Gallevy/hermex/issues/171) every owned package is
a release-age target once `enforceOn` is set, whether or not it was ever
imported — and reports at severity `warn`. It therefore renders identically
under both scopes and cannot account for any difference between the two
baselines.

That also means `legacy-widget` needs a recorded timeline: without one the
lookup misses and the case reports "1 packages skipped — registry
unreachable or not found" instead of the advisory row. Release ages come
from `fixtures/registry/timelines.ts` over the offline registry, never the
network.

## Cases that use it

| Case | Command | Expects |
| --- | --- | --- |
| `release-age-root-scope` | `hermex comply` | exit 1, nested copy advisory |
| `release-age-tree-scope` | `hermex comply --config tree.config.ts` | exit 1, nested copy mandatory |

## Layout

```
hermex.config.ts   releaseAge.scope: 'root'
tree.config.ts     the same, with scope: 'tree'
package.json       react ^18.3.0 + legacy-widget ^1.0.0
pnpm-lock.yaml     react 18.3.1 at the root, react 17.0.2 under legacy-widget
src/app.tsx        imports react so it has measured usage
```
