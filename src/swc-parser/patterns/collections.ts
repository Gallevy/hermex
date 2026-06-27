import type { ParserState } from '../types';

/**
 * Analyzes array expressions containing components
 */
export function analyzeArrayExpression(node: any, state: ParserState): void {
  // Check if array contains components
  const hasComponents = node.elements?.some((elem: any) => {
    if (elem?.type === 'Identifier') {
      return state.componentNames.has(elem.value);
    }
    return false;
  });

  if (hasComponents) {
    state.usagePatterns.arrayMappings.add({
      components: node.elements
        ?.map((elem: any) => elem?.value)
        .filter(Boolean),
      line: node.span?.start || 0,
    });
    // console.log('📋 Array with components found');
  }
}

/**
 * Analyzes object expressions with component mappings
 */
export function analyzeObjectExpression(node: any, state: ParserState): void {
  // Check if object contains component mappings
  const componentProps = node.properties?.filter((prop: any) => {
    if (prop.type === 'KeyValueProperty' && prop.value?.type === 'Identifier') {
      return state.componentNames.has(prop.value.value);
    }
    return false;
  });

  if (componentProps?.length > 0) {
    state.usagePatterns.objectMappings.add({
      mappings: componentProps.map((prop: any) => ({
        key: prop.key?.value || '[computed]',
        component: prop.value?.value,
      })),
      line: node.span?.start || 0,
    });
    // console.log('🗺️  Object mapping with components found');
  }
}
