---
"hermex": minor
---

Release-age enrichment now covers every package in the packages table when `releaseAge.enforceOn` is set, not only ones hermex measured rendering as JSX components. A dependency imported purely as functions or hooks reads `usageCount: 0` and used to show a blank Target cell beside its component-shaped siblings' advisory `[not enforced]` rows. Only `enforceOn` matches stay mandatory, so the `hermex comply` verdict is unchanged; the cost is one registry lookup per declared dependency. With `enforceOn` omitted — where every fetched package is severity `error` — the target set is unchanged, so no repo that passes today starts failing.
