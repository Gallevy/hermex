# `repos/lockfile-npm/`

The **npm** arm of the lock-file parity trio, alongside
[`../lockfile-yarn/`](../lockfile-yarn/README.md) and
[`../lockfile-pnpm/`](../lockfile-pnpm/README.md).

## What it proves

The three repos have an identical `package.json` and an identical
`src/usage.tsx`. The only thing that differs is which lock format records
the same resolved tree — so `scan --format json` must produce **identical
stdout** for all three. The `lockfile-parity` invariant in
`scripts/output-review.ts` enforces that on top of the per-case baselines,
because three baselines can drift apart together in one `--update` and no
single one of them would notice.

The trio found a real bug the first time it ran: the npm arm reported the
hoisted transitive packages (`js-tokens`, `loose-envify`, `scheduler`) as
**direct** dependencies. npm installs a conflict-free transitive dependency
at `node_modules/<name>` — exactly where a direct one lives — and the
adapter read that depth as "root". It now reads the declared set from the
lockfile's own `packages[""]` entry instead.

## Config

None. `src/config/loader.ts` looks for `hermex.config.ts` in the working
directory and does not walk up, so this repo genuinely runs on the built-in
schema defaults. That is deliberate — the parity claim is about the lock
parsers, and a config would give it somewhere else to differ.

## Cases that use it

| Case | Command | Expects |
| --- | --- | --- |
| `lockfile-npm` | `hermex scan --format json` | exit 0, identical to its two siblings |

## Layout

```
package-lock.json   the npm spelling of the shared resolved tree
package.json        identical across all three arms
src/usage.tsx       identical across all three arms
```
