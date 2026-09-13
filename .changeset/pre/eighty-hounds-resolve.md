---
'hermex': patch
---

Resolve a component's package from its import specifier in constant time.

`findComponentSource` runs once per JSX element, and each call re-sorted the
entire lockfile package list and prefix-matched down it — O(P log P + P) work
per element, against a P that spans the whole lockfile. An npm package name is
exactly one path segment, or two when scoped, so the name is now read straight
off the specifier and looked up in a `Set` instead: one hash probe, no
allocation, no scan.

Resolution is unchanged for every specifier a lockfile can produce — bare,
subpath, scoped, relative, absolute and unresolvable all resolve as before.
