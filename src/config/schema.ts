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

const EngineVersionRuleSchema = z.object({
  severity: RuleSeveritySchema,
  range: z.string(),
  message: z.string().optional(),
});

const ThresholdSchema = z.union([z.number(), z.literal(false)]);

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

  rules: z
    .object({
      detect_files: RuleConfigOrArraySchema.default([]),
      require_files: RuleConfigOrArraySchema.default([]),
      forbid_packages: RuleConfigOrArraySchema.default([]),
      require_packages: RuleConfigOrArraySchema.default([]),
      require_scripts: RuleConfigOrArraySchema.default([]),
      require_package_fields: RuleConfigOrArraySchema.default([]),
      engine_version: z
        .union([EngineVersionRuleSchema, z.array(EngineVersionRuleSchema)])
        .optional(),
    })
    .default(() => ({
      detect_files: [] as RuleConfig[],
      require_files: [] as RuleConfig[],
      forbid_packages: [] as RuleConfig[],
      require_packages: [] as RuleConfig[],
      require_scripts: [] as RuleConfig[],
      require_package_fields: [] as RuleConfig[],
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
    })
    .default(() => ({
      enabled: false,
      registry: 'https://registry.npmjs.org',
      thresholds: { patch: 30, minor: 45, major: 60 },
      enforceOn: [],
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
export type EngineVersionRule = z.infer<typeof EngineVersionRuleSchema>;
export type PackagesConfig = HermexConfig['packages'];
export type VersusConfig = HermexConfig['versus'][number];
export type RulesConfig = HermexConfig['rules'];
export type OutputConfig = HermexConfig['output'];
export type ReleaseAgeConfig = HermexConfig['releaseAge'];
export type ReleaseAgeThresholds = HermexConfig['releaseAge']['thresholds'];
