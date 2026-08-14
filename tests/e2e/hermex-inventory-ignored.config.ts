// `packages.ignore` is a reporting filter, not an uninstall: the ignored
// package must drop out of no-packages *and* still satisfy
// require-packages, which reads the installed axis.
export default {
  packages: {
    ignore: ['moment'],
  },
  rules: {
    'no-packages': [{ severity: 'error', patterns: ['moment'] }],
    'require-packages': [{ severity: 'error', patterns: ['moment'] }],
  },
  output: {
    format: 'json',
  },
};
