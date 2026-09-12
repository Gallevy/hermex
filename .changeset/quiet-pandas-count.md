---
"hermex": minor
---

Score `versus` on files that import a package, not on JSX renders.

`versus` is sold as migration tracking, but it scored each package with `usageCount` — which measures JSX component rendering. Every migration people actually track this way is function-only (`moment` → `date-fns`, `lodash` → `es-toolkit`, `redux` → `zustand`), and on that axis both sides read 0, so a migration 80% finished rendered identically to one never started and the section fell through to "No usage detected for any package in this group". Component-library pairs worked, which is exactly what the fixtures covered.

Each entry's `count` is now how many scanned files import the package. Files rather than bound symbols, so consolidating `import { format, parse, addDays }` down to one helper does not read as migration progress, and one unit for every group, so the two sides of a comparison are always commensurable.

The same count is on every `packages[]` row as `importingFileCount`, beside `usageCount`. The two are independent axes and both are kept: the first is imports, the second is JSX renders, and for a package used only as a function the second is always 0. Nothing that existed changed meaning.

A `versus` group can also name a package the repo does not have — misspelled, under `packages.ignore`, or never installed. That now reports `not found in this repo` (`present: false` in JSON) instead of a confident 0%, because "nobody has migrated yet" and "hermex cannot see this package" call for opposite reactions from a reader.

This is not the full imported axis of #163 — no per-file import sites, no `tsconfig` path resolution, no record of unresolved specifiers — and it deliberately leaves `usageCount` alone rather than reinterpreting it, so that design stays open.

Closes #174.
