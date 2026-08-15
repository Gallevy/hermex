---
"hermex": major
---

`--format json` now honours the `output.*` section toggles instead of always dumping the full report (#63, #91). `output.packages: false` omits `packages`, `output.components: false` omits `components`, `output.versus: false` omits `versus`, and `output.patterns: false` omits `summary.patternCounts` — the keys are dropped entirely rather than emitted empty, so disabling a section actually shrinks the file (`components[]` and `packages[]` are the bulk of a stored scan).

`version`, the `summary` counters, `ruleViolations` and `compliance` are never gated: they are the machine-readable verdict, and `comply` prints rules in human mode regardless of `output.rules`, so honouring it here would make the JSON lossier than the terminal output it mirrors. `output.details` and `output.summary` have no JSON counterpart.

Default output is unchanged — every section is enabled by default. Consumers of the exported `HermexScanResult` type will see `packages`, `components`, `versus` and `summary.patternCounts` marked optional, matching the fields a config can now remove.
