import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../src/lib/rate-limiter.mjs';

describe('RateLimiter', () => {
  let limiter;

  afterEach(() => {
    if (limiter) limiter.destroy();
  });

  it('allows requests within limit', () => {
    limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });
    const result = limiter.check('key1');
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 5);
  });

  it('blocks requests over limit', () => {
    limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 });
    limiter.check('key1');
    limiter.check('key1');
    limiter.check('key1');
    const result = limiter.check('key1');
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  it('resets after window expires', async () => {
    limiter = new RateLimiter({ windowMs: 100, maxRequests: 2 });
    limiter.check('key1');
    limiter.check('key1');
    assert.equal(limiter.check('key1').allowed, false);

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 150));
    assert.equal(limiter.check('key1').allowed, true);
  });

  it('tracks different keys independently', () => {
    limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });
    limiter.check('key1');
    limiter.check('key1');
    assert.equal(limiter.check('key1').allowed, false);
    assert.equal(limiter.check('key2').allowed, true);
  });

  it('middleware returns function', () => {
    limiter = new RateLimiter();
    const mw = limiter.middleware();
    assert.equal(typeof mw, 'function');
  });

  it('middleware blocks over-limit requests', () => {
    limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 1 });
    const mw = limiter.middleware();

    const headers = {};
    const response = {
      setHeader: (k, v) => { headers[k] = v; },
      getHeaders: () => headers,
      writeHead: () => {},
      end: () => {},
    };

    // First request passes
    let nextCalled = false;
    mw({ headers: {}, socket: { remoteAddress: '1.2.3.4' } }, response, () => { nextCalled = true; });
    assert.ok(nextCalled);

    // Second request blocked
    let blocked = false;
    const response2 = {
      setHeader: () => {},
      getHeaders: () => ({}),
      writeHead: (code) => { if (code === 429) blocked = true; },
      end: () => {},
    };
    mw({ headers: {}, socket: { remoteAddress: '1.2.3.4' } }, response2, () => {});
    assert.ok(blocked);
  });
});
