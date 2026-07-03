# Plan 014: Fix yarn adapter — always-overwrite bug + add parseMultiVersion

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/lock-parser/patterns/yarn.ts`
> If this file changed since this plan was written, compare before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug / correctness
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

The yarn adapter has two related issues:

**Bug 1 — Condition always overwrites**: `src/lock-parser/patterns/yarn.ts:45`:
```ts
if (value.version && (!versions[pkgName] || value.version)) {
```
`(!versions[pkgName] || value.version)` is always `true` when `value.version`
is truthy (the second operand of `||` is the non-null version string, which is
truthy). So this reduces to `if (value.version)` — meaning the last resolved
entry for each package wins. In a typical yarn.lock a package can appear under
multiple specifiers (e.g. `chalk@^4.0.0` and `chalk@^4.1.0`), and if they
resolve to different versions, only the last-encountered version is stored.
The intent was almost certainly first-wins (`!versions[pkgName]` only).

**Bug 2 — Missing `parseMultiVersion`**: Both `NpmLockfileAdapter` and
`PnpmLockfileAdapter` implement `parseMultiVersion()` which returns all
installed versions per package. `YarnLockfileAdapter` does not implement it.
As a result, the aggregator never detects version conflicts (the
`hasVersionConflict` flag on `PackageDistribution`) for yarn projects.

## Current state

**`src/lock-parser/patterns/yarn.ts`** (entire file):
```ts
import fs from 'fs';
import path from 'path';
import lockfile from '@yarnpkg/lockfile';
import type { LockfileAdapter } from '../lock-file-adapter';

export class YarnLockfileAdapter implements LockfileAdapter {
  name = 'yarn';
  supportedVersions = ['v1', 'v2+'];

  detect(projectPath: string): string | null {
    const lockfilePath = path.join(projectPath, 'yarn.lock');
    return fs.existsSync(lockfilePath) ? lockfilePath : null;
  }

  parse(lockFilePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      const parsed = lockfile.parse(content);

      if (parsed.type !== 'success') {
        console.warn('Warning: Failed to parse yarn.lock');
        return {};
      }

      const versions: Record<string, string> = {};

      Object.entries(parsed.object).forEach(([key, value]: [string, any]) => {
        let pkgName = key;

        if (key.startsWith('@')) {
          const match = key.match(/^(@[^@]+\/[^@]+)@/);
          if (match) pkgName = match[1];
        } else {
          const match = key.match(/^([^@]+)@/);
          if (match) pkgName = match[1];
        }

        if (value.version && (!versions[pkgName] || value.version)) {  // ← bug
          versions[pkgName] = value.version;
        }
      });

      return versions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not parse yarn.lock: ${message}`);
      return {};
    }
  }
}
```

**`src/lock-parser/lock-file-adapter.ts`** — adapter interface (read this to
understand `parseMultiVersion` signature):
```ts
export interface LockfileAdapter {
  name: string;
  supportedVersions: string[];
  detect(projectPath: string): string | null;
  parse(lockFilePath: string): Record<string, string>;
  parseMultiVersion?(lockFilePath: string): Record<string, string[]>;
}
```

**For comparison — `NpmLockfileAdapter.parseMultiVersion`** (in
`src/lock-parser/patterns/npm.ts`) accumulates all version strings per package:
```ts
parseMultiVersion(lockFilePath: string): Record<string, string[]> {
  // ... reads packages, builds Record<string, string[]> where
  //     each key maps to an array of all resolved versions
}
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0, no errors   |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass            |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/lock-parser/patterns/yarn.ts` — fix condition, add `parseMultiVersion`

**Out of scope** (do NOT touch):
- `src/lock-parser/patterns/npm.ts` — reference only; no changes
- `src/lock-parser/patterns/pnpm.ts` — reference only; no changes
- `src/lock-parser/lock-file-adapter.ts` — already defines the optional method
- Any other file

## Git workflow

- Branch: `advisor/014-yarn-adapter-fix`
- Commit message: `fix: yarn adapter version overwrite bug and add parseMultiVersion`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Fix the always-overwrite condition

In `src/lock-parser/patterns/yarn.ts`, find line 45:
```ts
if (value.version && (!versions[pkgName] || value.version)) {
```

Change to first-wins (only set if not already set):
```ts
if (value.version && !versions[pkgName]) {
```

**Verify**:
```
grep -n "versions\[pkgName\]" src/lock-parser/patterns/yarn.ts
```
→ should show `if (value.version && !versions[pkgName])`.

### Step 2: Extract the package name logic into a helper

Before adding `parseMultiVersion`, extract the repeated name-extraction code
into a private function to avoid duplication between `parse` and `parseMultiVersion`.

In `src/lock-parser/patterns/yarn.ts`, add a module-level (not class-level)
helper function before the class definition:

```ts
function extractPackageName(key: string): string {
  if (key.startsWith('@')) {
    const match = key.match(/^(@[^@]+\/[^@]+)@/);
    return match ? match[1] : key;
  }
  const match = key.match(/^([^@]+)@/);
  return match ? match[1] : key;
}
```

Then update `parse()` to use it. Replace the inline name extraction block:
```ts
// Before:
let pkgName = key;
if (key.startsWith('@')) {
  const match = key.match(/^(@[^@]+\/[^@]+)@/);
  if (match) pkgName = match[1];
} else {
  const match = key.match(/^([^@]+)@/);
  if (match) pkgName = match[1];
}
```

With:
```ts
const pkgName = extractPackageName(key);
```

**Verify**: `pnpm run typecheck` → exits 0.

### Step 3: Add parseMultiVersion to YarnLockfileAdapter

Inside the class body, after the `parse` method, add:

```ts
parseMultiVersion(lockFilePath: string): Record<string, string[]> {
  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    const parsed = lockfile.parse(content);

    if (parsed.type !== 'success') {
      return {};
    }

    const versions: Record<string, string[]> = {};

    Object.entries(parsed.object).forEach(([key, value]: [string, any]) => {
      if (!value.version) return;
      const pkgName = extractPackageName(key);
      if (!versions[pkgName]) {
        versions[pkgName] = [];
      }
      if (!versions[pkgName].includes(value.version)) {
        versions[pkgName].push(value.version);
      }
    });

    return versions;
  } catch {
    return {};
  }
}
```

**Verify**: `pnpm run typecheck` → exits 0. The method matches the
`parseMultiVersion?(lockFilePath: string): Record<string, string[]>` signature
in the interface.

### Step 4: Run the full suite

```
pnpm run build && pnpm run test:ci && pnpm run lint
```

All must exit 0.

If Plan 004 has been executed, its yarn lock-parser tests now cover the `parse`
method. The `parseMultiVersion` method is only tested via Plan 004's fixture if
a multi-version fixture exists — but that fixture is not required for this plan.

## Test plan

If Plan 004 is DONE:
- The existing yarn lock-parser tests exercise `parse()`. Run them and confirm
  they still pass.
- No test for `parseMultiVersion` is required by this plan. If you want to add
  one, add it to `tests/lock-parser/lock-parser.test.ts`:

```ts
it('parseMultiVersion collects all versions per package', () => {
  // Create a temp yarn.lock with chalk appearing under two specifiers
  // resolving to different versions, then verify both appear in the result.
  // (Out of scope for this plan — add if convenient.)
});
```

If Plan 004 is NOT done yet, no automated test is added by this plan. The fix
is small enough to verify by reading the logic.

## Done criteria

- [ ] `src/lock-parser/patterns/yarn.ts` line 45 condition is `if (value.version && !versions[pkgName])`
- [ ] `extractPackageName` helper function exists (module-level)
- [ ] `parseMultiVersion` method exists on `YarnLockfileAdapter`
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm run test:ci` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] Only `src/lock-parser/patterns/yarn.ts` modified
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- `pnpm run typecheck` reports that `parseMultiVersion` does not match the
  interface signature. Read `src/lock-parser/lock-file-adapter.ts` to confirm
  the exact return type expected, and adjust the implementation to match.
- Any existing test fails after the condition change. This should not happen
  since the fix only changes first-wins vs. last-wins ordering — the single
  fixture entry should be unaffected.

## Maintenance notes

- The `extractPackageName` helper is module-local. If a yarn v2+ format is ever
  supported, the helper may need to handle Berry's different lockfile key format.
- `parseMultiVersion` uses `.includes()` to deduplicate — this is O(n) per
  check, but yarn lockfiles typically have < 1000 packages with at most 2–3
  versions each. Not a performance concern.
- The caller (`src/lock-parser/index.ts`) checks `adapter.parseMultiVersion`
  optionally. This method is now implemented, so it will be called for yarn
  projects going forward.
