# Plan 024: CODEOWNERS coverage rule — every scanned file has an owner

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/rules/ src/config/ src/commands/pipeline.ts src/utils/print-rules.ts tests/rules/`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding. Plans 016/019/023
> touching `pipeline.ts` / the rules layer are **expected drift** — this plan
> describes how to compose with them inline.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (CODEOWNERS pattern semantics are subtle; mitigated by a translation table + focused tests)
- **Depends on**: 023 (both extend `RuleViolation`, `print-rules.ts`, `evaluator.test.ts` — land 023 first). Coordinate with 016/019: all touch `pipeline.ts`; land after 016 if queued.
- **Category**: direction / feature
- **Planned at**: commit `19a4695`, 2026-07-05

## Why this matters — and the scope decision

**Presence** of a CODEOWNERS file is already enforceable today with
`require_files` (`patterns: ['CODEOWNERS', '.github/CODEOWNERS',
'docs/CODEOWNERS']` — satisfied if any matches). What hermex cannot do is
look **inside** the file. The maintainer's question was whether that belongs
in hermex at all. The decision recorded by this plan:

- **In scope for hermex — coverage enforcement.** "Every file hermex scans
  has at least one owner" is a compliance property of the codebase itself,
  GitHub does not enforce it (unowned files silently get no reviewers), and
  hermex already holds the two required inputs: the scanned file list and a
  rules engine with severities and CI exit codes. This is the feature this
  plan builds.
- **Out of scope for hermex — owner identity.** Validating that
  `@org/team-frontend` exists, resolving team membership, or ownership
  analytics all require the GitHub API, credentials, and a moving external
  contract. Dedicated tools and GitHub's own editor validation cover that;
  hermex checking *syntax and coverage* offline is the boundary.

Target config:

```ts
rules: {
  codeowners: {
    severity: 'error',
    message: 'every scanned file needs an owner',
  },
},
```

Violations: CODEOWNERS missing entirely (only when the rule is configured),
or N scanned files matched by no owning rule.

## Current state

**`src/rules/shared.ts:5-21`** — `RuleViolation` closed union (after Plan 023
it also has `'forbid_package_fields'`, `fieldPath?`, `actualValue?`).

**`src/rules/evaluator.ts`** — signature today:
```ts
export function evaluateRules(
  repoPath: string,
  rulesConfig: RulesConfig,
  excludes: string[],
): import('./shared').RuleViolation[]
```

**`src/commands/pipeline.ts:80-84`** — the only production caller; it has the
scanned file list in scope (`const files = await findFiles(config.includes,
config.excludes);` at line 33):
```ts
const evaluatorViolations = evaluateRules(
  process.cwd(),
  config.rules,
  config.excludes,
);
```

**`src/config/schema.ts`** — `engine_version` (lines 53–55) is the precedent
for an optional single-object rule: `z.union([Schema,
z.array(Schema)]).optional()` — codeowners needs only the single-object
`.optional()` form.

**CODEOWNERS semantics to implement** (gitignore-style, per GitHub docs):
- Lines: `<pattern> <owner1> <owner2>…`; `#` comments; blank lines ignored.
- **Last matching rule wins** for a given file.
- A pattern with **no owners** un-assigns ownership (files matching it, and
  no later rule, count as unowned).
- Location search order: `.github/CODEOWNERS`, then repo-root `CODEOWNERS`,
  then `docs/CODEOWNERS` — first found wins.
- Pattern → micromatch translation table (implement exactly this):

| CODEOWNERS pattern | Matches | micromatch equivalent |
|---|---|---|
| `*` | everything | `**` |
| `*.ts` (no slash) | any `.ts` anywhere | `**/*.ts` |
| `foo` (no slash, no glob) | file or dir named foo anywhere | `**/foo` and `**/foo/**` |
| `/build/logs/` (leading slash, trailing slash) | dir anchored to root | `build/logs/**` |
| `docs/` (trailing slash, no leading) | dir anywhere | `**/docs/**` |
| `/scripts/*.sh` (leading slash) | anchored glob | `scripts/*.sh` |
| `apps/**` | recursive from any `apps` | `**/apps/**` (contains `/` mid-pattern → anchor to root: `apps/**`) |

General rules: strip a leading `/` and anchor; if the pattern contains no
`/` (after stripping), prefix `**/`; if it ends with `/`, append `**`; a
bare-name pattern also needs the `/**` directory variant. Use
`micromatch.isMatch(file, translated, { dot: true })`.

**Print layer** — `src/utils/print-rules.ts`: `formatRuleType` exhaustive
switch + `describeViolation` per-type branches (see Plan 023's Step 4 for the
shape after 023).

