// Primitive types not represented in the config schema
export type OutputMode = 'table' | 'chart';
export type UpgradeLevel = 'needs_upgrade' | 'mandatory_upgrade';

// All config types are derived from the Zod schema — re-exported here for backward compat
export type {
  HermexConfig,
  HermexConfigInput,
  RuleSeverity,
  RuleConfig,
  EngineVersionRule,
  PackagesConfig,
  VersusConfig,
  RulesConfig,
  OutputConfig,
  ReleaseAgeConfig,
  ReleaseAgeThresholds,
} from './schema';
