/**
 * File sizes are authored in `hermex.config.ts` (`max-file-size`'s
 * `maxSize`) and rendered back out in the rules table, so both halves of
 * the unit table live here — a unit accepted by {@link parseByteSize} and
 * a unit printed by {@link formatBytes} can never drift apart.
 *
 * Multiples are binary (1 KB = 1024 B), matching the `bytes` package and
 * the bundle-size tooling frontend authors already use — `kib`/`mib`/`gib`
 * are accepted as explicit spellings of the same values.
 */
const UNIT_MULTIPLIERS: Record<string, number> = {
  b: 1,
  kb: 1024,
  kib: 1024,
  mb: 1024 ** 2,
  mib: 1024 ** 2,
  gb: 1024 ** 3,
  gib: 1024 ** 3,
};

/** Units {@link formatBytes} prints, smallest first. */
const DISPLAY_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

const SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(b|kb|kib|mb|mib|gb|gib)?$/;

/**
 * Parses a config-authored file size into whole bytes.
 *
 * Accepts a raw byte count (`204800`) or a size with a unit
 * (`'200kb'`, `'1.5 MB'`, `'500b'`); a unitless string is read as bytes.
 * Returns `null` for anything that is not a positive size, so callers can
 * report the offending value rather than silently coercing it.
 */
export function parseByteSize(input: string | number): number | null {
  if (typeof input === 'number') {
    if (!Number.isSafeInteger(input) || input <= 0) return null;
    return input;
  }

  const match = SIZE_PATTERN.exec(input.trim().toLowerCase());
  if (!match) return null;

  const bytes = Math.round(
    Number(match[1]) * (match[2] ? UNIT_MULTIPLIERS[match[2]] : 1),
  );
  return bytes > 0 ? bytes : null;
}

/**
 * Formats a byte count for display, using the largest unit that keeps the
 * value at or above 1 (e.g. `204800` → `200 KB`, `900` → `900 B`).
 */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < DISPLAY_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  // One decimal, but only when it says something — "200 KB" reads better
  // than "200.0 KB", and the trailing zero is noise in a table.
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${DISPLAY_UNITS[unit]}`;
}
