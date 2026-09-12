import chalk from 'chalk';
import Table from 'cli-table3';
import type { AggregatedReport } from './aggregator';
import type { RuleViolation } from '../rules/evaluator';
import type { CoreRuleViolation } from '../rules/shared';
import { isPluginViolation, groupKeyFor } from '../rules/shared';
import type { PluginViolation } from '../plugins/types';
import { formatBytes } from './byte-size';
import { formatTruncatedList } from './format-utils';
import {
  formatSeverityTally,
  severityIcon,
  sortViolationsBySeverity,
} from './severity-format';

export function formatRuleType(violation: RuleViolation): string {
  // A plugin's rule id is its own namespace (`oxlint/no-unused-vars`) and
  // hermex neither parses nor shortens it — orchestrating means passing the
  // wrapped tool's identifiers through, not translating them (#102).
  if (isPluginViolation(violation)) return violation.ruleId;

  switch (violation.ruleId) {
    case 'no-files':
      return 'no-files';
    case 'require-files':
      return 'require-files';
    case 'max-file-size':
      return 'max-file-size';
    case 'require-packages':
      return 'require-packages';
    case 'no-packages':
      return 'no-packages';
    case 'require-scripts':
      return 'require-scripts';
    case 'require-package-fields':
      return 'package-fields';
    case 'no-package-fields':
      return 'package-fields';
    case 'require-engine-version':
      return 'require-engine-version';
    case 'require-codeowners':
      return 'require-codeowners';
    case 'release-age':
      return 'release-age';
  }
}

