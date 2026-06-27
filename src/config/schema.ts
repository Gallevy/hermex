import { z } from 'zod';

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const RuleSeveritySchema = z.enum(['error', 'warn']);

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

// ── Main schema with defaults ──────────────────────────────────────────────────

export const HermexConfigSchema = z.object({
  includes: z.array(z.string()).default(['**/*.{tsx,jsx,ts,js}']),
  excludes: z
    .array(z.string())
    .default(['**/node_modules/**', '**/dist/**', '**/build/**']),

  packages: z
    .object({
      internal: z.array(z.string()).default(() => []),
      ignore: z.array(z.string()).default(() => []),
    })
    .default(() => ({ internal: [], ignore: [] })),

  versus: z
    .array(z.object({ name: z.string(), packages: z.array(z.string()).min(2) }))
    .default(() => []),

  rules: z
    .object({
      forbid_files: RuleConfigOrArraySchema.optional(),
      require_files: RuleConfigOrArraySchema.optional(),
      allow_files: RuleConfigOrArraySchema.optional(),
      forbid_packages: RuleConfigOrArraySchema.optional(),
      require_packages: RuleConfigOrArraySchema.optional(),
      require_scripts: RuleConfigOrArraySchema.optional(),
      require_package_fields: RuleConfigOrArraySchema.optional(),
      engine_version: z
        .union([EngineVersionRuleSchema, z.array(EngineVersionRuleSchema)])
        .optional(),
    })
    .default(() => ({})),

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
    })
    .default(() => ({
      summary: 'log' as const,
      components: 'table' as const,
      packages: 'table' as const,
      patterns: 'table' as const,
      details: false,
      versus: true,
      rules: true,
    })),

  releaseAge: z
    .object({
      enabled: z.boolean().default(false),
      registry: z.string().default('https://registry.npmjs.org'),
      authToken: z.string().optional(),
      thresholds: z
        .object({
          patch: z.number().nullable().default(null),
          minor: z.number().nullable().default(60),
          major: z.number().nullable().default(90),
        })
        .default(() => ({ patch: null, minor: 60, major: 90 })),
    })
    .default(() => ({
      enabled: false,
      registry: 'https://registry.npmjs.org',
      thresholds: { patch: null, minor: 60, major: 90 },
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
