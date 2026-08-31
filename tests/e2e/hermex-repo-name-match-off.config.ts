export default {
  rules: {
    'require-repo-name-match': { severity: 'error' },
  },
  overrides: [
    {
      // The documented monorepo escape hatch — a monorepo root cannot be
      // named after its repository slug, so it switches the rule off by name.
      match: ['@acme/*-monorepo'],
      rules: {
        'require-repo-name-match': { severity: 'off' },
      },
    },
  ],
};
