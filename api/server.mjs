import http from 'http';
import { timingSafeEqual } from 'node:crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import {
  schedulePost, getScheduledPosts, analyzeSEO,
  connectGoogleAds, connectMetaAds, connectLinkedInAds, getAdsStatus,
  getPixels, createPixel, getAdCampaigns, createAdCampaign
} from './ad-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
await fs.mkdir(DATA_DIR, { recursive: true });

const SMTP_FILE = path.join(DATA_DIR, 'smtp.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

async function loadJson(file, fallback = []) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}
async function saveJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Simple SMTP client using raw sockets
async function sendEmailSmtp({ host, port, user, pass, from, to, subject, html, fromName }) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host, port: parseInt(port) || 587 });
    let stage = 0;
    const commands = [];

    const sender = from || user || 'noreply@squidweave.io';
    const displayName = fromName || 'SquidWeave';

    // Base64 encode for AUTH PLAIN if credentials provided
    if (user && pass) {
      const authPlain = Buffer.from(`\0${user}\0${pass}`).toString('base64');
      commands.push(`AUTH PLAIN ${authPlain}`);
    }

    commands.push(`MAIL FROM:<${sender}>`);
    commands.push(`RCPT TO:<${to}>`);
    commands.push('DATA');

    const message = [
      `From: "${displayName}" <${sender}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      html,
      '.',
      'QUIT'
    ].join('\r\n');

    client.on('connect', () => {
      client.write(`EHLO squidweave\r\n`);
    });

    client.on('data', (data) => {
      const response = data.toString();
      const code = parseInt(response.substring(0, 3));

      if (code >= 400) {
        client.destroy();
        reject(new Error(`SMTP error: ${response.trim()}`));
        return;
      }

      if (stage < commands.length) {
        client.write(commands[stage] + '\r\n');
        stage++;
      } else if (response.includes('354')) {
        client.write(message + '\r\n');
      } else if (response.includes('221')) {
        client.destroy();
        resolve({ success: true });
      }
    });

    client.on('error', reject);
    client.on('timeout', () => { client.destroy(); reject(new Error('SMTP timeout')); });
  });
}

// ── Auth (fail closed) ───────────────────────────────────────────
// Mirrors src/server.mjs: accept x-api-key (SQUIDWEAVE_API_KEY) OR Basic UI
// credentials (UI_USER/UI_PASS) so a logged-in browser session works without
// shipping the API key to the client. If no secret is configured and INSECURE
// is not set, refuse all access (503) rather than run open.
const INSECURE = ['1', 'true', 'yes', 'on'].includes(String(process.env.SQUIDWEAVE_ALLOW_INSECURE || '').toLowerCase());
const API_KEY = process.env.SQUIDWEAVE_API_KEY || null;
const UI_USER = process.env.UI_USER || '';
const UI_PASS = process.env.UI_PASS || '';

function safeEqual(provided, expected) {
  const a = Buffer.from(String(provided ?? ''));
  const b = Buffer.from(String(expected ?? ''));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function basicAuthOk(req) {
  if (!UI_USER || !UI_PASS) return false;
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Basic ')) return false;
  let decoded;
  try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); }
  catch { return false; }
  const colon = decoded.indexOf(':');
  if (colon === -1) return false;
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);
  return safeEqual(user, UI_USER) && safeEqual(pass, UI_PASS);
}

// Health check must stay reachable without credentials (Railway/uptime probes).
function isPublicPath(url) {
  return url.pathname === '/health';
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// Returns true when the request is authorized; otherwise writes the response.
function requireAuth(req, res, url) {
  if (isPublicPath(url)) return true;
  if (!API_KEY) {
    if (INSECURE) return true;
    if (basicAuthOk(req)) return true;
    sendJson(res, 503, { error: 'Server misconfigured: SQUIDWEAVE_API_KEY is not set. Refusing unauthenticated access.' });
    return false;
  }
  const provided = req.headers['x-api-key'];
  if (provided && safeEqual(provided, API_KEY)) return true;
  if (basicAuthOk(req)) return true;
  sendJson(res, 401, { error: 'Unauthorized. Provide x-api-key or valid Basic credentials.' });
  return false;
}

const server = http.createServer(async (req, res) => {
  // CORS headers — allow the auth headers the browser client sends.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Public health check (no body parsing / auth).
  if (url.pathname === '/health' && req.method === 'GET') {
    sendJson(res, 200, { status: 'ok', service: 'squidweave-ad-engine' });
    return;
  }

  // Authenticate before doing any work or touching data.
  if (!requireAuth(req, res, url)) return;

  // Parse body for POST requests
  let body = '';
  if (req.method === 'POST') {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    req.body = body;
  }

  try {
    // GET /api/smtp
    if (url.pathname === '/api/smtp' && req.method === 'GET') {
      const config = await loadJson(SMTP_FILE, {
        host: 'smtp-relay.brevo.com', port: 587, user: '', pass: '', from: 'noreply@squidweave.io'
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
      return;
    }

    // POST /api/smtp
    if (url.pathname === '/api/smtp' && req.method === 'POST') {
      const data = JSON.parse(body);
      await saveJson(SMTP_FILE, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // POST /api/smtp/test
    if (url.pathname === '/api/smtp/test' && req.method === 'POST') {
      const config = JSON.parse(body);
      try {
        const client = net.createConnection({ host: config.host, port: parseInt(config.port) || 587 });
        await new Promise((resolve, reject) => {
          client.on('connect', () => { client.destroy(); resolve(); });
          client.on('error', reject);
          client.setTimeout(5000, () => { client.destroy(); reject(new Error('Connection timeout')); });
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'SMTP server reachable' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
      return;
    }

    // POST /api/send-campaign
    if (url.pathname === '/api/send-campaign' && req.method === 'POST') {
      const { subject, body, to, fromName, fromEmail } = JSON.parse(body);
      const smtp = await loadJson(SMTP_FILE);

      const results = [];
      for (const recipient of to) {
        try {
          await sendEmailSmtp({
            host: smtp.host, port: smtp.port,
            user: smtp.user, pass: smtp.pass,
            from: fromEmail || smtp.from,
            fromName: fromName || 'SquidWeave',
            to: recipient, subject, html: body
          });
          results.push({ email: recipient, status: 'sent' });
        } catch (err) {
          results.push({ email: recipient, status: 'failed', error: err.message });
        }
      }

      const campaigns = await loadJson(CAMPAIGNS_FILE);
      campaigns.push({
        id: `camp_${Date.now()}`,
        subject, body: body.slice(0, 200),
        sentAt: new Date().toISOString(),
        recipients: to.length,
        sent: results.filter(r => r.status === 'sent').length,
        results
      });
      await saveJson(CAMPAIGNS_FILE, campaigns);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, sent: results.filter(r => r.status === 'sent').length, results }));
      return;
    }

    // GET /api/campaigns/history
    if (url.pathname === '/api/campaigns/history' && req.method === 'GET') {
      const campaigns = await loadJson(CAMPAIGNS_FILE);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(campaigns));
      return;
    }

    // POST /api/prospecting/import
    if (url.pathname === '/api/prospecting/import' && req.method === 'POST') {
      const { results } = JSON.parse(body);
      const contacts = results.map((r, i) => ({
        id: `prospect_${Date.now()}_${i}`,
        name: r.companyName || r.domain || r.name || `Prospect ${i+1}`,
        email: r.founderEmails?.[0] || r.emails?.[0] || r.email || '',
        phone: r.phone || '',
        tags: r.isHiring || r.hiring ? ['hiring', 'prospect'] : ['prospect'],
        stage: 'Lead',
        dealValue: (r.fundamentalScore || r.score || 0) * 100,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: r.source || 'prospecting-engine',
        domain: r.domain || ''
      }));

      const existing = await loadJson(CONTACTS_FILE);
      const all = [...existing, ...contacts];
      await saveJson(CONTACTS_FILE, all);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, imported: contacts.length, total: all.length }));
      return;
    }

    // GET /api/contacts
    if (url.pathname === '/api/contacts' && req.method === 'GET') {
      const contacts = await loadJson(CONTACTS_FILE);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(contacts));
      return;
    }

    // ===== ADVERTISING ROUTES =====
    // Organic
    if (url.pathname === '/api/organic/schedule' && req.method === 'POST') { await schedulePost(req, res); return; }
    if (url.pathname === '/api/organic/scheduled' && req.method === 'GET') { await getScheduledPosts(req, res); return; }
    if (url.pathname === '/api/seo/analyze' && req.method === 'POST') { await analyzeSEO(req, res); return; }
    // Ad platforms
    if (url.pathname === '/api/ads/google/connect' && req.method === 'POST') { await connectGoogleAds(req, res); return; }
    if (url.pathname === '/api/ads/meta/connect' && req.method === 'POST') { await connectMetaAds(req, res); return; }
    if (url.pathname === '/api/ads/linkedin/connect' && req.method === 'POST') { await connectLinkedInAds(req, res); return; }
    if (url.pathname === '/api/ads/status' && req.method === 'GET') { await getAdsStatus(req, res); return; }
    if (url.pathname === '/api/ads/campaigns' && req.method === 'GET') { await getAdCampaigns(req, res); return; }
    if (url.pathname === '/api/ads/campaigns' && req.method === 'POST') { await createAdCampaign(req, res); return; }
    // Retargeting
    if (url.pathname === '/api/retargeting/pixels' && req.method === 'GET') { await getPixels(req, res); return; }
    if (url.pathname === '/api/retargeting/pixels' && req.method === 'POST') { await createPixel(req, res); return; }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SquidWeave Marketing API running on port ${PORT}`);
  console.log(`Core endpoints:`);
  console.log(`  GET  /health`);
  console.log(`  GET  /api/smtp`);
  console.log(`  POST /api/smtp`);
  console.log(`  POST /api/smtp/test`);
  console.log(`  POST /api/send-campaign`);
  console.log(`  GET  /api/campaigns/history`);
  console.log(`  POST /api/prospecting/import`);
  console.log(`  GET  /api/contacts`);
  console.log(`Advertising endpoints:`);
  console.log(`  POST /api/organic/schedule`);
  console.log(`  GET  /api/organic/scheduled`);
  console.log(`  POST /api/seo/analyze`);
  console.log(`  POST /api/ads/google/connect`);
  console.log(`  POST /api/ads/meta/connect`);
  console.log(`  POST /api/ads/linkedin/connect`);
  console.log(`  GET  /api/ads/status`);
  console.log(`  GET  /api/ads/campaigns`);
  console.log(`  POST /api/ads/campaigns`);
  console.log(`  GET  /api/retargeting/pixels`);
  console.log(`  POST /api/retargeting/pixels`);
});
