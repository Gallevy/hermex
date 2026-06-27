import { globSync } from 'glob';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import type { RulesConfig } from '../config/types';

export interface RuleViolation {
  type:
    | 'forbid_files'
    | 'require_files'
    | 'allow_files'
    | 'forbid_packages'
    | 'require_packages'
    | 'require_scripts'
    | 'require_package_fields'
    | 'engine_version';
  severity: 'error' | 'warn';
  patterns: string[];
  message?: string;
  matchedFiles: string[];
  // engine_version only
  installedRange?: string;
  requiredRange?: string;
}

export function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function findMatches(patterns: string[], repoPath: string): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const found = globSync(pattern, {
      cwd: repoPath,
      nodir: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    matches.push(...found.map((f) => path.join(repoPath, f)));
  }
  return [...new Set(matches)];
}

function readPackageJson(repoPath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(
      path.join(repoPath, 'package.json'),
      'utf-8',
    );
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function evaluateRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of toArray(rulesConfig.forbid_files)) {
    const matches = findMatches(rule.patterns, repoPath);
    if (matches.length > 0) {
      violations.push({
        type: 'forbid_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: matches,
      });
    }
  }

  for (const rule of toArray(rulesConfig.require_files)) {
    const matches = findMatches(rule.patterns, repoPath);
    if (matches.length === 0) {
      violations.push({
        type: 'require_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
      });
    }
  }

  for (const rule of toArray(rulesConfig.allow_files)) {
    const matches = findMatches(rule.patterns, repoPath);
    if (matches.length === 0) {
      violations.push({
        type: 'allow_files',
        severity: rule.severity,
        patterns: rule.patterns,
        message: rule.message,
        matchedFiles: [],
      });
    }
  }

  violations.push(...evaluateScriptRules(repoPath, rulesConfig));
  violations.push(...evaluatePackageFieldRules(repoPath, rulesConfig));
  violations.push(...evaluateEngineVersion(repoPath, rulesConfig));

  return violations;
}

export function evaluateScriptRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const rules = toArray(rulesConfig.require_scripts);
  if (rules.length === 0) return [];

  const pkg = readPackageJson(repoPath);
  const scripts = (pkg?.scripts as Record<string, string> | undefined) ?? {};
  const scriptKeys = Object.keys(scripts);

  return rules
    .filter(
      (rule) =>
        !rule.patterns.some((p) =>
          scriptKeys.some((k) => k === p || globMatch(k, p)),
        ),
    )
    .map((rule) => ({
      type: 'require_scripts' as const,
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      matchedFiles: [],
    }));
}

export function evaluatePackageFieldRules(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const rules = toArray(rulesConfig.require_package_fields);
  if (rules.length === 0) return [];

  const pkg = readPackageJson(repoPath);
  const fieldKeys = pkg ? Object.keys(pkg) : [];

  return rules
    .filter((rule) => !rule.patterns.some((p) => fieldKeys.includes(p)))
    .map((rule) => ({
      type: 'require_package_fields' as const,
      severity: rule.severity,
      patterns: rule.patterns,
      message: rule.message,
      matchedFiles: [],
    }));
}

export function evaluateEngineVersion(
  repoPath: string,
  rulesConfig: RulesConfig,
): RuleViolation[] {
  const rules = toArray(rulesConfig.engine_version);
  if (rules.length === 0) return [];

  const pkg = readPackageJson(repoPath);
  const engines = pkg?.engines as Record<string, string> | undefined;
  const nodeRange = engines?.node;

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

function globMatch(value: string, pattern: string): boolean {
  // Simple wildcard matching for script name patterns like 'test:*'
  if (!pattern.includes('*')) return value === pattern;
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  return regex.test(value);
}
