// `packages.ignore` is a reporting filter, not an uninstall: the ignored
// package must drop out of forbid_packages *and* still satisfy
// require_packages, which reads the installed axis.
export default {
  packages: {
    ignore: ['moment'],
  },
  rules: {
    forbid_packages: [{ severity: 'error', patterns: ['moment'] }],
    require_packages: [{ severity: 'error', patterns: ['moment'] }],
  },
  output: {
    format: 'json',
  },
};
