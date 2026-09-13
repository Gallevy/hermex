// `moment` is in fixtures/package.json devDependencies and in the fixture
// lockfile, but no fixture source file imports it — the #75 case.
export default {
  rules: {
    'no-packages': [
      { severity: 'error', patterns: ['moment'], message: 'Use date-fns' },
    ],
  },
  output: {
    format: 'json',
  },
};
