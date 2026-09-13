# Research

Findings backing the [hermex v3 wayfinder map](https://github.com/Gallevy/hermex/issues/100).

Each document is the full record for one closed map ticket. The map's
"Decisions so far" section carries a one-line gist and links here for the
detail — so these files are the evidence the v3 RFC cites, not scratch notes.

Before this directory existed, each of these lived on an unpushed local
`research/*` branch, reachable only from the machine that produced it. They were
collected onto `main` so the map's citations resolve for everyone.

| Document | Ticket | What it settles |
|---|---|---|
| [plugin-api-prior-art.md](./plugin-api-prior-art.md) | [#118](https://github.com/Gallevy/hermex/issues/118) | ESLint flat config, oxlint, Biome and Vite/Rollup plugin APIs. oxlint now **ships** JS plugins; take Rollup's capability-granting context and typed hook combination, reject `enforce: pre\|post`. |
| [swc-jsx-prop-values.md](./swc-jsx-prop-values.md) | [#119](https://github.com/Gallevy/hermex/issues/119) | What SWC can statically resolve for JSX prop values. `JSXAttrOrSpread` is a tagged enum (no `ExprOrSpread` wrapper bug), but five same-class traps exist; bindings are the hard wall. |
| [alias-resolution.md](./alias-resolution.md) | [#120](https://github.com/Gallevy/hermex/issues/120) | How other tools resolve webpack/Vite path aliases. Nobody statically parses bundler config — knip, madge and eslint-import-resolver-webpack all *execute* it. Recommends a two-tier, zero-execution approach via `oxc-resolver`. |
| [improve-audit-2026-08-15.md](./improve-audit-2026-08-15.md) | [#111](https://github.com/Gallevy/hermex/issues/111) | Full `/improve` audit at commit `688c481`: 13 findings with evidence, their triage onto map tickets, and the 5 rejected with reasons. |

## Adding to this directory

A research ticket resolves by committing its document here, then recording the
gist plus a link to the file on the map. Do not leave the document on the
working branch — the map cites it, so it has to be reachable from `main`.
