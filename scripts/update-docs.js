import fs from 'node:fs';
import { execSync } from 'node:child_process';

const files = [
  { template: '__patterns.md', output: '../docs/patterns.md' },
  { template: '__examples.md', output: '../docs/examples.md' },
  { template: '__README.md', output: '../README.md' },
];

const commands = [
  '<!-- @cli <command> -->',
  '<!-- @package name -->',
  '<!-- @package description -->',
  '<!-- @package repository.url -->',
];

function updateContent(content) {}

function run() {
  execSync(`pnpm run build`);

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const updatedContent = updateContent(content);
    fs.writeFileSync(file, updatedContent);
  });
}
