---
"hermex": patch
---

Output review now runs each hermex build against the fixtures from its own checkout, rather than running both builds over the working tree's fixtures. Pairing every build with the config it shipped with is what gives a rule-adding PR a baseline at all: the target branch's hermex reads the target branch's config, instead of meeting a key its `.strict()` schema rejects and printing nothing. `no baseline` now means only that a case is new in the branch. Repo tooling only — no change to hermex itself.
