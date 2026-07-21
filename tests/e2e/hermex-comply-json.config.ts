export default {
  rules: {
    require_files: [{ severity: 'error', patterns: ['.nvmrc'] }],
  },
  output: {
    format: 'json',
  },
};
