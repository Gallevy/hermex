import { describe, it, expect } from 'vitest';
import {
  formatCount,
  formatDuration,
  formatDaysOverdue,
  formatDaysRemaining,
  formatTruncatedList,
} from '../../src/utils/format-utils';

describe('formatCount', () => {
  it('adds thousand separators', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
  });
});

describe('formatDuration', () => {
  it('formats seconds to two decimal places', () => {
    expect(formatDuration(10.2)).toBe('10.20s');
  });
});

describe('formatDaysOverdue', () => {
  it('pluralizes "days" when the overdue count is not 1', () => {
    expect(formatDaysOverdue(100, 60)).toBe('40 days overdue');
  });

  it('uses the singular "day" when the overdue count is exactly 1', () => {
    expect(formatDaysOverdue(61, 60)).toBe('1 day overdue');
  });
});

describe('formatDaysRemaining', () => {
  it('pluralizes "days" when the remaining count is not 1', () => {
    expect(formatDaysRemaining(12)).toBe('12 days remaining');
  });

  it('uses the singular "day" when the remaining count is exactly 1', () => {
    expect(formatDaysRemaining(1)).toBe('1 day remaining');
  });
});

describe('formatTruncatedList', () => {
  it('shows every item with no "and N others" suffix when nothing is truncated', () => {
    expect(formatTruncatedList(['a', 'b'], 'file')).toBe('a, b');
  });

  it('pluralizes the truncated-count noun when more than one item is hidden', () => {
    expect(formatTruncatedList(['a', 'b', 'c', 'd'], 'file')).toBe(
      'a, b and 2 other files',
    );
  });

  it('uses the singular noun when exactly one item is hidden', () => {
    expect(formatTruncatedList(['a', 'b', 'c'], 'file')).toBe(
      'a, b and 1 other file',
    );
  });
});
