import { parseSync } from '@swc/core';
import type { ParseOptions as SwcParseOptions } from '@swc/core';
import fs from 'node:fs';
import path from 'node:path';
import type { UsageReport } from './types';
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

export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  const ast = parseSync(code, swcOptionsForFile(filePath));
  visitNode(ast, state);
  return generateReport(state);
}

export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');
  return parseCode(code, filePath);
}

export type { UsageReport } from './types';
