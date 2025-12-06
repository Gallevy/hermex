import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  { template: './docs-templates/__patterns.md', output: './docs/patterns.md' },
  { template: './docs-templates/__examples.md', output: './docs/examples.md' },
  { template: './docs-templates/__README.md', output: './README.md' },
];

// Read package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
);

function getCliOutput(command) {
  try {
    return execSync(`node dist/cli.js ${command}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    }).trim();
  } catch (error) {
    console.error(`Error getting CLI output for: ${command}, error: ${error}`);
    return '';
  }
}

function getPackageValue(field) {
  const keys = field.split('.');
  let value = packageJson;
  for (const key of keys) {
    value = value?.[key];
  }
  return value || '';
}

function updateContent(content) {
  let updated = content;

  // Replace CLI command outputs
  // Match pattern: <!-- @cli command args -->
  const cliRegex = /<!--\s*@cli\s+(.+?)\s*-->/g;
  updated = updated.replace(cliRegex, (match, command) => {
    console.log(`  Replacing CLI command: ${command}`);
    const output = getCliOutput(command);
    return `\`\`\`\n${output}\n\`\`\``;
  });

  // Replace package.json values
  // Match pattern: <!-- @package field.path -->
  const packageRegex = /<!--\s*@package\s+(.+?)\s*-->/g;
  updated = updated.replace(packageRegex, (match, field) => {
    const value = getPackageValue(field);
    console.log(`  Replacing package field: ${field} = ${value}`);
    return value;
  });

  return updated;
}

function run() {
  console.log('Building project...');
  execSync('pnpm run build', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  console.log('\nProcessing documentation files...');
  files.forEach((file) => {
    const templatePath = path.join(__dirname, '..', file.template);
    const outputPath = path.join(__dirname, '..', file.output);

    if (!fs.existsSync(templatePath)) {
      console.warn(`Template not found: ${templatePath} ${file.template}`);
      return;
    }

    console.log(`\n Processing: ${file.template} -> ${file.output}`);
    const content = fs.readFileSync(templatePath, 'utf8');
    const updatedContent = updateContent(content);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, updatedContent);
    console.log(`Written to ${file.output}`);
  });

  console.log('\nDocumentation update complete!');
}

run();
