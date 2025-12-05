import chalk from 'chalk';
import path from 'node:path';
import type { UsageReport } from '../swc-parser';

export function printVerbose(filePath: string, report: UsageReport) {
  const relativePath = path.relative(process.cwd(), filePath);

  console.log(chalk.gray(`[VERBOSE] Analyzing: ${relativePath}`));

  // Print JSX usage
  for (const jsx of report.patterns.usage.jsx) {
    console.log(chalk.gray(`[VERBOSE] Found JSX Usage: <${jsx.component}>`));
  }

  // Print named imports
  for (const imp of report.patterns.imports.named) {
    console.log(
      chalk.gray(`[VERBOSE] Found import: ${imp.name} from ${imp.source}`),
    );
  }

  // Print default imports
  for (const imp of report.patterns.imports.default) {
    console.log(
      chalk.gray(
        `[VERBOSE] Found default import: ${imp.name} from ${imp.source}`,
      ),
    );
  }

  // Print namespace imports
  for (const imp of report.patterns.imports.namespace) {
    console.log(
      chalk.gray(
        `[VERBOSE] Found namespace import: ${imp.name} from ${imp.source}`,
      ),
    );
  }

  // Print aliased imports
  for (const imp of report.patterns.imports.aliased) {
    console.log(
      chalk.gray(
        `[VERBOSE] Found aliased import: ${imp.imported} as ${imp.local} from ${imp.source}`,
      ),
    );
  }

  // Print object mappings
  for (const obj of report.patterns.usage.objects) {
    for (const mapping of obj.mappings) {
      console.log(
        chalk.gray(
          `[VERBOSE] Found Object mapping with Component: ${mapping.component}`,
        ),
      );
    }
  }

  // Print conditional usage
  for (const cond of report.patterns.usage.conditional) {
    console.log(
      chalk.gray(`[VERBOSE] Found Conditional usage: ${cond.consequent}`),
    );
  }

  // Print array mappings
  for (const arr of report.patterns.usage.arrays) {
    console.log(
      chalk.gray(
        `[VERBOSE] Found Array mapping with components: ${arr.components.join(', ')}`,
      ),
    );
  }

  // Print variable assignments
  for (const variable of report.patterns.usage.variables) {
    console.log(
      chalk.gray(
        `[VERBOSE] Found Variable assignment: ${variable.variable} = ${variable.assignment}`,
      ),
    );
  }

  // Print destructuring
  for (const destructure of report.patterns.usage.destructuring) {
    console.log(
      chalk.gray(
        `[VERBOSE] Found Destructuring: ${destructure.property} from ${destructure.source}`,
      ),
    );
  }

  // Print lazy imports
  for (const lazy of report.patterns.advanced.lazy) {
    console.log(chalk.gray(`[VERBOSE] Found Lazy import: ${lazy.source}`));
  }

  // Print dynamic imports
  for (const dynamic of report.patterns.advanced.dynamic) {
    console.log(
      chalk.gray(`[VERBOSE] Found Dynamic import: ${dynamic.source}`),
    );
  }

  // Print HOC usage
  for (const hoc of report.patterns.advanced.hoc) {
    console.log(
      chalk.gray(`[VERBOSE] Found HOC: ${hoc.function}(${hoc.component})`),
    );
  }

  // Print memo
  for (const memo of report.patterns.advanced.memo) {
    console.log(
      chalk.gray(`[VERBOSE] Found Memoized component: ${memo.component}`),
    );
  }

  // Print forwardRef
  if (report.patterns.advanced.forwardRef.length > 0) {
    console.log(chalk.gray(`[VERBOSE] Found Forward Ref usage`));
  }

  // Print portal
  if (report.patterns.advanced.portal.length > 0) {
    console.log(chalk.gray(`[VERBOSE] Found Portal usage`));
  }

  // Print line separator
  console.log(chalk.gray(`[VERBOSE] ${'─'.repeat(80)}`));
}
