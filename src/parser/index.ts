import type { UsageReport } from '../swc-parser/types';
import type { ParserName } from '../config/types';

/**
 * The front-end contract every parser satisfies. Both implementations produce
 * the same `UsageReport`, so everything downstream of `parseFile` — the
 * aggregator, the rules, every printer — is parser-agnostic.
 */
export interface Parser {
  name: ParserName;
  parseCode(code: string, filePath?: string): UsageReport;
  parseFile(filePath: string): UsageReport | null;
}

/**
 * Resolves the configured `parser`.
 *
 * Both front-ends are loaded lazily: a scan should only ever pay to load the
 * native binding of the parser it actually uses.
 */
export async function getParser(name: ParserName): Promise<Parser> {
  if (name === 'oxc-experimental') {
    const oxc = await import('../oxc-parser');
    return { name, parseCode: oxc.parseCode, parseFile: oxc.parseFile };
  }

  const swc = await import('../swc-parser');
  return { name: 'swc', parseCode: swc.parseCode, parseFile: swc.parseFile };
}
