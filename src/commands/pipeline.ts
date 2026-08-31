import type { Ora } from 'ora';
import chalk from 'chalk';
import { parseFile } from '../swc-parser';
import type { UsageReport } from '../swc-parser';
import type { ParseError } from '../swc-parser/types';
import { aggregateReports } from '../utils/aggregator';
import type { AggregatedReport } from '../utils/aggregator';
import { printErrors } from '../utils/print-errors';
import { findFiles } from '../utils/file-utils';
import { findAndParseLockfile } from '../lock-parser';
import { evaluateRules } from '../rules/evaluator';
import { collectDeclaredPackages } from '../rules/shared';
import { enrichWithReleaseAge } from '../npm-registry/enricher';
import { applyOverrides } from '../config/overrides';
import { runPlugins } from '../plugins';
import type { HermexConfig } from '../config/types';

const DECLARATION_FILE_RE = /\.d\.(ts|mts|cts)$/;

function isDeclarationFile(filePath: string): boolean {
  return DECLARATION_FILE_RE.test(filePath);
}

/**
 * Runs the shared parse → aggregate → rules → release-age pipeline used by
 * both `scan` and `comply`. Returns `null` if no files matched (the spinner
 * has already reported the failure); throws on unexpected errors.
 */
export async function runPipeline(
  config: HermexConfig,
  spinner: Ora,
  isJson: boolean,
): Promise<AggregatedReport | null> {
  // Repo-scoped rule overrides are resolved here, against the repo actually
  // being analyzed (process.cwd()) — not in the loader, which only knows
  // where the config file itself came from and may be pointed elsewhere via
  // `--config`.
  const resolvedConfig = applyOverrides(config, process.cwd());

  const lockfileResult = findAndParseLockfile(process.cwd());
  const declaredPackages = collectDeclaredPackages(process.cwd());

  spinner.succeed(
    chalk.blue(
      `Found ${lockfileResult.lockfileType} lockfile (supports: ${lockfileResult.supportedVersions.join(', ')}) - ${Object.keys(lockfileResult.versions).length} packages`,
    ),
  );

  if (spinner.isEnabled) spinner.start('Finding files...');
  const discovered = await findFiles(
    resolvedConfig.includes,
    resolvedConfig.excludes,
  );
  const files = discovered.filter((f) => !isDeclarationFile(f));

  if (files.length === 0) {
    spinner.fail(
      chalk.red(
        `No files found matching includes: ${resolvedConfig.includes.join(', ')}`,
      ),
    );
    return null;
  }

  spinner.succeed(chalk.green(`Found ${files.length} files`));

  if (spinner.isEnabled) spinner.start('Analyzing files...');
  const reports: UsageReport[] = [];
  const parseErrors: ParseError[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (spinner.isEnabled)
      spinner.text = `Analyzing files... (${i + 1}/${files.length})`;

    try {
      const report = parseFile(file);
      if (report) {
        reports.push(report);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      parseErrors.push({ file, message });
    }
  }

  spinner.succeed(
    chalk.green(
      `Analysis complete! Analyzed ${reports.length}/${files.length} files`,
    ),
  );

  printErrors(parseErrors, isJson);

  const aggregated = aggregateReports(
    reports,
    lockfileResult.versions,
    resolvedConfig,
    lockfileResult.multiVersions,
    lockfileResult.resolutions,
    declaredPackages,
  );

  const evaluatorViolations = evaluateRules(
    process.cwd(),
    resolvedConfig.rules,
    resolvedConfig.excludes,
    files,
  );
  aggregated.ruleViolations = [
    ...aggregated.ruleViolations,
    ...evaluatorViolations,
  ];

  if (resolvedConfig.releaseAge.enabled) {
    if (spinner.isEnabled)
      spinner.start('Fetching release age from registry...');
    const { enriched, skipped } = await enrichWithReleaseAge(
      aggregated.packageDistribution,
      resolvedConfig.releaseAge,
    );
    aggregated.packageDistribution = enriched;
    spinner.succeed(
      chalk.blue(
        `Release age fetched${skipped > 0 ? chalk.gray(` (${skipped} packages skipped — registry unreachable or not found)`) : ''}`,
      ),
    );
  }

  // Plugins run last, once everything hermex computes itself is finished, so
  // a plugin sees the complete picture — and still before rendering, so what
  // it contributes reaches the rules table and the verdict (#102).
  //
  // The whole block is inert when no plugins are configured, which is the
  // default: an unconfigured run prints exactly what it printed before.
  if (resolvedConfig.plugins.length > 0) {
    if (spinner.isEnabled) spinner.start('Running plugins...');

    const pluginViolations = await runPlugins({
      plugins: resolvedConfig.plugins,
      aggregated,
      config: resolvedConfig,
      cwd: process.cwd(),
      files,
      quiet: isJson,
    });

    aggregated.ruleViolations = [
      ...aggregated.ruleViolations,
      ...pluginViolations,
    ];

    // Attribution: third-party code just executed in the user's repo, so
    // name it. hermex does not sandbox plugins — the config that imports
    // them already runs as arbitrary code — which makes visibility the
    // obligation instead (#102).
    spinner.succeed(
      chalk.blue(
        `Ran ${resolvedConfig.plugins.length} plugin(s): ${resolvedConfig.plugins.map((p) => p.name).join(', ')}` +
          (pluginViolations.length > 0
            ? chalk.gray(` — ${pluginViolations.length} finding(s)`)
            : ''),
      ),
    );
  }

  return aggregated;
}
