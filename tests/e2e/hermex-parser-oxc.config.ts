// Paired with ./hermex-parser-swc.config.ts — identical but for `parser`, so
// the e2e suite can diff one full CLI run against the other.
export default {
  parser: 'oxc-experimental',
  output: { format: 'json', details: true, patterns: 'table' },
};
