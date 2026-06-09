/**
 * Parse a short duration string like "15m", "7d", "30s", "12h" into milliseconds.
 * Falls back to 0 for unrecognized input.
 */
export function durationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 0;

  const value = Number(match[1]);
  switch (match[2]) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    case "d":
      return value * 86_400_000;
    default:
      return 0;
  }
}
