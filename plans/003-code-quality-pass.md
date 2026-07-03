# Plan 003: Code quality pass — delete debug scaffolding, fix type escapes, remove stale FIXME

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/swc-parser/patterns/imports.ts src/swc-parser/patterns/jsx.ts src/swc-parser/patterns/variables.ts src/swc-parser/patterns/lazy-dynamic.ts src/swc-parser/patterns/collections.ts src/swc-parser/patterns/conditionals.ts src/swc-parser/patterns/advanced.ts src/commands/scan.ts src/swc-parser/core/report.ts src/utils/print-components.ts`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / quality
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

Three independent quality issues, all low-risk and independently verifiable:

1. **14 commented-out `console.log` statements** across all 7 pattern files are
   leftover debug scaffolding from initial development. They clutter every
   pattern module. If accidentally uncommented they corrupt tool output.

2. **`catch (error: any)`** at two sites in `scan.ts` overrides the compiler's
   ability to catch misuse of the error value. TypeScript's correct pattern is
   `catch (error: unknown)` with an `instanceof Error` guard before accessing
   `.message`.

3. **`(patterns as any)[key]`** in `calculateTotalPatterns()` casts the entire
   `UsagePatterns` object to bypass the type system. `Object.values()` with
   `instanceof` checks is safer and clearer.

4. **Stale FIXME comment** in `print-components.ts:7` has no owner, no ticket,
   and no reproduction context.

## Current state

**Commented console.logs** — 14 instances across 7 files (line numbers at planned-at commit):
```
src/swc-parser/patterns/imports.ts:17
src/swc-parser/patterns/jsx.ts:55
src/swc-parser/patterns/variables.ts:26, 62
src/swc-parser/patterns/lazy-dynamic.ts:20, 36
src/swc-parser/patterns/collections.ts:22, 46
src/swc-parser/patterns/conditionals.ts:24
src/swc-parser/patterns/advanced.ts:12, 28, 39, 49, 67
```
All follow the pattern `// console.log(...)` — single-line commented calls.

**`catch (error: any)` in `src/commands/scan.ts`**:
```ts
// ~line 82 — inner per-file parse error
} catch (error: any) {
  parseErrors.push({ file, message: error.message ?? String(error) });
}

// ~line 133 — outer catch
} catch (error: any) {
  spinner.fail(chalk.red('Analysis failed: ' + error.message));
  console.error(error);
  process.exit(1);
}
```

**`(patterns as any)` cast in `src/swc-parser/core/report.ts`** (lines 60–74):
```ts
function calculateTotalPatterns(state: ParserState): number {
  let sum = 0;
  const patterns = state.usagePatterns;

  for (const key in patterns) {
    const pattern = (patterns as any)[key];
    if (pattern instanceof Set) {
      sum += pattern.size;
    } else if (pattern instanceof Map) {
      sum += pattern.size;
    }
  }

  return sum;
}
```

**FIXME in `src/utils/print-components.ts:7`**:
```ts
// FIXME why double space, if single space output is wrong somehow?
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope** (the only files to modify):
- `src/swc-parser/patterns/imports.ts`
- `src/swc-parser/patterns/jsx.ts`
- `src/swc-parser/patterns/variables.ts`
- `src/swc-parser/patterns/lazy-dynamic.ts`
- `src/swc-parser/patterns/collections.ts`
- `src/swc-parser/patterns/conditionals.ts`
- `src/swc-parser/patterns/advanced.ts`
- `src/commands/scan.ts`
- `src/swc-parser/core/report.ts`
- `src/utils/print-components.ts`

**Out of scope** (do NOT touch):
- Any other file. Do NOT add a debug logging system or structured logger — out of scope.

## Git workflow

- Branch: `advisor/003-quality-pass`
- Commit message: `refactor: remove commented debug logs, fix error type casts, remove stale FIXME`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Delete all 14 commented console.log lines

In each of the 7 pattern files listed in "Current state", find and delete each
`// console.log(...)` line. These are single-line comments — delete the entire
line. Do not leave trailing blank lines if the surrounding code reads cleanly
without them; use your judgment on whitespace.

