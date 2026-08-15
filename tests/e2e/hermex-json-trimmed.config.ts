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
    patterns: false,
    versus: false,
    rules: false,
  },
};
