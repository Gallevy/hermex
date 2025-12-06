/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted string (e.g., 1,234,567)
 */
export function formatCount(num: number): string {
  return num.toLocaleString();
}

/**
 * Format duration in seconds to a readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., 10.2s, 1.5s, 0.1s)
 */
export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}
