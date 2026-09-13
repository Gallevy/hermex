// Every trimmable section switched off (#63, #91) — JSON mode must honour
// these the same way the human printers do.
export default {
  rules: {
    'require-files': [{ severity: 'error', patterns: ['.nvmrc'] }],
  },
  output: {
    format: 'json',
    components: false,
    packages: false,
    // Both, because the Details section renders the same patternCounts array
    // the Patterns section does.
    patterns: false,
    details: false,
    versus: false,
    rules: false,
  },
};
