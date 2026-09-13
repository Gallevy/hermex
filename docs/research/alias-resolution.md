# How comparable tools resolve webpack and Vite path aliases

Research for wayfinder ticket #120.

**Question.** hermex needs to follow imports like `@/components/Button` and
`~lib/utils`. Those specifiers are meaningless to Node's resolver — they only
work because some bundler was configured to rewrite them. How do comparable
tools learn that mapping?

**Hard constraint.** hermex must not execute arbitrary user bundler config as
part of analysis. This rules out one of the four strategies outright, so the
research is really about what the remaining three cost.

**Method.** Every claim below is cited to the tool's own documentation or its
own source code. No blog posts, no secondary summaries.

---

## The four strategies

| # | Strategy | Correctness | Safety | Setup burden |
|---|---|---|---|---|
| A | Read `tsconfig.json` `compilerOptions.paths` | High where it applies | Total — parsing JSON | Zero |
| B | Statically parse the bundler config | Low, and silently so | Total | Zero |
| C | Execute the bundler config, read the resolved object | Highest ceiling, brittle floor | None | Zero, until it breaks |
| D | Make the user restate aliases in the tool's own config | Exactly as good as the user is | Total | High, and duplicated |

## Summary of findings

| Tool | Strategy | Notes |
|---|---|---|
| **knip** | A + C + D | tsconfig `paths` automatically; **executes** `webpack.config.*` and `vite.config.*` via `jiti` and reads `resolve.alias`; own `paths` option as the escape hatch |
| **madge** | A + C | Delegates to `filing-cabinet`, which `require()`s the webpack config for `.js`, and uses `tsconfig-paths` for `.ts` |
| **ts-morph / TS compiler API** | A only | `compilerOptions.paths` is the entire mechanism. No concept of a bundler alias. Escape hatch is a programmatic `resolutionHost`, not a config file |
| **eslint-plugin-import** | Split by resolver: A, C, or D | `-typescript` = A, `-webpack` = C (`require`s the config), `-alias` = D |

