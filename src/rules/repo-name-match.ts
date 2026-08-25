import type { ResolvedRulesConfig } from '../config/types';
import { readPackageJson } from './shared';
import type { RuleViolation } from './shared';
import { parseRemoteUrl, readGitConfig, remoteSlug } from './git-context';

/** `@scope/name` -> `name`; an unscoped name is returned unchanged. */
function unscope(name: string): string {
  if (!name.startsWith('@')) return name;
  const slash = name.indexOf('/');
  return slash === -1 ? name : name.slice(slash + 1);
}

/**
 * Checks that `package.json` "name" matches the repository it lives in.
 *
 * Drift here is quiet but costly: hermex's own `overrides[].match` keys on
 * the manifest name (see `applyOverrides`), so a repo whose name no longer
 * resembles its remote silently stops matching the org rules written for it.
 *
 * Comparison is against the *unscoped* name (`@acme/checkout` matches a
 * `checkout` repository) and case-insensitive, since npm names must be
 * lowercase while host repository names need not be.
 *
 * Skips silently — returning no violations — whenever the repository cannot
 * be identified: no `.git` in the scanned directory, no such remote, or a URL
 * with no recognisable slug. Those are properties of the checkout, not policy
 * breaches, and a tarball or a `.git`-less CI export should not fail a rule
 * about naming.
 */
export function evaluateRepoNameMatch(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
): RuleViolation[] {
  const rule = rulesConfig['require-repo-name-match'];
  if (!rule) return [];

  // Checked before any git I/O: without a manifest name there is nothing to
  // compare, whatever the remote turns out to be.
  const pkg = readPackageJson(repoPath);
  const packageName = typeof pkg?.name === 'string' ? pkg.name : null;
  if (!packageName) return [];

  const config = readGitConfig(repoPath);
  if (config === null) return [];

  const url = parseRemoteUrl(config, rule.remote);
  if (url === null) return [];

  const slug = remoteSlug(url);
  if (slug === null) return [];

  if (unscope(packageName).toLowerCase() === slug.toLowerCase()) return [];

  return [
    {
      ruleId: 'require-repo-name-match',
      severity: rule.severity,
      // No glob identity, like require-engine-version — the rule is a
      // singleton, so there is nothing to key patterns on.
      patterns: [],
      message: rule.message,
      matchedFiles: [],
      expectedName: slug,
      actualName: packageName,
    },
  ];
}
