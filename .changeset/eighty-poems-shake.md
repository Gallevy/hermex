---
"hermex": major
---

`releaseAge.enforceOn` is now a plain glob list of the packages that are mandatory, with no special case for the empty one, and release-age enrichment covers every installed package the repo owns rather than only the ones it renders as JSX components.

**Reporting.** Enrichment previously required `usageCount > 0` or an `enforceOn` match. `usageCount` counts JSX component rendering, which has nothing to do with whether an installed version is stale, so every dependency consumed as functions or hooks was silently exempt from the check: it appeared in `packages[]` with a version and a blank Target cell, beside component-shaped siblings carrying full advisory rows (#171). Every installed package now gets a Target. The cost is one registry request per installed dependency rather than per rendered one.

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
