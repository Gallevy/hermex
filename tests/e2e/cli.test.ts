import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

  it('a config authored with defineConfig loads and runs (#19)', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-defineconfig.config.ts',
    );
    const result = run(['scan', '--config', configPath]);
    expect(result.status).toBe(0);
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
    // scan --format json carries the same official compliance verdict as
    // comply, so consumers get a canonical status off either command (#55).
    expect(parsed).toHaveProperty('compliance');
    expect(parsed.compliance).toHaveProperty('status');
    expect(['compliant', 'warning', 'non-compliant']).toContain(
      parsed.compliance.status,
    );
  });

  it('skips .d.ts files instead of reporting them as parse errors (#22)', () => {
    const configPath = join(ROOT, 'tests', 'e2e', 'hermex-dts.config.ts');
    const result = run(['scan', '--config', configPath]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    // Only consumer.tsx is analyzed — shim.d.ts is excluded, not parsed and
    // not reported as a parse error.
    expect(parsed.summary.filesAnalyzed).toBe(1);
  });

  it('scan stdout has no "failed to parse" warning for a .d.ts-only fixture', () => {
    const configPath = join(ROOT, 'tests', 'e2e', 'hermex-dts.config.ts');
    const result = run(['scan', '--config', configPath]);
    expect(result.stdout + result.stderr).not.toMatch(/failed to parse/i);
  });

  it('routes parse-error diagnostics to stderr under output.format json, leaving stdout pure JSON (#23)', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-broken-json.config.ts',
    );
    const result = run(['scan', '--config', configPath]);
    expect(result.status).toBe(0);
    // stdout must be valid JSON on its own, no leading diagnostic text
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('summary');
    // the diagnostic must have gone to stderr instead
    expect(result.stderr).toMatch(/failed to parse/i);
    expect(result.stderr).toMatch(/unparseable\.tsx/);
  });

  it('keeps parse-error diagnostics on stdout in human (non-JSON) mode', () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-broken-human.config.ts',
    );
    const result = run(['scan', '--config', configPath]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/failed to parse/i);
  });

  it('--format json overrides a human-format config and emits valid JSON', () => {
    const result = run(['scan', '--format', 'json']);
    expect(result.status).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('summary');
  });

  it('--format bogus exits non-zero with a clear message', () => {
    const result = run(['scan', '--format', 'bogus']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/human|json/i);
  });

  it('NO_COLOR=1 strips all ANSI escape codes from stdout, even when color would otherwise be forced on', () => {
    const result = spawnSync('node', [CLI, 'scan'], {
      cwd: FIXTURES,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '1', NO_COLOR: '1' },
    });
    expect(result.status).toBe(0);
    // oxlint-disable-next-line no-control-regex -- asserting the ANSI escape byte is absent
    expect(result.stdout).not.toMatch(/\x1b\[/);
  });

  it('--no-color strips all ANSI escape codes from stdout, even when color would otherwise be forced on', () => {
    const env = { ...process.env, FORCE_COLOR: '1' };
    delete env.NO_COLOR;
    const result = spawnSync('node', [CLI, 'scan', '--no-color'], {
      cwd: FIXTURES,
      encoding: 'utf8',
      env,
    });
    expect(result.status).toBe(0);
    // oxlint-disable-next-line no-control-regex -- asserting the ANSI escape byte is absent
    expect(result.stdout).not.toMatch(/\x1b\[/);
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

  it("json output carries the official compliance verdict: 'non-compliant' on an error rule, matching the exit code (#55)", () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-comply-json.config.ts',
    );
    const result = run(['comply', '--config', configPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.compliance.status).toBe('non-compliant');
    expect(parsed.compliance.compliant).toBe(false);
    expect(parsed.compliance.counts.errorRuleViolations).toBe(1);
  });

  it("json output reports status 'warning' for a warn-severity rule while still exiting 0 — the key #55 case consumers mis-mapped", () => {
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-comply-warning.config.ts',
    );
    const result = run(['comply', '--config', configPath]);
    // A warn-severity rule is advisory: comply still passes (exit 0)...
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    // ...but the official status distinguishes it from a clean 'compliant'.
    expect(parsed.compliance.status).toBe('warning');
    expect(parsed.compliance.compliant).toBe(true);
    expect(parsed.compliance.counts.warningRuleViolations).toBe(1);
  });

  it("json output reports status 'compliant' when the only signals are info/advisory, not 'warning' (#55)", () => {
    // hermex-comply-pass has only an info detect_files rule (matches
    // fixtures/hermex.config.ts), so nothing is at error or warn severity.
    const configPath = join(
      ROOT,
      'tests',
      'e2e',
      'hermex-comply-pass.config.ts',
    );
    const result = run(['comply', '--config', configPath, '--format', 'json']);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.compliance.status).toBe('compliant');
    expect(parsed.compliance.compliant).toBe(true);
  });

  it('runs the full pipeline and reports all violations, not just the first', () => {
    // fixtures/hermex.config.ts has multiple error-severity rules configured
    // and none of the required conditions are met — comply must not fail fast.
    const result = run(['comply']);
    expect(result.status).toBe(1);
    const errorLines = result.stdout
      .split('\n')
      .filter((line) => line.includes('🔴'));
    expect(errorLines.length).toBeGreaterThan(1);
  });

  it('includes the Versus section, same as scan', () => {
    // fixtures/hermex.config.ts also configures a `versus` comparison —
    // comply should show it too, not just scan.
    const result = run(['comply']);
    expect(result.stdout).toMatch(/Versus/);
    expect(result.stdout).toContain('Design System Migration');
  });

  it('--summary-file writes an ANSI-free markdown summary alongside the normal report (#31)', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hermex-summary-e2e-'));
    try {
      const summaryPath = join(tempDir, 'summary.md');
      const configPath = join(
        ROOT,
        'tests',
        'e2e',
        'hermex-comply-fail.config.ts',
      );
      const result = run([
        'comply',
        '--config',
        configPath,
        '--summary-file',
        summaryPath,
      ]);
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/NOT COMPLIANT/); // full report on stdout, unchanged
      expect(existsSync(summaryPath)).toBe(true);
      const content = readFileSync(summaryPath, 'utf8');
      // oxlint-disable-next-line no-control-regex -- asserting the ANSI escape byte is absent
      expect(content).not.toMatch(/\x1b\[/);
      expect(content).toMatch(/NOT COMPLIANT/);
      expect(content).not.toMatch(/Versus/);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('--summary-file writes a COMPLIANT summary when there are no mandatory violations', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hermex-summary-e2e-'));
    try {
      const summaryPath = join(tempDir, 'summary.md');
      const configPath = join(
        ROOT,
        'tests',
        'e2e',
        'hermex-comply-pass.config.ts',
      );
      const result = run([
        'comply',
        '--config',
        configPath,
        '--summary-file',
        summaryPath,
      ]);
      expect(result.status).toBe(0);
      expect(existsSync(summaryPath)).toBe(true);
      const content = readFileSync(summaryPath, 'utf8');
      expect(content).toMatch(/COMPLIANT/);
      expect(content).not.toMatch(/NOT COMPLIANT/);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('--summary-title overrides the default heading in the --summary-file output', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hermex-summary-e2e-'));
    try {
      const summaryPath = join(tempDir, 'summary.md');
      const configPath = join(
        ROOT,
        'tests',
        'e2e',
        'hermex-comply-pass.config.ts',
      );
      const result = run([
        'comply',
        '--config',
        configPath,
        '--summary-file',
        summaryPath,
        '--summary-title',
        'Custom CI Title',
      ]);
      expect(result.status).toBe(0);
      const content = readFileSync(summaryPath, 'utf8');
      expect(content).toContain('# Custom CI Title');
      expect(content).not.toContain('# Hermex Compliance Report');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('--summary-file still writes the file when the primary format is json', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hermex-summary-e2e-'));
    try {
      const summaryPath = join(tempDir, 'summary.md');
      const configPath = join(
        ROOT,
        'tests',
        'e2e',
        'hermex-comply-json.config.ts',
      );
      const result = run([
        'comply',
        '--config',
        configPath,
        '--summary-file',
        summaryPath,
      ]);
      expect(result.status).toBe(1);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      expect(existsSync(summaryPath)).toBe(true);
      const content = readFileSync(summaryPath, 'utf8');
      expect(content).toMatch(/NOT COMPLIANT/);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
