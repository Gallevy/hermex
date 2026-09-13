# Plan 039: One rule layer owns the violation list; `AggregatedReport` is built once

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 044719c..HEAD -- src/commands/pipeline.ts src/utils/aggregator-core.ts src/rules/ src/plugins/runner.ts`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (pure refactor — zero output change is the acceptance test)
- **Depends on**: none
- **Category**: tech-debt / architecture
- **Planned at**: commit `044719c`, 2026-09-13
- **Issue**: [#84](https://github.com/Gallevy/hermex/issues/84) (rewritten 2026-09-13)

No assumption encoded. This changes no runtime behaviour, no output, and no
published type. It relocates where rules are evaluated and removes three
reassignments.

## Why this matters

Rule evaluation happens in **four** places today, and the results are stitched
onto an already-constructed `AggregatedReport` by reassigning a field three
times. Two consequences, one of which has already landed:

**`evaluateRules()` does not evaluate the rules.** It covers six of eleven
families despite the name and despite living in `src/rules/evaluator.ts`.
Package rules run inside `aggregateReports`; registry rules and plugins run in
`runPipeline`. Three rule families have been added since #84 was filed (#168,
#183, #187) and each had to guess which of four sites it belonged in, unaided.

**The half-built-report window is now occupied.** `src/plugins/runner.ts:59`
reads `aggregated.ruleViolations` while the pipeline is still assembling it, and
compensates by splicing in the remainder by hand:

```ts
violations: [...aggregated.ruleViolations, ...violations],
```

It is correct today only because the plugin phase happens to run last. And
`PluginInventoryView.violations` is **public plugin API** — "is this the whole
list?" is a promise to third-party authors kept by one unenforced line.

Secondary: `sortViolationsBySeverity` (`src/utils/severity-format.ts:99`) is a
stable sort keyed on insertion index, so within-severity order is inherited from
call-site sequencing rather than chosen; and `CLAUDE.md` asks for immutable data
structures while the pipeline reassigns a returned object three times.

## Current state

**`src/utils/aggregator-core.ts:28-42`** — the report type, rule verdicts mixed
in with run facts:

```ts
export interface AggregatedReport {
  filesAnalyzed: number;
  // ... facts ...
  packageInventory: PackageInventoryEntry[];
  packageDistribution: PackageDistribution[];
  versusResults: VersusResult[];
  /** Every rule hit, `no-packages` included (#77) — one list, no second field to remember to read. */
  ruleViolations: RuleViolation[];
  reports: UsageReport[];
}
```

**`src/utils/aggregator-core.ts:169-188`** — site 1, package rules inside
aggregation:

```ts
  const forbiddenPackageViolations = detectForbiddenPackages(packageInventory, config);
  const requiredPackageViolations = detectRequiredPackages(packageInventory, config);

  return {
    // ...
    // Detection order: package rules here, then the file/script/manifest
    // evaluators appended by the pipeline.
    ruleViolations: [
      ...forbiddenPackageViolations,
      ...requiredPackageViolations,
    ],
    reports,
  };
```

**`src/commands/pipeline.ts:127-199`** — sites 2, 3 and 4, each reassigning:

```ts
  const evaluatorViolations = evaluateRules(process.cwd(), resolvedConfig.rules, resolvedConfig.excludes, files);
  aggregated.ruleViolations = [...aggregated.ruleViolations, ...evaluatorViolations];

  if (needsRegistry(resolvedConfig.rules)) {
    // ... spinner ...
    const { enriched, violations, skipped } = await evaluateRegistryRules(aggregated.packageDistribution, resolvedConfig);
    aggregated.packageDistribution = enriched;
    aggregated.ruleViolations = [...aggregated.ruleViolations, ...violations];
    // ... spinner ...
  }

  if (resolvedConfig.plugins.length > 0) {
    // ... spinner ...
    const pluginViolations = await runPlugins({ plugins, aggregated, config, cwd, files, quiet });
    aggregated.ruleViolations = [...aggregated.ruleViolations, ...pluginViolations];
    // ... spinner ...
  }
```

**`src/plugins/runner.ts:43-60`** — the occupied window:

```ts
function buildInventoryView(
  aggregated: AggregatedReport,
  violations: readonly PluginViolation[],
): PluginInventoryView {
  return {
    // ...
    violations: [...aggregated.ruleViolations, ...violations],
  };
}
```

**Emission order to preserve, exactly**: `no-packages` → `require-packages` →
evaluator families (file, max-file-size, script, package-field, engine-version,
codeowners) → registry families → plugins.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test:ci` | all pass |
| Lint | `pnpm run lint:ci` | exit 0 |
| Format check | `pnpm run format:ci` | exit 0 |
| Build | `pnpm run build:ci` | exit 0 |
| Output review | `pnpm run test:output` | **0 changed** |

