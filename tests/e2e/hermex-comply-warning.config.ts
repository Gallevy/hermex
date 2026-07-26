// A warn-severity rule that will be violated (no .editorconfig in fixtures):
// passes `comply` (exit 0) but the official JSON status must be 'warning',
// not 'compliant' and not 'non-compliant' (#55).
export default {
  rules: {
    require_files: [{ severity: 'warn', patterns: ['.editorconfig'] }],
  },
  output: {
    format: 'json',
  },
};
