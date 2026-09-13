/**
 * Reads the source offset off an SWC node's span.
 *
 * Every node SWC produces carries a span, but the pattern analyzers take
 * untyped (`any`) nodes and were each repeating `node.span?.start || 0` —
 * sixteen copies of a fallback that real parser output can never reach.
 * Funnelling them through one helper keeps the defensive `0` for synthetic
 * or partially-built nodes without paying for it at every call site.
 */
export function lineOf(node: any): number {
  return node?.span?.start || 0;
}
