import type { ParserState } from '../types';

/**
 * Analyzes React.lazy() imports
 */
export function analyzeLazyImport(node: any, state: ParserState): void {
  const arg = node.arguments?.[0]?.expression;
  if (
    arg?.type === 'ArrowFunctionExpression' &&
    arg.body?.type === 'CallExpression'
  ) {
    const importCall = arg.body;
    if (importCall.callee?.type === 'Import') {
      const source = importCall.arguments?.[0]?.expression?.value;
      if (source) {
        state.usagePatterns.lazyImports.add({
          source,
          line: node.span?.start || 0,
        });
      }
    }
  }
}

/**
 * Analyzes dynamic import() calls
 */
export function analyzeDynamicImport(node: any, state: ParserState): void {
  const source = node.arguments?.[0]?.expression?.value;
  if (source) {
    state.usagePatterns.dynamicImports.add({
      source,
      line: node.span?.start || 0,
    });
  }
}
