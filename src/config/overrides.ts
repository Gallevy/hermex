import micromatch from 'micromatch';
import { readPackageJson, toArray } from '../rules/shared';
import type { HermexConfig, RulesConfig } from './schema';

/**
 * Merges each `overrides` entry whose `match` patterns hit the current
 * repo's package.json "name" into `rules`. Array-based rules (everything
 * except `codeowners`) are merged additively — concatenated onto the base
 * list rather than replacing it — mirroring how a single rule type already
 * supports multiple simultaneous instances via `RuleConfigOrArraySchema`.
 * `codeowners` only ever holds one rule, so a matching override replaces
 * the base entirely.
 */
export function applyOverrides(
  config: HermexConfig,
  repoPath: string,
): HermexConfig {
  if (config.overrides.length === 0) return config;

  const pkg = readPackageJson(repoPath);
  const repoName = typeof pkg?.name === 'string' ? pkg.name : undefined;
  if (!repoName) return config;

  const matching = config.overrides.filter((override) =>
    micromatch.isMatch(repoName, override.match),
  );
  if (matching.length === 0) return config;

  const rules: RulesConfig = { ...config.rules };

  for (const override of matching) {
    const o = override.rules;
    if (o.detect_files !== undefined) {
      rules.detect_files = [
        ...toArray(rules.detect_files),
        ...toArray(o.detect_files),
      ];
    }
    if (o.require_files !== undefined) {
      rules.require_files = [
        ...toArray(rules.require_files),
        ...toArray(o.require_files),
      ];
    }
    if (o.forbid_packages !== undefined) {
      rules.forbid_packages = [
        ...toArray(rules.forbid_packages),
        ...toArray(o.forbid_packages),
      ];
    }
    if (o.require_packages !== undefined) {
      rules.require_packages = [
        ...toArray(rules.require_packages),
        ...toArray(o.require_packages),
      ];
    }
    if (o.require_scripts !== undefined) {
      rules.require_scripts = [
        ...toArray(rules.require_scripts),
        ...toArray(o.require_scripts),
      ];
    }
    if (o.require_package_fields !== undefined) {
      rules.require_package_fields = [
        ...toArray(rules.require_package_fields),
        ...toArray(o.require_package_fields),
      ];
    }
    if (o.forbid_package_fields !== undefined) {
      rules.forbid_package_fields = [
        ...toArray(rules.forbid_package_fields),
        ...toArray(o.forbid_package_fields),
      ];
    }
    if (o.engine_version !== undefined) {
      rules.engine_version = [
        ...toArray(rules.engine_version),
        ...toArray(o.engine_version),
      ];
    }
    if (o.codeowners !== undefined) {
      rules.codeowners = o.codeowners;
    }
  }

  return { ...config, rules };
}
