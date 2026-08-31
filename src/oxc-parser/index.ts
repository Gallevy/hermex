import { parseSync } from 'oxc-parser';
import fs from 'node:fs';
import path from 'node:path';
import type { UsageReport } from '../swc-parser/types';
import { createState } from '../swc-parser/core/state';
import { visitNode } from '../swc-parser/core/visitor';
import { generateReport } from '../swc-parser/core/report';
import { normalizeProgram } from './normalize';

/**
 * Experimental oxc-parser front-end (`parser: 'oxc-experimental'`).
 *
 * Only the parse step differs from the default SWC front-end: the ESTree AST
 * oxc produces is normalized into SWC's node vocabulary (see ./normalize.ts)
 * and then walked by the same visitor, the same pattern analyzers and the same
 * report generator. There is no second copy of the analysis to keep in sync.
 */

type OxcLang = 'ts' | 'tsx' | 'jsx';

/**
 * Mirrors `swcOptionsForFile` exactly, including its treatment of every
 * non-`.ts`/`.tsx` extension as JSX-enabled ECMAScript. oxc does *not* enable
 * JSX for `.js` by default, so the language has to be stated explicitly for
 * `.js` files containing JSX to parse the way they do under SWC.
 */
function oxcLangForFile(filePath: string): OxcLang {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts') return 'ts';
  if (ext === '.tsx') return 'tsx';
  // .jsx / .js / .mjs / .cjs
  return 'jsx';
}

export function parseCode(code: string, filePath = 'file.tsx'): UsageReport {
  const state = createState();
  const result = parseSync(filePath, code, {
    lang: oxcLangForFile(filePath),
    sourceType: 'module',
  });

  // oxc reports syntax errors instead of throwing. The pipeline distinguishes
  // an unparseable file from a parsed one by the throw, so re-raise here to
  // keep `parseErrors` behaving identically across both front-ends.
  const fatal = result.errors.filter((error) => error.severity === 'Error');
  if (fatal.length > 0) {
    throw new Error(fatal.map((error) => error.message).join('\n'));
  }

  visitNode(normalizeProgram(result.program, code), state);
  return generateReport(state, filePath);
}

export function parseFile(filePath: string): UsageReport | null {
  const code = fs.readFileSync(filePath, 'utf8');
  return parseCode(code, filePath);
}

export type { UsageReport } from '../swc-parser/types';
