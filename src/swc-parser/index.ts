import { parseSync } from '@swc/core';
import type { ParseOptions as SwcParseOptions } from '@swc/core';
import fs from 'node:fs';
import path from 'node:path';
import type { ParseOptions, UsageReport } from './types';
import { createState } from './core/state';
import { visitNode } from './core/visitor';
import { generateReport } from './core/report';

function swcOptionsForFile(filePath: string): SwcParseOptions {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts')
    return {
      syntax: 'typescript',
      tsx: false,
      decorators: true,
      dynamicImport: true,
    };
  if (ext === '.tsx')
    return {
      syntax: 'typescript',
      tsx: true,
      decorators: true,
      dynamicImport: true,
    };
  if (ext === '.jsx')
    return {
      syntax: 'ecmascript',
      jsx: true,
      decorators: true,
      importAssertions: true,
    };
  // .js / .mjs / .cjs
  return {
    syntax: 'ecmascript',
    jsx: false,
    decorators: true,
    importAssertions: true,
  };
}

/**
 * Parses code and analyzes React component usage patterns
 */
export function parseCode(
  code: string,
  options: ParseOptions = {},
  filePath = 'file.tsx',
): UsageReport {
  const state = createState();

  // Parse code to AST
  const ast = parseSync(code, swcOptionsForFile(filePath));

  // Visit all nodes and analyze patterns
  visitNode(ast, state);

  // Generate report
  const report = generateReport(state);

  return report;
}

/**
 * Parses a file and analyzes React component usage patterns.
 * Throws on parse/read errors — callers are responsible for handling them.
 */
export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');
  return parseCode(code, {}, filePath);
}

// Re-export types for convenience
export type { UsageReport, ParseOptions } from './types';
