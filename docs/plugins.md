# hermex — Plugins

**hermex does not reinvent.** If another tool already does something better, it becomes a
plugin rather than a hermex rule. Linting is the type case: hermex orchestrates a linter
and folds its findings into one verdict — it never grows into one.

A plugin is a **plain object**. There is no factory to call, no package to install, and no
registration step.

```ts
export default {
  plugins: [
    {
      name: 'my-tool',
      hooks: {
        onRunComplete(ctx) {
          ctx.violations.add({
            ruleId: 'something-wrong',
            severity: 'warn',
            message: 'a human-readable description',
          });
        },
      },
    },
  ],
};
```

That contributes `my-tool/something-wrong` to the rules table, the JSON output, and the
compliance verdict.

---

## The hook

`onRunComplete` runs **once**, after hermex has finished its own analysis and evaluated its
own rules, and **before anything is rendered**. So a plugin sees the complete picture, and
what it contributes still reaches the verdict and the exit code.

It is the only hook today. `hooks` is an object so that more can be added later without
changing anything you have already written — but note that hermex **rejects an unknown hook
name** rather than ignoring it. A plugin built against a newer hermex fails loudly instead
of half-running:

```
Unknown hook `onFileParsed`. This version of hermex supports: onRunComplete.
```

Plugins run **sequentially, in array order**. There is no `enforce: pre | post` and no
dependency graph: with a single hook there is nothing for one plugin to wait on, so order
only affects how the output reads.

## The context

```ts
interface PluginContext {
  cwd: string;
  config: ResolvedHermexConfig;     // read-only, after overrides are applied
  files: readonly string[];         // in-scope files, post-exclude
  inventory: PluginInventoryView;   // summary, packages, components, versus, violations

  violations: { add(v): void };
  meta: { set(key, value): void; get(key): unknown };
  logger: { info(msg): void; warn(msg): void };
}
```

`inventory.violations` holds everything found so far — hermex's own rule violations plus
anything earlier plugins contributed. That is what a **reporter** plugin reads: one that
ships findings to SARIF, Slack or a dashboard and adds nothing itself.

`meta` is a scratch channel shared across plugins for a single run, so one plugin can hand
structured data to a later one without a global. It is not yet part of the JSON output.

There are deliberately **no host capabilities** — no `resolve()`, no `emitFile()`. With one
terminal hook there is no pipeline left to re-enter.

## What a plugin contributes

```ts
ctx.violations.add({
  ruleId: 'no-unused-vars',              // namespaced to `<plugin>/no-unused-vars`
  severity: 'error' | 'warn' | 'info',
  message: 'x is never read',
  files: ['src/a.tsx'],                  // optional
  location: { file: 'src/a.tsx', line: 12, column: 3 },  // optional
});
```

**Granularity is yours.** One aggregated row or three thousand line-level ones are both
valid — you know the tool you are wrapping and hermex does not.

**Severity is yours too.** hermex has no lever over it: there is no
`rules: { 'my-tool/x': 'off' }`, and `overrides` does not reach plugin findings. That is
deliberate — `hermex.config.ts` must not become a second, drifting place to configure
another tool. Tune the tool in **its own config**, and expose whatever knobs your plugin
needs in your plugin's own idiom:

```ts
const myTool = ({ severity = 'warn' } = {}) => ({ name: 'my-tool', hooks: { /* … */ } });
```

An `error` fails `hermex comply` through the ordinary verdict path — there is no separate
pass/fail channel, so a red build always has a row in the table explaining it.

## Failure

**If a hook throws, the run aborts with exit code 2.** It reports neither pass nor fail: a
governance tool that stays green because its lint plugin silently did not run is worse than
one that stops and says so. Handle errors you consider acceptable inside your own hook.

## Trust

hermex does **not** sandbox plugins. It cannot meaningfully do so — `hermex.config.ts` is
already executed as arbitrary TypeScript, so a plugin is not a new trust boundary. hermex's
obligation is visibility instead: every run names the plugins that executed.

