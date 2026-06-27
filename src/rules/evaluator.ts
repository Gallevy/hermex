import type { RulesConfig } from '../config/types';
import { evaluateFileRules } from './file-rules';
import { evaluateScriptRules } from './script-rules';
import { evaluatePackageFieldRules } from './package-field-rules';
import { evaluateEngineVersion } from './engine-version';

export type { RuleViolation } from './shared';
export { toArray } from './shared';

const DEFAULT_EXCLUDES = ['**/node_modules/**', '**/dist/**', '**/build/**'];

export function evaluateRules(
  repoPath: string,
  rulesConfig: RulesConfig,
  excludes: string[] = DEFAULT_EXCLUDES,
): import('./shared').RuleViolation[] {
  return [
    ...evaluateFileRules(repoPath, rulesConfig, excludes),
    ...evaluateScriptRules(repoPath, rulesConfig),
    ...evaluatePackageFieldRules(repoPath, rulesConfig),
    ...evaluateEngineVersion(repoPath, rulesConfig),
  ];
}
