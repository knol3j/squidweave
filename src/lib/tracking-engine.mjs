/**
 * TrackingEngine — Self-hosted email open/click tracking and reply detection.
 *
 * - Generates 1x1 tracking pixels for open tracking
 * - Rewrites links for click tracking
 * - Ingests webhook events from email providers (Brevo, Mailgun, etc.)
 * - Feeds events back into the store for analytics pipeline
 *
 * No external dependencies — pure Node.js + crypto.
 */

import crypto from 'node:crypto';

const BASE_URL = process.env.TRACKING_BASE_URL || process.env.PUBLIC_URL || 'http://localhost:4010';

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export class TrackingEngine {
  constructor({ store }) {
    this.store = store;
  }

  /**
   * Generate a tracking pixel URL for an email.
   * @param {object} opts
   * @param {string} opts.campaignId
   * @param {string} opts.investorId
   * @param {string} opts.emailId - unique email identifier
   * @returns {string} URL to embed as <img src="...">
   */
  generatePixelUrl({ campaignId, investorId, emailId }) {
    const token = crypto
      .createHmac('sha256', process.env.TRACKING_SECRET || 'squidweave-tracking')
      .update(`${campaignId}:${investorId}:${emailId}`)
      .digest('hex')
      .slice(0, 32);

    return `${BASE_URL}/webhooks/pixel/${campaignId}/${investorId}/${emailId}/${token}`;
  }

  /**
   * Serve the tracking pixel (1x1 transparent GIF).
   */
  servePixel(request, response) {
    response.writeHead(200, {
      'content-type': 'image/gif',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'pragma': 'no-cache',
      'expires': '0',
    });
    response.end(PIXEL);
  }

  /**
   * Rewrite HTML body to inject tracking pixel and rewrite links.
   * @param {string} html - original HTML
   * @param {object} trackingMeta - { campaignId, investorId, emailId }
   * @returns {string} modified HTML
   */
  rewriteHtml(html, { campaignId, investorId, emailId }) {
    if (!html) return html;

    let rewritten = html;

    // Inject tracking pixel before </body>
    const pixelUrl = this.generatePixelUrl({ campaignId, investorId, emailId });
    const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;

    if (rewritten.toLowerCase().includes('</body>')) {
      rewritten = rewritten.replace(/<\/body>/i, `${pixelTag}</body>`);
    } else {
      rewritten += pixelTag;
    }

    // Rewrite links for click tracking
    const clickPrefix = `${BASE_URL}/webhooks/click/${campaignId}/${investorId}/${emailId}`;
    rewritten = rewritten.replace(
      /href="(https?:\/\/[^"]+)"/gi,
      (match, url) => {
        // Don't track tracking/pixel URLs
        if (url.includes('/webhooks/pixel/') || url.includes('/webhooks/click/')) {
          return match;
        }
        const encoded = Buffer.from(url).toString('base64url');
        return `href="${clickPrefix}/${encoded}"`;
      },
    );

    return rewritten;
  }

  /**
   * Record an open event (pixel loaded).
   */
  async recordOpen({ campaignId, investorId, emailId, ip, userAgent }) {
    const event = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'open',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId, ip: ip || null, userAgent: userAgent || null },
    };

    await this.store.addEvent(event);
    await this.store.addOutreachEvent({
      id: `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'open',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId },
    });

    return event;
  }

  /**
   * Record a click event (link clicked).
   */
  async recordClick({ campaignId, investorId, emailId, targetUrl, ip, userAgent }) {
    const event = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'click',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId, targetUrl, ip: ip || null, userAgent: userAgent || null },
    };

    await this.store.addEvent(event);
    await this.store.addOutreachEvent({
      id: `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'click',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId, targetUrl },
    });

    return event;
  }

  /**
   * Record a reply event (from webhook or IMAP).
   */
  async recordReply({ campaignId, investorId, emailId, subject, snippet }) {
    const event = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'reply',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId, subject: subject || null, snippet: snippet || null },
    };

    await this.store.addEvent(event);
    await this.store.addOutreachEvent({
      id: `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'reply',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId, subject },
    });

    return event;
  }

  /**
   * Record a bounce event.
   */
  async recordBounce({ campaignId, investorId, emailId, reason }) {
    const event = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'bounce',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId, reason: reason || null },
    };

    await this.store.addEvent(event);
    await this.store.addOutreachEvent({
      id: `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      campaignId,
      targetId: investorId,
      type: 'bounce',
      channel: 'email',
      timestamp: new Date().toISOString(),
      metadata: { emailId, reason },
    });

    return event;
  }

  /**
   * Handle Brevo (Sendinblue) webhook payload.
   * Brevo sends event arrays with fields: event, email, campaignId, ...
   */
  async handleBrevoWebhook(payload) {
    const events = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const evt of events) {
      const campaignId = evt['squidweave-campaign-id'] || evt.campaignId || null;
      const investorId = evt['squidweave-investor-id'] || evt.investorId || null;
      const emailId = evt['message-id'] || evt.emailId || null;

      if (!campaignId || !investorId) continue;

      switch (evt.event) {
        case 'open':
          results.push(await this.recordOpen({ campaignId, investorId, emailId }));
          break;
        case 'click':
          results.push(await this.recordClick({ campaignId, investorId, emailId, targetUrl: evt.url }));
          break;
        case 'bounce':
        case 'hardBounce':
          results.push(await this.recordBounce({ campaignId, investorId, emailId, reason: evt.reason }));
          break;
        case 'spam':
          results.push(await this.recordBounce({ campaignId, investorId, emailId, reason: 'spam-complaint' }));
          break;
        default:
          // Unsubscribe, deferred, etc. — log but don't process
          break;
      }
    }

    return { processed: results.length, events: results };
  }

  /**
   * Handle Mailgun webhook payload.
   */
  async handleMailgunWebhook(payload) {
    const campaignId = payload['squidweave-campaign-id'] || null;
    const investorId = payload['squidweave-investor-id'] || null;
    const emailId = payload['message-id'] || null;

    if (!campaignId || !investorId) return { processed: 0 };

    let result;
    switch (payload.event) {
      case 'opened':
        result = await this.recordOpen({ campaignId, investorId, emailId, ip: payload.ip });
        break;
      case 'clicked':
        result = await this.recordClick({ campaignId, investorId, emailId, targetUrl: payload.url, ip: payload.ip });
        break;
      case 'bounced':
        result = await this.recordBounce({ campaignId, investorId, emailId, reason: payload.reason });
        break;
      default:
        return { processed: 0 };
    }

    return { processed: 1, events: [result] };
  }

  /**
   * Handle generic webhook payload (SMTP-level bounces via return-path).
   */
  async handleGenericWebhook(payload) {
    const { campaignId, investorId, emailId, event: eventType, ...rest } = payload;

    if (!campaignId || !investorId) return { processed: 0 };

    let result;
    switch (eventType) {
      case 'open':
        result = await this.recordOpen({ campaignId, investorId, emailId });
        break;
      case 'click':
        result = await this.recordClick({ campaignId, investorId, emailId, targetUrl: rest.url });
        break;
      case 'reply':
        result = await this.recordReply({ campaignId, investorId, emailId, subject: rest.subject, snippet: rest.snippet });
        break;
      case 'bounce':
        result = await this.recordBounce({ campaignId, investorId, emailId, reason: rest.reason });
        break;
      default:
        return { processed: 0 };
    }

    return { processed: 1, events: [result] };
  }
}
