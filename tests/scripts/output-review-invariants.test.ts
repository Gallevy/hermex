import { describe, it, expect } from 'vitest';
import { INVARIANTS } from '../../scripts/output-review';
import type { CaseResult, FixtureCase } from '../../scripts/output-review';

const ESC = String.fromCharCode(27);

function caseResult(
  fixture: Partial<FixtureCase> & { name: string },
  artifacts: Record<string, string>,
  raw?: Partial<{ stdout: string; stderr: string }>,
): CaseResult {
  return {
    fixture: {
      proves: 'test fixture',
      cwd: '.',
      args: ['scan'],
      expectExit: 0,
      ...fixture,
    },
    artifacts,
    raw: { stdout: '', stderr: '', ...raw },
    changed: [],
    added: [],
    removed: [],
    diff: '',
  };
}

function run(name: string, results: CaseResult[], full = true): string[] {
  const invariant = INVARIANTS.find((i) => i.name === name);
  if (!invariant) throw new Error(`No invariant named ${name}`);
  return invariant.check({ results, full });
}

/**
 * These are the claims no baseline can make, so nothing else can catch them
 * regressing — an invariant that silently stopped firing would look exactly
 * like a clean run.
 */
describe('ansi-purity', () => {
  it('flags colour in a case that did not ask for it', () => {
    const breaches = run('ansi-purity', [
      caseResult({ name: 'plain' }, {}, { stdout: `${ESC}[31mred${ESC}[39m` }),
    ]);
    expect(breaches).toEqual(['plain: stdout carries colour']);
  });

  it('allows colour in a case that opted in', () => {
    const breaches = run('ansi-purity', [
      caseResult(
        { name: 'coloured', keepAnsi: true },
        {},
        { stdout: `${ESC}[31mred${ESC}[39m` },
      ),
    ]);
    expect(breaches).toEqual([]);
  });

  it('flags colour in a written file even for an opted-in case', () => {
    const breaches = run('ansi-purity', [
      caseResult(
        { name: 'coloured', keepAnsi: true, writes: ['summary.md'] },
        {
          'summary.md': `${ESC}[31mNOT COMPLIANT${ESC}[39m`,
        },
      ),
    ]);
    expect(breaches).toEqual(['coloured: summary.md carries colour']);
  });
});

describe('exit-code-agrees-with-verdict', () => {
  it('flags exit 0 printed alongside a non-compliant verdict', () => {
    const breaches = run('exit-code-agrees-with-verdict', [
      caseResult(
        { name: 'comply-x', args: ['comply'] },
        {
          'exit-code.txt': '0\n',
          'stdout.txt': '🔴 NOT COMPLIANT\n',
        },
      ),
    ]);
    expect(breaches).toEqual([
      'comply-x: exited 0 without printing a compliant verdict',
    ]);
  });

  it('accepts a matching pair', () => {
    const breaches = run('exit-code-agrees-with-verdict', [
      caseResult(
        { name: 'comply-x', args: ['comply'] },
        {
          'exit-code.txt': '1\n',
          'stdout.txt': '🔴 NOT COMPLIANT\n',
        },
      ),
    ]);
    expect(breaches).toEqual([]);
  });

  it('flags JSON whose compliance block contradicts the exit code', () => {
    const breaches = run('exit-code-agrees-with-verdict', [
      caseResult(
        { name: 'comply-json', args: ['comply', '--format', 'json'] },
        {
          'exit-code.txt': '1\n',
          'stdout.json': JSON.stringify({ compliance: { compliant: true } }),
        },
      ),
    ]);
    expect(breaches).toEqual([
      'comply-json: compliance.compliant is true but the process exited 1',
    ]);
  });

  it('ignores exit 2, where no verdict was reached at all', () => {
    const breaches = run('exit-code-agrees-with-verdict', [
      caseResult(
        { name: 'comply-broken', args: ['comply'] },
        {
          'exit-code.txt': '2\n',
          'stdout.txt': 'No files found\n',
        },
      ),
    ]);
    expect(breaches).toEqual([]);
  });
});

