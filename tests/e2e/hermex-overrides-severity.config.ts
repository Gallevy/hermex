export default {
  rules: {
    'require-packages': [
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
        'require-packages': [{ severity: 'off', patterns: ['@acme/shell'] }],
      },
    },
    {
      match: ['@acme/legacy-warn'],
      rules: {
        'require-packages': [
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