## Scope

**In scope**:
- `src/utils/aggregator-core.ts` — split the type, drop rule evaluation
- `src/rules/run.ts` — **new file**, the single entry point
- `src/commands/pipeline.ts` — call it, construct the report once
- `src/plugins/runner.ts` — take facts + violations as separate arguments
- `tests/utils/aggregator.test.ts` — move package-rule assertions out
- `tests/rules/run.test.ts` — **new file**
- `tests/plugins/runner.test.ts` — options-shape update

**Out of scope** (do NOT touch):
- `src/rules/evaluator.ts` internals, `src/rules/registry-rules.ts` internals,
  `src/utils/package-rules.ts` internals. This plan moves call sites; it does
  not change what any rule decides.
- Emission order. It becomes *explicit*, but stays *identical*. Reordering is a
  separate, output-visible decision.
- `PluginInventoryView` in `src/plugins/types.ts`. Its shape is public and
  unchanged — only how `buildInventoryView` is fed changes.
- Every `print-*.ts`, `compliance.ts`, `write-summary-file.ts`. They consume
  `AggregatedReport`, which keeps `ruleViolations`; they need no edit.
- `src/index.ts` and `HermexScanResult`. `aggregateReports` and
  `AggregatedReport` are not exported from the package entry point — confirm
  this before starting (`grep -n "aggregateReports\|AggregatedReport" src/index.ts`
  must return nothing).

## Git workflow

- Branch: `advisor/039-one-rule-layer`
- Conventional commits, e.g. `refactor(rules): give the rule layer one entry point`
- Do NOT push or open a PR unless the operator instructed it.
- No changeset — internal only, no user-facing change.

## Steps

### Step 1: Split the report type, drop rule evaluation from aggregation

In `src/utils/aggregator-core.ts`:

```ts
/**
 * What the run observed, before any rule has judged it. `aggregateReports`
 * returns this and nothing more: the package inventory is a *fact*, and the
 * rules that read it belong to the rule layer (`src/rules/run.ts`), not to
 * aggregation (#84).
 */
export interface AnalysisFacts {
  filesAnalyzed: number;
  totalImports: number;
  totalComponents: number;
  totalUsagePatterns: number;
  patternCounts: PatternCount[];
  componentUsage: Map<string, ComponentUsage>;
  topComponents: ComponentUsage[];
  /** Every package known to this run, on all three axes — the list every rule and view below is derived from. */
  packageInventory: PackageInventoryEntry[];
  packageDistribution: PackageDistribution[];
  versusResults: VersusResult[];
  reports: UsageReport[];
}

/**
 * Facts plus every verdict reached about them. Constructed exactly once, at
 * the end of `runPipeline`, and never reassigned after (#84).
 */
export interface AggregatedReport extends AnalysisFacts {
  /** Every rule hit, `no-packages` and plugin findings included (#77) — one list, no second field to remember to read. */
  ruleViolations: RuleViolation[];
}
```

Change `aggregateReports`'s return type to `AnalysisFacts`, delete the
`detectForbiddenPackages` / `detectRequiredPackages` calls and the
`ruleViolations` key from its returned object, and drop the now-unused imports
(`detectForbiddenPackages`, `detectRequiredPackages`; keep the `RuleViolation`
type import — `AggregatedReport` still uses it).

**Verify**: `pnpm run typecheck` now fails, loudly, in `pipeline.ts` and
`tests/utils/aggregator.test.ts`. That is expected and is the map for Steps 2–5.

### Step 2: Add the single entry point

New file `src/rules/run.ts`:

```ts
import type { ResolvedHermexConfig } from '../config/types';
import type { PackageDistribution } from '../utils/package-distribution';
import type { PackageInventoryEntry } from '../utils/package-inventory';
import {
  detectForbiddenPackages,
  detectRequiredPackages,
} from '../utils/package-rules';
import { evaluateRules } from './evaluator';
import { evaluateRegistryRules, needsRegistry } from './registry-rules';
import type { RuleViolation } from './shared';

/**
 * Progress hooks for the one phase that is slow enough to need them.
 *
 * Callbacks rather than an `Ora` parameter: the rule layer should not import a
 * spinner, and `runRules` stays callable from a test or a future programmatic
 * API with no terminal attached.
 */
export interface RuleRunEvents {
  onRegistryStart?(info: { forReleaseAge: boolean }): void;
  onRegistryFinish?(info: { forReleaseAge: boolean; skipped: number }): void;
}

export interface RunRulesOptions {
  repoPath: string;
  config: ResolvedHermexConfig;
  files: string[];
  inventory: PackageInventoryEntry[];
  packages: PackageDistribution[];
  events?: RuleRunEvents;
}

export interface RuleRunResult {
  /** Every violation hermex itself computes. Complete — plugins append to it, they are not part of it. */
  violations: RuleViolation[];
  /** Registry-enriched when a registry-backed rule ran; the input list unchanged otherwise. */
  packages: PackageDistribution[];
}

/**
 * Evaluates every rule hermex ships, against one set of facts, and returns the
 * complete list.
 *
 * This is the only place that knows the rule families exist. Adding one means
 * adding a line here — there is no second site to choose between (#84).
 *
 * The array order below IS the emission order: it reaches the JSON
 * `ruleViolations` array directly, and the human Rules table through
 * `sortViolationsBySeverity`, which is stable and so preserves it *within* each
 * severity bucket. Changing it changes output. It is chosen here, deliberately,
 * rather than falling out of which call site happened to run first.
 */
export async function runRules({
  repoPath,
  config,
  files,
  inventory,
  packages,
  events,
}: RunRulesOptions): Promise<RuleRunResult> {
  const violations: RuleViolation[] = [
    ...detectForbiddenPackages(inventory, config),
    ...detectRequiredPackages(inventory, config),
    ...evaluateRules(repoPath, config.rules, config.excludes, files),
  ];

  // A rule family being non-empty IS "that rule enabled" — no separate flag
  // (see src/config/schema.ts's releaseAge block comment). Both registry-backed
  // families share one enrichment pass, so the gate is "does anything need the
  // registry", not "is no-outdated-packages on" (#107).
  if (!needsRegistry(config.rules)) {
    return { violations, packages };
  }

  const forReleaseAge = config.rules['no-outdated-packages'].length > 0;
  events?.onRegistryStart?.({ forReleaseAge });

  const {
    enriched,
    violations: registryViolations,
    skipped,
  } = await evaluateRegistryRules(packages, config);

  events?.onRegistryFinish?.({ forReleaseAge, skipped });

  return {
    violations: [...violations, ...registryViolations],
    packages: enriched,
  };
}
```

**Do not** re-export `runRules` from `src/rules/evaluator.ts`. `evaluateRules`
keeps its current name and its current six families — it is now honestly a
*part* of the layer rather than a misnamed whole.

**Verify**: `pnpm run typecheck` reports no new errors inside `src/rules/run.ts`.

### Step 3: Feed plugins their inputs instead of a half-built report

In `src/plugins/runner.ts`, change the import of `AggregatedReport` to
`AnalysisFacts`, add a `RuleViolation` type import from `../rules/shared`, and
rewrite `buildInventoryView` plus `RunPluginsOptions`:

```ts
function buildInventoryView(
  facts: AnalysisFacts,
  hermexViolations: readonly RuleViolation[],
  pluginViolations: readonly PluginViolation[],
): PluginInventoryView {
  return {
    summary: {
      filesAnalyzed: facts.filesAnalyzed,
      totalImports: facts.totalImports,
      totalComponents: facts.totalComponents,
      totalUsagePatterns: facts.totalUsagePatterns,
    },
    packages: facts.packageDistribution,
    components: facts.topComponents,
    versus: facts.versusResults,
    // hermex's complete list plus whatever earlier plugins contributed — the
    // view is rebuilt per plugin so a reporter running last sees everything.
    // Both halves arrive as arguments: nothing here reaches into a report that
    // is still being assembled (#84).
    violations: [...hermexViolations, ...pluginViolations],
  };
}

export interface RunPluginsOptions {
  plugins: readonly HermexPlugin[];
  facts: AnalysisFacts;
  /** Every violation hermex computed, complete before the first plugin runs. */
  violations: readonly RuleViolation[];
  config: ResolvedHermexConfig;
  cwd: string;
  files: readonly string[];
  /** Suppressed under `--format json`, where stdout is the payload. */
  quiet?: boolean;
}
```

Update the destructure in `runPlugins` (`aggregated` → `facts, violations`) and
the call site inside the loop:

```ts
      inventory: buildInventoryView(facts, violations, collected),
```

`facts.packageDistribution` must be the **registry-enriched** list — Step 4
guarantees that. `PluginInventoryView` itself is unchanged.

**Verify**: `pnpm run typecheck` — remaining errors should be confined to
`src/commands/pipeline.ts` and the two test files.

### Step 4: Construct the report once, in the pipeline