describe('json-stdout-is-only-json', () => {
  it('flags progress chrome leaking onto a json stdout', () => {
    const breaches = run('json-stdout-is-only-json', [
      caseResult(
        { name: 'scan-json', args: ['scan', '--format', 'json'] },
        {
          'stdout.txt': 'hermex v<version>\n{"summary":{}}\n',
        },
      ),
    ]);
    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toContain('scan-json');
  });

  it('accepts a clean payload', () => {
    const breaches = run('json-stdout-is-only-json', [
      caseResult(
        { name: 'scan-json', args: ['scan', '--format', 'json'] },
        {
          'stdout.json': '{"summary":{}}\n',
        },
      ),
    ]);
    expect(breaches).toEqual([]);
  });
});

describe('no-unscrubbed-volatiles', () => {
  it('flags an absolute path the scrubber missed', () => {
    const breaches = run('no-unscrubbed-volatiles', [
      // Deliberately not C:/Users/... — that trips the POSIX pattern too,
      // and this case is about the Windows one alone.
      caseResult({ name: 'leaky' }, { 'stdout.txt': 'at C:/work/repo\n' }),
    ]);
    expect(breaches).toEqual([
      'leaky/stdout.txt contains an absolute Windows path the scrubber missed',
    ]);
  });

  it('flags an absolute POSIX path, the shape a Linux runner would leak', () => {
    const breaches = run('no-unscrubbed-volatiles', [
      caseResult({ name: 'leaky' }, { 'stdout.txt': 'at /home/runner/work\n' }),
    ]);
    expect(breaches).toEqual([
      'leaky/stdout.txt contains an absolute POSIX path the scrubber missed',
    ]);
  });

  it('does not mistake a URL scheme for a drive letter', () => {
    const breaches = run('no-unscrubbed-volatiles', [
      caseResult(
        { name: 'urls' },
        {
          'stdout.json': '{"registry":"https://npm.internal.example.com"}',
        },
      ),
    ]);
    expect(breaches).toEqual([]);
  });

  it('flags an unscrubbed hermex version', () => {
    const breaches = run('no-unscrubbed-volatiles', [
      caseResult({ name: 'versioned' }, { 'stdout.txt': 'hermex v2.11.0\n' }),
    ]);
    expect(breaches).toHaveLength(1);
  });
});

describe('suppressed-sections-stay-absent', () => {
  it('flags a section that should have been switched off', () => {
    const breaches = run('suppressed-sections-stay-absent', [
      caseResult(
        { name: 'minimal', absent: ['📦 Packages'] },
        {
          'stdout.txt': '📦 Packages\n',
        },
      ),
    ]);
    expect(breaches).toEqual([
      'minimal: "📦 Packages" is still present in stdout',
    ]);
  });

  it('says nothing when the section really is gone', () => {
    const breaches = run('suppressed-sections-stay-absent', [
      caseResult(
        { name: 'minimal', absent: ['📦 Packages'] },
        {
          'stdout.txt': '📊 Summary\n',
        },
      ),
    ]);
    expect(breaches).toEqual([]);
  });
});

describe('lockfile-parity', () => {
  it('reports each arm that disagrees with the first', () => {
    const payload = (body: string) => ({ 'stdout.json': body });
    const breaches = run('lockfile-parity', [
      caseResult({ name: 'lockfile-npm' }, payload('{"a":1}')),
      caseResult({ name: 'lockfile-yarn' }, payload('{"a":2}')),
      caseResult({ name: 'lockfile-pnpm' }, payload('{"a":1}')),
    ]);
    expect(breaches).toEqual([
      'lockfile-yarn disagrees with lockfile-npm on the same tree',
    ]);
  });

  it('stays quiet when a filtered run has too few arms to compare', () => {
    const breaches = run('lockfile-parity', [
      caseResult({ name: 'lockfile-npm' }, { 'stdout.json': '{"a":1}' }),
    ]);
    expect(breaches).toEqual([]);
  });

  it('is advisory, so a known parser divergence cannot block the run', () => {
    const parity = INVARIANTS.find((i) => i.name === 'lockfile-parity');
    expect(parity?.blocking).toBe(false);
  });
});

describe('no-orphaned-baselines', () => {
  it('does not judge the whole matrix from a filtered run', () => {
    const breaches = run('no-orphaned-baselines', [], false);
    expect(breaches).toEqual([]);
  });
});