Nobody in the surveyed set implements strategy B. That absence is the single
most useful finding in this document, and [§5](#5-why-nobody-statically-parses-the-bundler-config)
explains why.

---

## 1. knip

knip is the most instructive case because it does three of the four strategies
at once, and documents the resulting damage.

### A — tsconfig paths, automatically

> "Tools like TypeScript, webpack and Babel support import aliases in various
> ways. Knip automatically includes `compilerOptions.paths` from the TypeScript
> configuration, but does not automatically use other types of import aliases."

— <https://knip.dev/reference/configuration>

### D — its own `paths` option

The same page continues, "They can be configured manually:", with a `paths`
block that deliberately mirrors TypeScript's shape:

```json
{
  "paths": {
    "@lib": ["./lib/index.ts"],
    "@lib/*": ["./lib/*"]
  }
}
```

knip's plugin-authoring docs confirm that everything funnels into one
representation:

> "The `alias` input type adds path aliases to the core module resolver.
> They're added to `compilerOptions.paths` so the syntax is identical."

— <https://knip.dev/writing-a-plugin/inputs>

This is worth copying. knip has one internal alias model — TypeScript's — and
every source of aliases is normalised into it. That keeps the resolver from
growing a second code path per bundler.

### C — it executes the bundler config

Config files are loaded through a single helper that ends in a `jiti` import:

```ts
// packages/knip/src/util/loader.ts
return await jiti.import(filePath, { default: true });
```

— <https://github.com/webpro-nl/knip/blob/main/packages/knip/src/util/loader.ts>

`jiti` is a production dependency of the `knip` package, alongside
`oxc-resolver` and `get-tsconfig`
(<https://github.com/webpro-nl/knip/blob/main/packages/knip/package.json>).

The webpack plugin then treats the imported value as live code. It calls the
config function — twice, to cover both modes — and walks `resolve.alias`:

```ts
// Projects may use a single config function for both development and production modes, so resolve it twice
const passes = typeof config === 'function' ? [false, true] : [isProduction];
// ...
const resolvedConfig = typeof config === 'function' ? await config(env, argv) : config;
// ...
if (opts.resolve?.alias) processAlias(opts.resolve.alias);
if (opts.resolveLoader?.alias) processAlias(opts.resolveLoader.alias);
```

— <https://github.com/webpro-nl/knip/blob/main/packages/knip/src/plugins/webpack/index.ts>

`processAlias` in the same file handles webpack's trailing-`$` exact-match form
and array-valued aliases, converting each into a `toAlias(...)` input — i.e.
into `compilerOptions.paths` syntax, per the model above.

Vite goes through the same door. `plugins/vite/index.ts` re-exports the vitest
plugin's `resolveConfig`
(<https://github.com/webpro-nl/knip/blob/main/packages/knip/src/plugins/vite/index.ts>),
and that resolver invokes the exported config function across the command/mode
matrix before reading aliases:

```ts
if (typeof config === 'function') {
  for (const command of ['serve', 'build'] as COMMAND[]) {
    for (const mode of ['development', 'production'] as MODE[]) {
      const cfg = await config({ command, mode, ssrBuild: undefined });
// ...
if (cfg.test.alias) addAliases(cfg.test.alias);
if (cfg.resolve?.alias) addAliases(cfg.resolve.alias);
```

— <https://github.com/webpro-nl/knip/blob/main/packages/knip/src/plugins/vitest/index.ts>

Note the shape of that: knip cannot know which `(command, mode)` pair the user
cares about, so it runs the config function four times and unions the results.
Execution does not actually give you *the* resolved config; it gives you one
config per hypothetical invocation.

### What it costs knip

knip documents the fallout on a dedicated page. The failure is not exotic — it
has its own error message:

> ```
> $ knip
> ERROR: Error loading vite.config.ts
> ```
>
> "Knip may load such files differently, in a different environment, with
> missing environment variables, missing path aliases, etcetera."

— <https://knip.dev/reference/known-issues>

The listed workarounds are a good inventory of everything that breaks when you
execute someone else's config: install dependencies, replace relative paths
with `path.resolve()`, set environment variables (`KEY=VAL knip`,
`node --env-file .env $(which knip)`), *run the build script to generate
required files*, disable the plugin, or ignore the workspace entirely.

There is a second, delicious failure on the same page: the config file may
itself use path aliases.

> ```
> Error loading .../cypress.config.ts
> Reason: Cannot find module '@alias/name'
> ```

The suggested fixes are `NODE_OPTIONS="--import tsx" knip` or
`NODE_OPTIONS="--import tsconfig-paths/register.js" knip`. A tool that executes
config in order to learn aliases needs to already know the aliases in order to
execute the config.

---

## 2. madge

madge exposes three alias-related options and does the work in dependencies:

| Option | Documented description |
|---|---|
| `requireConfig` | "RequireJS config for resolving aliased modules" |
| `webpackConfig` | "Webpack config for resolving aliased modules" |
| `tsConfig` | "TypeScript config for resolving aliased modules - Either a path to a tsconfig file or an object containing the config" |

— <https://github.com/pahen/madge/blob/master/README.md>

All three are passed straight through to `dependency-tree`
(<https://github.com/pahen/madge/blob/master/lib/tree.js>), and the README is
explicit about the delegation and its consequence:

> "Madge uses dependency-tree which uses filing-cabinet to resolve modules.
> However it requires configurations for each file type (js/jsx) and (ts/tsx).
> So provide both `webpackConfig` and `tsConfig` options to madge."

That sentence is the tell: in a mixed JS/TS repo the user must supply the same
alias set twice, in two formats, because two different resolvers are involved.

Inside `filing-cabinet`, the split is exactly strategy C for webpack and
strategy A for TypeScript:

```js
// webpack path — the config is required and, if callable, called
loadedConfig = require(webpackConfig);
if (typeof loadedConfig === 'function') {
  loadedConfig = loadedConfig();
}
```

The resolved `resolve` section is then handed to `enhanced-resolve`'s
`create.sync()`. TypeScript takes a different route entirely, via
`tsconfig-paths`:

```js
const tsMatchPath = createMatchPath(absoluteBaseUrl, compilerOptions.paths);
const resolvedTsAliasPath = tsMatchPath(dependency, undefined, undefined, extensions);
```

— <https://github.com/dependents/node-filing-cabinet/blob/master/index.js>

The webpack branch bails if the config returns a Promise, since the surrounding
code is synchronous. So madge inherits both the execution risk and a narrower
subset of valid webpack configs than webpack itself accepts.

---

## 3. ts-morph and the TypeScript compiler API

This is the clean case: **strategy A and nothing else**. TypeScript has no
notion of a bundler alias and never has.

`paths` is defined as:

> "A series of entries which re-map imports to lookup locations relative to the
> `baseUrl` if set, or to the tsconfig file itself otherwise."

and carries an explicit disclaimer:

> "this feature does not change how import paths are emitted by `tsc`, so
> `paths` should only be used to inform TypeScript that another tool has this
> mapping and will use it at runtime or when bundling."

— <https://www.typescriptlang.org/tsconfig/paths.html>

The modules reference is blunter:

> "**The `paths` option does _not_ change the import path in the code emitted by
> TypeScript.** Consequently, it's very easy to create path aliases that appear
> to work in TypeScript but will crash at runtime"

— <https://www.typescriptlang.org/docs/handbook/modules/reference.html>

**This is the load-bearing fact for hermex.** `compilerOptions.paths` is, by
design, a *declaration that some other tool performs this mapping*. It is the
one place in the repo where the alias set is written down in a static,
machine-readable, non-executable form, specifically so that tools other than
the bundler can read it. Reading it is not a workaround for not executing the
bundler config; it is the intended interface.

The programmatic surface is `resolveModuleName`, driven by whatever
`CompilerOptions` you hand it:

> `resolveModuleName(moduleName: string, containingFile: string, options: CompilerOptions, moduleResolutionHost: ModuleResolutionHost): ResolvedModuleNameWithFallbackLocations`

with a `CompilerHost.resolveModuleNames(moduleNames, containingFile)` hook for
overriding resolution wholesale.

— <https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API>

ts-morph is a thin wrapper over this. You point it at a tsconfig with
`tsConfigFilePath`, and for non-standard resolution you pass a `resolutionHost`
factory that receives the module resolution host and compiler options
(<https://ts-morph.com/setup/>). Note the shape of ts-morph's escape hatch: it
is a **function you write in code**, not a config file it reads. ts-morph never
takes on the job of interpreting a third-party build config.

---

## 4. eslint-plugin-import

eslint-plugin-import itself resolves nothing. It defines a resolver interface
and ships several implementations, referenced by the convention
`eslint-import-resolver-[name]`
(<https://github.com/import-js/eslint-plugin-import>). The README is candid
about why the abstraction exists:

> "webpack allows a number of things in import module source strings that Node
> does not, such as loaders (`import 'file!./whatever'`) and a number of
> aliasing schemes"

Each resolver picks a different strategy, which makes this the best natural
experiment in the survey.

### `eslint-import-resolver-typescript` — strategy A

> "Use `paths` defined in `tsconfig.json`"

Options are `project` (tsconfig path or glob), `alwaysTryTypes`, `bun`, plus
pass-through options for the underlying `unrs-resolver` (`conditionNames`,
`extensions`, `extensionAlias`, `mainFields`). There is no option to read a
webpack or Vite config.

— <https://github.com/import-js/eslint-import-resolver-typescript>

### `eslint-import-resolver-webpack` — strategy C

It `require()`s the config file:

```js
webpackConfig = require(configPath);
// ...
if (typeof webpackConfig === 'function') { /* invoked with env, argv */ }
```

and, to make `require` work on non-`.js` configs, it registers a compiler
(ts-node and friends) off the `interpret` extension table before requiring:

```js
registerCompiler(interpret.extensions[extension]);
```

— <https://github.com/import-js/eslint-plugin-import/blob/main/resolvers/webpack/index.js>

Its README enumerates the sharp edges honestly:

> "If your config relies on environment variables, they can be specified using
> the `env` parameter. If your config is a function, it will be invoked with the
> value assigned to `env`."

> a function config "will be evaluated at every resolution" unless you opt into
> the `cache` parameter

> "Only 'synchronous' Webpack configs are supported at the moment. If your
> config returns a `Promise`, this will cause problems."

Plus a disambiguation rule for multi-config repos: it uses the first config
containing a `resolve` section, unless you set `config-index`.

— <https://github.com/import-js/eslint-plugin-import/blob/main/resolvers/webpack/README.md>

Read that list as a spec for what strategy C actually requires you to
re-implement: env injection, arity-dependent function invocation, per-file
caching to avoid re-executing user code on every resolution, sync-only
restriction, and a multi-config tiebreaker. And note that "evaluated at every
resolution" means the default behaviour of this resolver is to execute user
build code in a hot loop.

### `eslint-import-resolver-alias` — strategy D

The user restates the mapping in ESLint settings:

```js
settings: {
  'import/resolver': {
    alias: {
      map: [
        ['helper', './utils/helper'],
        ['material-ui', 'material-ui-ie10'],
      ],
      extensions: ['.ts', '.js', '.jsx', '.json'],
    },
  },
}
```

— <https://github.com/johvin/eslint-import-resolver-alias>

Notably, the ESLint ecosystem's *most used* resolver for aliased TS projects is
the tsconfig one, not the webpack one. The webpack resolver exists mainly for
pre-TypeScript codebases where no tsconfig-shaped declaration is available.

---

## 5. Why nobody statically parses the bundler config

Strategy B looks attractive from the outside: read `webpack.config.js` as an
AST, pluck `resolve.alias`, no execution, no risk. Nobody does it. The bundler
docs explain why.

**Webpack.** The canonical alias value in webpack's own documentation is a
function call, not a literal:

```js
resolve: {
  alias: {
    Utilities: path.resolve(__dirname, "src/utilities/"),
  },
}
```

Aliases may also end in `$` for exact match, be arrays of multiple roots,
contain `*` wildcards, or be `false` to blank a module out. And
`resolve.alias` is not even the only mechanism — `resolve.plugins` accepts
arbitrary resolver plugins.

— <https://webpack.js.org/configuration/resolve/>

**Vite.** The config is routinely a function, routinely async, and routinely
computed:

> "If the config needs to conditionally determine options based on the command
> (`serve` or `build`), the mode being used… it can export a function instead"

> "If the config needs to call async functions, it can export an async function
> instead."

Aliases accept either an object or `Array<{ find: string | RegExp, replacement: string }>`,
where `find` may be a regular expression and `replacement` may use replacement
patterns; it "works similar to `@rollup/plugin-alias`", and anything harder is
pushed into plugins.

— <https://vite.dev/config/> and <https://vite.dev/config/shared-options.html>

The decisive detail: **Vite does not statically read its own config.** It
bundles `vite.config.ts` with Rolldown into a temporary file and executes that,
with `--configLoader native` as the alternative. And it deliberately withholds
`.env` values until after the config has been resolved, requiring `loadEnv` for
config-time env access (<https://vite.dev/config/>). If the tool that owns the
format has to bundle-and-execute to read it, a third-party static parser is not
going to do better.

A static parser would therefore handle `{'@': './src'}` and silently mis-handle
everything else. For a static-analysis tool, **silently wrong is strictly worse
than absent**: an unresolved import can be reported as unresolved, but an import
resolved to the wrong file corrupts every downstream metric — dependency graph,
dead-code detection, package distribution — with no signal that anything went
wrong. Strategy B trades a loud failure for a quiet one.

---

## 6. Does the `hermex.config.ts` carve-out hold up?

hermex already executes user code. `src/config/loader.ts` does:

```ts
const mod = await import(pathToFileURL(configPath).href);
return HermexConfigSchema.parse(mod.default ?? mod);
```

So: is "we don't execute bundler config, but we do execute our own config"
coherent, or is it a distinction without a difference?

**It holds — on two grounds, neither of which is "executing code is safe here".**

**1. Consent and ownership.** `hermex.config.ts` exists for one reason: the user
wrote it to configure hermex. Running `hermex scan` is an explicit invocation of
the program that file configures, and the file is only loaded because it is
sitting at the path hermex owns. This is the same contract vite, eslint, and
knip all operate under for their own config, and it is why that pattern was
accepted. `webpack.config.js` is a file written for a *different program*, under
a *different environment contract* — webpack sets a mode, passes `env`/`argv`,
and has already established its own module and plugin runtime before the config
evaluates. Nothing about running hermex constitutes consent to run webpack's
config outside of webpack. knip's known-issues page is the empirical proof that
this mismatch is not theoretical.

**2. Blast radius.** `hermex.config.ts` is a small, hermex-shaped file whose
transitive imports are typically just hermex's own `defineConfig` helper
(`src/index.ts` is documented as "safe to import from `hermex.config.ts`").
A real `webpack.config.js` imports the entire build plugin graph — every plugin
in `devDependencies` gets loaded and its constructor run, at analysis time, on
every scan. eslint-import-resolver-webpack's plain `require(configPath)` means
exactly that. Executing bundler config turns "hermex's dependency surface" into
"every build tool in the repo", including anything that reads secrets, touches
the network, or writes files during construction. That is a categorical change
in exposure, not an incremental one.

**The caveat, stated plainly.** The distinction is about *conventional
expectation and scope*, not *isolation*. `await import()` of `hermex.config.ts`
is still arbitrary code execution in hermex's process. Under the threat model
"a user runs hermex against their own repository", that is fine and matches
every comparable tool. Under the threat model "hermex analyses untrusted code" —
CI on fork PRs, a hosted scanning service, an editor extension over a freshly
cloned repo — the carve-out evaporates, because a malicious `hermex.config.ts`
is just as effective as a malicious `webpack.config.js`. If hermex ever targets
that second model, the config loader needs a sandbox or a static format too. It
should not be assumed that today's carve-out survives that shift.

Worth noting alongside this: hermex's own standards already say "Never use
`eval()` and similar dynamic code execution" (`CLAUDE.md`, Security). Importing
third-party build config is squarely within the spirit of that rule.

---

## 7. Recommendation for hermex

Adopt a **two-tier, zero-execution** model, and reject the other two strategies
explicitly rather than leaving them open.

### Tier 1 (default, no configuration) — read `tsconfig.json`

Resolve `compilerOptions.paths` and `baseUrl`, honouring `extends` and
`references`. This is what TypeScript, ts-morph, `eslint-import-resolver-typescript`,
and knip-by-default all do, and per [§3](#3-ts-morph-and-the-typescript-compiler-api)
it is the officially intended consumer of that field: `paths` exists precisely
to tell non-bundler tools what the mapping is.

Two reinforcing points for a *frontend* TS tool specifically:

- Aliases almost always appear in `tsconfig.json` regardless of bundler, because
  otherwise the editor and `tsc` break on every aliased import.
- The ecosystem's own answer for Vite runs in this direction, not the other one.
  `vite-tsconfig-paths` exists to "Give vite the ability to resolve imports
  using TypeScript's path mapping"
  (<https://github.com/aleclarson/vite-tsconfig-paths>) — the bundler is made to
  follow tsconfig, not the reverse.

### Tier 2 (escape hatch) — an `alias` field in `hermex.config.ts`

For the residue: JS-only repos, webpack aliases that were never mirrored into
tsconfig, `resolveLoader` aliases. Follow knip's design lesson and normalise
every source into **one** internal representation with TypeScript `paths`
semantics, so the resolver has a single code path
(<https://knip.dev/writing-a-plugin/inputs>). Precedents: knip's `paths`
(<https://knip.dev/reference/configuration>) and
`eslint-import-resolver-alias`'s `map`.

The setup burden is real but bounded, one-time, and — critically — *declarative*.
It is the cost madge already imposes on every mixed JS/TS user, who must supply
both `webpackConfig` and `tsConfig`.

### Reject strategy C (execute the bundler config)

Per the constraint, and independently justified by [§1](#1-knip) and
[§6](#6-does-the-hermexconfigts-carve-out-hold-up). Even setting safety aside,
correctness is not the win it appears to be: knip must invoke a Vite config four
times across the command/mode matrix and union the results, because there is no
single "resolved object" to read.

### Reject strategy B (statically parse the bundler config) as a *resolution source*

Per [§5](#5-why-nobody-statically-parses-the-bundler-config). Silently-wrong
resolution is worse than no resolution.

**One narrow, optional exception**, if the setup burden of Tier 2 proves too
high in practice: statically scan `vite.config.*` / `webpack.config.*` for
literal string alias pairs and use them **only as a diagnostic hint** —
"`vite.config.ts` appears to alias `@` but it is not declared in `tsconfig.json`
`paths` or `hermex.config.ts`; unresolved imports may be under-reported." Never
feed the guess into the graph. This keeps the failure loud and moves the user
toward a declaration, without ever making the analysis depend on a parse that
cannot be correct in general.

### Implementation note

`oxc-resolver` covers both tiers in one dependency, and hermex is already in the
oxc/SWC ecosystem. Its documented feature set includes a "Built-in
tsconfig-paths-webpack-plugin" supporting "paths alias defined in
`tsconfig.compilerOptions.paths`" and "project references defined
`tsconfig.references`", plus a programmatic `alias` option ("A hash map of module
alias configurations") and a `fallback` option applied only when default
resolution fails (<https://github.com/oxc-project/oxc-resolver>). Tier 1 maps to
its tsconfig support, Tier 2 maps to `alias`. knip ships it as a production
dependency for the same reason
(<https://github.com/webpro-nl/knip/blob/main/packages/knip/package.json>).

### Cross-cutting requirement

Whatever ships, **unresolved specifiers must be reported, not dropped**. That is
what makes the no-execution choice safe: the cost of a missing alias is a
visible, actionable diagnostic rather than a quietly incomplete dependency graph.

---

## Sources

All accessed for ticket #120.

**knip**
- <https://knip.dev/reference/configuration>
- <https://knip.dev/writing-a-plugin/inputs>
- <https://knip.dev/reference/known-issues>
- <https://knip.dev/explanations/plugins>
- <https://github.com/webpro-nl/knip/blob/main/packages/knip/src/util/loader.ts>
- <https://github.com/webpro-nl/knip/blob/main/packages/knip/src/plugins/webpack/index.ts>
- <https://github.com/webpro-nl/knip/blob/main/packages/knip/src/plugins/vite/index.ts>
- <https://github.com/webpro-nl/knip/blob/main/packages/knip/src/plugins/vitest/index.ts>
- <https://github.com/webpro-nl/knip/blob/main/packages/knip/package.json>

**madge**
- <https://github.com/pahen/madge/blob/master/README.md>
- <https://github.com/pahen/madge/blob/master/lib/tree.js>
- <https://github.com/dependents/node-filing-cabinet/blob/master/index.js>

**TypeScript / ts-morph**
- <https://www.typescriptlang.org/tsconfig/paths.html>
- <https://www.typescriptlang.org/docs/handbook/modules/reference.html>
- <https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API>
- <https://ts-morph.com/setup/>

**eslint-plugin-import and resolvers**
- <https://github.com/import-js/eslint-plugin-import>
- <https://github.com/import-js/eslint-plugin-import/blob/main/resolvers/webpack/index.js>
- <https://github.com/import-js/eslint-plugin-import/blob/main/resolvers/webpack/README.md>
- <https://github.com/import-js/eslint-import-resolver-typescript>
- <https://github.com/johvin/eslint-import-resolver-alias>

**Bundlers and resolvers**
- <https://webpack.js.org/configuration/resolve/>
- <https://vite.dev/config/>
- <https://vite.dev/config/shared-options.html>
- <https://github.com/aleclarson/vite-tsconfig-paths>
- <https://github.com/oxc-project/oxc-resolver>

**hermex**
- `src/config/loader.ts`
- `CLAUDE.md` (Security)
