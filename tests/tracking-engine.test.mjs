import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TrackingEngine } from '../src/lib/tracking-engine.mjs';

function createMockStore() {
  const events = [];
  const outreachEvents = [];
  return {
    state: { analyticsEvents: events, outreachEvents },
    addEvent: async (e) => { events.push(e); return e; },
    addOutreachEvent: async (e) => { outreachEvents.push(e); return e; },
    listEvents: () => events,
    listOutreachEvents: () => outreachEvents,
  };
}

describe('TrackingEngine', () => {
  let engine;
  let store;

  beforeEach(() => {
    store = createMockStore();
    engine = new TrackingEngine({ store });
  });

  it('generates pixel URL', () => {
    const url = engine.generatePixelUrl({ campaignId: 'c1', investorId: 'inv1', emailId: 'e1' });
    assert.ok(url.includes('/webhooks/pixel/c1/inv1/e1/'));
    assert.ok(url.length > 50);
  });

  it('pixel URL includes HMAC token', () => {
    const url1 = engine.generatePixelUrl({ campaignId: 'c1', investorId: 'inv1', emailId: 'e1' });
    const url2 = engine.generatePixelUrl({ campaignId: 'c1', investorId: 'inv1', emailId: 'e2' });
    // Different email IDs produce different tokens
    assert.notEqual(url1, url2);
  });

  it('serves pixel as 1x1 GIF', () => {
    let written = false;
    let statusCode;
    const response = {
      writeHead: (code) => { statusCode = code; },
      end: (data) => { written = true; },
    };
    engine.servePixel({}, response);
    assert.equal(statusCode, 200);
    assert.ok(written);
  });

  it('rewrites HTML with tracking pixel', () => {
    const html = '<html><body><h1>Hello</h1></body></html>';
    const result = engine.rewriteHtml(html, { campaignId: 'c1', investorId: 'inv1', emailId: 'e1' });
    assert.ok(result.includes('<img src='));
    assert.ok(result.includes('/webhooks/pixel/'));
    assert.ok(result.includes('</body>'));
  });

  it('rewrites links for click tracking', () => {
    const html = '<a href="https://example.com/page">Click here</a>';
    const result = engine.rewriteHtml(html, { campaignId: 'c1', investorId: 'inv1', emailId: 'e1' });
    assert.ok(result.includes('/webhooks/click/c1/inv1/e1/'));
    assert.ok(!result.includes('href="https://example.com/page"'));
  });

  it('does not rewrite tracking URLs', () => {
    const html = '<img src="http://localhost:4010/webhooks/pixel/c1/inv1/e1/token" />';
    const result = engine.rewriteHtml(html, { campaignId: 'c1', investorId: 'inv1', emailId: 'e1' });
    // Should not double-rewrite
    assert.equal(result.match(/\/webhooks\/click\//g)?.length || 0, 0);
  });

  it('records open event', async () => {
    const event = await engine.recordOpen({ campaignId: 'c1', investorId: 'inv1', emailId: 'e1', ip: '1.2.3.4' });
    assert.ok(event.id);
    assert.equal(event.type, 'open');
    assert.equal(event.campaignId, 'c1');
    assert.equal(store.state.analyticsEvents.length, 1);
    assert.equal(store.state.outreachEvents.length, 1);
  });

  it('records click event', async () => {
    const event = await engine.recordClick({
      campaignId: 'c1', investorId: 'inv1', emailId: 'e1',
      targetUrl: 'https://example.com',
    });
    assert.equal(event.type, 'click');
    assert.equal(event.metadata.targetUrl, 'https://example.com');
  });

  it('records reply event', async () => {
    const event = await engine.recordReply({
      campaignId: 'c1', investorId: 'inv1', emailId: 'e1',
      subject: 'Re: Meeting', snippet: 'Sounds great!',
    });
    assert.equal(event.type, 'reply');
    assert.equal(event.metadata.subject, 'Re: Meeting');
  });

  it('records bounce event', async () => {
    const event = await engine.recordBounce({
      campaignId: 'c1', investorId: 'inv1', emailId: 'e1',
      reason: 'mailbox-full',
    });
    assert.equal(event.type, 'bounce');
    assert.equal(event.metadata.reason, 'mailbox-full');
  });

  it('handles Brevo webhook payload', async () => {
    const payload = [
      { event: 'open', email: 'test@example.com', 'squidweave-campaign-id': 'c1', 'squidweave-investor-id': 'inv1', emailId: 'e1' },
      { event: 'click', email: 'test@example.com', 'squidweave-campaign-id': 'c1', 'squidweave-investor-id': 'inv1', emailId: 'e1', url: 'https://example.com' },
    ];
    const result = await engine.handleBrevoWebhook(payload);
    assert.equal(result.processed, 2);
  });

  it('handles Mailgun webhook payload', async () => {
    const payload = {
      event: 'opened',
      'squidweave-campaign-id': 'c1',
      'squidweave-investor-id': 'inv1',
      'message-id': 'e1',
      ip: '5.6.7.8',
    };
    const result = await engine.handleMailgunWebhook(payload);
    assert.equal(result.processed, 1);
  });

  it('skips events without campaignId/investorId', async () => {
    const result = await engine.handleBrevoWebhook([{ event: 'open', email: 'test@example.com' }]);
    assert.equal(result.processed, 0);
  });
});
