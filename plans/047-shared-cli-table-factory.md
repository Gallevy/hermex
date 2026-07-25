# Plan 047: Extract a shared cli-table3 factory for the repeated table style

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat ac69a10..HEAD -- src/utils/print-summary.ts src/utils/print-packages.ts src/utils/print-components.ts src/utils/print-patterns.ts`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `ac69a10`, 2026-07-25

## Why this matters

Four `print-*` modules each construct a `cli-table3` table with the identical
style block:

```ts
const table = new Table({
  head: [...],
  style: {
    head: ['cyan'],
    border: ['gray'],
  },
});
```

The only thing that varies between them is the `head` (column headers). The
`style: { head: ['cyan'], border: ['gray'] }` literal is copy-pasted in all
four files. That means a future change to the table look (e.g. a different
border color, or making it respect a `--no-color` theme) has to be made in
four places, and it's easy to update three and miss one — the tables would
silently drift out of visual sync. Centralizing the style in one factory
removes the duplication with zero output change (the produced tables are
byte-identical) and gives a single place to evolve table styling later. Pure
readability/maintainability cleanup.

## Current state

`grep -rln "new Table(" src/` returns exactly these four files, and
`grep -rn "head: \['cyan'\]" src/` confirms the identical style literal in
each:

- **`src/utils/print-summary.ts:13-19`** — `head: ['Metric', 'Count']`
- **`src/utils/print-packages.ts:110-116`** (inside `printPackagesTable`) —
  `head` is `['Package', 'Version']`, with `'Upgrades'` conditionally
  appended before the `new Table(...)` call (`const head = ['Package',
  'Version']; if (hasReleaseAge) head.push('Upgrades');`)
- **`src/utils/print-components.ts:36-42`** —
  `head: ['Component', 'Package', 'Count']`
- **`src/utils/print-patterns.ts:31-37`** — `head: ['Pattern', 'Count']`

Every one uses the exact same `style: { head: ['cyan'], border: ['gray'] }`.

Facts the executor needs:

- `cli-table3` is imported in each file as `import Table from 'cli-table3';`.
  Its default export is a constructor; `new Table(options)` takes a
  `{ head, style, ... }` options object. The factory must return the same
  `Table` instance type so callers can still call `.push(...)` and
  `.toString()` on it unchanged.
- `src/utils/` has no existing shared print/table helper module — the closest,
  `severity-format.ts`, is about colors/icons, not tables. Create a new small
  module rather than overloading it.
- `print-rules.ts` and `print-versus.ts` do **not** use `cli-table3` (they
  render rows manually) — they are not part of this change.
- The print functions are covered by `tests/utils/print-utils.test.ts` (it
  imports and calls `printSummary`, `printPackages`, `printComponents`,
  `printPatterns`, etc.) and end-to-end by `tests/e2e/cli.test.ts`. Because
  the factory produces an identical `Table`, all existing assertions must
  continue to pass with no change.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |
| Format    | `pnpm run format:ci` | exit 0 (no diff)    |

(Exact scripts from `package.json`; `format:ci` is a real CI gate — run it.)

## Scope

**In scope**:
- `src/utils/print-table.ts` — **create**: the shared factory.
- `src/utils/print-summary.ts` — use the factory.
- `src/utils/print-packages.ts` — use the factory.
- `src/utils/print-components.ts` — use the factory.
- `src/utils/print-patterns.ts` — use the factory.

**Out of scope** (do NOT touch, even though they look related):
- `src/utils/print-rules.ts`, `src/utils/print-versus.ts`,
  `src/utils/print-details.ts` — they do not build `cli-table3` tables; leave
  them alone.
- `src/utils/chart-renderer.ts` — separate bar-chart rendering, unrelated.
- Do NOT change any table's `head` values, column order, conditional-column
  logic (the `hasReleaseAge` push in print-packages), or any `.push(...)`
  row-building code. Only the construction of the styled table moves.
- Do NOT change the style itself (keep `head: ['cyan'], border: ['gray']`) —
  this plan is a no-output-change refactor, not a restyle.

## Git workflow

- Branch: `advisor/047-shared-cli-table-factory`
- Commit message (conventional-commit style, matching `git log`):
  `refactor: extract shared cli-table3 factory for report tables`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the factory module

Create `src/utils/print-table.ts`:

```ts
import Table from 'cli-table3';

