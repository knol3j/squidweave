/**
 * RateLimiter — Token-bucket rate limiter for API endpoints.
 * No external dependencies — pure in-memory.
 */

export class RateLimiter {
  constructor({ windowMs = 60_000, maxRequests = 60, keyGenerator = null } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyGenerator = keyGenerator || ((req) => req.headers['x-api-key'] || req.socket?.remoteAddress || 'unknown');
    this.buckets = new Map();

    // Cleanup stale buckets every 5 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 300_000);
  }

  /**
   * Express/Connect-style middleware.
   */
  middleware() {
    return (request, response, next) => {
      const key = this.keyGenerator(request);
      const now = Date.now();

      let bucket = this.buckets.get(key);
      if (!bucket || now - bucket.windowStart > this.windowMs) {
        bucket = { windowStart: now, count: 0 };
        this.buckets.set(key, bucket);
      }

      bucket.count++;

      const remaining = Math.max(0, this.maxRequests - bucket.count);
      const resetAt = bucket.windowStart + this.windowMs;

      response.setHeader('X-RateLimit-Limit', this.maxRequests);
      response.setHeader('X-RateLimit-Remaining', remaining);
      response.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

      if (bucket.count > this.maxRequests) {
        response.writeHead(429, {
          'content-type': 'application/json; charset=utf-8',
          'Retry-After': Math.ceil((resetAt - now) / 1000),
          ...response.getHeaders(),
        });
        response.end(JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((resetAt - now) / 1000),
        }));
        return;
      }

      next();
    };
  }

  /**
   * Check if a request would be rate-limited (without incrementing).
   */
  check(key) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart > this.windowMs) {
      return { allowed: true, remaining: this.maxRequests, resetAt: now + this.windowMs };
    }
    const remaining = Math.max(0, this.maxRequests - bucket.count);
    return {
      allowed: bucket.count <= this.maxRequests,
      remaining,
      resetAt: bucket.windowStart + this.windowMs,
    };
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart > this.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this.buckets.clear();
  }
}
