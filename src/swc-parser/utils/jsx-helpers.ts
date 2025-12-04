import type { ParserState } from '../types';

/**
 * Extracts the name from a JSX element (handles identifiers and member expressions)
 */
export function getJSXElementName(nameNode: any): string {
  if (!nameNode) return '';

  switch (nameNode.type) {
    case 'Identifier':
      return nameNode.value;
    case 'JSXMemberExpression':
      return `${getJSXElementName(nameNode.object)}.${nameNode.property.value}`;
    default:
      return '';
  }
}

/**
 * Checks if a JSX member expression is a known component
 */
export function isMemberExpressionComponent(
  nameNode: any,
  state: ParserState,
): boolean {
  if (nameNode?.type === 'JSXMemberExpression') {
    const objectName = getJSXElementName(nameNode.object);
    return state.allIdentifiers.has(objectName);
  }
  return false;
}

/**
 * Extracts props from JSX attributes
 */
export function extractJSXProps(attributes: any[]): Array<{
  name: string;
  value: any;
  isSpread?: boolean;
}> {
  if (!attributes) return [];

  return attributes
    .map((attr) => {
      if (attr.type === 'JSXAttribute') {
        return {
          name: attr.name?.value || attr.name?.name?.value,
          value: extractJSXAttributeValue(attr.value),
        };
      }
      if (attr.type === 'SpreadElement') {
        return {
          name: '...',
          value: '[spread]',
          isSpread: true,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    name: string;
    value: any;
    isSpread?: boolean;
  }>;
}

/**
 * Extracts value from JSX attribute
 */
export function extractJSXAttributeValue(value: any): any {
  if (!value) return true; // boolean attribute

  switch (value.type) {
    case 'StringLiteral':
      return value.value;
    case 'JSXExpressionContainer':
      return extractExpressionValue(value.expression);
    default:
      return '[complex]';
  }
}

/**
 * Extracts a readable value from an expression
 */
export function extractExpressionValue(expr: any): any {
  if (!expr) return '[unknown]';

  switch (expr.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
      return expr.value;
    case 'Identifier':
      return `{${expr.value}}`;
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return '[function]';
    case 'ObjectExpression':
      return '[object]';
    case 'ArrayExpression':
      return '[array]';
    default:
      return '[expression]';
  }
}

/**
 * Determines the context where a component is being used
 */
export function getUsageContext(parent: any): string {
  if (!parent) return 'direct';

  switch (parent.type) {
    case 'ConditionalExpression':
      return 'conditional';
    case 'ArrayExpression':
      return 'array';
    case 'ObjectExpression':
      return 'object';
    case 'CallExpression':
      return 'hoc';
    case 'VariableDeclarator':
      return 'variable';
    default:
      return 'jsx';
  }
}
