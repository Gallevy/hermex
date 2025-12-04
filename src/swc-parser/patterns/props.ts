import type { PropsAnalysis, PropDetail, ParserState } from '../types';

/**
 * Analyzes props in detail for a component
 */
export function analyzePropsInDetail(
  attributes: any[],
  componentName: string,
  state: ParserState,
): PropsAnalysis {
  const analysis: PropsAnalysis = {
    namedProps: [],
    hasSpread: false,
    hasComplexProps: false,
    hasEventHandlers: false,
    propDetails: [],
  };

  if (!attributes) return analysis;

  for (const attr of attributes) {
    if (attr.type === 'JSXAttribute') {
      const propName = attr.name?.value || attr.name?.name?.value;
      if (propName) {
        analysis.namedProps.push(propName);

        const propDetail: PropDetail = {
          name: propName,
          type: getPropType(attr.value),
          isEventHandler: propName.startsWith('on'),
          isComplex: isComplexProp(attr.value),
        };

        if (propDetail.isEventHandler) {
          analysis.hasEventHandlers = true;
        }
        if (propDetail.isComplex) {
          analysis.hasComplexProps = true;
        }

        analysis.propDetails.push(propDetail);
      }
    } else if (attr.type === 'SpreadElement') {
      analysis.hasSpread = true;
      analysis.propDetails.push({
        name: '...',
        type: 'spread',
        isSpread: true,
        isComplex: true,
        isEventHandler: false,
        warning: 'Spread props cannot be statically analyzed',
      });
      analysis.hasComplexProps = true;
    }
  }

  // Store in state
  state.usagePatterns.propsAnalysis.set(componentName, analysis);

  return analysis;
}

/**
 * Determines the type of a prop value
 */
function getPropType(value: any): string {
  if (!value) return 'boolean';

  switch (value.type) {
    case 'StringLiteral':
      return 'string';
    case 'JSXExpressionContainer': {
      const expr = value.expression;
      if (!expr) return 'unknown';
      switch (expr.type) {
        case 'NumericLiteral':
          return 'number';
        case 'BooleanLiteral':
          return 'boolean';
        case 'StringLiteral':
          return 'string';
        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
          return 'function';
        case 'ObjectExpression':
          return 'object';
        case 'ArrayExpression':
          return 'array';
        case 'Identifier':
          return 'variable';
        default:
          return 'expression';
      }
    }
    default:
      return 'unknown';
  }
}

/**
 * Checks if a prop value is complex (object, array, call, conditional)
 */
function isComplexProp(value: any): boolean {
  if (!value) return false;
  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;
    if (!expr) return false;
    return (
      expr.type === 'ObjectExpression' ||
      expr.type === 'ArrayExpression' ||
      expr.type === 'CallExpression' ||
      expr.type === 'ConditionalExpression'
    );
  }
  return false;
}
