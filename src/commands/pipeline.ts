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
import { enrichWithReleaseAge } from '../npm-registry/enricher';
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
  const lockfileResult = findAndParseLockfile(process.cwd());

  spinner.succeed(
    chalk.blue(
      `📦 Found ${lockfileResult.lockfileType} lockfile (supports: ${lockfileResult.supportedVersions.join(', ')}) - ${Object.keys(lockfileResult.versions).length} packages`,
    ),
  );

  spinner.start('Finding files...');
  const discovered = await findFiles(config.includes, config.excludes);
  const files = discovered.filter((f) => !isDeclarationFile(f));

  if (files.length === 0) {
    spinner.fail(
      chalk.red(
        `No files found matching includes: ${config.includes.join(', ')}`,
      ),
    );
    return null;
  }

  spinner.succeed(chalk.green(` Found ${files.length} files`));

  spinner.start('Analyzing files...');
  const reports: UsageReport[] = [];
  const parseErrors: ParseError[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
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
    config,
    lockfileResult.multiVersions,
  );

  const evaluatorViolations = evaluateRules(
    process.cwd(),
    config.rules,
    config.excludes,
    files,
  );
  aggregated.ruleViolations = [
    ...aggregated.ruleViolations,
    ...evaluatorViolations,
  ];

  if (config.releaseAge.enabled) {
    spinner.start('Fetching release age from registry...');
    const { enriched, skipped } = await enrichWithReleaseAge(
      aggregated.packageDistribution,
      config.releaseAge,
    );
    aggregated.packageDistribution = enriched;
    spinner.succeed(
      chalk.blue(
        `📅 Release age fetched${skipped > 0 ? chalk.gray(` (${skipped} packages skipped — registry unreachable or not found)`) : ''}`,
      ),
    );
  }

  return aggregated;
}
