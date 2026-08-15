---
"hermex": major
---

`--format json` now honours the `output.*` section toggles instead of always dumping the full report (#63, #91). `output.packages: false` omits `packages`, `output.components: false` omits `components`, and `output.versus: false` omits `versus` — the keys are dropped entirely rather than emitted empty, so disabling a section actually shrinks the file (`components[]` and `packages[]` are the bulk of a stored scan). `summary.patternCounts` drops when `output.patterns` and `output.details` are both false, since both of those human sections render that same array.

`version`, the `summary` counters, `ruleViolations` and `compliance` are never gated: they are the machine-readable verdict, and `comply` prints rules in human mode regardless of `output.rules`, so honouring it here would make the JSON lossier than the terminal output it mirrors. `output.summary` has no clean JSON counterpart — the human Summary table shows derived metrics that share only `filesAnalyzed` with the serialized counters.

Default output is unchanged — every section is enabled by default. Consumers of the exported `HermexScanResult` type will see `packages`, `components`, `versus` and `summary.patternCounts` marked optional, matching the fields a config can now remove.
