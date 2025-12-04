import { parseSync } from '@swc/core';
import fs from 'node:fs';
import type { ParseOptions, UsageReport } from './types';
import { createState } from './core/state';
import { visitNode } from './core/visitor';
import { generateReport } from './core/report';

/**
 * Parses code and analyzes React component usage patterns
 */
export function parseCode(
  code: string,
  options: ParseOptions = {},
): UsageReport {
  const state = createState();

  // Parse code to AST
  const ast = parseSync(code, {
    syntax: 'typescript',
    tsx: true,
    decorators: true,
    dynamicImport: true,
  });

  // Visit all nodes and analyze patterns
  visitNode(ast, state);

  // Generate report
  const report = generateReport(state);

  // Optional: Filter by library if specified
  if (options.libraryName) {
    return filterReportByLibrary(report, options.libraryName);
  }

  return report;
}

/**
 * Parses a file and analyzes React component usage patterns
 */
export function parseFile(
  filePath: string,
  options: ParseOptions = {},
): UsageReport | null {
  console.log(`\n📁 Analyzing: ${filePath}`);

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    return parseCode(code, options);
  } catch (error: any) {
    console.error(`❌ Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Filters report to only include imports/usage from a specific library
 */
function filterReportByLibrary(
  report: UsageReport,
  libraryName: string,
): UsageReport {
  const isFromLibrary = (source: string) =>
    source.startsWith(libraryName) || source.includes(libraryName);

  return {
    ...report,
    patterns: {
      imports: {
        default: report.patterns.imports.default.filter((imp) =>
          isFromLibrary(imp.source),
        ),
        named: report.patterns.imports.named.filter((imp) =>
          isFromLibrary(imp.source),
        ),
        namespace: report.patterns.imports.namespace.filter((imp) =>
          isFromLibrary(imp.source),
        ),
        aliased: report.patterns.imports.aliased.filter((imp) =>
          isFromLibrary(imp.source),
        ),
      },
      usage: report.patterns.usage,
      advanced: {
        lazy: report.patterns.advanced.lazy.filter((imp) =>
          isFromLibrary(imp.source),
        ),
        dynamic: report.patterns.advanced.dynamic.filter((imp) =>
          isFromLibrary(imp.source),
        ),
        hoc: report.patterns.advanced.hoc,
        memo: report.patterns.advanced.memo,
        forwardRef: report.patterns.advanced.forwardRef,
        portal: report.patterns.advanced.portal,
      },
      props: report.patterns.props,
    },
  };
}

// Re-export types for convenience
export type { UsageReport, ParseOptions } from './types';
