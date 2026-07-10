// Library entry point — types only, safe to import from `hermex.config.ts`
// without pulling in any CLI runtime code.

export type {
  HermexConfig,
  HermexConfigInput,
  RuleSeverity,
  RuleConfig,
  PackageFieldRule,
  EngineVersionRule,
  PackagesConfig,
  VersusConfig,
  RulesConfig,
  OutputConfig,
  ReleaseAgeConfig,
  ReleaseAgeThresholds,
} from './config/types';

export type { PatternCount } from './utils/pattern-counter';
export type {
  ComponentUsage,
  PackageDistribution,
} from './utils/package-distribution';
export type { VersusResult, VersusEntry } from './utils/versus';
export type { RuleViolation } from './rules/evaluator';
export type { BannedPackageViolation } from './utils/package-rules';

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
  ruleViolations: import('./rules/evaluator').RuleViolation[];
  bannedPackageViolations: import('./utils/package-rules').BannedPackageViolation[];
}
