import type { ParserState } from '../types';

/**
 * Analyzes React.lazy() imports
 */
export function analyzeLazyImport(node: any, state: ParserState): void {
  const arg = node.arguments?.[0];
  if (
    arg?.type === 'ArrowFunctionExpression' &&
    arg.body?.type === 'CallExpression'
  ) {
    const importCall = arg.body;
    if (importCall.callee?.type === 'Import') {
      const source = importCall.arguments?.[0]?.value;
      if (source) {
        state.usagePatterns.lazyImports.add({
          source,
          line: node.span?.start || 0,
        });
        console.log(`🔄 Found lazy import: ${source}`);
      }
    }
  }
}

/**
 * Analyzes dynamic import() calls
 */
export function analyzeDynamicImport(node: any, state: ParserState): void {
  const source = node.arguments?.[0]?.value;
  if (source) {
    state.usagePatterns.dynamicImports.add({
      source,
      line: node.span?.start || 0,
    });
    console.log(`⚡ Found dynamic import: ${source}`);
  }
}
