// Library entry point — safe to import from `hermex.config.ts` without
// pulling in any CLI runtime code (parsing, SWC, registry calls, etc.).
// `defineConfig` is the one runtime export; everything else is type-only.

export type {
  HermexConfig,
  HermexConfigInput,
  RuleSeverity,
  RuleConfig,
  PackageFieldRule,
  EngineVersionRule,
  CodeownersRule,
  PackagesConfig,
  VersusConfig,
  RulesConfig,
  OverrideConfig,
  OutputConfig,
  ReleaseAgeConfig,
  ReleaseAgeThresholds,
} from './config/types';
import type { HermexConfigInput } from './config/types';

/**
 * Identity helper for authoring `hermex.config.ts` with full type inference
 * and autocomplete — mirrors the same `defineConfig` convention used by
 * Vite, ESLint's flat config, and Vitest. Returns its argument unchanged;
 * `loadConfig` (`src/config/loader.ts`) accepts a plain object default
 * export either way, so this is purely a DX affordance, not a requirement.
 */
export function defineConfig(config: HermexConfigInput): HermexConfigInput {
  return config;
}

export type { PatternCount } from './utils/pattern-counter';
export type {
  ComponentUsage,
  PackageDistribution,
} from './utils/package-distribution';
export type { VersusResult, VersusEntry } from './utils/versus';
export type { RuleViolation } from './rules/evaluator';
export type { ComplianceStatus } from './utils/compliance';

/** Shape of a single entry in `components` — same as `ComponentUsage`, but with `files` as an array (JSON has no `Set`) */
export interface HermexScanComponent extends Omit<
  import('./utils/package-distribution').ComponentUsage,
  'files'
> {
  files: string[];
}

/** Shape of the JSON emitted by `hermex scan --format json` (see `printJson`) */
export interface HermexScanResult {
  version: string;
  summary: {
    filesAnalyzed: number;
    totalImports: number;
    totalComponents: number;
    totalUsagePatterns: number;
  };
  packages: import('./utils/package-distribution').PackageDistribution[];
  components: HermexScanComponent[];
  patterns: import('./utils/pattern-counter').PatternCount[];
  versus: import('./utils/versus').VersusResult[];
  /**
   * Every rule hit, in one list. `forbid_packages` violations live here too
   * (#77) — filter on `type` to single them out; each carries the matched
   * package in `packageName`.
   */
  ruleViolations: import('./rules/evaluator').RuleViolation[];
  /**
   * The official compliance verdict — read `status` instead of re-deriving
   * one from `packages`/`ruleViolations` (#55). `compliant` mirrors the
   * `comply` exit code; `status: 'warning'` (warn-severity rule violations,
   * `forbid_packages` among them) does not change it.
   */
  compliance: {
    status: import('./utils/compliance').ComplianceStatus;
    compliant: boolean;
    counts: {
      errorRuleViolations: number;
      releaseAgeViolations: number;
      warningRuleViolations: number;
    };
  };
}
