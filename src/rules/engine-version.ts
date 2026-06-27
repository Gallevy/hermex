import semver from 'semver';
import type { RulesConfig } from '../config/types';
import { toArray, readPackageJson } from './shared';
import type { RuleViolation } from './shared';

export function evaluateEngineVersion(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const rules = toArray(rulesConfig.engine_version);
  if (rules.length === 0) {
    return [];
  }

  const pkg = readPackageJson(repoPath);
  const nodeRange = (pkg?.engines as Record<string, string> | undefined)?.node;

  return rules.flatMap((rule): RuleViolation[] => {
    if (!nodeRange) {
      return [
        {
          type: 'engine_version',
          severity: rule.severity,
          patterns: [],
          message: rule.message ?? 'engines.node not specified in package.json',
          matchedFiles: [],
          requiredRange: rule.range,
        },
      ];
    }

    const minVer = semver.minVersion(nodeRange);
    if (!minVer || !semver.satisfies(minVer, rule.range)) {
      return [
        {
          type: 'engine_version',
          severity: rule.severity,
          patterns: [],
          message: rule.message,
          matchedFiles: [],
          installedRange: nodeRange,
          requiredRange: rule.range,
        },
      ];
    }

    return [];
  });
}
