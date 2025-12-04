export function generateUnixTimestamp() {
  const unixTimestamp = Math.floor(Date.now() / 1000);

  return unixTimestamp;
}
