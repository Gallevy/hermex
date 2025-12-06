/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ['main', { name: 'beta', prerelease: true }],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: true }],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md', 'LICENSE.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]',
      },
    ],
    // [
    //   '@semantic-release/github',
    //   {
    //     assets: ['package.json', 'CHANGELOG.md', 'LICENSE.md'],
    //   },
    // ],
  ],
};
