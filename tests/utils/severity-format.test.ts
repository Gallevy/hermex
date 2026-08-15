import { describe, it, expect, afterEach } from 'vitest';
import chalk from 'chalk';
import type { RuleViolation } from '../../src/rules/evaluator';
import {
  severityIcon,
  severityColor,
  resolveColorLevel,
  stripAnsi,
  applyColorLevel,
  groupBySeverity,
  formatSeverityTally,
} from '../../src/utils/severity-format';

function violation(severity: RuleViolation['severity']): RuleViolation {
  return {
    ruleId: 'require-files',
    severity,
    patterns: ['.nvmrc'],
    matchedFiles: [],
  };
}

describe('severityIcon', () => {
  it('maps each severity to a distinct colored-circle glyph', () => {
    expect(severityIcon('error')).toBe('🔴');
    expect(severityIcon('warn')).toBe('🟡');
    expect(severityIcon('info')).toBe('🔵');
    expect(severityIcon('success')).toBe('🟢');
  });
});

describe('severityColor', () => {
  it('returns chalk color functions matching the severity', () => {
    expect(severityColor('error')).toBe(chalk.red);
    expect(severityColor('warn')).toBe(chalk.yellow);
    expect(severityColor('info')).toBe(chalk.blue);
    expect(severityColor('success')).toBe(chalk.green);
  });
});

describe('resolveColorLevel', () => {
  it('returns 0 when --no-color is passed', () => {
    expect(resolveColorLevel({ colorFlag: false })).toBe(0);
  });

  it('returns 1 when --color is passed', () => {
    expect(resolveColorLevel({ colorFlag: true })).toBe(1);
  });

  it('returns 0 when NO_COLOR env is set, regardless of value', () => {
    expect(resolveColorLevel({ noColorEnv: '' })).toBe(0);
    expect(resolveColorLevel({ noColorEnv: '1' })).toBe(0);
  });

  it('gives an explicit --no-color flag precedence over NO_COLOR being unset', () => {
    expect(resolveColorLevel({ colorFlag: false, noColorEnv: undefined })).toBe(
      0,
    );
  });

  it('returns undefined (defer to chalk auto-detection) when nothing is set', () => {
    expect(resolveColorLevel({})).toBeUndefined();
  });
});

describe('applyColorLevel', () => {
  const originalLevel = chalk.level;
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  afterEach(() => {
    chalk.level = originalLevel;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  it('is a no-op when level is undefined', () => {
    chalk.level = 2;
    applyColorLevel(undefined);
    expect(chalk.level).toBe(2);
    expect(process.stdout.write).toBe(originalStdoutWrite);
  });

  it('sets chalk.level without touching stdout/stderr when level is 1', () => {
    applyColorLevel(1);
    expect(chalk.level).toBe(1);
    expect(process.stdout.write).toBe(originalStdoutWrite);
    expect(process.stderr.write).toBe(originalStderrWrite);
  });

  it('strips ANSI codes from stdout/stderr writes when level is 0', () => {
    // applyColorLevel binds the *current* stream.write as the pass-through
    // target when it installs its wrapper, so the sink must be in place
    // before calling it.
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    process.stdout.write = ((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    applyColorLevel(0);
    expect(chalk.level).toBe(0);

    const esc = String.fromCharCode(27);
    process.stdout.write(`${esc}[31mred${esc}[39m`);
    process.stderr.write(`${esc}[31merr${esc}[39m`);

    expect(stdoutChunks[0]).toBe('red');
    expect(stderrChunks[0]).toBe('err');
  });

  it('passes a non-string chunk through unchanged when level is 0', () => {
    const stdoutChunks: unknown[] = [];
    process.stdout.write = ((chunk: unknown) => {
      stdoutChunks.push(chunk);
      return true;
    }) as typeof process.stdout.write;

    applyColorLevel(0);
    const buf = Buffer.from('binary chunk');
    process.stdout.write(buf);

    expect(stdoutChunks[0]).toBe(buf);
  });
});

describe('groupBySeverity', () => {
  it('returns empty buckets for an empty list', () => {
    expect(groupBySeverity([])).toEqual({ error: [], warn: [], info: [] });
  });

  it('buckets violations by severity, preserving order within each bucket', () => {
    const errorA = violation('error');
    const warnA = violation('warn');
    const errorB = violation('error');
    const infoA = violation('info');

    expect(groupBySeverity([errorA, warnA, errorB, infoA])).toEqual({
      error: [errorA, errorB],
      warn: [warnA],
      info: [infoA],
    });
  });
});

describe('formatSeverityTally', () => {
  it('returns an empty string for an empty list', () => {
    expect(formatSeverityTally([])).toBe('');
  });

  it('omits info by default even when info violations are present', () => {
    const tally = stripAnsi(
      formatSeverityTally([violation('error'), violation('info')]),
    );
    expect(tally).toBe('1 error');
  });

  it('includes info when includeInfo is true', () => {
    const tally = stripAnsi(
      formatSeverityTally(
        [violation('error'), violation('warn'), violation('info')],
        { includeInfo: true },
      ),
    );
    expect(tally).toBe('1 error, 1 warning, 1 info');
  });

  it('omits an info count of zero even with includeInfo: true', () => {
    const tally = stripAnsi(
      formatSeverityTally([violation('error')], { includeInfo: true }),
    );
    expect(tally).toBe('1 error');
  });

  it('pluralizes counts greater than one', () => {
    const tally = stripAnsi(
      formatSeverityTally(
        [
          violation('error'),
          violation('error'),
          violation('warn'),
          violation('warn'),
          violation('info'),
          violation('info'),
        ],
        { includeInfo: true },
      ),
    );
    expect(tally).toBe('2 errors, 2 warnings, 2 info');
  });
});

describe('stripAnsi', () => {
  it('removes color escapes from a chalk-colored string', () => {
    const original = chalk.level;
    chalk.level = 1;
    const colored = chalk.red('NOT COMPLIANT');
    chalk.level = original;

    expect(colored).not.toBe('NOT COMPLIANT');
    expect(stripAnsi(colored)).toBe('NOT COMPLIANT');
  });

  it('leaves plain text untouched', () => {
    expect(stripAnsi('plain text, no color')).toBe('plain text, no color');
  });
});
