import type { ParserState, UsagePatterns } from '../types';

export function createState(): ParserState {
  const usagePatterns: UsagePatterns = {
    directImports: new Set(),
    namedImports: new Set(),
    namespaceImports: new Set(),
    defaultImports: new Set(),
    aliasedImports: new Map(),
    variableAssignments: new Map(),
    componentMappings: new Set(),
    lazyImports: new Set(),
    dynamicImports: new Set(),
    conditionalUsage: new Set(),
    arrayMappings: new Set(),
    objectMappings: new Set(),
    hocUsage: new Set(),
    renderProps: new Set(),
    contextUsage: new Set(),
    forwardedRefs: new Set(),
    memoizedComponents: new Set(),
    portalUsage: new Set(),
    jsxUsage: new Map(),
    destructuredUsage: new Set(),
    propsAnalysis: new Map(),
  };

  return {
    usagePatterns,
    componentNames: new Set(),
    allIdentifiers: new Set(),
  };
}