**Test conventions** — `tests/rules/evaluator.test.ts`: temp dir via
`mkdtempSync`, files via `writeFileSync`, `emptyRules: RulesConfig` literal
that must gain `codeowners: undefined`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/config/schema.ts` — `CodeownersRuleSchema`, `codeowners` in rules, type export
- `src/config/types.ts`, `src/index.ts` — re-export `CodeownersRule`
- `src/rules/shared.ts` — `'codeowners'` in the type union
- `src/rules/codeowners.ts` — create: locate, parse, translate, evaluate
- `src/rules/evaluator.ts` — add `scannedFiles: string[]` parameter, call the new evaluator
- `src/commands/pipeline.ts` — pass `files` to `evaluateRules`
- `src/utils/print-rules.ts` — display branch
- `tests/rules/codeowners.test.ts` — create
- `tests/rules/evaluator.test.ts` — `emptyRules` key + updated `evaluateRules` call sites

**Out of scope** (do NOT touch):
- Owner identity validation, GitHub API calls, team resolution — the recorded
  scope decision above; do not add network code
- `require_files` / `detect_files` — presence enforcement stays there
- Nested CODEOWNERS files (monorepo per-package) — GitHub itself only reads
  the three root locations
- Gitlab/Bitbucket CODEOWNERS dialects (sections, optional approvals)

## Git workflow

- Branch: `advisor/024-codeowners-coverage`
- Commit message: `feat(rules): codeowners coverage rule — unowned scanned files fail comply`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Schema and types

In `src/config/schema.ts`, next to `EngineVersionRuleSchema`:

```ts
const CodeownersRuleSchema = z.object({
  severity: RuleSeveritySchema,
  message: z.string().optional(),
});
```

Add to the rules object: `codeowners: CodeownersRuleSchema.optional(),`
(the `.default(() => ({...}))` factory needs no entry for an optional field —
mirror how `engine_version` is handled there). Export
`export type CodeownersRule = z.infer<typeof CodeownersRuleSchema>;` and
re-export from `src/config/types.ts` and `src/index.ts`.

Update `tests/rules/evaluator.test.ts` `emptyRules` with
`codeowners: undefined,`.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Create src/rules/codeowners.ts

Structure (signatures are load-bearing; bodies follow the semantics table in
"Current state"):

```ts
import fs from 'fs';
import path from 'path';
import micromatch from 'micromatch';
import type { RulesConfig } from '../config/types';
import type { RuleViolation } from './shared';

const CODEOWNERS_LOCATIONS = [
  '.github/CODEOWNERS',
  'CODEOWNERS',
  'docs/CODEOWNERS',
];

export interface CodeownersEntry {
  pattern: string;      // as written
  globs: string[];      // translated micromatch patterns
  owners: string[];     // may be empty (un-assigns ownership)
}

/** First existing location, GitHub search order. Null if none exist. */
export function findCodeownersFile(repoPath: string): string | null { ... }

/** Parses content into entries; skips blank lines and # comments. */
export function parseCodeowners(content: string): CodeownersEntry[] { ... }

/** Translation per the table: anchoring, no-slash prefixing, dir suffixing. */
export function codeownersPatternToGlobs(pattern: string): string[] { ... }

/** Last matching entry wins; owned iff that entry has >= 1 owner. */
export function fileIsOwned(file: string, entries: CodeownersEntry[]): boolean {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (micromatch.isMatch(file, entries[i].globs, { dot: true })) {
      return entries[i].owners.length > 0;
    }
  }
  return false;
}

