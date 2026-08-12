// `react-dom` is imported by a fixture source file (for a non-JSX call, so
// the usage axis never sees it) and is a root dependency in the fixture
// lockfile, but is deliberately absent from fixtures/package.json. The
// lockfile's own record of direct dependencies is enough to make it this
// repo's to remove, so it stays forbiddable.
export default {
  rules: {
    forbid_packages: [{ severity: 'error', patterns: ['react-dom'] }],
  },
  output: {
    format: 'json',
  },
};
