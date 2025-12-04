import type { Node } from '@swc/core';

// Pattern result types
export interface ImportPattern {
  name: string;
  source: string;
  line?: number;
}

export interface AliasedImport {
  imported: string;
  local: string;
  source: string;
  line?: number;
}

export interface JSXUsage {
  component: string;
  props: string[];
  propsAnalysis: PropsAnalysis;
  line?: number;
  context?: string;
}

export interface PropsAnalysis {
  namedProps: string[];
  hasSpread: boolean;
  hasComplexProps: boolean;
  hasEventHandlers: boolean;
  propDetails: PropDetail[];
}

export interface PropDetail {
  name: string;
  type: string;
  isEventHandler: boolean;
  isComplex: boolean;
  isSpread?: boolean;
  warning?: string;
}

export interface VariableAssignment {
  assignment: string;
  line?: number;
}

export interface ConditionalUsage {
  consequent: string;
  alternate: string;
  line?: number;
}

export interface ArrayMapping {
  components: string[];
  line?: number;
}

export interface ObjectMapping {
  key: string;
  component: string;
}

export interface HOCUsage {
  function: string;
  component: string;
  line?: number;
}

export interface LazyImport {
  source: string;
  line?: number;
}

// State management
export interface UsagePatterns {
  directImports: Set<string>;
  namedImports: Set<ImportPattern>;
  namespaceImports: Set<ImportPattern>;
  defaultImports: Set<ImportPattern>;
  aliasedImports: Map<string, AliasedImport>;
  variableAssignments: Map<string, VariableAssignment>;
  componentMappings: Set<string>;
  lazyImports: Set<LazyImport>;
  dynamicImports: Set<LazyImport>;
  conditionalUsage: Set<ConditionalUsage>;
  arrayMappings: Set<ArrayMapping>;
  objectMappings: Set<{ mappings: ObjectMapping[]; line?: number }>;
  hocUsage: Set<HOCUsage>;
  renderProps: Set<string>;
  contextUsage: Set<string>;
  forwardedRefs: Set<{ line?: number }>;
  memoizedComponents: Set<{ component: string; line?: number }>;
  portalUsage: Set<{ line?: number }>;
  jsxUsage: Map<string, JSXUsage>;
  destructuredUsage: Set<{ property: string; source: string; line?: number }>;
  propsAnalysis: Map<string, PropsAnalysis>;
}

export interface ParserState {
  usagePatterns: UsagePatterns;
  componentNames: Set<string>;
  allIdentifiers: Set<string>;
}

// Visitor context
export interface VisitorContext {
  parent?: Node;
  inJSX?: boolean;
  inArray?: boolean;
  inObject?: boolean;
}

// Report types
export interface UsageReport {
  summary: {
    totalImports: number;
    totalComponents: number;
    totalUsagePatterns: number;
  };
  patterns: {
    imports: {
      default: ImportPattern[];
      named: ImportPattern[];
      namespace: ImportPattern[];
      aliased: AliasedImport[];
    };
    usage: {
      jsx: JSXUsage[];
      variables: Array<{ variable: string; assignment: string }>;
      destructuring: Array<{ property: string; source: string }>;
      conditional: ConditionalUsage[];
      arrays: ArrayMapping[];
      objects: Array<{ mappings: ObjectMapping[] }>;
    };
    advanced: {
      lazy: LazyImport[];
      dynamic: LazyImport[];
      hoc: HOCUsage[];
      memo: Array<{ component: string }>;
      forwardRef: Array<{ line?: number }>;
      portal: Array<{ line?: number }>;
    };
    props: Array<{ component: string; analysis: PropsAnalysis }>;
  };
  components: string[];
}

export interface ParseOptions {
  libraryName?: string; // Optional library filter (for backward compatibility)
}
