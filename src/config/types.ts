// All config types are derived from the Zod schema — re-exported here for backward compat
export type {
  HermexConfig,
  HermexConfigInput,
  RuleSeverity,
  ParserName,
  RuleConfig,
  PackageFieldRule,
  MaxFileSizeRule,
  EngineVersionRule,
  CodeownersRule,
  ReleaseAgeRuleConfig,
  PackagesConfig,
  VersusConfig,
  RulesConfig,
  OverrideConfig,
  OutputConfig,
  ReleaseAgeConfig,
  ReleaseAgeThresholds,
} from './schema';
// Post-resolution types (severity 'off' resolved away) — internal only, not
// part of the public `hermex.config.ts` authoring surface, so not re-exported
// from src/index.ts.
export type {
  ResolvedRuleConfig,
  ResolvedPackageFieldRule,
  ResolvedMaxFileSizeRule,
  ResolvedEngineVersionRule,
  ResolvedCodeownersRule,
  ResolvedReleaseAgeRuleConfig,
  ResolvedDeprecatedPackagesRuleConfig,
  ResolvedRulesConfig,
  ResolvedHermexConfig,
} from './overrides';
