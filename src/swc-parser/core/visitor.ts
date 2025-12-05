import type { ParserState, VisitorContext } from '../types';
import { analyzeImportDeclaration } from '../patterns/imports';
import { analyzeJSXElement, analyzeJSXOpeningElement } from '../patterns/jsx';
import { analyzeVariableDeclaration } from '../patterns/variables';
import { analyzeConditionalExpression } from '../patterns/conditionals';
import {
  analyzeArrayExpression,
  analyzeObjectExpression,
} from '../patterns/collections';
import {
  analyzeLazyImport,
  analyzeDynamicImport,
} from '../patterns/lazy-dynamic';
import {
  analyzeHOCUsage,
  analyzeMemoUsage,
  analyzeForwardRefUsage,
  analyzePortalUsage,
  analyzeMemberExpression,
  isHOCPattern,
} from '../patterns/advanced';

/**
 * Main AST visitor that routes nodes to appropriate pattern analyzers
 */
export function visitNode(
  node: any,
  state: ParserState,
  context: VisitorContext = {},
): void {
  if (!node) return;

  switch (node.type) {
    case 'Module':
      // Process imports first (they populate componentNames)
      if (node.body) {
        for (const item of node.body) {
          if (item.type === 'ImportDeclaration') {
            visitNode(item, state, context);
          }
        }
        // Then process everything else
        for (const item of node.body) {
          if (item.type !== 'ImportDeclaration') {
            visitNode(item, state, { ...context, parent: node });
          }
        }
      }
      break;

    case 'ImportDeclaration':
      analyzeImportDeclaration(node, state);
      break;

    case 'CallExpression':
      analyzeCallExpression(node, state, context);
      break;

    case 'VariableDeclaration':
      analyzeVariableDeclaration(node, state);
      visitChildren(node, state, context);
      break;

    case 'JSXElement':
    case 'JSXFragment':
      analyzeJSXElement(node, state);
      visitChildren(node, state, context);
      break;

    case 'JSXOpeningElement':
      analyzeJSXOpeningElement(node, state, context.parent);
      break;

    case 'ArrayExpression':
      analyzeArrayExpression(node, state);
      visitChildren(node, state, context);
      break;

    case 'ObjectExpression':
      analyzeObjectExpression(node, state);
      visitChildren(node, state, context);
      break;

    case 'MemberExpression':
      analyzeMemberExpression(node, state);
      visitChildren(node, state, context);
      break;

    case 'ConditionalExpression':
      analyzeConditionalExpression(node, state);
      visitChildren(node, state, context);
      break;

    case 'FunctionDeclaration':
    case 'ClassDeclaration':
    case 'ExpressionStatement':
    case 'ReturnStatement':
    case 'VariableDeclarator':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      visitChildren(node, state, { ...context, parent: node });
      break;

    default:
      visitChildren(node, state, context);
      break;
  }
}

/**
 * Analyzes call expressions and routes to specific analyzers
 */
function analyzeCallExpression(
  node: any,
  state: ParserState,
  context: VisitorContext,
): void {
  // Analyze lazy imports
  if (
    node.callee?.value === 'lazy' ||
    (node.callee?.object?.value === 'React' &&
      node.callee?.property?.value === 'lazy')
  ) {
    analyzeLazyImport(node, state);
  }

  // Analyze dynamic imports
  if (node.callee?.type === 'Import') {
    analyzeDynamicImport(node, state);
  }

  // Analyze HOC patterns
  if (isHOCPattern(node, state)) {
    analyzeHOCUsage(node, state);
  }

  // Analyze React.memo, React.forwardRef
  if (node.callee?.object?.value === 'React') {
    if (node.callee?.property?.value === 'memo') {
      analyzeMemoUsage(node, state);
    } else if (node.callee?.property?.value === 'forwardRef') {
      analyzeForwardRefUsage(node, state);
    }
  }

  // Analyze createPortal
  if (
    node.callee?.property?.value === 'createPortal' ||
    node.callee?.value === 'createPortal'
  ) {
    analyzePortalUsage(node, state);
  }

  visitChildren(node, state, context);
}

/**
 * Visits all children of a node
 */
function visitChildren(
  node: any,
  state: ParserState,
  context: VisitorContext,
): void {
  if (!node) return;

  for (const key in node) {
    const value = node[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') {
          visitNode(item, state, { ...context, parent: node });
        }
      }
    } else if (value && typeof value === 'object' && value.type) {
      visitNode(value, state, { ...context, parent: node });
    }
  }
}
