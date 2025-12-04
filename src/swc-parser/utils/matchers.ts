import type { ParserState } from '../types';

/**
 * Checks if a name is a known component from imports
 */
export function isKnownComponent(name: string, state: ParserState): boolean {
  return state.componentNames.has(name) || state.allIdentifiers.has(name);
}

/**
 * Checks if a function name matches HOC patterns
 */
export function isHOCPattern(name: string): boolean {
  const hocPatterns = ['with', 'enhance', 'wrap', 'connect', 'create'];
  return hocPatterns.some((pattern) => name.startsWith(pattern));
}

/**
 * Checks if a node represents a HOC function call
 */
export function isHOCFunction(callee: any): boolean {
  if (!callee) return false;

  if (callee.type === 'Identifier') {
    return isHOCPattern(callee.value);
  }

  if (callee.type === 'MemberExpression') {
    const prop = callee.property;
    return prop?.value && isHOCPattern(prop.value);
  }

  return false;
}

/**
 * Checks if an expression looks like a React component
 * (starts with capital letter)
 */
export function looksLikeComponent(name: string): boolean {
  return /^[A-Z]/.test(name);
}

/**
 * Checks if source is from a specific library (for filtering)
 */
export function isFromLibrary(source: string, libraryName: string): boolean {
  return source.startsWith(libraryName) || source.includes(libraryName);
}
