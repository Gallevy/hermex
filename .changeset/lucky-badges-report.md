---
'hermex': major
---

Packages table: a status-badge hook, and deprecation as its own rule

Closes #86 and #107.

**A `Status` column on the packages table.** A badge exists if and only if a package rule produced a
violation for that row, and its icon is that violation's severity. `no-packages` and the new
`no-deprecated-packages` contribute today; a future package rule plugs into the same declaration table
(`src/utils/package-status.ts`) and gets a badge with no change to any renderer.

**`no-deprecated-packages`, a new rule.** Deprecation used to be detected only as a by-product of
release-age enrichment, so turning release-age off silently turned deprecation detection off with it.
It is now an inventory fact recorded by the registry pass plus a rule that judges it — resolved
last-match-wins against an implicit `['**']` baseline at severity `info`, the way release-age is. So a
deprecated package stays visible with no configuration, an `error` entry makes it fail `comply`, and an
`'off'` entry genuinely exempts it. Both registry-backed rules share one request per installed package,
and a repo that configures neither still makes no network calls.

Breaking changes:

- `--format json`: `packages[].releaseAge.deprecated` moved to `packages[].deprecated`, and `deprecated`
  was removed from `release-age` entries in `ruleViolations[]`. Deprecation is now reported as its own
  `ruleId: "no-deprecated-packages"` entry, which also means a repo with `release-age` configured gains
  `info`-severity violations it did not have before (they do not affect `compliance.status` or the exit
  code).
- The packages table's `Target` column is now `Minimum target`, in both the human table and
  `--summary-file`, whose header row changed accordingly.
- The `[BANNED]` / `[RESTRICTED]` / `[DEPRECATED]` prefixes on package names are gone. `[RESTRICTED]`
  named a config concept that never existed — both badges came from one `no-packages` rule — and it
  collapsed `warn` and `info` into a single word.
- The gray `[not enforced]` suffix is gone; the severity icon carries that on its own.

Fixes, visible in the same output:

- A release-age breach governed by an `info`-severity entry rendered red, and so did one governed by an
  `'off'` entry that produced no violation at all. They now render blue and unadorned respectively.
- 🔵 meant two unrelated things at once — "an info-severity violation exists" and "an upgrade is coming
  due". A pending upgrade now renders without an icon.
- Chart mode measured its label padding from the bare package name while padding a badge-prefixed,
  ANSI-colored string, so any flagged row pushed its bar out of column. Badges now trail the bar.
