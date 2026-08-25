---
'hermex': minor
---

Add a `require-repo-name-match` rule that checks `package.json` "name" against the repository's git remote.

The repository name is the last path segment of the remote URL with a trailing `.git` dropped, read straight from `.git/config` — no `git` subprocess, so `git` need not be on `PATH`. Comparison ignores the npm scope and is case-insensitive: `@acme/checkout` passes in a `checkout` repository.

The rule skips silently when it cannot identify the repository — no `.git` in the scanned directory, no such remote, or a URL with no recognisable slug — since those describe the checkout rather than a policy breach. `.git` is looked for in the scanned directory only, never a parent, so a monorepo's `packages/*` skips rather than inheriting the root's remote. A monorepo root itself turns the rule off by name through the existing `overrides` mechanism.

Configure the remote with `remote` (default `origin`).
