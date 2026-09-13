---
"hermex": major
---

Removed the unused `packages.internal` config option and its `[int]` marker in package output.

Config authors using `packages.internal` in `hermex.config.ts` must remove it — the key is no longer part of the schema. The `internal` field is also gone from the `PackageDistribution` and `PackageInventoryEntry` exported types.
