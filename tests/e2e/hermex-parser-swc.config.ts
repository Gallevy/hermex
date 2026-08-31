// Paired with ./hermex-parser-oxc.config.ts — identical but for `parser`, so
// the e2e suite can diff one full CLI run against the other.
export default {
  parser: 'swc',
  output: { format: 'json', details: true, patterns: 'table' },
};
