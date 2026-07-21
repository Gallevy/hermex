import { describe, it, expect } from 'vitest';
import chalk from 'chalk';
import {
  severityIcon,
  severityColor,
  formatViolationLine,
  resolveColorLevel,
} from '../../src/utils/severity-format';

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

describe('formatViolationLine', () => {
  it('aligns icon, padded label, and description on one line', () => {
    const line = formatViolationLine({
      icon: '🔴',
      label: 'detect_files',
      description: '.env detected (.env)',
    });
    expect(line).toBe('  🔴  detect_files   .env detected (.env)');
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
