import type { ParserState } from '../types';
import { isHOCFunction } from '../utils/matchers';

/**
 * Analyzes Higher-Order Component (HOC) usage
 */
export function analyzeHOCUsage(node: any, state: ParserState): void {
  state.usagePatterns.hocUsage.add({
    function: node.callee?.value || '[unknown]',
    component: node.arguments?.[0]?.value || '[unknown]',
    line: node.span?.start || 0,
  });
  console.log(`🎁 HOC usage found`);
}

/**
 * Analyzes React.memo() usage
 */
export function analyzeMemoUsage(node: any, state: ParserState): void {
  const component = node.arguments?.[0];
  if (
    component?.type === 'Identifier' &&
    state.componentNames.has(component.value)
  ) {
    state.usagePatterns.memoizedComponents.add({
      component: component.value,
      line: node.span?.start || 0,
    });
    console.log(`🧠 Memoized component: ${component.value}`);
  }
}

/**
 * Analyzes React.forwardRef() usage
 */
export function analyzeForwardRefUsage(node: any, state: ParserState): void {
  state.usagePatterns.forwardedRefs.add({
    line: node.span?.start || 0,
  });
  console.log('↗️  ForwardRef usage found');
}

/**
 * Analyzes ReactDOM.createPortal() usage
 */
export function analyzePortalUsage(node: any, state: ParserState): void {
  state.usagePatterns.portalUsage.add({
    line: node.span?.start || 0,
  });
  console.log('🌀 Portal usage found');
}

/**
 * Analyzes member expression access (e.g., Foundation.Button)
 */
export function analyzeMemberExpression(node: any, state: ParserState): void {
  // Check if this is a namespace access like Foundation.Button
  if (
    node.object?.type === 'Identifier' &&
    state.allIdentifiers.has(node.object.value)
  ) {
    const namespaceName = node.object.value;
    const propertyName = node.property?.value;

    if (propertyName) {
      // Track namespace property access
      state.componentNames.add(propertyName);
      console.log(`🔗 Namespace access: ${namespaceName}.${propertyName}`);
    }
  }
}

/**
 * Checks if a node represents HOC pattern
 */
export function isHOCPattern(node: any, state: ParserState): boolean {
  // Simple heuristic: function that returns a component-like structure
  return (
    node.callee?.type === 'Identifier' &&
    node.arguments?.some(
      (arg: any) =>
        arg.type === 'Identifier' && state.componentNames.has(arg.value),
    )
  );
}