export function evaluateCodeowners(
  repoPath: string,
  rulesConfig: RulesConfig,
  scannedFiles: string[],
): RuleViolation[] {
  const rule = rulesConfig.codeowners;
  if (!rule) return [];

  const filePath = findCodeownersFile(repoPath);
  if (!filePath) {
    return [{
      type: 'codeowners',
      severity: rule.severity,
      patterns: CODEOWNERS_LOCATIONS,
      message: rule.message,
      matchedFiles: [],
    }];
  }

  const entries = parseCodeowners(fs.readFileSync(filePath, 'utf-8'));
  const relFiles = scannedFiles.map((f) =>
    (path.isAbsolute(f) ? path.relative(repoPath, f) : f).replace(/\\/g, '/'),
  );
  const unowned = relFiles.filter((f) => !fileIsOwned(f, entries));
  if (unowned.length === 0) return [];

  return [{
    type: 'codeowners',
    severity: rule.severity,
    patterns: [path.basename(filePath)],
    message: rule.message,
    matchedFiles: unowned,
  }];
}
```

Add `'codeowners'` to the `type` union in `src/rules/shared.ts`.

Parsing details: split each non-comment line on whitespace (`/\s+/`); first
token is the pattern, the rest are owners (do NOT validate owner syntax —
that is the out-of-scope boundary). Windows path note: normalize scanned
files to forward slashes before matching, as shown.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Thread the scanned file list

`src/rules/evaluator.ts`:

```ts
export function evaluateRules(
  repoPath: string,
  rulesConfig: RulesConfig,
  excludes: string[],
  scannedFiles: string[] = [],
): RuleViolation[] {
  return [
    ...evaluateFileRules(repoPath, rulesConfig, excludes),
    ...evaluateScriptRules(repoPath, rulesConfig),
    ...evaluatePackageFieldRules(repoPath, rulesConfig),
    ...evaluateEngineVersion(repoPath, rulesConfig),
    ...evaluateCodeowners(repoPath, rulesConfig, scannedFiles),
  ];
}
```

The default `[]` keeps existing test call sites compiling; with an empty list
and a codeowners rule configured, only the missing-file check fires — which
is correct for callers that have no scan context.

`src/commands/pipeline.ts`: pass `files` as the fourth argument.

**Verify**: `pnpm run typecheck && pnpm run build` → exit 0.

### Step 4: Printing

`src/utils/print-rules.ts` — `formatRuleType`: `case 'codeowners': return
'codeowners';`. `describeViolation`:

```ts
if (v.type === 'codeowners') {
  if (v.matchedFiles.length === 0)
    return `CODEOWNERS not found (looked in ${patterns})${suffix}`;
  const shown = v.matchedFiles.slice(0, 3).join(', ');
  const more = v.matchedFiles.length > 3
    ? ` and ${v.matchedFiles.length - 3} more` : '';
  return `${v.matchedFiles.length} scanned file(s) have no owner: ${shown}${more}${suffix}`;
}
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 5: Tests — tests/rules/codeowners.test.ts

Unit-test the translation and matching **directly** (they carry the risk):

- `codeownersPatternToGlobs` cases — one assertion per row of the table in
  "Current state" (7 rows)
- `fileIsOwned`: last-match-wins (`*.ts @a` then `src/generated.ts` with no
  owners → `src/generated.ts` unowned, other `.ts` owned); no-slash dir name
  owns nested files (`docs @a` owns `docs/guide/x.md`)
- `parseCodeowners`: comments/blank lines skipped; owners split on multiple
  spaces/tabs

Integration-test `evaluateCodeowners` with a temp dir (copy the
`mkdtempSync` pattern from `evaluator.test.ts`):

- no CODEOWNERS + rule configured → 1 violation, `matchedFiles: []`
- `.github/CODEOWNERS` with `* @org/frontend` → full coverage, no violation
- partial coverage (`src/ @a` but scanned file `lib/x.ts`) → violation with
  `matchedFiles: ['lib/x.ts']`
- rule not configured → no violation even without the file
- `.github/CODEOWNERS` preferred over root `CODEOWNERS` when both exist
  (write different content; assert the `.github` one governed the result)

**Verify**: `pnpm run test:ci` → all pass.

### Step 6: Full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck
```

All exit 0. Then a manual smoke: this repo has no CODEOWNERS, so adding the
rule to `fixtures/hermex.config.ts` temporarily and running
`pnpm run dev:scan` should print the missing-file violation. **Revert the
fixture change** before committing (or keep it only if you also add a
CODEOWNERS fixture — do not leave the fixtures failing).

## Test plan

Step 5: ~7 translation tests, 3 matching tests, 2 parser tests, 5 evaluator
integration tests. The translation table is the contract — every row tested.

## Done criteria

- [ ] `rules.codeowners` accepted by the schema; `CodeownersRule` exported from `src/index.ts`
- [ ] Unowned scanned files produce a violation that fails `comply` at `severity: 'error'` (integration test proves the violation; comply wiring is generic)
- [ ] All translation-table rows covered by passing tests
- [ ] No network code added (`grep -rn "fetch\|https" src/rules/` → no new matches)
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `findFiles` output turns out to be neither repo-relative nor absolute
  (e.g. already-normalized differently) and the Step 2 normalization produces
  paths that match nothing — verify by logging one path in a test; report
  what you see rather than adding heuristics.
- A translation-table row cannot be expressed in micromatch (matching
  disagrees with the table after two attempts) — report the row; do not ship
  a silently-wrong pattern class.
- Plan 023 has not landed and the `RuleViolation`/print-rules edits conflict
  — land 023 first (dependency order), or report.

## Maintenance notes

- The scope boundary is deliberate and recorded above: syntax + coverage
  offline, never owner identity. Reviewers should reject any follow-up that
  adds GitHub API calls to the rules layer.
- The pattern translation is a documented approximation of gitignore
  semantics. If users report mismatches, extend the table AND its tests —
  the table is the spec.
- If a future `--changed-files` / baseline mode lands (see direction options
  in `plans/README.md`), coverage can cheaply run on the diff set only — the
  evaluator already takes an arbitrary file list.
