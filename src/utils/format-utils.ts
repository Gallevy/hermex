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
 * @returns Formatted string (e.g., 10.21s, 1.57s, 0.12s)
 */
export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}

/**
 * Format how far an upgrade candidate is past its age threshold
 * @returns Formatted string (e.g., "40 days overdue", "1 day overdue")
 */
export function formatDaysOverdue(
  releasedDaysAgo: number,
  thresholdDays: number,
): string {
  const overdue = releasedDaysAgo - thresholdDays;
  return `${overdue} day${overdue === 1 ? '' : 's'} overdue`;
}

/**
 * Format how long until an upgrade candidate breaches its age threshold
 * @returns Formatted string (e.g., "12 days remaining", "1 day remaining")
 */
export function formatDaysRemaining(daysRemaining: number): string {
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
}

/**
 * Join a list of items, showing only the first `limit` and summarizing the rest
 * @returns Formatted string (e.g., "a, b and 3 other files", "a, b and 1 other file")
 */
export function formatTruncatedList(
  items: string[],
  noun: string,
  limit = 2,
): string {
  const shown = items.slice(0, limit).join(', ');
  const rest = items.length - limit;
  if (rest <= 0) return shown;
  return `${shown} and ${rest} other ${noun}${rest === 1 ? '' : 's'}`;
}