Replace `src/commands/pipeline.ts:118-199` with a single assembly. Imports:
drop `evaluateRules`, `evaluateRegistryRules`, `needsRegistry`; add
`runRules` from `../rules/run` and the `AnalysisFacts` type.

```ts
  const analysis = aggregateReports(
    reports,
    lockfileResult.versions,
    resolvedConfig,
    lockfileResult.multiVersions,
    lockfileResult.resolutions,
    declaredPackages,
  );

  // Every rule hermex ships, evaluated in one place against one set of facts.
  // The spinner lines stay here; the rule layer reports progress through
  // callbacks rather than importing ora (#84).
  const { violations, packages } = await runRules({
    repoPath: process.cwd(),
    config: resolvedConfig,
    files,
    inventory: analysis.packageInventory,
    packages: analysis.packageDistribution,
    events: {
      onRegistryStart: ({ forReleaseAge }) => {
        if (spinner.isEnabled)
          spinner.start(
            forReleaseAge
              ? 'Fetching release age from registry...'
              : 'Checking the registry for deprecated packages...',
          );
      },
      onRegistryFinish: ({ forReleaseAge, skipped }) => {
        spinner.succeed(
          chalk.blue(
            `${forReleaseAge ? 'Release age fetched' : 'Registry checked'}${skipped > 0 ? chalk.gray(` (${skipped} packages skipped — registry unreachable or not found)`) : ''}`,
          ),
        );
      },
    },
  });

  // Registry enrichment replaces the package list; everything else is as
  // aggregation left it.
  const facts: AnalysisFacts = { ...analysis, packageDistribution: packages };

  const pluginViolations = await runPluginPhase(
    resolvedConfig,
    facts,
    violations,
    files,
    spinner,
    isJson,
  );

  return {
    aggregated: {
      ...facts,
      ruleViolations: [...violations, ...pluginViolations],
    },
    resolvedConfig,
  };
```

The spinner strings above are **byte-identical** to the current ones. Copy them;
do not retype them.

Then add the plugin phase as a module-level function in the same file, keeping
its existing comments verbatim:

```ts
/**
 * Plugins run last, once everything hermex computes itself is finished, so a
 * plugin sees the complete picture — and still before rendering, so what it
 * contributes reaches the rules table and the verdict (#102).
 *
 * Inert when no plugins are configured, which is the default: an unconfigured
 * run prints exactly what it printed before.
 */
async function runPluginPhase(
  resolvedConfig: ResolvedHermexConfig,
  facts: AnalysisFacts,
  violations: RuleViolation[],
  files: string[],
  spinner: Ora,
  isJson: boolean,
): Promise<RuleViolation[]> {
  if (resolvedConfig.plugins.length === 0) return [];

  if (spinner.isEnabled) spinner.start('Running plugins...');

  const pluginViolations = await runPlugins({
    plugins: resolvedConfig.plugins,
    facts,
    violations,
    config: resolvedConfig,
    cwd: process.cwd(),
    files,
    quiet: isJson,
  });

  // Attribution: third-party code just executed in the user's repo, so name
  // it. hermex does not sandbox plugins — the config that imports them already
  // runs as arbitrary code — which makes visibility the obligation instead
  // (#102).
  spinner.succeed(
    chalk.blue(
      `Ran ${resolvedConfig.plugins.length} plugin(s): ${resolvedConfig.plugins.map((p) => p.name).join(', ')}` +
        (pluginViolations.length > 0
          ? chalk.gray(` — ${pluginViolations.length} finding(s)`)
          : ''),
    ),
  );

  return pluginViolations;
}
```

**Verify**: `pnpm run typecheck` — `src/` is clean. Then
`grep -n "aggregated\.\w* =" src/commands/pipeline.ts` must return **nothing**.

### Step 5: Move the tests that moved

1. **`tests/utils/aggregator.test.ts`** — delete the
   `expect(result.ruleViolations)` assertion in the baseline case (~line 72) and
   move the three package-rule cases (~lines 290–370, covering `no-packages`,
   the `no-packages` + `require-packages` ordering case, and `packages.ignore`)
   into a new `tests/rules/run.test.ts`, rewritten to call `runRules` instead of
   `aggregateReports`. Keep their comments, including the `#77` one.

2. **`tests/rules/run.test.ts`** — add, beyond the moved cases, one test that
   pins the contract this plan exists to create:

```ts
  it('returns package rules before evaluator rules, in one list', async () => {
    // The emission order is chosen in runRules, not inherited from whichever
    // call site ran first (#84). Reordering this is an output change.
  });
```

   and one that pins the registry gate:

