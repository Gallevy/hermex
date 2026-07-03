import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import packageJson from '../../package.json';

const ROOT = resolve(__dirname, '../..');
const CLI = join(ROOT, 'dist', 'cli.mjs');
const FIXTURES = join(ROOT, 'fixtures');

beforeAll(() => {
  execSync('pnpm run build', { cwd: ROOT, encoding: 'utf8' });
});

function run(args: string[], cwd = FIXTURES) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' });
}

describe('CLI smoke tests', () => {
  it('--version prints the correct version', () => {
    const result = run(['--version']);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(packageJson.version);
  });

  it('--help exits cleanly and mentions hermex', () => {
    const result = run(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/hermex/i);
  });

  it('scan completes without error', () => {
    const result = run(['scan']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Analysis complete/);
  });

  it('scan output includes the current version', () => {
    const result = run(['scan']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`hermex v${packageJson.version}`);
  });

  it('--config loads an explicit config file', () => {
    const configPath = join(FIXTURES, 'hermex.config.ts');
    const result = run(['scan', '--config', configPath], ROOT);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Analysis complete/);
  });

  it('--config throws when the file does not exist', () => {
    const result = run(['scan', '--config', '/nonexistent/hermex.config.ts']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Config file not found/);
  });

  it('import type in config is erased at runtime (no ERR_MODULE_NOT_FOUND)', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-importtype.config.ts',
    );
    const result = run(['scan', '--config', configPath]);
    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/ERR_MODULE_NOT_FOUND/);
    expect(result.stdout).toMatch(/Analysis complete/);
  });

  it('output.format json emits valid JSON to stdout', () => {
    const configPath = join(ROOT, 'tests', 'e2e', 'hermex-json.config.ts');
    const result = run(['scan', '--config', configPath]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.version).toBe(packageJson.version);
    expect(parsed).toHaveProperty('summary');
    expect(parsed).toHaveProperty('packages');
    expect(parsed).toHaveProperty('components');
    expect(parsed).toHaveProperty('patterns');
    expect(parsed.summary).toHaveProperty('filesAnalyzed');
  });
});
