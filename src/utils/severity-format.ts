import chalk from 'chalk';
import type { RuleViolation } from '../rules/evaluator';

export type DisplaySeverity = 'error' | 'warn' | 'info' | 'success';

const ICONS: Record<DisplaySeverity, string> = {
  error: '🔴',
  warn: '🟡',
  info: '🔵',
  success: '🟢',
};

const COLORS: Record<DisplaySeverity, (text: string) => string> = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.blue,
  success: chalk.green,
};

/** Colored-circle glyph for a severity — carries meaning without relying on ANSI color. */
export function severityIcon(severity: DisplaySeverity): string {
  return ICONS[severity];
}

/** chalk color function for a severity, for text that needs coloring. */
export function severityColor(
  severity: DisplaySeverity,
): (text: string) => string {
  return COLORS[severity];
}

/**
 * Resolves an explicit color-on/off override from CLI flags or the NO_COLOR
 * convention (https://no-color.org). Returns `undefined` when there's no
 * explicit signal, meaning chalk's own auto-detection should be left alone
 * (including its GitHub-Actions-aware detection of non-TTY streams).
 */
export function resolveColorLevel(opts: {
  colorFlag?: boolean;
  noColorEnv?: string;
}): 0 | 1 | undefined {
  if (opts.colorFlag === false) return 0;
  if (opts.colorFlag === true) return 1;
  if (opts.noColorEnv !== undefined) return 0;
  return undefined;
}

// oxlint-disable-next-line no-control-regex -- matching the ANSI escape byte is the point
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*m/g;

/** Removes ANSI color escapes — for output destinations (files, PR comments) that can't render them. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

function stripAnsiWrites(stream: NodeJS.WriteStream): void {
  const originalWrite = stream.write.bind(stream);
  stream.write = ((chunk: unknown, ...rest: unknown[]) => {
    const stripped = typeof chunk === 'string' ? stripAnsi(chunk) : chunk;
    return (originalWrite as (...args: unknown[]) => boolean)(
      stripped,
      ...rest,
    );
  }) as typeof stream.write;
}

/**
 * Beyond setting chalk's own level, this strips ANSI codes at the stream
 * boundary when color is explicitly disabled. hermex also prints through
 * cli-table3 and ora (whose spinner symbols come from log-symbols/yoctocolors)
 * — neither shares hermex's chalk instance or honors chalk.level, so mutating
 * chalk alone can't make NO_COLOR/--no-color hold for their output too.
 */
export function applyColorLevel(level: 0 | 1 | undefined): void {
  if (level === undefined) return;
  chalk.level = level;
  if (level === 0) {
    stripAnsiWrites(process.stdout);
    stripAnsiWrites(process.stderr);
  }
}

const SEVERITY_RANK: Record<RuleViolation['severity'], number> = {
  error: 0,
  warn: 1,
  info: 2,
};

/**
 * Sorts rule violations by severity descending (error → warn → info), with
 * detection order as the tiebreak so runs stay deterministic and diffable
 * (#87). Render-time only — `ruleViolations` on `AggregatedReport` itself
 * stays in detection order, so nothing upstream (compliance counting,
 * further aggregation) has to account for a sort. Every rendered surface —
 * the terminal table (`printRules`), `--summary-file`, and `--format json` —
 * routes through this one helper, so none of them can drift from each other
 * or from a second, differently-ordered notion of "the" rule violations.
 */
export function sortViolationsBySeverity<T extends RuleViolation>(
  violations: T[],
): T[] {
  return violations
    .map((v, index) => ({ v, index }))
    .sort((a, b) => {
      const rankDiff =
        SEVERITY_RANK[a.v.severity] - SEVERITY_RANK[b.v.severity];
      return rankDiff !== 0 ? rankDiff : a.index - b.index;
    })
    .map(({ v }) => v);
}

/**
 * Buckets violations by severity in one pass — the single place that knows
 * how to partition a violations array, so `printRules`, `--summary-file`,
 * and `computeCompliance`'s error/warn buckets all derive from the same
 * grouping instead of each re-filtering `ruleViolations` independently (#88).
 */
export function groupBySeverity<T extends RuleViolation>(
  violations: T[],
): Record<RuleViolation['severity'], T[]> {
  const groups: Record<RuleViolation['severity'], T[]> = {
    error: [],
    warn: [],
    info: [],
  };
  for (const v of violations) groups[v.severity].push(v);
  return groups;
}

/**
 * Renders the colored, pluralized "N error(s), N warning(s)[, N info]" tally
 * line shared by `printRules` and `--summary-file`. Built on
 * `groupBySeverity` so the count under a table always matches the rows
 * above it — `printRules` shows every severity and passes
 * `includeInfo: true` accordingly; `--summary-file` filters `info` out of
 * its rows before calling this (per #31) and leaves `includeInfo` off, so
 * its tally stays untouched (#88).
 */
export function formatSeverityTally(
  violations: RuleViolation[],
  options?: { includeInfo?: boolean },
): string {
  const groups = groupBySeverity(violations);
  const parts: string[] = [];
  if (groups.error.length > 0)
    parts.push(
      severityColor('error')(
        `${groups.error.length} error${groups.error.length > 1 ? 's' : ''}`,
      ),
    );
  if (groups.warn.length > 0)
    parts.push(
      severityColor('warn')(
        `${groups.warn.length} warning${groups.warn.length > 1 ? 's' : ''}`,
      ),
    );
  if (options?.includeInfo && groups.info.length > 0)
    parts.push(severityColor('info')(`${groups.info.length} info`));
  return parts.join(', ');
}
