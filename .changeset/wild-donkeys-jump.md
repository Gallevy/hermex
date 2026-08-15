---
"hermex": major
---

`hermex.config.ts` is now validated strictly: a config file with no default export throws instead of silently loading as an all-defaults config, and any config object (root or nested — `rules`, `overrides[].rules`, `output`, `releaseAge`, etc.) carrying an unrecognized key throws instead of silently dropping it.

Both were previously silent failures: a misspelled rule key parsed cleanly and enforced nothing, and a config file that forgot `export default` did the same. Both now fail loudly at load time, naming the offending key or the missing export.

Config authors should check `hermex.config.ts` (and any files referenced by `overrides[].rules`) for stray or misspelled keys before upgrading — anything not in the documented schema will now throw.
