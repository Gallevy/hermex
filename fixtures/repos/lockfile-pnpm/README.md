# `repos/lockfile-pnpm/`

The **pnpm** arm of the lock-file parity trio, alongside
[`../lockfile-npm/`](../lockfile-npm/README.md) and
[`../lockfile-yarn/`](../lockfile-yarn/README.md).

## What it proves

The three repos have an identical `package.json` and an identical
`src/usage.tsx`. The only thing that differs is which lock format records
the same resolved tree — so `scan --format json` must produce **identical
stdout** for all three. The `lockfile-parity` invariant in
`scripts/output-review.ts` enforces that on top of the per-case baselines,
because three baselines can drift apart together in one `--update` and no
single one of them would notice.

pnpm's lockfile is the one that states the tree most directly — importers,
then a flat `packages` map keyed by dependency path — so it is the arm the
other two are usually measured against when they disagree.

## Config

None. `src/config/loader.ts` looks for `hermex.config.ts` in the working
directory and does not walk up, so this repo genuinely runs on the built-in
schema defaults. That is deliberate — the parity claim is about the lock
parsers, and a config would give it somewhere else to differ.

## Cases that use it

| Case | Command | Expects |
| --- | --- | --- |
| `lockfile-pnpm` | `hermex scan --format json` | exit 0, identical to its two siblings |

## Layout

```
pnpm-lock.yaml  the pnpm spelling of the shared resolved tree
package.json    identical across all three arms
src/usage.tsx   identical across all three arms
```
