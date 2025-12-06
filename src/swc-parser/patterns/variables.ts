import type { ParserState } from '../types';
import { isKnownComponent } from '../utils/matchers';

/**
 * Analyzes variable declarations for component assignments
 */
export function analyzeVariableDeclaration(
  node: any,
  state: ParserState,
): void {
  if (!node.declarations) return;

  for (const decl of node.declarations) {
    if (decl.id?.type === 'Identifier') {
      const varName = decl.id.value;

      // Check if it's assigning a component
      if (decl.init) {
        const assignment = extractAssignmentInfo(decl.init);
        if (assignment && isKnownComponent(assignment, state)) {
          state.usagePatterns.variableAssignments.set(varName, {
            assignment,
            line: node.span?.start || 0,
          });
          state.componentNames.add(varName);
          // console.log(`📝 Variable assignment: ${varName} = ${assignment}`);
        }
      }
    }

    // Handle destructuring assignments
    if (decl.id?.type === 'ObjectPattern') {
      analyzeDestructuringPattern(decl.id, decl.init, state);
    }
  }
}

/**
 * Analyzes destructuring patterns
 */
export function analyzeDestructuringPattern(
  pattern: any,
  init: any,
  state: ParserState,
): void {
  if (!pattern.properties) return;

  for (const prop of pattern.properties) {
    if (
      prop.type === 'AssignmentPatternProperty' &&
      prop.key?.type === 'Identifier'
    ) {
      const propName = prop.key.value;

      if (init?.type === 'Identifier' && state.allIdentifiers.has(init.value)) {
        state.usagePatterns.destructuredUsage.add({
          property: propName,
          source: init.value,
          line: pattern.span?.start || 0,
        });
        state.componentNames.add(propName);
        // console.log(`🔧 Destructuring: ${propName} from ${init.value}`);
      }
    }
  }
}

/**
 * Extracts assignment information from various node types
 */
function extractAssignmentInfo(node: any): string | null {
  switch (node.type) {
    case 'Identifier':
      return node.value;
    case 'MemberExpression':
      return `${extractAssignmentInfo(node.object)}.${node.property.value}`;
    case 'ConditionalExpression':
      return `${extractAssignmentInfo(node.consequent)} | ${extractAssignmentInfo(node.alternate)}`;
    default:
      return null;
  }
}
