// lib/rateLimit.ts

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 60 * 60 * 1000);

export function rateLimit(ip: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    // New entry or expired
    entry = { count: 1, resetTime: now + windowMs };
    store.set(ip, entry);
    return { success: true, limit, remaining: limit - 1, reset: entry.resetTime };
  }

  // Existing entry within window
  entry.count++;
  
  if (entry.count > limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetTime };
  }

  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetTime };
}
