export default {
  rules: {
    require_packages: [
      {
        severity: 'error',
        patterns: ['@acme/shell'],
        message: 'shell required',
      },
    ],
  },
  overrides: [
    {
      match: ['@acme/legacy-off'],
      rules: {
        require_packages: [{ severity: 'off', patterns: ['@acme/shell'] }],
      },
    },
    {
      match: ['@acme/legacy-warn'],
      rules: {
        require_packages: [
          {
            severity: 'warn',
            patterns: ['@acme/shell'],
            message: 'shell required (downgraded for this repo)',
          },
        ],
      },
    },
  ],
};
