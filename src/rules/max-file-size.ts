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
 * Flags files that exceed their rule's `maxSize`. One violation per rule
 * rather than per file — mirrors `no-files`, so a pattern matching 200
 * oversize assets stays one row in the rules table instead of 200.
 */
export function evaluateMaxFileSize(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
  excludes: string[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of rulesConfig['max-file-size']) {
    const oversizeFiles: OversizeFile[] = [];

    for (const file of findMatches(rule.patterns, repoPath, excludes)) {
      const sizeBytes = fileSizeBytes(path.join(repoPath, file));
      if (sizeBytes !== null && sizeBytes > rule.maxSize) {
        oversizeFiles.push({ file, sizeBytes });
      }
    }

    if (oversizeFiles.length === 0) continue;

    // Largest first: the worst offender is the one worth naming, and
    // `describeViolation` only ever shows the head of the list.
    oversizeFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);

    violations.push({
      ruleId: 'max-file-size',
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      matchedFiles: oversizeFiles.map((f) => f.file),
      maxSizeBytes: rule.maxSize,
      oversizeFiles,
    });
  }

  return violations;
}
