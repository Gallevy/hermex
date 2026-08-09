import { z } from 'zod';

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const RuleSeveritySchema = z.enum(['error', 'warn', 'info']);

const RuleConfigSchema = z.object({
  severity: RuleSeveritySchema,
  patterns: z.array(z.string()),
  message: z.string().optional(),
});

const RuleConfigOrArraySchema = z.union([
  RuleConfigSchema,
  z.array(RuleConfigSchema),
]);

const PackageFieldRuleSchema = RuleConfigSchema.extend({
  /** Optional micromatch patterns the field's stringified value must match */
  values: z.array(z.string()).optional(),
});

const PackageFieldRuleOrArraySchema = z.union([
  PackageFieldRuleSchema,
  z.array(PackageFieldRuleSchema),
]);

const EngineVersionRuleSchema = z.object({
  severity: RuleSeveritySchema,
  range: z.string(),
  message: z.string().optional(),
});

const CodeownersRuleSchema = z.object({
  severity: RuleSeveritySchema,
  message: z.string().optional(),
  /** If set, matched files must be owned by at least one of these owner strings (exact match against CODEOWNERS entries, e.g. "@org/team"). */
  requiredOwners: z.array(z.string()).optional(),
});

const ThresholdSchema = z.union([z.number(), z.literal(false)]);

const OverrideRulesSchema = z
  .object({
    detect_files: RuleConfigOrArraySchema.optional(),
    require_files: RuleConfigOrArraySchema.optional(),
    forbid_packages: RuleConfigOrArraySchema.optional(),
    require_packages: RuleConfigOrArraySchema.optional(),
    require_scripts: RuleConfigOrArraySchema.optional(),
    require_package_fields: PackageFieldRuleOrArraySchema.optional(),
    forbid_package_fields: PackageFieldRuleOrArraySchema.optional(),
    engine_version: z
      .union([EngineVersionRuleSchema, z.array(EngineVersionRuleSchema)])
      .optional(),
    codeowners: CodeownersRuleSchema.optional(),
  })
  .default(() => ({}));

const OverrideSchema = z.object({
  /** Micromatch patterns checked against the current repo's package.json "name" */
  match: z.array(z.string()).min(1),
  rules: OverrideRulesSchema,
});

// ── Main schema with defaults ──────────────────────────────────────────────────

export const HermexConfigSchema = z.object({
  includes: z.array(z.string()).default(['**/*.{tsx,jsx,ts,js}']),
  excludes: z
    .array(z.string())
    .default(['**/node_modules/**', '**/dist/**', '**/build/**']),

  packages: z
    .object({
      internal: z.array(z.string()).default([]),
      ignore: z.array(z.string()).default([]),
    })
    .default(() => ({ internal: [], ignore: [] })),

  versus: z
    .array(z.object({ name: z.string(), packages: z.array(z.string()).min(2) }))
    .default([]),

  /**
   * Repo-scoped rule additions: when the current repo's package.json "name"
   * matches an entry's `match` patterns, its `rules` are merged (additively)
   * into the base `rules` below — lets one shared config apply extra rules
   * to only a subset of repos, e.g. a mandatory dependency for 30 of 150 apps.
   */
  overrides: z.array(OverrideSchema).default([]),

  rules: z
    .object({
      detect_files: RuleConfigOrArraySchema.default([]),
      require_files: RuleConfigOrArraySchema.default([]),
      forbid_packages: RuleConfigOrArraySchema.default([]),
      require_packages: RuleConfigOrArraySchema.default([]),
      require_scripts: RuleConfigOrArraySchema.default([]),
      require_package_fields: PackageFieldRuleOrArraySchema.default([]),
      forbid_package_fields: PackageFieldRuleOrArraySchema.default([]),
      engine_version: z
        .union([EngineVersionRuleSchema, z.array(EngineVersionRuleSchema)])
        .optional(),
      codeowners: CodeownersRuleSchema.optional(),
    })
    .default(() => ({
      detect_files: [] as RuleConfig[],
      require_files: [] as RuleConfig[],
      forbid_packages: [] as RuleConfig[],
      require_packages: [] as RuleConfig[],
      require_scripts: [] as RuleConfig[],
      require_package_fields: [] as PackageFieldRule[],
      forbid_package_fields: [] as PackageFieldRule[],
    })),

  output: z
    .object({
      summary: z.union([z.literal('log'), z.literal(false)]).default('log'),
      components: z
        .union([z.enum(['table', 'chart']), z.literal(false)])
        .default('table'),
      packages: z
        .union([z.enum(['table', 'chart']), z.literal(false)])
        .default('table'),
      patterns: z
        .union([z.enum(['table', 'chart']), z.literal(false)])
        .default('table'),
      details: z.boolean().default(false),
      versus: z.boolean().default(true),
      rules: z.boolean().default(true),
      format: z.enum(['human', 'json']).default('human'),
    })
    .default(() => ({
      summary: 'log' as const,
      components: 'table' as const,
      packages: 'table' as const,
      patterns: 'table' as const,
      details: false,
      versus: true,
      rules: true,
      format: 'human' as const,
    })),

  releaseAge: z
    .object({
      enabled: z.boolean().default(false),
      registry: z.string().default('https://registry.npmjs.org'),
      authToken: z.string().optional(),
      thresholds: z
        .object({
          patch: ThresholdSchema.default(30),
          minor: ThresholdSchema.default(45),
          major: ThresholdSchema.default(60),
        })
        .default(() => ({ patch: 30, minor: 45, major: 60 })),
      enforceOn: z.array(z.string()).default([]),
      cacheTtlMs: z.number().int().positive().optional(),
      cacheDisabled: z.boolean().default(false),
      // 'root' checks only each package's direct/root-installed version;
      // 'tree' checks every resolved copy in the lockfile, failing if any
      // is overdue. Nested duplicates are always visible as advisory data
      // regardless of scope — this only decides what's mandatory (#57).
      scope: z.enum(['root', 'tree']).default('root'),
      // Glob-matched (like enforceOn): packages matching here use the
      // OPPOSITE of `scope`, letting one global policy carve out
      // exceptions for specific packages.
      scopeExceptions: z.array(z.string()).default([]),
    })
    .default(() => ({
      enabled: false,
      registry: 'https://registry.npmjs.org',
      thresholds: { patch: 30, minor: 45, major: 60 },
      enforceOn: [],
      cacheDisabled: false,
      scope: 'root' as const,
      scopeExceptions: [],
    })),
});

// ── Derived types ──────────────────────────────────────────────────────────────

/** Config as returned after parsing — all defaults applied, all fields required */
export type HermexConfig = z.infer<typeof HermexConfigSchema>;

/** Config as accepted by the user — everything optional */
export type HermexConfigInput = z.input<typeof HermexConfigSchema>;

// Sub-types derived from the output shape so they can never drift from the schema
export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;
export type RuleConfig = z.infer<typeof RuleConfigSchema>;
export type PackageFieldRule = z.infer<typeof PackageFieldRuleSchema>;
export type EngineVersionRule = z.infer<typeof EngineVersionRuleSchema>;
export type CodeownersRule = z.infer<typeof CodeownersRuleSchema>;
export type PackagesConfig = HermexConfig['packages'];
export type VersusConfig = HermexConfig['versus'][number];
export type RulesConfig = HermexConfig['rules'];
export type OverrideConfig = HermexConfig['overrides'][number];
export type OutputConfig = HermexConfig['output'];
export type ReleaseAgeConfig = HermexConfig['releaseAge'];
export type ReleaseAgeThresholds = HermexConfig['releaseAge']['thresholds'];
