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

/**
 * Shape of the JSON emitted by `hermex scan --format json` (see `printJson`).
 *
 * The optional fields are the ones `output.*` can switch off (#63, #91): a
 * disabled section is omitted from the payload entirely rather than emitted
 * empty, so narrow the field before reading it. They are all present under
 * the default config — only an explicit `output.<section>: false` removes one.
 */
export interface HermexScanResult {
  version: string;
  summary: {
    filesAnalyzed: number;
    totalImports: number;
    totalComponents: number;
    totalUsagePatterns: number;
    /**
     * `totalUsagePatterns` broken down by pattern type — aggregate counts,
     * not per-item records (#80). Omitted only when `output.patterns` **and**
     * `output.details` are both false: the Patterns and Details sections
     * render this same array, so either one being on keeps it.
     */
    patternCounts?: import('./utils/pattern-counter').PatternCount[];
  };
  /**
   * Every package this repo owns — declared in `package.json`, a direct
   * dependency in the lockfile, and/or imported by scanned source (#78).
   * Purely transitive dependencies are excluded. `usageCount` is component
   * usage, so a package used only as a function reads 0 while still being a
   * real dependency. Omitted when `output.packages: false`.
   */
  packages?: import('./utils/package-distribution').PackageDistribution[];
  /**
   * Every component found, with the package it came from. The one place
   * component names live — `packages[]` carries only `componentCount` (#79).
   * Omitted when `output.components: false`.
   */
  components?: HermexScanComponent[];
  /** Omitted when `output.versus: false`. */
  versus?: import('./utils/versus').VersusResult[];
  /**
   * Every rule hit, in one list — filter on `type` to single out a rule.
   * Always present: it is part of the compliance verdict, so no `output.*`
   * toggle (`output.rules` included) removes it.
   */
  ruleViolations: import('./rules/evaluator').RuleViolation[];
  /**
   * The official compliance verdict — read `status` instead of re-deriving
   * one from `packages`/`ruleViolations` (#55). `compliant` mirrors the
   * `comply` exit code; `status: 'warning'` (a warn-severity rule violation)
   * does not change it.
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
