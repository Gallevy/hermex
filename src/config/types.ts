export type OutputMode = 'table' | 'chart';
export type RuleSeverity = 'error' | 'warn';
export type UpgradeLevel = 'needs_upgrade' | 'mandatory_upgrade';

export interface PackagesConfig {
  internal: string[];
  ignore: string[];
}

export interface VersusConfig {
  name: string;
  packages: string[];
}

export interface RuleConfig {
  severity: RuleSeverity;
  patterns: string[];
  message?: string;
}

export interface RulesConfig {
  forbid_files?: RuleConfig | RuleConfig[];
  require_files?: RuleConfig | RuleConfig[];
  allow_files?: RuleConfig | RuleConfig[];
  forbid_packages?: RuleConfig | RuleConfig[];
}

export interface OutputConfig {
  summary: 'log' | false;
  components: OutputMode | false;
  packages: OutputMode | false;
  patterns: OutputMode | false;
  details: boolean;
  versus: boolean;
  rules: boolean;
}

export interface ReleaseAgeThresholds {
  patch: number | null;
  minor: number | null;
  major: number | null;
}

export interface ReleaseAgeConfig {
  enabled: boolean;
  registry?: string;
  authToken?: string;
  thresholds: ReleaseAgeThresholds;
}

export interface HermexConfig {
  includes: string[];
  excludes: string[];
  packages: PackagesConfig;
  versus: VersusConfig[];
  rules: RulesConfig;
  output: OutputConfig;
  releaseAge: ReleaseAgeConfig;
}

export const DEFAULT_CONFIG: HermexConfig = {
  includes: ['**/*.{tsx,jsx,ts,js}'],
  excludes: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  packages: {
    internal: [],
    ignore: [],
  },
  versus: [],
  rules: {},
  output: {
    summary: 'log',
    components: 'table',
    packages: 'table',
    patterns: 'table',
    details: false,
    versus: true,
    rules: true,
  },
  releaseAge: {
    enabled: false,
    registry: 'https://registry.npmjs.org',
    thresholds: {
      patch: null,
      minor: 60,
      major: 90,
    },
  },
};
