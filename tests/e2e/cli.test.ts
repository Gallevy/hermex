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

describe('comply command', () => {
  it('exits 1 when an error-severity rule violation is present', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-comply-fail.config.ts',
    );
    const result = run(['comply', '--config', configPath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/NOT COMPLIANT/);
  });

  it('exits 0 when there are no mandatory violations', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-comply-pass.config.ts',
    );
    const result = run(['comply', '--config', configPath]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/COMPLIANT/);
  });

  it('exits 2 when no files match includes', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-comply-nofiles.config.ts',
    );
    const result = run(['comply', '--config', configPath]);
    expect(result.status).toBe(2);
  });

  it('output.format json emits valid JSON and still exits non-zero on violations', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-comply-json.config.ts',
    );
    const result = run(['comply', '--config', configPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('ruleViolations');
    expect(parsed.ruleViolations).toHaveLength(1);
    expect(parsed.ruleViolations[0].severity).toBe('error');
  });

  it('runs the full pipeline and reports all violations, not just the first', () => {
    // fixtures/hermex.config.ts has multiple error-severity rules configured
    // and none of the required conditions are met — comply must not fail fast.
    const result = run(['comply']);
    expect(result.status).toBe(1);
    const errorLines = result.stdout
      .split('\n')
      .filter((line) => line.includes('[ERROR]'));
    expect(errorLines.length).toBeGreaterThan(1);
  });
});
