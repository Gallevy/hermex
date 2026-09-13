---
"hermex": patch
---

`allVersions` in lockfile resolution output is now sorted by semver instead of lexicographically, so a package resolved at `1.9.0` and `1.10.0` reports `["1.9.0", "1.10.0"]` instead of `["1.10.0", "1.9.0"]`. Non-semver version strings (git URLs, `file:` links, workspace protocol) are collated last, in stable lexicographic order.
