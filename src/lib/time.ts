/**
 * Resolve `work`, or reject once the deadline passes. Use it to bound I/O that
 * doesn't reliably fail on its own — e.g. Bun's RedisClient auto-reconnects
 * and queues commands while disconnected, so a command against a dead Redis
 * never settles without one.
 */
export function withDeadline<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms`)),
      ms,
    );
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

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