**Verify**:
```
grep -rn "// console.log" src/swc-parser/patterns/
```
→ no matches.

### Step 2: Fix catch (error: any) in scan.ts — inner catch

In `src/commands/scan.ts`, find the inner catch (~line 82):
```ts
} catch (error: any) {
  parseErrors.push({ file, message: error.message ?? String(error) });
}
```
Replace with:
```ts
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  parseErrors.push({ file, message });
}
```

### Step 3: Fix catch (error: any) in scan.ts — outer catch

In `src/commands/scan.ts`, find the outer catch (~line 133):
```ts
} catch (error: any) {
  spinner.fail(chalk.red('Analysis failed: ' + error.message));
  console.error(error);
  process.exit(1);
}
```
Replace with:
```ts
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  spinner.fail(chalk.red('Analysis failed: ' + message));
  console.error(error);
  process.exit(1);
}
```

**Verify after Steps 2+3**:
```
grep -n "catch (error: any)" src/commands/scan.ts
```
→ no matches.

```
pnpm run typecheck
```
→ exits 0.

### Step 4: Fix the (patterns as any) cast in calculateTotalPatterns

In `src/swc-parser/core/report.ts`, replace the body of `calculateTotalPatterns`:

```ts
function calculateTotalPatterns(state: ParserState): number {
  return Object.values(state.usagePatterns).reduce((sum, collection) => {
    if (collection instanceof Set || collection instanceof Map) {
      return sum + collection.size;
    }
    return sum;
  }, 0);
}
```

This produces identical numeric output while eliminating the `as any` cast.

**Verify**:
```
grep -n "as any" src/swc-parser/core/report.ts
```
→ no matches.

```
pnpm run typecheck && pnpm run test:ci
```
→ exits 0 (the snapshot test exercises this path).

If TypeScript 7.0.1-rc rejects `Object.values(state.usagePatterns)` with a
type error, use this alternative that avoids `as any` without `Object.values`:
```ts
function calculateTotalPatterns(state: ParserState): number {
  let sum = 0;
  for (const key of Object.keys(state.usagePatterns) as Array<keyof typeof state.usagePatterns>) {
    const collection = state.usagePatterns[key];
    if (collection instanceof Set || collection instanceof Map) {
      sum += collection.size;
    }
  }
  return sum;
}
```

### Step 5: Remove the FIXME from print-components.ts

In `src/utils/print-components.ts`, delete the comment on ~line 7:
```ts
// FIXME why double space, if single space output is wrong somehow?
```
Do not change any surrounding code.

**Verify**:
```
grep -n "FIXME" src/utils/print-components.ts
```
→ no matches.

### Step 6: Final validation

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

## Test plan

No new tests needed — all changes are cosmetic or type-narrowing with identical runtime behavior. The existing suite is the regression check.

## Done criteria

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `grep -rn "// console.log" src/swc-parser/patterns/` → no matches
- [ ] `grep -n "catch (error: any)" src/commands/scan.ts` → no matches
- [ ] `grep -n "as any" src/swc-parser/core/report.ts` → no matches
- [ ] `grep -n "FIXME" src/utils/print-components.ts` → no matches
- [ ] Only in-scope files modified (`git diff --name-only`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- The `calculateTotalPatterns` replacement in Step 4 causes the JSX snapshot test to fail with a different count value. Stop and report — do not guess at a fix.
- TypeScript reports an unexpected error on `Object.values(state.usagePatterns)` that the alternative implementation also doesn't resolve. Stop and report.

## Maintenance notes

- The two `catch (error: unknown)` blocks in `scan.ts` are the canonical pattern for error handling here. New try/catch blocks should follow the same `instanceof Error ? error.message : String(error)` guard.
- `calculateTotalPatterns` with `Object.values()` automatically picks up any new fields added to `UsagePatterns` — no manual update needed.
