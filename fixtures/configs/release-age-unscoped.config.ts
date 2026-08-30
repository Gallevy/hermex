import type { HermexConfigInput } from '../../src/config/types.ts';
import base from './release-age.config.ts';

/**
 * The same release-age policy as `./release-age.config.ts`, with `enforceOn`
 * emptied — the default.
 *
 * `enforceOn` is a plain glob list of the mandatory packages, so an empty
 * one matches nothing and enforces nothing. Every installed package is
 * still fetched and still reported; none of them can fail `comply`. The
 * case therefore exits 1 purely on its rule violations, with every
 * release-age row advisory.
 *
 * The diff against `./release-age.config.ts`'s baseline is exactly what
 * naming a package buys you: the same packages checked either way, split
 * across two severity tiers there and all advisory here.
 *
 * This is also the only case covering the empty-`enforceOn` path at all,
 * which is where #171 could have changed a verdict — enrichment used to be
 * gated on JSX component usage, so `moment` (declared, installed, never
 * imported) was never looked up. It is looked up now, and stays advisory
 * because nothing names it.
 */
export default {
  ...base,
  releaseAge: { ...base.releaseAge, enforceOn: [] },
} satisfies HermexConfigInput;
