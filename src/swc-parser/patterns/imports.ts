import type { ImportDeclaration } from '@swc/core';
import type { ParserState } from '../types';
import { lineOf } from '../utils/span';

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
    line: lineOf(node),
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
    line: lineOf(node),
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
    line: lineOf(node),
  });

  // Track aliases
  if (importedName !== localName) {
    state.usagePatterns.aliasedImports.set(localName, {
      imported: importedName,
      local: localName,
      source,
      line: lineOf(node),
    });
  }

  state.componentNames.add(localName);
}
