export default {
  rules: {
    require_packages: [
      {
        severity: 'off',
        patterns: ['@acme/shell'],
        message: 'not required here',
      },
    ],
  },
};
