# Plan 011: Improve readFixture error messages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 36699c4..HEAD -- tests/helpers/read-fixture.ts`
> If this file changed since this plan was written, compare the "Current state" excerpt before proceeding.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: DX / tests
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

When a test calls `readFixture('missing-file.tsx')` and the fixture doesn't
exist, the raw Node.js error is:
```
ENOENT: no such file or directory, open '.../fixtures/missing-file.tsx'
```
This gives no indication of which fixture was requested or where fixtures live,
making fixture-related test failures confusing to diagnose.

A simple try/catch with a rethrow improves the message to:
```
Fixture not found: "missing-file.tsx" — expected at .../fixtures/missing-file.tsx
```

## Current state

**`tests/helpers/read-fixture.ts`** (entire file):
```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function readFixture(fixtureName: string) {
  const path = join(__dirname, '../..', 'fixtures', fixtureName);

  return readFileSync(path, 'utf8');
}
```

The function is `async` but performs synchronous I/O — this is a minor mismatch
(the return value is a `string`, not `Promise<string>`, because `readFileSync`
is synchronous even inside an async function). The plan does not change the
async signature to avoid breaking callers.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `tests/helpers/read-fixture.ts`

**Out of scope** (do NOT touch):
- Any `src/` file
- Any existing test that calls `readFixture`

## Git workflow

- Branch: `advisor/011-read-fixture-error`
- Commit message: `test: improve readFixture error message for missing fixtures`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add error wrapping to readFixture

Replace the entire content of `tests/helpers/read-fixture.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function readFixture(fixtureName: string): Promise<string> {
  const fixturePath = join(__dirname, '../..', 'fixtures', fixtureName);

  try {
    return readFileSync(fixturePath, 'utf8');
  } catch {
    throw new Error(
      `Fixture not found: "${fixtureName}" — expected at ${fixturePath}`,
    );
  }
}
```

**Verify**: `pnpm run typecheck` → exits 0.

### Step 2: Verify existing tests still pass

```
pnpm run test:ci
```
→ all pass. (The change is additive — same behavior for existing fixture files, better error for missing ones.)

### Step 3: Lint

```
pnpm run lint
```
→ exits 0.

## Test plan

No new test file needed. The change is verified by:
1. TypeScript accepting the explicit `Promise<string>` return type
2. The existing test suite passing (existing callers unaffected)

If you want to add a direct test for the error message, add a case to any
test file:
```ts
it('throws descriptive error for missing fixture', async () => {
  await expect(readFixture('nonexistent.tsx')).rejects.toThrow('Fixture not found: "nonexistent.tsx"');
});
```

## Done criteria

- [ ] `tests/helpers/read-fixture.ts` has a try/catch around `readFileSync`
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] Only `tests/helpers/read-fixture.ts` modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- An existing test that calls `readFixture` fails after the change. The change is backward-compatible for existing fixtures; a failure means the fixture file doesn't exist. Fix the fixture path, not the helper.

## Maintenance notes

- `__dirname` in vitest resolves correctly for ESM test files. If a future migration to native ESM `import.meta.dirname` is needed, update accordingly.
- This helper is used by E2E tests that read JSX fixtures. Keep the `async` signature even though the body is synchronous — changing it would require updating all callers.
