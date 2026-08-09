export default {
  rules: {
    require_packages: [
      {
        severity: 'error',
        patterns: ['some-base-required-pkg'],
        message: 'base rule',
      },
    ],
  },
  overrides: [
    {
      match: ['@acme/checkout'],
      rules: {
        require_packages: [
          {
            severity: 'error',
            patterns: ['@acme/shell'],
            message: 'override rule',
          },
        ],
      },
    },
  ],
};
