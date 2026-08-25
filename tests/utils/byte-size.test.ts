import { describe, it, expect } from 'vitest';
import { parseByteSize, formatBytes } from '../../src/utils/byte-size';

describe('parseByteSize', () => {
  it('reads a raw byte count as bytes', () => {
    expect(parseByteSize(204800)).toBe(204800);
    expect(parseByteSize(1)).toBe(1);
  });

  it('reads a unitless string as bytes', () => {
    expect(parseByteSize('204800')).toBe(204800);
  });

  it('applies binary multipliers, so 1 KB is 1024 B', () => {
    expect(parseByteSize('200kb')).toBe(204800);
    expect(parseByteSize('1mb')).toBe(1048576);
    expect(parseByteSize('1gb')).toBe(1073741824);
    expect(parseByteSize('500b')).toBe(500);
  });

  it('treats kib/mib/gib as spellings of the same multipliers', () => {
    expect(parseByteSize('1kib')).toBe(parseByteSize('1kb'));
    expect(parseByteSize('1mib')).toBe(parseByteSize('1mb'));
    expect(parseByteSize('1gib')).toBe(parseByteSize('1gb'));
  });

  it('accepts fractional sizes, uppercase units and internal whitespace', () => {
    expect(parseByteSize('1.5mb')).toBe(1572864);
    expect(parseByteSize('200KB')).toBe(204800);
    expect(parseByteSize(' 200 kb ')).toBe(204800);
  });

  it('rounds a fractional byte result to a whole number', () => {
    expect(parseByteSize('1.0005kb')).toBe(1025);
  });

  // Returning null (rather than coercing) is what lets the config schema
  // report the offending value instead of silently accepting nonsense.
  it('rejects sizes that are not positive whole byte counts', () => {
    expect(parseByteSize(0)).toBeNull();
    expect(parseByteSize(-1)).toBeNull();
    expect(parseByteSize(1.5)).toBeNull();
    expect(parseByteSize(Number.NaN)).toBeNull();
    expect(parseByteSize(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseByteSize('0')).toBeNull();
    expect(parseByteSize('0.4b')).toBeNull();
  });

  it('rejects strings that are not sizes', () => {
    expect(parseByteSize('')).toBeNull();
    expect(parseByteSize('big')).toBeNull();
    expect(parseByteSize('200tb')).toBeNull();
    expect(parseByteSize('200 kilobytes')).toBeNull();
    expect(parseByteSize('-200kb')).toBeNull();
    expect(parseByteSize('1e3')).toBeNull();
  });
});

describe('formatBytes', () => {
  it('keeps small values in bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('steps up to the largest unit at or above 1', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(204800)).toBe('200 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('shows one decimal only when it says something', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(412000)).toBe('402.3 KB');
  });

  it('stays in GB above the largest unit', () => {
    expect(formatBytes(1024 ** 4)).toBe('1024 GB');
  });
});
