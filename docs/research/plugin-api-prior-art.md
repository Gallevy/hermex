# Plugin API prior art

Research for the hermex plugin API design. The question: how do comparable tools model
plugins, and which model fits a tool whose plugins are **pipeline steps, not custom rules**?

hermex's settled principle is that it does not reinvent — if an existing tool does something
better, it becomes a plugin step, not a hermex rule. Linting is the type case: hermex would
orchestrate a linter, never grow into one. That framing makes the question less "how do
linters let you add rules" and more "how do build tools let you add stages", but the linters
are still worth reading, because they are the tools that have lived longest with the failure
modes.

All sources below are primary: official documentation, the projects' own RFCs and design
discussions, and their own issue trackers.

---

## 1. ESLint (flat config)

### What it does

An ESLint plugin is a plain JavaScript object exposing a fixed set of keys — `meta`,
`rules`, `configs`, `processors`, and (since v9) `languages`
([Plugins](https://eslint.org/docs/latest/extend/plugins)). There is no registration call and
no lifecycle: the plugin is data, and ESLint reads it.

A rule inside `rules` is itself an object with `meta` and a `create(context)` function.
`create()` returns a **visitor object**: keys are AST node types or selectors
(`Identifier`, `FunctionExpression:exit`) and values are callbacks invoked during traversal
([Custom Rules](https://eslint.org/docs/latest/extend/custom-rules)). The rule never drives
the traversal; ESLint does, and calls the rule back.

**Namespacing is the config author's decision, not the plugin's.** In flat config, `plugins`
is an object mapping a namespace key to a plugin object, and rule IDs are then
`namespace/rule-name`:

```js
export default defineConfig([
  {
    plugins: { example },
    rules: { "example/rule1": "warn" },
  },
]);
```

The docs are explicit that the prefix is not fixed by the plugin —
you can specify any prefix you like
([Configure Plugins](https://eslint.org/docs/latest/use/configure/plugins)). Convention is the
npm name minus `eslint-plugin-`. Plugins may also be declared inline in the config as virtual
plugins, with rules defined right there in the config object.

**What `context` carries.** The context object is overwhelmingly *read-only information about
the current lint target*, plus one way to speak: `id`, `filename`, `physicalFilename`, `cwd`,
`options` (the configured rule options array), `settings` (shared config bag), `sourceCode`,
and `languageOptions` (`sourceType`, `ecmaVersion`, `parser`, `parserOptions`, `globals`). The
single output channel is `context.report(descriptor)`, taking `messageId`/`message`,
`node`/`loc`, `data`, an optional `fix(fixer)`, and optional `suggest` entries
([Custom Rules](https://eslint.org/docs/latest/extend/custom-rules)). A rule cannot ask ESLint
to resolve a module, run another rule, or emit a file. It observes and it reports.

**Config resolution.** Flat config is an array. Every object may carry `files`/`ignores` to
scope itself; objects with neither apply to any file matched by another object. When several
objects match a file, they merge, with later objects overriding earlier ones on conflict
([Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)).
For rules this means last-writer-wins on severity and options — options are replaced, not
merged. So plugin-provided shareable configs interact with user rules purely by array
position.

### What it gets right

- **The plugin is inert data.** No side effects at load, nothing to boot. That makes configs
  serializable, testable, and cheap to compose.
- **Inversion of control on traversal.** Rules declare which nodes they care about; ESLint
  parses once and dispatches. Every rule pays only for the nodes it asked for — the same idea
  Biome later reaches for when it says plugins should only cost on patterns they care about
  ([RFC #1762](https://github.com/biomejs/biome/discussions/1762)).
- **Flat config deliberately traded magic for explicitness.** The RFC's own diagnosis is that
  `.eslintrc` had too many merging strategies (cascading, extending, overriding), loading
  strategies (plugins, processors, parsers), and naming conventions, and that the format was
  describing *what* should happen rather than *how*
  ([config-simplification RFC](https://github.com/eslint/rfcs/blob/main/designs/2019-config-simplification/README.md)).
  Flat config replaced name-based resolution with ordinary JS imports: the user resolves the
  plugin, ESLint never guesses.

### What users actually complain about

- **Namespacing collisions are now a *config* problem, and the ecosystem feels it.** Because
  the config author names the plugin, two shareable configs can register the same plugin under
  different namespaces. Result: the same violation reported twice under two rule IDs, and no
  way to silence one, plus unresolvable option conflicts when both configure the same
  underlying rule differently
  ([Discussion #17766](https://github.com/eslint/eslint/discussions/17766)). The maintainer
  reply was that it is too early to call this a problem and the ecosystem should converge by
  convention.
- **"Cannot redefine plugin."** If the same namespace is bound to two different plugin object
  *instances* — e.g. importing the plugin directly *and* spreading its recommended config —
  ESLint throws
  ([Issue #17371](https://github.com/eslint/eslint/issues/17371)). Identity is by object
  reference, which is invisible in the config file that triggers it.
- **The retrofit confirms the diagnosis.** ESLint now recommends plugins ship
  `meta.namespace`, precisely so `defineConfig()` can find a plugin even when the user
  assigned it a different namespace
  ([Plugins](https://eslint.org/docs/latest/extend/plugins)). That is the tool re-introducing
  a canonical identity after having handed naming to the config author.
- **Last-writer-wins option merging** gives no way for a config to say "keep the base options
  and change one field."

---

## 2. oxlint

### What it does

The premise that oxlint deliberately withholds a plugin API is **out of date**. oxlint now
ships JS plugins, in alpha, with an API deliberately compatible with ESLint v9+
([JS Plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins)). Plugins are listed in a
`jsPlugins` array and their rules referenced by namespace:

```json
{
  "jsPlugins": ["./path/to/my-plugin.js", "eslint-plugin-whatever"],
  "rules": {
    "my-plugin/rule1": "error",
    "whatever/rule1": "error"
  }
}
```

Aliases (`{"name": "jsdoc-js", "specifier": "eslint-plugin-jsdoc"}`) exist specifically to
avoid collisions with native oxlint plugins — an explicit answer to the ESLint namespace
problem above. Supported: AST traversal and exploration, rule options, selectors, `SourceCode`
APIs, scope and control-flow analysis, fixes, inline disable directives. Not supported: custom
parsers/file formats (Svelte, Vue, Angular) and type-aware rules.

### The stated reasoning

The reasoning is entirely about the **cost of the Rust/JS boundary**, not about restricting
what plugins may express. oxlint's position is that its performance is the product, and
compromising it too much would not be desirable
([JS Plugins Preview](https://oxc.rs/blog/2025-10-09-oxlint-js-plugins.html)). The identified
bottleneck is serialization: serializing the AST to JSON and rehydrating it in JS is
described as extremely slow. Their solution was not to narrow the API but to remove the cost —
"raw transfer", described as a low-level mechanism that reduces the cost of moving data
between Rust and JS almost to zero, plus a prototyped lazy-deserialization scheme
([JS Plugins Alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha)).

Two design commitments matter for us:

1. **Ecosystem compatibility over API invention.** The stated aim is to support 100% of
   ESLint's plugin API surface so oxlint can eventually run any ESLint plugin unmodified
   ([JS Plugins Preview](https://oxc.rs/blog/2025-10-09-oxlint-js-plugins.html)). They also
   offer a faster native alternative (`defineRule` with `createOnce`) *alongside* the
   compatible API rather than instead of it.
2. **Alternatives were weighed and deferred.** Rust-only plugins and WASM (WIT components)
   were both raised; the maintainer position was that WASM is not off the table but not
   planned for a good while, and that JS plugin support and AST stability come first
   ([Discussion #10342](https://github.com/oxc-project/oxc/discussions/10342)).

### What it gets right

- **Adopting the incumbent's API is a legitimate design choice.** It converts "write a plugin
  for us" into "your existing plugin works", which is the single biggest adoption lever
  available to a challenger tool.
- **Aliasing at the config layer** fixes ESLint's collision problem without giving up the
  config author's naming freedom.
- Reported results: 1m43s to 21s on the Node.js repo (4.8x) with plugins in play, and up to
  100x where plugins are used sparingly
  ([JS Plugins Alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha)).

### What users actually complain about

- Alpha status and the gaps that come with it: no custom parsers, so Vue/Svelte/Angular users
  cannot migrate; no type-aware rules, which is where a large share of real-world
  `typescript-eslint` value lives; token-based APIs still absent, so stylistic rules do not
  work ([JS Plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins),
  [JS Plugins Preview](https://oxc.rs/blog/2025-10-09-oxlint-js-plugins.html)).
- Out-of-memory errors on Windows are a known issue, with WSL suggested as the workaround
  ([JS Plugins Alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha)).

---

## 3. Biome

### What it does

Biome's shipped plugin mechanism is **GritQL**, a pattern-matching query language, not a
general API. A plugin is a `.grit` file referenced from config
([Linter Plugins](https://biomejs.dev/linter/plugins/)):

```json
{ "plugins": ["./path-to-plugin.grit"] }
```

with optional path scoping:

```json
{
  "plugins": [
    { "path": "./react-plugin.grit", "includes": ["src/components/**"] }
  ]
}
```

A plugin matches code patterns, reports diagnostics, and may declare a rewrite with `=>`.
Rewrites default to unsafe unless marked `fix_kind = 'safe'`. Suppression is only via
`lint/plugin` comments — plugin diagnostics are not individually addressable the way built-in
rules are.

### The stated reasoning

Biome's plugin RFC is the most useful document in this whole survey, because it is the one
that reasons explicitly about *how much power to give a plugin*
([RFC #1762](https://github.com/biomejs/biome/discussions/1762)):

- Performance is the product: one of Biome's main selling points is that it is much faster
  than the established alternatives.
- **Plugins must not drive traversal.** JavaScript plugins should not do their own syntax tree
  traversal, because that would introduce serialization overhead and computation on the plugin
  side. Nodes handed to plugins are deliberately impoverished — no trivia, no child
  statements — to avoid serialization overhead. Plugins should only cause overhead on the
  code patterns they are actually interested in.
- **GritQL first because it is cheaper and more approachable.** GritQL is expected to run much
  faster than JS plugins and should be preferred; the appeal is that end users can intuitively
  understand how to write plugins even without knowing AST internals
  ([GritQL under the Biome umbrella](https://biomejs.dev/blog/gritql-under-biome-umbrella/)).
- **Not everything should be a plugin.** The RFC states plainly that just because something
  *can* be a plugin does not mean it has to be — built-in rules remain preferred.
- Sandboxing was considered (V8 via Deno, for its built-in permissions model), and the author
  is hesitant about *requiring* npm to install Biome plugins — consistent with Biome's
  single-binary, zero-dependency positioning.

So Biome restricted plugins for two reasons that are worth separating: **the boundary cost**
(same as oxlint) and **a deliberate preference for upstreaming over distributing**.

### What users actually complain about

- **No distribution story.** Since v2 plugins exist, but users cannot distribute or share
  them. Design-system teams want to ship a plugin as an export of their components package;
  orgs want to share internal rules across repos; framework maintainers (Storybook, Next.js)
  have no official channel. The maintainer position is that Biome will support third parties
  who want to *upstream* rules into Biome via the domain system, and that plugins should stay
  company/organisation-specific
  ([Discussion #6265](https://github.com/biomejs/biome/discussions/6265)). This is a coherent
  stance, but it means a plugin system that cannot grow an ecosystem by design.
- **Expressiveness ceiling.** GritQL's AST story has known limits (comment support among
  them), the standard library and multi-file patterns were out of scope initially
  ([GritQL integration progress](https://github.com/biomejs/biome/discussions/2585)).
- **Semantic divergence from upstream Grit.** Queries that work with `grit apply` can produce
  no results as a Biome plugin
  ([Issue #5980](https://github.com/biomejs/biome/issues/5980),
  [Issue #6782](https://github.com/biomejs/biome/issues/6782)).
- Config-integration bugs, e.g. plugins not respecting `linter.enabled: false` in overrides
  ([Issue #8522](https://github.com/biomejs/biome/issues/8522)).

The pattern: choosing a restricted DSL bought performance and approachability, and the bill
arrives as expressiveness ceilings and a second, divergent semantics to maintain.

---

## 4. Vite (and Rollup underneath)

### What it does

A Vite plugin is a factory returning an object with a required `name` plus hook
implementations ([Plugin API](https://vite.dev/guide/api-plugin.html)). It is a superset of
the Rollup plugin interface: universal Rollup build hooks plus Vite-specific ones.

**The hooks.** From Rollup, the build sequence is `options` → `buildStart` → `resolveId` →
`load` → `transform` → `moduleParsed` → `buildEnd`
([Plugin Development](https://rollupjs.org/plugin-development/)). Vite adds `config`,
`configResolved`, `configureServer`, `transformIndexHtml`, and `handleHotUpdate`.

**What hooks receive and return** — this is the load-bearing part:

- `resolveId(source, importer, options)` may return a string, an object
  (`{id, external, meta, moduleSideEffects, syntheticNamedExports}`), `false` for external,
  or `null`/`undefined` to defer.
- `load(id, options)` returns `null` to defer, a code string, or a `SourceDescription`
  (`{code, map, ast, meta, ...}`).
- `transform(code, id, options)` returns the same shapes as `load`.

**Hook kinds** are typed by their combination semantics, which is the real contribution:

| kind | semantics |
| --- | --- |
| `first` | run sequentially until one returns something other than `null`/`undefined` |
| `sequential` | all run in plugin order; each waits for the previous |
| `parallel` | all run in plugin order, but async ones do not wait for each other |
| `async` | may return a Promise of the same value type |

So `resolveId` and `load` are `first` (one plugin wins), `transform` is `sequential` (every
plugin gets a turn, threading the code through), and `buildStart` is `parallel`. **Returning
`null` means "not mine, pass it on"** — the primitive that lets independently written plugins
coexist in one chain.

**Ordering** happens at two levels, which is a recurring source of confusion:

1. **Plugin order** via `enforce: 'pre' | undefined | 'post'`. The resolved order is:
   Alias → user `pre` plugins → Vite core plugins → user plugins with no `enforce` → Vite
   build plugins → user `post` plugins → Vite post-build plugins
   ([Plugin API](https://vite.dev/guide/api-plugin.html)).
2. **Hook order within a plugin's hook** via the object form
   `{ order: 'pre' | 'post' | null, handler() {} }`
   ([Plugin Development](https://rollupjs.org/plugin-development/)). This is independent of
   `enforce`.

**Conditional application.** `apply: 'build' | 'serve'` or a predicate function lets a plugin
opt out of a phase entirely.

**The plugin context.** Rollup hooks are called with a `this` carrying *capabilities*, not
just data: `this.resolve()` (resolve an import using the same plugin chain the host uses),
`this.emitFile()` (create a chunk or asset, returns a reference id), `this.warn()` /
`this.error()` (error aborts the build), `this.getModuleInfo()` (parsed AST, imports,
exports, and plugin-attached `meta`)
([Plugin Development](https://rollupjs.org/plugin-development/)).

### What it gets right

- **Hooks are a contract about combination, not just a callback list.** Declaring a hook as
  `first`/`sequential`/`parallel` tells you, before reading any plugin, what happens when
  three plugins implement it. This is the single most transferable idea in the survey.
- **`null` as "defer".** Non-participation is the default and is cheap. Plugins do not need
  to know about each other to compose.
- **The context grants capabilities.** `this.resolve()` lets a plugin reuse the host's whole
  resolution pipeline instead of reimplementing it; `this.emitFile()` lets it contribute
  outputs; `this.error()` gives a uniform failure channel. Compare ESLint's `context`, which
  is essentially read-only data plus `report()`.
- **`meta` on modules** gives plugins a sanctioned channel to pass data to later plugins
  without a side-channel global.
- **Phase awareness is explicit** (`apply`, `configResolved`'s `command`), rather than
  plugins sniffing the environment.

### What users actually complain about

- **Two-tier ordering is not enough, and Vite's own RFC says so.** The RFC to allow relative
  ordering states that `enforce: pre|post` works in simple cases but can move a plugin
  earlier or later in the chain than it needs to be, and **hides the dependency on a required
  plugin** ([Discussion #13174](https://github.com/vitejs/vite/discussions/13174)). Observed
  workarounds in the wild: manual ordering in config, plugins validating their own position at
  runtime and throwing, and reaching into Vite internals. The proposal is to let a plugin name
  the plugins it must run before/after (`{ pre?: string[], post?: string[] }`).
- **The real shape of the need**, per the maintainers: plugins that extend a known plugin
  (Vuetify with Vue, Iles with Vue) need to sit *adjacent* to it, not at a global extreme, and
  numeric priorities were rejected as a fix because plugins could break each other with
  careless numbers ([Discussion #9613](https://github.com/vitejs/vite/discussions/9613)).
- **Dev/build divergence.** Output-generation hooks (except `closeBundle`) are not called
  during dev; the dev server is like calling `rollup.rollup()` without `bundle.generate()`
  ([Plugin API](https://vite.dev/guide/api-plugin.html)). A Rollup plugin only works in Vite
  dev if it has no strong coupling between build-phase and output-phase hooks. The result is
  plugins that silently do nothing in one mode.
- Consequent confusion between `enforce` (orders plugins) and `order` (orders hooks) — two
  similarly named knobs at different levels.

---

## 5. Recommendation for a tool that orchestrates rather than reimplements

**The hunch survives contact with the sources, but not for the reason it was probably formed.**

The naive version — "hermex plugins are steps, Vite plugins are steps, therefore copy Vite" —
is a shape argument. The stronger argument is about what the plugin is *allowed to ask the
host for*. ESLint's `context` is a read-only view of one file plus `report()`; a rule cannot
resolve a module, invoke another analysis, or emit an artifact, because it is not supposed to
— it is a leaf. Rollup's plugin context is the opposite: `this.resolve()`, `this.emitFile()`,
`this.getModuleInfo()`, `this.error()` all let a plugin **re-enter the host pipeline**. A tool
whose plugins wrap *other tools* needs exactly that: a step that runs a linter must be able to
ask hermex which files are in scope, hand back findings, and fail the run — none of which the
ESLint rule shape offers.

So: **Rollup/Vite hook model for the mechanism; ESLint's flat-config lessons for the
configuration layer; Biome's restraint for the scope.** Concretely:

1. **Type the hooks by combination semantics, not just by name.** Adopt `first` /
   `sequential` / `parallel` explicitly and document each hook's kind. For an orchestrator the
   mapping is natural: "which tool handles this file type" is `first`; "enrich the report" is
   `sequential`; "collect findings from independent tools" is `parallel`. This is the decision
   that pays off every time two plugins are installed together.
2. **Make `null` mean "not mine".** Non-participation must be the cheap default so steps stay
   mutually ignorant. This is what makes an orchestrator's plugin set additive.
3. **Give the step context *capabilities*, not just data.** At minimum: resolve/enumerate the
   files in scope using hermex's own resolution, report findings through one channel, emit
   artifacts, and a `warn`/`error` pair where `error` aborts. Include a `meta` channel so a
   step can pass structured data to later steps without globals.
4. **Do not ship `enforce: pre|post` as the only ordering primitive.** Vite's own RFC
   concedes it hides dependencies, and the real-world need is adjacency to a *named* plugin,
   not a global extreme. For an orchestrator this is sharper still: step B usually needs step
   A's *output*, which is a data dependency, not a priority. Prefer declaring dependencies by
   name (or by produced/consumed artifact) and deriving order, with `pre`/`post` at most as
   sugar. If two ordering knobs are unavoidable, do not name them `enforce` and `order`.
5. **Give plugins a canonical identity, and let config rename them.** ESLint handed naming to
   the config author and then had to retrofit `meta.namespace` to recover identity; oxlint
   shipped aliases from day one to avoid native-rule collisions. Do both from the start: the
   plugin declares its canonical name; the config may alias it; hermex de-duplicates by
   canonical identity, not by object reference — the "Cannot redefine plugin" error is a
   symptom of identity-by-reference leaking into user-facing config.
6. **Config resolution: prefer explicit imports over name-based resolution.** The flat-config
   RFC's own diagnosis was that too many loading and naming strategies made the format
   resistant to change. Let the user's config import the step, so hermex never guesses a
   package location.
7. **Merge options additively where you can.** ESLint's last-writer-wins on rule options is a
   real complaint and hermex has more freedom here, since a step's config is a plain object
   rather than a positional array.
8. **Take Biome's restraint on scope, but reject its restraint on distribution.** "Just
   because something can be a plugin doesn't mean it has to be" is right — hermex's own core
   analysis should stay built in. But Biome's refusal of an npm distribution path, in favour of
   upstreaming, has produced a documented, unresolved user complaint. A tool whose *thesis* is
   orchestrating third-party tools cannot adopt "upstream it into us instead" — that is
   exactly the reinvention hermex has ruled out. Plan for npm-distributed steps.
9. **The oxlint/Biome performance argument mostly does not bind here, and knowing that is
   liberating.** Both restricted plugins because the hot loop is a per-AST-node callback
   across a native/JS boundary. hermex's steps are coarse-grained — run a tool, collect a
   result — so per-node serialization cost is not the constraint, and there is no reason to
   copy the restrictions it motivated. The cost model to actually worry about is process
   spawning and redundant file reads across steps, which argues for a shared, cached file/scope
   service on the context object.
10. **The most on-thesis lesson is oxlint's compatibility bet.** oxlint chose to implement
    someone else's plugin API rather than invent one. For hermex the analogue is: when a step
    wraps a tool, speak that tool's native config and output format rather than re-specifying
    it in hermex terms. Orchestration means passing through, not translating.

**One thing worth stealing from ESLint despite all of the above:** the plugin-as-inert-data
shape. Vite plugins are factory functions, which makes configs unserializable and load-time
side effects possible. A hermex step could be a plain object of hooks plus metadata, resolved
and validated before anything runs — ESLint's discipline applied to Vite's hook model.

**One trap to avoid, from Vite:** the dev/build divergence where hooks silently do not fire in
one mode. If hermex ever grows a watch mode alongside one-shot runs, either every hook fires
in both, or a step must declare which modes it applies to (Vite's `apply`) and hermex must
error when a step's required hook can never run in the selected mode. Silent no-ops are the
worst outcome.

---

## Source index

**ESLint**
- https://eslint.org/docs/latest/extend/plugins
- https://eslint.org/docs/latest/extend/custom-rules
- https://eslint.org/docs/latest/use/configure/configuration-files
- https://eslint.org/docs/latest/use/configure/plugins
- https://github.com/eslint/rfcs/blob/main/designs/2019-config-simplification/README.md
- https://github.com/eslint/eslint/discussions/17766
- https://github.com/eslint/eslint/issues/17371

**oxlint / oxc**
- https://oxc.rs/docs/guide/usage/linter/js-plugins
- https://oxc.rs/blog/2025-10-09-oxlint-js-plugins.html
- https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha
- https://github.com/oxc-project/oxc/discussions/10342

**Biome**
- https://biomejs.dev/linter/plugins/
- https://biomejs.dev/blog/gritql-under-biome-umbrella/
- https://github.com/biomejs/biome/discussions/1762
- https://github.com/biomejs/biome/discussions/2585
- https://github.com/biomejs/biome/discussions/6265
- https://github.com/biomejs/biome/issues/5980
- https://github.com/biomejs/biome/issues/6782
- https://github.com/biomejs/biome/issues/8522

**Vite / Rollup**
- https://vite.dev/guide/api-plugin.html
- https://rollupjs.org/plugin-development/
- https://github.com/vitejs/vite/discussions/13174
- https://github.com/vitejs/vite/discussions/9613
