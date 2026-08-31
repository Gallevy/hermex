// The plugin surface. See #102 for the decisions these types encode.
//
// Every import here is type-only on purpose: `hermex.config.ts` declares
// plugins inline as plain objects, so nothing in this module may pull runtime
// code into the config-loading path. It also keeps the deliberate type cycle
// with `rules/shared` (RuleViolation includes PluginViolation, and
// PluginInventoryView exposes RuleViolation) erased at runtime.

import type { ResolvedHermexConfig } from '../config/overrides';
import type { RuleViolation } from '../rules/shared';
import type {
  PackageDistribution,
  ComponentUsage,
} from '../utils/package-distribution';
import type { VersusResult } from '../utils/versus';

/**
 * Every hook hermex knows about. Adding one is additive — a plugin written
 * against an older hermex keeps working, and `plugins` in the config schema
 * rejects any key that is *not* in here rather than ignoring it, so a plugin
 * written against a *newer* hermex fails loudly instead of half-running.
 * Silent no-ops are the failure mode this list exists to prevent.
 */
export const KNOWN_HOOKS = ['onRunComplete'] as const;

export type KnownHook = (typeof KNOWN_HOOKS)[number];

export interface HermexPluginHooks {
  /**
   * The only hook in 3.0. Runs once after the inventory and hermex's own
   * rules are complete, and before anything is rendered — so a plugin sees
   * the finished picture and whatever it contributes still reaches the
   * verdict.
   */
  onRunComplete?(ctx: PluginContext): void | Promise<void>;
}

/**
 * A plugin is inert data — a plain object, declarable inline in
 * `hermex.config.ts`, with no factory call and no load-time side effects.
 * The `hooks` envelope is what lets the API grow without a breaking change.
 */
export interface HermexPlugin {
  /**
   * Canonical identity, declared by the plugin and never by the config
   * author. hermex de-duplicates by this name and namespaces the plugin's
   * violations under it. Two plugins sharing a name is a config error.
   */
  readonly name: string;
  readonly hooks: HermexPluginHooks;
}

/** Where a finding sits in the source, when the wrapped tool reports it. */
export interface PluginViolationLocation {
  file: string;
  line?: number;
  column?: number;
}

/**
 * A finding contributed by a plugin. Structurally uniform — unlike hermex's
 * own violations, which carry rule-specific fields — because hermex does not
 * model the wrapped tool's domain.
 *
 * `plugin` is the discriminant that separates these from hermex's own
 * violations in the `RuleViolation` union; narrow with `'plugin' in v`.
 */
export interface PluginViolation {
  /**
   * Namespaced `${plugin.name}/${foreignRuleId}`. hermex does not parse or
   * validate the second half — it is the wrapped tool's id space, and
   * `hermex.config.ts` deliberately cannot address it (#102).
   */
  ruleId: string;
  severity: 'error' | 'warn' | 'info';
  message: string;
  /** Canonical name of the contributing plugin. Set by hermex, not the plugin. */
  plugin: string;
  files?: string[];
  location?: PluginViolationLocation;
}

/** What a plugin may report. `plugin` is stamped on by hermex. */
export type PluginViolationInput = Omit<PluginViolation, 'plugin'>;

/**
 * The read-only view of the run handed to a plugin.
 *
 * Deliberately *not* `AggregatedReport`. Keeping the pipeline's internal
 * state out of the plugin surface is what leaves the public API and the JSON
 * contract free to change (#104, #115) — it was the main reason
 * plugin-as-pipeline-stage was rejected.
 */
export interface PluginInventoryView {
  readonly summary: {
    readonly filesAnalyzed: number;
    readonly totalImports: number;
    readonly totalComponents: number;
    readonly totalUsagePatterns: number;
  };
  readonly packages: readonly PackageDistribution[];
  readonly components: readonly ComponentUsage[];
  readonly versus: readonly VersusResult[];
  /**
   * Everything found so far — hermex's own violations plus anything earlier
   * plugins contributed. This is what a reporter plugin (SARIF, Slack, a
   * dashboard) reads.
   */
  readonly violations: readonly RuleViolation[];
}

/**
 * Read-only data plus write channels. There are no host capabilities here —
 * no `resolve()`, no `emitFile()` — a deliberate divergence from the Rollup
 * prior art, whose capability argument assumed plugins re-enter the host
 * pipeline. With one terminal hook there is nothing to re-enter (#102).
 */
export interface PluginContext {
  readonly cwd: string;
  readonly config: ResolvedHermexConfig;
  /** In-scope files, post-exclude and post-`.d.ts` filtering. */
  readonly files: readonly string[];
  readonly inventory: PluginInventoryView;

  readonly violations: {
    /**
     * Contribute a finding. Granularity is the plugin's decision: one
     * aggregated row or three thousand line-level ones are both valid —
     * the plugin author knows the wrapped tool and hermex does not (#102).
     *
     * An `error` severity fails the run through the ordinary compliance
     * path; there is no separate verdict channel.
     */
    add(violation: PluginViolationInput): void;
  };

  /**
   * A scratch channel shared across plugins for one run, so a plugin can
   * pass structured data to a later one without a global. Not yet surfaced
   * in the JSON output — that is #115.
   */
  readonly meta: {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
  };

  readonly logger: {
    info(message: string): void;
    warn(message: string): void;
  };
}
