import { z } from 'zod';
import { KNOWN_HOOKS } from '../plugins/types';
import type { HermexPlugin } from '../plugins/types';

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

// ── Plugins ────────────────────────────────────────────────────────────────────

// A plugin holds functions, so it can't be described structurally the way
// every other branch of this schema is — `z.custom` carries the type and the
// refinement below does the checking by hand. Note this makes a config that
// declares plugins non-JSON-serializable, which is inherent: hooks are code.
const PluginSchema = z.custom<HermexPlugin>().superRefine((value, ctx) => {
  const fail = (message: string, path: (string | number)[] = []) =>
    ctx.addIssue({ code: 'custom', message, path });

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('Plugin must be an object with `name` and `hooks`.');
    return;
  }

  const plugin = value as Partial<HermexPlugin>;

  if (typeof plugin.name !== 'string' || plugin.name.trim() === '') {
    fail('Plugin `name` must be a non-empty string.', ['name']);
  }

  if (
    typeof plugin.hooks !== 'object' ||
    plugin.hooks === null ||
    Array.isArray(plugin.hooks)
  ) {
    fail('Plugin `hooks` must be an object.', ['hooks']);
    return;
  }

  const hooks = plugin.hooks as Record<string, unknown>;
  const declared = Object.keys(hooks);

  for (const key of declared) {
    // Rejected rather than ignored on purpose: a plugin built against a
    // newer hermex must fail loudly, not half-run. A hook that silently
    // never fires is the failure mode this check exists to prevent.
    if (!(KNOWN_HOOKS as readonly string[]).includes(key)) {
      fail(
        `Unknown hook \`${key}\`. This version of hermex supports: ${KNOWN_HOOKS.join(', ')}. ` +
          `If the plugin targets a newer hermex, upgrade rather than removing the hook.`,
        ['hooks', key],
      );
      continue;
    }
    if (typeof hooks[key] !== 'function') {
      fail(`Hook \`${key}\` must be a function.`, ['hooks', key]);
    }
  }

  if (declared.length === 0) {
    fail(
      `Plugin "${plugin.name ?? '<unnamed>'}" declares no hooks, so it can never run. ` +
        `Implement one of: ${KNOWN_HOOKS.join(', ')}.`,
      ['hooks'],
    );
  }
});

// Identity is the plugin's own `name` — never a namespace the config author
// assigns. ESLint handed naming to the config layer and had to retrofit
// `meta.namespace` to recover identity; de-duplicating by declared name here
// avoids that, and makes a duplicate a config error rather than two
// silently-merged sources of the same finding.
const PluginsSchema = z.array(PluginSchema).superRefine((plugins, ctx) => {
  const seen = new Set<string>();
  plugins.forEach((plugin, index) => {
    const name = (plugin as Partial<HermexPlugin>)?.name;
    if (typeof name !== 'string') return;
    if (seen.has(name)) {
      ctx.addIssue({
        code: 'custom',
        message: `Duplicate plugin name "${name}". Plugin names must be unique — hermex de-duplicates by name, not by object identity.`,
        path: [index, 'name'],
      });
    }
    seen.add(name);
  });
});

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

    /**
     * Plugins run other tools and fold their findings into this run — hermex
     * orchestrates, it never reimplements (#102). Each is a plain object with
     * a canonical `name` and a `hooks` envelope; declare them inline to keep
     * the config importable under `npx` with no `node_modules`, since only
     * `node:` builtins and `import type` resolve there.
     *
     * hermex owns the channel and nothing else: granularity and severity are
     * the plugin's, configured in the plugin's own idiom, so `rules` below
     * stays exclusively hermex's own.
     */
    plugins: PluginsSchema.default([]),

    rules: z
      .object({
        'no-files': RuleConfigOrArraySchema.default([]),
        'require-files': RuleConfigOrArraySchema.default([]),
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
export type EngineVersionRule = z.infer<typeof EngineVersionRuleSchema>;
export type CodeownersRule = z.infer<typeof CodeownersRuleSchema>;
export type PackagesConfig = HermexConfig['packages'];
export type VersusConfig = HermexConfig['versus'][number];
export type RulesConfig = HermexConfig['rules'];
export type OverrideConfig = HermexConfig['overrides'][number];
export type OutputConfig = HermexConfig['output'];
export type PluginsConfig = HermexConfig['plugins'];
export type ReleaseAgeConfig = HermexConfig['releaseAge'];
export type ReleaseAgeThresholds = HermexConfig['releaseAge']['thresholds'];
