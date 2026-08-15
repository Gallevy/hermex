// `js-tokens` exists only under the fixture lockfile's `packages` key, never
// in `importers` — a purely transitive dependency. The repo cannot remove it,
// so no-packages must not flag it.
export default {
  rules: {
    'no-packages': [{ severity: 'error', patterns: ['js-tokens'] }],
  },
  output: {
    format: 'json',
  },
};
