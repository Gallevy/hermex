import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderBarChart } from '../../src/utils/chart-renderer';

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe('renderBarChart', () => {
  it('prints a placeholder and returns early when data is empty', () => {
    renderBarChart([]);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('No data to display');
  });

  it('prints a placeholder and returns early when every value is zero', () => {
    renderBarChart([{ label: 'a', value: 0 }]);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('All values are zero');
  });

  it('renders bars with values by default', () => {
    renderBarChart([{ label: 'react', value: 10 }]);
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('react');
    expect(output).toContain('10');
  });

  it('omits the value string when showValues is false', () => {
    renderBarChart([{ label: 'react', value: 10 }], { showValues: false });
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('react');
    expect(output).not.toContain('10');
  });

  it('uses custom bar and empty characters when provided', () => {
    renderBarChart(
      [
        { label: 'a', value: 5 },
        { label: 'bb', value: 1 },
      ],
      {
        barChar: '#',
        emptyChar: '.',
      },
    );
    const output = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(output).toContain('#');
    expect(output).toContain('.');
  });
});
