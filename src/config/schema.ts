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

// Overrides accept 'off' in addition to the base severities — like ESLint,
// an override rule with severity 'off' cancels a base rule with the same
// identity (patterns, or range for engine_version) instead of adding one.
const OverrideRuleSeveritySchema = z.enum(['error', 'warn', 'info', 'off']);

const OverrideRuleConfigSchema = RuleConfigSchema.extend({
  severity: OverrideRuleSeveritySchema,
});
const OverrideRuleConfigOrArraySchema = z.union([
  OverrideRuleConfigSchema,
  z.array(OverrideRuleConfigSchema),
]);

const OverridePackageFieldRuleSchema = PackageFieldRuleSchema.extend({
  severity: OverrideRuleSeveritySchema,
});
const OverridePackageFieldRuleOrArraySchema = z.union([
  OverridePackageFieldRuleSchema,
  z.array(OverridePackageFieldRuleSchema),
]);

const OverrideEngineVersionRuleSchema = EngineVersionRuleSchema.extend({
  severity: OverrideRuleSeveritySchema,
});

const OverrideCodeownersRuleSchema = CodeownersRuleSchema.extend({
  severity: OverrideRuleSeveritySchema,
});

const OverrideRulesSchema = z
  .object({
    detect_files: OverrideRuleConfigOrArraySchema.optional(),
    require_files: OverrideRuleConfigOrArraySchema.optional(),
    forbid_packages: OverrideRuleConfigOrArraySchema.optional(),
    require_packages: OverrideRuleConfigOrArraySchema.optional(),
    require_scripts: OverrideRuleConfigOrArraySchema.optional(),
    require_package_fields: OverridePackageFieldRuleOrArraySchema.optional(),
    forbid_package_fields: OverridePackageFieldRuleOrArraySchema.optional(),
    engine_version: z
      .union([
        OverrideEngineVersionRuleSchema,
        z.array(OverrideEngineVersionRuleSchema),
      ])
      .optional(),
    codeowners: OverrideCodeownersRuleSchema.optional(),
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
   * Repo-scoped rule adjustments: when the current repo's package.json "name"
   * matches an entry's `match` patterns, its `rules` are upserted into the
   * base `rules` below, keyed by identity (a rule's `patterns`, or `range`
   * for engine_version) — a rule with new patterns is added, one whose
   * patterns match an existing base rule replaces it, and severity 'off'
   * replaces it with nothing (like ESLint's per-rule 'off'). Lets one shared
   * config both add rules to a subset of repos (a mandatory dependency for
   * 30 of 150 apps) and loosen/cancel an org-wide rule for specific repos.
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
export type OverrideRuleSeverity = z.infer<typeof OverrideRuleSeveritySchema>;
export type OverrideRuleConfig = z.infer<typeof OverrideRuleConfigSchema>;
export type OverridePackageFieldRule = z.infer<
  typeof OverridePackageFieldRuleSchema
>;
export type OverrideEngineVersionRule = z.infer<
  typeof OverrideEngineVersionRuleSchema
>;
export type OverrideCodeownersRule = z.infer<
  typeof OverrideCodeownersRuleSchema
>;
export type OutputConfig = HermexConfig['output'];
export type ReleaseAgeConfig = HermexConfig['releaseAge'];
export type ReleaseAgeThresholds = HermexConfig['releaseAge']['thresholds'];
