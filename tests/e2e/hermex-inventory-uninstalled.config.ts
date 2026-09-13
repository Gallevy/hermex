// `eslint` is declared in fixtures/package.json but absent from the fixture
// lockfile. The two rules read different axes, so the same package is
// forbiddable (declared) while failing to satisfy a requirement (not
// installed).
export default {
  rules: {
    'no-packages': [{ severity: 'error', patterns: ['eslint'] }],
    'require-packages': [{ severity: 'error', patterns: ['eslint'] }],
  },
  output: {
    format: 'json',
  },
};
