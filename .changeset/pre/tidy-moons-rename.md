---
'hermex': major
---

feat(rules)!: rename `release-age` to `no-outdated-packages`

Every other rule id names a policy — `no-files`, `require-files`,
`max-file-size`, `no-packages`, `require-engine-version`. `release-age` was
the only one naming the thing being measured instead, and it collided with
established ecosystem vocabulary in the worst possible direction:
`minimumReleaseAge` (Renovate, pnpm) and npm's `--before` all mean *don't
install anything younger than N days*. This rule is the inverse — don't stay
behind an upgrade that has already aged past your threshold — so the old name
inverted the polarity for anyone arriving from those tools.

**Migration.** Rename the key; nothing else changes.

```diff
 rules: {
-  'release-age': [{ severity: 'error', patterns: ['@my-org/*'] }],
+  'no-outdated-packages': [{ severity: 'error', patterns: ['@my-org/*'] }],
 }
```

`rules['release-age']` still works and behaves identically, in both the base
`rules` block and inside `overrides[].rules`. It prints a deprecation warning
on config load (stderr, so `--format json` on stdout stays clean). Authoring
both spellings is an error rather than a silent precedence rule — the two
would resolve to one governing entry per package, and quietly picking a
winner would hide a policy decision you never made.

**`--json` consumers:** violations from this rule now carry
`ruleId: 'no-outdated-packages'` instead of `ruleId: 'release-age'`.
