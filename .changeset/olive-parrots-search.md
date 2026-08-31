---
"hermex": minor
---

New `parser` config option selects the AST front-end. It defaults to `'swc'` — unchanged behaviour for every existing config — and adds an opt-in `'oxc-experimental'` that parses with [oxc-parser](https://oxc.rs/) instead of `@swc/core`.

Only the parse step is swapped. oxc's ESTree AST is normalized into the node vocabulary the analyzers already read, so the same visitor, the same pattern analyzers and the same report generator run under either front-end — there is no second copy of the analysis to keep in sync. `tests/oxc-parser/parity.test.ts` asserts the two produce identical `UsageReport`s over every source file in `fixtures/` plus ~70 per-analyzer snippets, and the e2e suite diffs a full `scan --format json` run between them. `tests/oxc-parser/analysis.test.ts` asserts the oxc path positively, so parity cannot pass by both front-ends finding nothing.

Measured on the fixture corpus: the parser plus its native binding drops from ~27 MB installed to ~3 MB, and the parse step itself runs ~5.5x faster (10.0 → 1.8 ms/pass). End-to-end it is currently *slower* (11.7 → 17.6 ms/pass) because the AST normalization pass costs more than the faster parse saves — realizing the speed win needs the analyzers to read oxc's AST directly rather than a normalized copy. Install size is the reason to reach for it today; the option is experimental and opt-in for exactly that reason. A run using it prints a notice naming the parser.

The normalization is deliberately faithful to SWC rather than to ESTree, including where SWC sees less: a class method's body is not analyzed under `swc` (SWC stores the function in an untyped `function` field that the visitor skips), and `oxc-experimental` reproduces that instead of quietly analyzing more than the default parser does. Widening it is a change to the analysis, and belongs in its own change.
