import type { ParserState } from '../types';

/**
 * Analyzes conditional expressions (ternary operators) with components
 */
export function analyzeConditionalExpression(
  node: any,
  state: ParserState,
): void {
  const consequent =
    node.consequent?.type === 'Identifier' ? node.consequent.value : null;
  const alternate =
    node.alternate?.type === 'Identifier' ? node.alternate.value : null;

  if (
    (consequent && state.componentNames.has(consequent)) ||
    (alternate && state.componentNames.has(alternate))
  ) {
    state.usagePatterns.conditionalUsage.add({
      consequent: consequent || '',
      alternate: alternate || '',
      line: node.span?.start || 0,
    });
    // console.log('🔀 Conditional component usage found');
  }
}