```ts
  it('does not touch the registry, or fire its events, when no rule needs it', async () => {
    // needsRegistry false → zero requests and no spinner callbacks (#107).
  });
```

   Use `config.rules['no-outdated-packages'] = []` and
   `config.rules['no-deprecated-packages'] = []` and assert neither
   `onRegistryStart` nor `onRegistryFinish` was called.

3. **`tests/plugins/runner.test.ts`** — the fixture builder returns an
   `AggregatedReport`; the options shape changed. Pass `facts` (the same object
   literal, still structurally valid — `AggregatedReport extends AnalysisFacts`)
   and `violations: []`, or retype the builder to `AnalysisFacts`. Add one case
   asserting a plugin sees hermex's violations in its `inventory.violations`
   when `violations` is non-empty — the promise that `runner.ts:59`'s manual
   splice used to keep implicitly.

Fixture builders in `tests/utils/compliance.test.ts`,
`package-columns.test.ts`, `print-utils.test.ts` and `write-summary-file.test.ts`
build `AggregatedReport` literals and need **no change** — the type still has
every field they set.

**Verify**: `pnpm run test:ci` — all pass.

### Step 6: Prove zero output change

```bash
pnpm run test:output
```

Expect **0 changed** cases. This is the acceptance test for the whole plan: the
refactor is only correct if the CLI prints, byte for byte, what it printed
before — same violations, same order, same spinner lines, same JSON.

A non-zero diff means either the emission order changed or a rule stopped
running. Do not accept it as "probably fine"; see STOP conditions.

### Step 7: Full gate sweep

```bash
pnpm run lint:ci && pnpm run format:ci && pnpm run typecheck && pnpm run test:ci && pnpm run build:ci
```

All five exit 0.

## Test plan

| What | Where | Asserts |
|---|---|---|
| Package rules still fire | `tests/rules/run.test.ts` (moved) | `no-packages`, `require-packages`, `packages.ignore` |
| Emission order is pinned | `tests/rules/run.test.ts` (new) | package → evaluator → registry |
| Registry gate holds | `tests/rules/run.test.ts` (new) | no events, no requests when `needsRegistry` is false |
| Plugins see the complete list | `tests/plugins/runner.test.ts` (new case) | `inventory.violations` contains hermex's own |
| Nothing user-visible moved | `pnpm run test:output` | 0 changed |
| JSON array unchanged | `tests/e2e/cli.test.ts` (existing, untouched) | still passes as-is |

## Done criteria

- [ ] `aggregateReports` returns `AnalysisFacts`; it neither imports nor calls
      `detectForbiddenPackages` / `detectRequiredPackages`.
- [ ] `src/rules/run.ts` exists and is the only module that calls package,
      evaluator and registry rules.
- [ ] `grep -n "aggregated\.\w* =" src/commands/pipeline.ts` returns nothing.
- [ ] `AggregatedReport` is constructed at exactly one place in `src/`.
- [ ] `src/plugins/runner.ts` contains no reference to `ruleViolations`.
- [ ] `pnpm run test:output` reports 0 changed.
- [ ] All five gates exit 0.
- [ ] `plans/README.md` status row updated.
- [ ] Issue #84 referenced in the commit message.

## STOP conditions

- **`pnpm run test:output` reports a non-zero diff.** This plan cannot change
  output. Report the diff verbatim and stop — do not adjust the expected
  baseline, and do not reorder the violation array to "fix" it.
- **A `print-*.ts`, `compliance.ts` or `write-summary-file.ts` file needs an
  edit to typecheck.** They consume `AggregatedReport`, which is unchanged. If
  one breaks, `AnalysisFacts` was split wrongly — re-read Step 1.
- **`src/index.ts` or `HermexScanResult` needs an edit.** Out of scope; the
  published API does not reference these types. Stop and report.
- **`PluginInventoryView` in `src/plugins/types.ts` needs a shape change.** Its
  shape is public. Only how it is *built* may change.
- **The drift check shows `pipeline.ts` or `aggregator-core.ts` changed since
  `044719c`.** Re-verify the "Current state" excerpts before touching anything.

## Maintenance notes

After this lands, adding a rule family is one line in `runRules`, and the
question "which side of the seam does this belong on?" no longer exists. Two
follow-ups become newly cheap and are deliberately **not** part of this plan:

- **Reordering emission** is now a one-line change in a commented array, rather
  than a pipeline restructure. It is an output change and needs its own
  decision.
- **Making the immutability enforceable** — `readonly ruleViolations` on
  `AggregatedReport`, or `Readonly<AggregatedReport>` in `PipelineResult` — is a
  natural next step once there is exactly one construction site. Left out here
  so the diff stays a pure relocation.
