interface RateLimiter {
  check(): boolean;
  reset(): void;
}

export function createRateLimiter(maxActions: number, windowMs: number): RateLimiter {
  let timestamps: number[] = [];

  return {
    check(): boolean {
      const now = Date.now();
      // Remove timestamps older than the window
      timestamps = timestamps.filter(time => now - time < windowMs);
      
      if (timestamps.length >= maxActions) {
        return false; // Limit exceeded
      }
      
      timestamps.push(now);
      return true;
    },
    reset(): void {
      timestamps = [];
    }
  };
}