```
✔ Ran 1 plugin(s): oxlint — 47 finding(s)
```

Treat a plugin like any other dependency you let run in your repo.

---

## Recipe: oxlint

There is no `hermex-plugin-oxlint` package to install, on purpose. The plugin is short
enough to own, and owning it means no version to keep in step with hermex.

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HermexConfigInput } from 'hermex';

const exec = promisify(execFile);

const oxlintPlugin = ({ severity = 'warn' as const } = {}) => ({
  name: 'oxlint',
  hooks: {
    async onRunComplete(ctx) {
      let stdout = '';
      try {
        ({ stdout } = await exec('oxlint', ['--format', 'json', ...ctx.files], {
          cwd: ctx.cwd,
          // node_modules/.bin is not on PATH outside npm scripts.
          env: { ...process.env, PATH: `${ctx.cwd}/node_modules/.bin:${process.env.PATH}` },
          // On Windows those are .cmd shims, which execFile cannot spawn directly.
          shell: process.platform === 'win32',
          maxBuffer: 64 * 1024 * 1024,
        }));
      } catch (err: any) {
        // oxlint exits non-zero *when it finds problems* — stdout is still valid.
        // Only a genuine failure (missing binary, bad flag) has no stdout.
        if (!err?.stdout) throw err;
        stdout = err.stdout;
      }

      for (const d of JSON.parse(stdout).diagnostics ?? []) {
        ctx.violations.add({
          ruleId: d.code ?? 'unknown',
          severity,
          message: d.message,
          location: { file: d.filename, line: d.labels?.[0]?.line },
        });
      }
    },
  },
});

export default {
  plugins: [oxlintPlugin({ severity: 'warn' })],
} satisfies HermexConfigInput;
```

Start at `severity: 'warn'` so the first run shows you everything without failing the
build, and tighten to `'error'` once the backlog is clear.

Three things that bite, all of them oxlint's shape rather than hermex's:

1. **oxlint exits non-zero when it finds problems.** `execFile` treats that as a throw, so
   read `stdout` off the error.
2. **`node_modules/.bin` is not on `PATH`** outside npm scripts — prepend it.
3. **On Windows those are `.cmd` shims**, which `execFile` cannot spawn without `shell`.

### The no-install variant

If your CI job runs `npx hermex comply` without `pnpm install`, nothing is available to
spawn. Have a prior CI step write the report and let the plugin ingest it — this needs no
`node_modules` at all:

```yaml
- run: pnpm oxlint --format json > oxlint.json || true
- run: npx hermex comply
```

```ts
import { readFileSync, existsSync } from 'node:fs';

const oxlintReport = ({ path = 'oxlint.json', severity = 'warn' as const } = {}) => ({
  name: 'oxlint',
  hooks: {
    onRunComplete(ctx) {
      if (!existsSync(path)) throw new Error(`${path} not found — did the lint step run?`);
      for (const d of JSON.parse(readFileSync(path, 'utf8')).diagnostics ?? []) {
        ctx.violations.add({ ruleId: d.code ?? 'unknown', severity, message: d.message });
      }
    },
  },
});
```

## Keeping your config npx-safe

`npx hermex` works in a repo with **no `node_modules`** — but only if your config imports
nothing that has to be resolved from `node_modules`. Node resolves bare specifiers relative
to the importing file, and `npx`'s temp directory is not on that path.

| in `hermex.config.ts` | resolves without `node_modules`? |
| --- | --- |
| `import type { … } from 'hermex'` | ✅ erased before it runs |
| `import { execFile } from 'node:child_process'` | ✅ builtin |
| `import { anything } from 'some-package'` | ❌ `ERR_MODULE_NOT_FOUND` |

So: **declare plugins inline**, use `import type` and `node:` builtins only, and prefer
`satisfies HermexConfigInput` over a runtime `defineConfig` import. Then the same config
works whether or not anything is installed.
