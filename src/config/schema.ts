import { z } from 'zod';
import { parseByteSize } from '../utils/byte-size';

// ── Sub-schemas ────────────────────────────────────────────────────────────────

// 'off' disables a rule — same as ESLint/oxlint. It's meaningful anywhere a
// rule is authored (not just inside `overrides`): a rule reaching a repo's
// final config with severity 'off' is dropped before evaluators ever see
// it (see `resolveRules` in ./overrides), so a future shared/extends-style
// base config could ship a rule that individual repos turn off, the same
// way an override cancels an org-wide rule for specific repos today.
const RuleSeveritySchema = z.enum(['error', 'warn', 'info', 'off']);

const RuleConfigSchema = z
  .object({
    severity: RuleSeveritySchema,
    patterns: z.array(z.string()),
    message: z.string().optional(),
  })
  .strict();

const RuleConfigOrArraySchema = z.union([
  RuleConfigSchema,
  z.array(RuleConfigSchema),
]);

const PackageFieldRuleSchema = RuleConfigSchema.extend({
  /** Optional micromatch patterns the field's stringified value must match */
  values: z.array(z.string()).optional(),
}).strict();

const PackageFieldRuleOrArraySchema = z.union([
  PackageFieldRuleSchema,
  z.array(PackageFieldRuleSchema),
]);

/**
 * A file size ceiling, authored either as a raw byte count (`204800`) or as
 * a string with a unit (`'200kb'`, `'1.5mb'`) — both normalize to whole
 * bytes here, so everything downstream only ever sees a number. Units are
 * binary (1 KB = 1024 B); see src/utils/byte-size.ts.
 */
const ByteSizeSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const bytes = parseByteSize(value);
    if (bytes === null) {
      ctx.addIssue({
        code: 'custom',
        message:
          `Invalid file size ${JSON.stringify(value)} — use a positive byte ` +
          `count (204800) or a size with a unit ("200kb", "1.5mb").`,
      });
      return z.NEVER;
    }
    return bytes;
  });

const MaxFileSizeRuleSchema = RuleConfigSchema.extend({
  /** Files matching `patterns` may not exceed this size */
  maxSize: ByteSizeSchema,
}).strict();

const MaxFileSizeRuleOrArraySchema = z.union([
  MaxFileSizeRuleSchema,
  z.array(MaxFileSizeRuleSchema),
]);

const EngineVersionRuleSchema = z
  .object({
    severity: RuleSeveritySchema,
    range: z.string(),
    message: z.string().optional(),
  })
  .strict();

const CodeownersRuleSchema = z
  .object({
    severity: RuleSeveritySchema,
    message: z.string().optional(),
    /** If set, matched files must be owned by at least one of these owner strings (exact match against CODEOWNERS entries, e.g. "@org/team"). */
    requiredOwners: z.array(z.string()).optional(),
  })
  .strict();

const ThresholdSchema = z.union([z.number(), z.literal(false)]);

// Overrides use the same rule schemas as the base `rules` below (severity
// 'off' included) — an override rule is resolved into the base the same
// way `resolveRules` resolves the base config against itself.
const OverrideRulesSchema = z
  .object({
    'no-files': RuleConfigOrArraySchema.optional(),
    'require-files': RuleConfigOrArraySchema.optional(),
    'max-file-size': MaxFileSizeRuleOrArraySchema.optional(),
    'no-packages': RuleConfigOrArraySchema.optional(),
    'require-packages': RuleConfigOrArraySchema.optional(),
    'require-scripts': RuleConfigOrArraySchema.optional(),
    'require-package-fields': PackageFieldRuleOrArraySchema.optional(),
    'no-package-fields': PackageFieldRuleOrArraySchema.optional(),
    'require-engine-version': z
      .union([EngineVersionRuleSchema, z.array(EngineVersionRuleSchema)])
      .optional(),
    'require-codeowners': CodeownersRuleSchema.optional(),
  })
  .strict()
  .default(() => ({}));

const OverrideSchema = z
  .object({
    /** Micromatch patterns checked against the current repo's package.json "name" */
    match: z.array(z.string()).min(1),
    rules: OverrideRulesSchema,
  })
  .strict();

// ── Main schema with defaults ──────────────────────────────────────────────────

