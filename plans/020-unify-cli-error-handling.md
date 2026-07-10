# Plan 020: Unify scan/comply error handling and shared command boilerplate

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 19a4695..HEAD -- src/commands/scan.ts src/commands/comply.ts`
> If these files changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / dx
- **Planned at**: commit `19a4695`, 2026-07-04

## Why this matters

`scan` and `comply` diverge in how they fail, and duplicate ~15 lines of
setup:

1. **`scan` calls `process.exit(1)`; `comply` sets `process.exitCode`.**
   `process.exit` terminates before async stdout writes are flushed — on a
   piped large JSON output that can truncate; `process.exitCode` lets the
   event loop drain. One command chose the safe pattern, the other didn't.
2. **Both dump the raw error object** with `console.error(error)` right after
   already printing a formatted message via `spinner.fail(...)`. Users get
   the message twice plus a stack trace on every ordinary failure (e.g. "No
   supported lockfile found" — an expected condition — prints a stack).
3. **The spinner/version/stream setup block is copy-pasted** in both commands
   and will be pasted again for the next command.

## Current state

**`src/commands/scan.ts:32-56`**:
```ts
export async function executeScan(config: HermexConfig) {
  const isJson = config.output.format === 'json';
  const versionStream = isJson ? process.stderr : process.stdout;
  versionStream.write(chalk.gray(`hermex v${getVersion()}\n`));
  const spinner = ora({
    text: 'Parsing lockfile...',
    stream: isJson ? process.stderr : process.stdout,
  }).start();

  try {
    const aggregated = await runPipeline(config, spinner);
    if (!aggregated) return;
    ...
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red('Analysis failed: ' + message));
    console.error(error);
    process.exit(1);
  }
}
```

**`src/commands/comply.ts:30-67`** — same shape: identical `isJson` /
`versionStream` / spinner block (lines 31–37), catch block with
`console.error(error)` (line 64) but `process.exitCode = 2` (line 65). Note
comply's exit-code semantics: 0 compliant, 1 non-compliant, 2 execution error
— these are load-bearing for CI users and must not change.

**e2e coverage**: `tests/e2e/cli.test.ts` runs the built CLI against fixture
configs, including comply pass/fail/json cases that assert exit codes.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Build     | `pnpm run build`     | exit 0              |
| Tests     | `pnpm run test:ci`   | all pass (e2e exercises exit codes) |
| Lint      | `pnpm run lint`      | exit 0              |

## Scope

**In scope**:
- `src/commands/command-context.ts` — create (shared setup helper)
- `src/commands/scan.ts` — use helper; `process.exitCode = 1` + `return`
  instead of `process.exit(1)`; drop `console.error(error)`
- `src/commands/comply.ts` — use helper; drop `console.error(error)`

**Out of scope** (do NOT touch):
- `src/commands/pipeline.ts` — pipeline behavior unchanged
- Exit-code *values* (scan failure 1; comply 0/1/2) — consumers depend on them
- `src/cli.ts`, print utilities

## Git workflow

- Branch: `advisor/020-unify-cli-error-handling`
- Commit message: `refactor: unify command error handling and shared spinner setup`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create src/commands/command-context.ts

```ts
import ora from 'ora';
import type { Ora } from 'ora';
import chalk from 'chalk';
import { getVersion } from '../utils/version';
import type { HermexConfig } from '../config/types';

export interface CommandContext {
  isJson: boolean;
  spinner: Ora;
}

/**
 * Shared command preamble: routes human-readable chrome (version line,
 * spinner) to stderr when the command emits JSON on stdout.
 */
export function createCommandContext(config: HermexConfig): CommandContext {
  const isJson = config.output.format === 'json';
  const stream = isJson ? process.stderr : process.stdout;
  stream.write(chalk.gray(`hermex v${getVersion()}\n`));
  const spinner = ora({ text: 'Parsing lockfile...', stream }).start();
  return { isJson, spinner };
}
```

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: Rewire scan.ts

Replace lines 33–39 with `const { isJson, spinner } = createCommandContext(config);`
and change the catch block to:

```ts
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red('Analysis failed: ' + message));
    process.exitCode = 1;
  }
```

(no `console.error`, no `process.exit`). Remove now-unused imports (`ora`,
`getVersion`) — keep `chalk` (still used in the catch).

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Rewire comply.ts

Same substitution for lines 31–37. In the catch block, remove only the
`console.error(error)` line — keep `process.exitCode = 2` and the message.

**Verify**: `pnpm run typecheck && pnpm run build` → exit 0.

### Step 4: Full suite

```
pnpm run test:ci && pnpm run lint
```

All pass — the e2e tests assert exit codes 0/1/2 for comply and JSON output
for scan; they are the safety net for this refactor.

## Test plan

No new tests: `tests/e2e/cli.test.ts` already pins the observable contract
(exit codes, JSON on stdout, human output on the right streams). If it lacks
a scan-failure exit-code case, that is acceptable — adding one requires a
fixture with a missing lockfile and is noted as deferred below.

## Done criteria

- [ ] `grep -rn "process.exit(" src/` → no matches (only `process.exitCode` assignments remain)
- [ ] `grep -rn "console.error(error)" src/commands/` → no matches
- [ ] Both commands use `createCommandContext`
- [ ] `pnpm run typecheck`, `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` all exit 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- An e2e test fails on exit codes after Step 2 — the `process.exit` →
  `process.exitCode` swap changed observable behavior somewhere; report the
  failing case, do not chase it by reintroducing `process.exit`.
- Commander turns out to swallow the rejected promise so the process exits 0
  on scan failure — verify by running the built CLI in an empty temp dir
  (`node dist/cli.mjs scan`; expect non-zero exit). If it exits 0, STOP and
  report: the action handler needs an explicit wrapper, which is a design
  choice.

## Maintenance notes

- New commands should start from `createCommandContext` — that is the point.
- If a `--verbose`/`--debug` flag is ever added (it is on the maintainer's
  TODO list), the dropped `console.error(error)` stack dump is exactly what
  should return behind that flag.
- Deferred: an e2e case for scan's failure exit code in a lockfile-less dir.
