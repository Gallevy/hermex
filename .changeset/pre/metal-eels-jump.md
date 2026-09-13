---
"hermex": minor
---

Fix `summary.patternCounts` so it partitions cleanly against the totals it should explain: renamed `imports.aliased` to `imports.named.aliased` (still counted alongside `imports.named`, not subtracted from it — `totalUsagePatterns` counts aliased imports separately too) and added a `usage.props` bucket so props analysis is no longer missing from the pattern breakdown. `imports.aliased` consumers must switch to `imports.named.aliased`.
