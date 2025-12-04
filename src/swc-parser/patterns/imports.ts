import type { ImportDeclaration } from '@swc/core';
import type { ParserState } from '../types';

/**
 * Analyzes import declarations and tracks all types:
 * - Default imports
 * - Named imports
 * - Namespace imports
 * - Aliased imports
 */
export function analyzeImportDeclaration(
  node: ImportDeclaration,
  state: ParserState,
): void {
  const source = node.source.value;

  console.log(`📦 Found import: ${source}`);

  for (const spec of node.specifiers) {
    switch (spec.type) {
      case 'ImportDefaultSpecifier':
        analyzeDefaultImport(spec, source, node, state);
        break;

      case 'ImportNamespaceSpecifier':
        analyzeNamespaceImport(spec, source, node, state);
        break;

      case 'ImportSpecifier':
        analyzeNamedImport(spec, source, node, state);
        break;
    }
  }
}

function analyzeDefaultImport(
  spec: any,
  source: string,
  node: ImportDeclaration,
  state: ParserState,
): void {
  const name = spec.local.value;

  state.usagePatterns.defaultImports.add({
    name,
    source,
    line: node.span?.start || 0,
  });

  state.componentNames.add(name);
}

function analyzeNamespaceImport(
  spec: any,
  source: string,
  node: ImportDeclaration,
  state: ParserState,
): void {
  const name = spec.local.value;

  state.usagePatterns.namespaceImports.add({
    name,
    source,
    line: node.span?.start || 0,
  });

  state.allIdentifiers.add(name);
}

function analyzeNamedImport(
  spec: any,
  source: string,
  node: ImportDeclaration,
  state: ParserState,
): void {
  const importedName = spec.imported ? spec.imported.value : spec.local.value;
  const localName = spec.local.value;

  state.usagePatterns.namedImports.add({
    name: importedName,
    source,
    line: node.span?.start || 0,
  });

  // Track aliases
  if (importedName !== localName) {
    state.usagePatterns.aliasedImports.set(localName, {
      imported: importedName,
      local: localName,
      source,
      line: node.span?.start || 0,
    });
  }

  state.componentNames.add(localName);
}
