export default {
  rules: {
    'require-packages': [
      {
        severity: 'off',
        patterns: ['@acme/shell'],
        message: 'not required here',
      },
    ],
  },
};
