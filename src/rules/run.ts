import type { ResolvedHermexConfig } from '../config/types';
import type { PackageDistribution } from '../utils/package-distribution';
import type { PackageInventoryEntry } from '../utils/package-inventory';
import {
  detectForbiddenPackages,
  detectRequiredPackages,
} from '../utils/package-rules';
import { evaluateRules } from './evaluator';
import { evaluateRegistryRules, needsRegistry } from './registry-rules';
import type { RuleViolation } from './shared';

/**
 * Progress hooks for the one phase that is slow enough to need them.
 *
 * Callbacks rather than an `Ora` parameter: the rule layer should not import a
 * spinner, and `runRules` stays callable from a test or a future programmatic
 * API with no terminal attached.
 */
export interface RuleRunEvents {
  onRegistryStart?(info: { forReleaseAge: boolean }): void;
  onRegistryFinish?(info: { forReleaseAge: boolean; skipped: number }): void;
}

export interface RunRulesOptions {
  repoPath: string;
  config: ResolvedHermexConfig;
  files: string[];
  inventory: PackageInventoryEntry[];
  packages: PackageDistribution[];
  events?: RuleRunEvents;
}

export interface RuleRunResult {
  /** Every violation hermex itself computes. Complete — plugins append to it, they are not part of it. */
  violations: RuleViolation[];
  /** Registry-enriched when a registry-backed rule ran; the input list unchanged otherwise. */
  packages: PackageDistribution[];
}

/**
 * Evaluates every rule hermex ships, against one set of facts, and returns the
 * complete list.
 *
 * This is the only place that knows the rule families exist. Adding one means
 * adding a line here — there is no second site to choose between (#84).
 *
 * The array order below IS the emission order: it reaches the JSON
 * `ruleViolations` array directly, and the human Rules table through
 * `sortViolationsBySeverity`, which is stable and so preserves it *within* each
 * severity bucket. Changing it changes output. It is chosen here, deliberately,
 * rather than falling out of which call site happened to run first.
 */
export async function runRules({
  repoPath,
  config,
  files,
  inventory,
  packages,
  events,
}: RunRulesOptions): Promise<RuleRunResult> {
  const violations: RuleViolation[] = [
    ...detectForbiddenPackages(inventory, config),
    ...detectRequiredPackages(inventory, config),
    ...evaluateRules(repoPath, config.rules, config.excludes, files),
  ];

  // A rule family being non-empty IS "that rule enabled" — no separate flag
  // (see src/config/schema.ts's releaseAge block comment). Both registry-backed
  // families share one enrichment pass, so the gate is "does anything need the
  // registry", not "is no-outdated-packages on" (#107).
  if (!needsRegistry(config.rules)) {
    return { violations, packages };
  }

  const forReleaseAge = config.rules['no-outdated-packages'].length > 0;
  events?.onRegistryStart?.({ forReleaseAge });

  const {
    enriched,
    violations: registryViolations,
    skipped,
  } = await evaluateRegistryRules(packages, config);

  events?.onRegistryFinish?.({ forReleaseAge, skipped });

  return {
    violations: [...violations, ...registryViolations],
    packages: enriched,
  };
}
