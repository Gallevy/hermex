import semver from 'semver';
import type { ResolvedRulesConfig } from '../config/types';
import { readPackageJson } from './shared';
import type { RuleViolation } from './shared';

export function evaluateEngineVersion(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
): RuleViolation[] {
  const rules = rulesConfig['require-engine-version'];
  if (rules.length === 0) {
    return [];
  }

  const pkg = readPackageJson(repoPath);
  const nodeRange = (pkg?.engines as Record<string, string> | undefined)?.node;

  return rules.flatMap((rule): RuleViolation[] => {
    if (!nodeRange) {
      return [
        {
          ruleId: 'require-engine-version',
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
          ruleId: 'require-engine-version',
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
