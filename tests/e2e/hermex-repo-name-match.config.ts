export default {
  // No `includes` narrowing: the temp repo this runs against has no source
  // files, and the rule reads only package.json and .git/config.
  rules: {
    'require-repo-name-match': {
      severity: 'error',
      message: 'Rename the package to match its repository',
    },
  },
};
