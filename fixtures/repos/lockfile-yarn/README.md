# `repos/lockfile-yarn/`

The **yarn** arm of the lock-file parity trio, alongside
[`../lockfile-npm/`](../lockfile-npm/README.md) and
[`../lockfile-pnpm/`](../lockfile-pnpm/README.md).

## What it proves

The three repos have an identical `package.json` and an identical
`src/usage.tsx`. The only thing that differs is which lock format records
the same resolved tree — so `scan --format json` must produce **identical
stdout** for all three. The `lockfile-parity` invariant in
`scripts/output-review.ts` enforces that on top of the per-case baselines,
because three baselines can drift apart together in one `--update` and no
single one of them would notice.

Yarn's v1 lockfile is the odd one out in shape: it records resolution
entries keyed by the requested range rather than a tree, so the adapter has
to reconstruct which packages are direct from the manifest. A diff here that
its siblings do not share is a yarn-adapter bug.

## Config

None. `src/config/loader.ts` looks for `hermex.config.ts` in the working
directory and does not walk up, so this repo genuinely runs on the built-in
schema defaults. That is deliberate — the parity claim is about the lock
parsers, and a config would give it somewhere else to differ.

## Cases that use it

| Case | Command | Expects |
| --- | --- | --- |
| `lockfile-yarn` | `hermex scan --format json` | exit 0, identical to its two siblings |

## Layout

```
yarn.lock       the yarn v1 spelling of the shared resolved tree
package.json    identical across all three arms
src/usage.tsx   identical across all three arms
```
