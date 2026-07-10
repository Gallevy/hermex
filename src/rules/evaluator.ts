import type { RulesConfig } from '../config/types';
import { evaluateFileRules } from './file-rules';
import { evaluateScriptRules } from './script-rules';
import { evaluatePackageFieldRules } from './package-field-rules';
import { evaluateEngineVersion } from './engine-version';
import { evaluateCodeowners } from './codeowners';

export type { RuleViolation } from './shared';
export { toArray } from './shared';

export function evaluateRules(
  repoPath: string,
  rulesConfig: RulesConfig,
  excludes: string[],
  scannedFiles: string[] = [],
): import('./shared').RuleViolation[] {
  return [
    ...evaluateFileRules(repoPath, rulesConfig, excludes),
    ...evaluateScriptRules(repoPath, rulesConfig),
    ...evaluatePackageFieldRules(repoPath, rulesConfig),
    ...evaluateEngineVersion(repoPath, rulesConfig),
    ...evaluateCodeowners(repoPath, rulesConfig, scannedFiles),
  ];
}
