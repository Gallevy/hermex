import type { ResolvedRulesConfig } from '../config/types';
import { evaluateFileRules } from './file-rules';
import { evaluateMaxFileSize } from './max-file-size';
import { evaluateScriptRules } from './script-rules';
import { evaluatePackageFieldRules } from './package-field-rules';
import { evaluateEngineVersion } from './engine-version';
import { evaluateCodeowners } from './codeowners';

export type { RuleViolation } from './shared';

export function evaluateRules(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
  excludes: string[],
  scannedFiles: string[] = [],
): import('./shared').RuleViolation[] {
  return [
    ...evaluateFileRules(repoPath, rulesConfig, excludes),
    ...evaluateMaxFileSize(repoPath, rulesConfig, excludes),
    ...evaluateScriptRules(repoPath, rulesConfig),
    ...evaluatePackageFieldRules(repoPath, rulesConfig),
    ...evaluateEngineVersion(repoPath, rulesConfig),
    ...evaluateCodeowners(repoPath, rulesConfig, scannedFiles),
  ];
}