function basename(file: string): string {
  const parts = file.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

/**
 * Describes one *group* of atomic violations that share a `groupKeyFor` key
 * (i.e. came from the same rule-config-entry) as a single row — this is
 * what reconstructs today's folded display (`no-files`, `require-codeowners`,
 * `max-file-size`) from what are now atomic violation records. Every group
 * this is called with is homogeneous: same `ruleId`, same `patterns`,
 * same `severity` (they came from one rule entry), so reading fields off
 * `group[0]` for anything not itself the varying subject is safe.
 */
function describeGroup(group: CoreRuleViolation[]): string {
  const v0 = group[0];
  const patterns = v0.patterns.join(', ');
  const suffix = v0.message ? chalk.gray(` — ${v0.message}`) : '';

  switch (v0.ruleId) {
    case 'no-files': {
      const files = (
        group as (CoreRuleViolation & { ruleId: 'no-files' })[]
      ).map((v) => basename(v.matchedFile));
      return `${patterns} detected (${formatTruncatedList(files, 'file')})${suffix}`;
    }

    case 'require-files':
      return `${patterns} not found${suffix}`;

    case 'max-file-size': {
      const items = group as (CoreRuleViolation & {
        ruleId: 'max-file-size';
      })[];
      // Largest first: the worst offender is the one worth naming.
      const sorted = [...items].sort(
        (a, b) => b.oversizeFile.sizeBytes - a.oversizeFile.sizeBytes,
      );
      const files = sorted.map((v) => basename(v.oversizeFile.file));
      const ceiling = `${patterns} over ${formatBytes(v0.maxSizeBytes)}`;
      const largest = sorted[0]?.oversizeFile;
      if (!largest)
        return `${ceiling} (${formatTruncatedList(files, 'file')})${suffix}`;
      if (files.length === 1)
        return `${ceiling} (${files[0]} at ${formatBytes(largest.sizeBytes)})${suffix}`;
      return `${ceiling} (${formatTruncatedList(files, 'file')}, largest ${formatBytes(largest.sizeBytes)})${suffix}`;
    }

    case 'require-packages':
      return `${patterns} not installed${suffix}`;

    case 'require-scripts':
      return `script ${patterns} missing in package.json${suffix}`;

    case 'require-package-fields':
      if (v0.fieldPath && v0.actualValue !== undefined)
        return `field ${v0.fieldPath} is ${chalk.yellow(v0.actualValue)}, does not match required value${suffix}`;
      return `field ${patterns} missing in package.json${suffix}`;

    case 'require-engine-version':
      if (!v0.installedRange)
        return `engines.node not specified (required ${v0.requiredRange})${suffix}`;
      return `engines.node is ${chalk.yellow(v0.installedRange)}, required ${chalk.cyan(v0.requiredRange)}${suffix}`;

    case 'require-codeowners': {
      if (v0.reason === 'missing-file')
        return `CODEOWNERS not found (looked in ${patterns})${suffix}`;
      const files = (
        group as (CoreRuleViolation & { ruleId: 'require-codeowners' })[]
      ).map((v) => v.matchedFile!);
      const label =
        v0.reason === 'wrong-owner' ? 'have the wrong owner' : 'have no owner';
      return `${files.length} scanned file(s) ${label}: ${formatTruncatedList(files, 'file')}${suffix}`;
    }

    default:
      return `${patterns} not present${suffix}`;
  }
}

/** One row per violation — each subject (a forbidden package, a forbidden
 * field) is individually actionable, so folding them would hide which
 * specific ones to fix. Matches today's existing display for these rules,
 * which already emit one violation per subject. */
function describeIndividual(v: CoreRuleViolation): string {
  const patterns = v.patterns.join(', ');
  const suffix = v.message ? chalk.gray(` — ${v.message}`) : '';

  if (v.ruleId === 'no-packages')
    return `${v.packageName ?? patterns} is forbidden${suffix}`;
  if (v.ruleId === 'no-package-fields')
    return `field ${v.fieldPath ?? patterns} is forbidden in package.json${suffix}`;

  return describeGroup([v]);
}

/** Plugin findings carry a ready-made `message` from the wrapped tool
 * instead of hermex-authored prose about hermex's own rule shapes — and
 * aren't part of the grouping model at all (each is already one row). */
function describePlugin(v: PluginViolation): string {
  const where = v.location
    ? `${v.location.file}${v.location.line !== undefined ? `:${v.location.line}` : ''}`
    : v.files && v.files.length > 0
      ? formatTruncatedList(v.files, 'file')
      : '';
  return where ? `${v.message} ${chalk.gray(`(${where})`)}` : v.message;
}

/** Rule types whose atomic violations render one row each rather than being
 * folded into one row per group — see `describeIndividual`. Every rule not
 * listed here uses the fold-and-truncate display (`describeGroup`), and
 * `release-age` renders nothing here at all (see `printRules`) — its display
 * is the Packages table, not this one. This table is the single place that
 * declares each rule's rendering strategy. */
const ONE_ROW_PER_VIOLATION = new Set<CoreRuleViolation['ruleId']>([
  'no-packages',
  'no-package-fields',
]);

export interface Row {
  rule: string;
  description: string;
  severity: RuleViolation['severity'];
}

/**
 * Describes a single violation on its own — for a plugin finding or a
 * `no-packages`/`no-package-fields` hit this is exactly what shows up in
 * `buildRuleRows`'s output (each already renders one row per violation); for
 * a fold-style rule (`no-files`, `max-file-size`, `require-codeowners`, or
 * any absence rule) it describes that one violation in isolation, as if it
 * were the only member of its group — useful for callers that already have
 * a single violation in hand and don't need `buildRuleRows`'s grouping.
 * `release-age` has no dedicated description here since it never renders in
 * this table at all (see `printRules`); it falls through to the generic
 * "not present" default, same as any other unhandled shape.
 */
export function describeViolation(v: RuleViolation): string {
  if (isPluginViolation(v)) return describePlugin(v);
  if (ONE_ROW_PER_VIOLATION.has(v.ruleId)) return describeIndividual(v);
  return describeGroup([v]);
}

/**
 * Turns a flat list of atomic violations into display rows: one row per
 * group for fold-style rules (`no-files`, `max-file-size`,
 * `require-codeowners`, and every absence rule, which are always
 * single-member groups), one row per violation for `no-packages`/
 * `no-package-fields`, one row per finding for plugins, and zero rows for
 * `release-age` (its display is the Packages table). Shared by the terminal
 * table (`printRules`) and `--summary-file` (`write-summary-file.ts`) so
 * the two surfaces can never render a different row count for the same
 * violations — pass violations pre-sorted (`sortViolationsBySeverity`) if
 * row order matters to the caller.
 */
export function buildRuleRows(violations: RuleViolation[]): Row[] {
  const rows: Row[] = [];
  const seenGroups = new Set<string>();

  for (const v of violations) {
    if (isPluginViolation(v)) {
      // Plugin findings are already atomic and aren't part of this grouping
      // model — one row each, as always.
      rows.push({
        rule: formatRuleType(v),
        description: `${severityIcon(v.severity)} ${describePlugin(v)}`,
        severity: v.severity,
      });
      continue;
    }

    // release-age never gets a row here — its display is the Packages
    // table (formatUpgradeCell/print-packages.ts), not this one. This is a
    // declared choice, the same kind every rule below makes, not a filter
    // bolted on for one rule id.
    if (v.ruleId === 'release-age') continue;

    if (ONE_ROW_PER_VIOLATION.has(v.ruleId)) {
      rows.push({
        rule: formatRuleType(v),
        description: `${severityIcon(v.severity)} ${describeIndividual(v)}`,
        severity: v.severity,
      });
      continue;
    }

    const key = groupKeyFor(v);
    if (seenGroups.has(key)) continue; // already rendered as part of its group
    seenGroups.add(key);

    const group = violations.filter(
      (other) => !isPluginViolation(other) && groupKeyFor(other) === key,
    ) as CoreRuleViolation[];

    rows.push({
      rule: formatRuleType(v),
      description: `${severityIcon(v.severity)} ${describeGroup(group)}`,
      severity: v.severity,
    });
  }

  return rows;
}

export function printRules(aggregated: AggregatedReport): void {
  const { ruleViolations } = aggregated;

  // Nothing to report — print nothing at all, rather than a "Rules" header
  // plus an "All rule checks passed" line with zero rows underneath it.
  // The overall compliance verdict (printComplianceVerdict) already gives
  // the definitive pass/fail signal; an empty section here is pure
  // boilerplate, indistinguishable from "no rules were ever configured."
  if (ruleViolations.length === 0) return;

  const rows = buildRuleRows(sortViolationsBySeverity(ruleViolations));
  if (rows.length === 0) return; // everything present was release-age

  console.log(chalk.blueBright.bold('\n🔍 Rules\n'));

  // A table, matching the Packages table's shape/scanability, rather than a
  // bullet list.
  const table = new Table({
    head: ['Rule', 'Description'],
    style: { head: ['cyan'], border: ['gray'] },
  });

  for (const row of rows) {
    table.push([row.rule, row.description]);
  }

  console.log(table.toString());

  // Sums the full atomic list, not the rendered rows — a fold that reads as
  // one row is still N things wrong, and the tally below the table must
  // reflect that (this is the whole point of moving to atomic violations:
  // `ruleViolations.length` is finally a comparable "things wrong" count).
  // Note this can differ from what's visibly listed above when release-age
  // violations are present, since those contribute to the tally but never
  // render as rows here — their detail lives in the Packages table instead.
  console.log(
    chalk.gray(
      `\n${formatSeverityTally(ruleViolations, { includeInfo: true })}`,
    ),
  );
}
