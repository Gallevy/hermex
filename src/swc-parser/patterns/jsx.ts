import type { ParserState, JSXUsage } from '../types';
import {
  getJSXElementName,
  isMemberExpressionComponent,
  extractJSXProps,
  getUsageContext,
} from '../utils/jsx-helpers';
import { analyzePropsInDetail } from './props';

/**
 * Analyzes JSX element usage
 */
export function analyzeJSXElement(
  node: any,
  state: ParserState,
  parent?: any,
): void {
  if (node.opening) {
    analyzeJSXOpeningElement(node.opening, state, node);
  }
}

/**
 * Analyzes JSX opening element and tracks component usage
 */
export function analyzeJSXOpeningElement(
  node: any,
  state: ParserState,
  parent?: any,
): void {
  const elementName = getJSXElementName(node.name);

  // Check if this is a known component
  if (
    !state.componentNames.has(elementName) &&
    !isMemberExpressionComponent(node.name, state)
  ) {
    return;
  }

  const propsAnalysis = analyzePropsInDetail(
    node.attributes,
    elementName,
    state,
  );
  const usage: JSXUsage = {
    component: elementName,
    props: extractJSXProps(node.attributes).map((p) => p.name),
    propsAnalysis,
    line: node.span?.start || 0,
    context: getUsageContext(parent),
  };

  // Track JSX usage
  if (!state.usagePatterns.jsxUsage.has(elementName)) {
    state.usagePatterns.jsxUsage.set(elementName, usage);
  }

  console.log(`🎨 JSX Usage: <${elementName}>`);
}
