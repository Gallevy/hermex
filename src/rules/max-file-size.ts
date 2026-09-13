import fs from 'fs';
import path from 'path';
import type { ResolvedRulesConfig } from '../config/types';
import { findMatches } from './shared';
import type { OversizeFile, RuleViolation } from './shared';

/**
 * Size of `filePath` in bytes, or null if it can't be read. A file that
 * vanished between the glob and the stat (or that the process can't stat)
 * is not evidence of an oversize asset, and a whole scan must not fail
 * over one unreadable path — same reasoning as `readPackageJson`.
 */
function fileSizeBytes(filePath: string): number | null {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return null;
  }
}

/**
 * Flags files that exceed their rule's `maxSize` — one violation per
 * oversize file. `print-rules.ts`'s default fold renderer groups these back
 * into one row (largest first, truncated), same display as before this rule
 * type became atomic.
 */
export function evaluateMaxFileSize(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
  excludes: string[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of rulesConfig['max-file-size']) {
    for (const file of findMatches(rule.patterns, repoPath, excludes)) {
      const sizeBytes = fileSizeBytes(path.join(repoPath, file));
      if (sizeBytes === null || sizeBytes <= rule.maxSize) continue;

      const oversizeFile: OversizeFile = { file, sizeBytes };
      violations.push({
        ruleId: 'max-file-size',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        maxSizeBytes: rule.maxSize,
        oversizeFile,
      });
    }
  }

  return violations;
}