/**
 * Builds a `cli-table3` table with hermex's standard report styling
 * (cyan header, gray borders). Centralizes the style so every report table
 * stays visually in sync — pass the column headers, then `.push(...)` rows
 * as usual.
 */
export function createReportTable(head: string[]): Table {
  return new Table({
    head,
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });
}
```

`Table` (the value) is also `cli-table3`'s type for an instance, so the
`: Table` return annotation resolves correctly from the default import.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Switch print-summary.ts to the factory

In `src/utils/print-summary.ts`, replace:
```ts
  const table = new Table({
    head: ['Metric', 'Count'],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });
```
with:
```ts
  const table = createReportTable(['Metric', 'Count']);
```
Remove the now-unused `import Table from 'cli-table3';` and add
`import { createReportTable } from './print-table';`.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Switch print-patterns.ts and print-components.ts

Same transform:
- `print-patterns.ts`: `const table = createReportTable(['Pattern', 'Count']);`
- `print-components.ts`:
  `const table = createReportTable(['Component', 'Package', 'Count']);`

In each, drop `import Table from 'cli-table3';` and add the
`createReportTable` import.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 4: Switch print-packages.ts (keep the conditional column)

In `printPackagesTable`, the head is built conditionally — preserve that:
```ts
  const head = ['Package', 'Version'];
  if (hasReleaseAge) head.push('Upgrades');

  const table = createReportTable(head);
```
Drop `import Table from 'cli-table3';`, add the `createReportTable` import.
Do not touch the `hasReleaseAge` logic or the row-building `forEach`.

**Verify**: `pnpm run typecheck` → exit 0; then
`grep -rn "new Table(" src/` → **no matches** (all four call sites now go
through the factory).

### Step 5: Full verification suite

```
pnpm run build && pnpm run test:ci && pnpm run lint && pnpm run typecheck && pnpm run format:ci
```

All exit 0. This is a behavior-preserving refactor — every existing test,
including the `print-utils` and e2e suites, must pass unchanged.

## Test plan

No new tests required — output is byte-identical, and the existing
`tests/utils/print-utils.test.ts` already calls all four affected print
functions (any change to the rendered table would fail those assertions or
the e2e snapshot-style checks in `tests/e2e/cli.test.ts`).

If any print or e2e test fails after the change, the factory is not producing
an identical table — treat it as a STOP condition; do not adjust the tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/utils/print-table.ts` exists and exports `createReportTable`.
- [ ] `grep -rn "new Table(" src/` → no matches.
- [ ] `grep -rn "head: \['cyan'\]" src/` → no matches (the style literal now
      lives only in `print-table.ts`, where it reads `head: ['cyan']` inside
      the factory — that single occurrence is expected and fine).
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`,
      `pnpm run lint`, `pnpm run format:ci` all exit 0.
- [ ] Only the five in-scope files are added/modified (`git status`).
- [ ] `plans/README.md` status row for 047 updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt doesn't match the live code (a print file was
  restyled or refactored since this plan was written).
- The `: Table` return-type annotation on `createReportTable` fails to
  typecheck (some cli-table3 versions type the instance differently) — if so,
  STOP and report; do not switch to `any` to force it through.
- Any `print-utils` or e2e test fails after the change — the factory isn't
  behavior-equivalent; report rather than editing tests.
- The change appears to require touching a file outside the in-scope list.

## Maintenance notes

- Future table-style changes (border color, header color, a `--no-color`
  aware theme) now happen once in `createReportTable`, not in four files —
  that was the point.
- A reviewer should confirm the diff is purely mechanical: no `head` values
  changed, the `print-packages` conditional `'Upgrades'` column preserved,
  and no row-building (`.push`) code touched.
- If a new report table is added later (e.g. a future `comply` table), it
  should call `createReportTable` too rather than re-introducing the inline
  style.
- Deliberately not folding in `print-rules`/`print-versus`: they render rows
  by hand without `cli-table3`, so they share no code with this factory.
