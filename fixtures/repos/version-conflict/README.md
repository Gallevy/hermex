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

`enforceOn` is `['react']` alone. That keeps `legacy-widget` — which no
recorded timeline covers — out of the registry lookup entirely, so the case
reports a scope difference rather than a registry miss. Release ages come
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