export const HermexConfigSchema = z
  .object({
    includes: z.array(z.string()).default(['**/*.{tsx,jsx,ts,js}']),
    excludes: z
      .array(z.string())
      .default(['**/node_modules/**', '**/dist/**', '**/build/**']),

    packages: z
      .object({
        ignore: z.array(z.string()).default([]),
      })
      .strict()
      .default(() => ({ ignore: [] })),

    versus: z
      .array(
        z
          .object({ name: z.string(), packages: z.array(z.string()).min(2) })
          .strict(),
      )
      .default([]),

    /**
     * Repo-scoped rule adjustments: when the current repo's package.json "name"
     * matches an entry's `match` patterns, its `rules` are upserted into the
     * base `rules` below, keyed by identity (a rule's `patterns`, or `range`
     * for require-engine-version) — a rule with new patterns is added, one
     * whose patterns match an existing base rule replaces it, and severity
     * 'off' replaces it with nothing (like ESLint's per-rule 'off'). Lets one
     * shared config both add rules to a subset of repos (a mandatory
     * dependency for 30 of 150 apps) and loosen/cancel an org-wide rule for
     * specific repos.
     */
    overrides: z.array(OverrideSchema).default([]),

    rules: z
      .object({
        'no-files': RuleConfigOrArraySchema.default([]),
        'require-files': RuleConfigOrArraySchema.default([]),
        'max-file-size': MaxFileSizeRuleOrArraySchema.default([]),
        'no-packages': RuleConfigOrArraySchema.default([]),
        'require-packages': RuleConfigOrArraySchema.default([]),
        'require-scripts': RuleConfigOrArraySchema.default([]),
        'require-package-fields': PackageFieldRuleOrArraySchema.default([]),
        'no-package-fields': PackageFieldRuleOrArraySchema.default([]),
        'require-engine-version': z
          .union([EngineVersionRuleSchema, z.array(EngineVersionRuleSchema)])
          .optional(),
        'require-codeowners': CodeownersRuleSchema.optional(),
      })
      .strict()
      .default(() => ({
        'no-files': [] as RuleConfig[],
        'require-files': [] as RuleConfig[],
        'max-file-size': [] as MaxFileSizeRule[],
        'no-packages': [] as RuleConfig[],
        'require-packages': [] as RuleConfig[],
        'require-scripts': [] as RuleConfig[],
        'require-package-fields': [] as PackageFieldRule[],
        'no-package-fields': [] as PackageFieldRule[],
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
      .strict()
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
          .strict()
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
      .strict()
      .default(() => ({
        enabled: false,
        registry: 'https://registry.npmjs.org',
        thresholds: { patch: 30, minor: 45, major: 60 },
        enforceOn: [],
        cacheDisabled: false,
        scope: 'root' as const,
        scopeExceptions: [],
      })),
  })
  .strict();

// ── Derived types ──────────────────────────────────────────────────────────────

/** Config as returned after parsing — all defaults applied, all fields required */
export type HermexConfig = z.infer<typeof HermexConfigSchema>;

/** Config as accepted by the user — everything optional */
export type HermexConfigInput = z.input<typeof HermexConfigSchema>;

// Sub-types derived from the output shape so they can never drift from the schema
export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;
export type RuleConfig = z.infer<typeof RuleConfigSchema>;
export type PackageFieldRule = z.infer<typeof PackageFieldRuleSchema>;
/** `maxSize` is normalized to whole bytes on parse — authored as `number | string`, read as `number`. */
export type MaxFileSizeRule = z.infer<typeof MaxFileSizeRuleSchema>;
export type EngineVersionRule = z.infer<typeof EngineVersionRuleSchema>;
export type CodeownersRule = z.infer<typeof CodeownersRuleSchema>;
export type PackagesConfig = HermexConfig['packages'];
export type VersusConfig = HermexConfig['versus'][number];
export type RulesConfig = HermexConfig['rules'];
export type OverrideConfig = HermexConfig['overrides'][number];
export type OutputConfig = HermexConfig['output'];
export type ReleaseAgeConfig = HermexConfig['releaseAge'];
export type ReleaseAgeThresholds = HermexConfig['releaseAge']['thresholds'];
