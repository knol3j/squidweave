import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
await fs.mkdir(DATA_DIR, { recursive: true });

const ADS_FILE = path.join(DATA_DIR, 'ads.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const PIXELS_FILE = path.join(DATA_DIR, 'pixels.json');

async function loadJson(file, fallback = []) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

async function saveJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ===== ORGANIC MARKETING =====

// POST /api/organic/schedule
export async function schedulePost(req, res) {
  try {
    const post = JSON.parse(req.body);
    const posts = await loadJson(POSTS_FILE);
    posts.push({ ...post, id: `post_${Date.now()}`, createdAt: new Date().toISOString() });
    await saveJson(POSTS_FILE, posts);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, post: posts[posts.length - 1] }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// GET /api/organic/scheduled
export async function getScheduledPosts(req, res) {
  try {
    const posts = await loadJson(POSTS_FILE);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(posts));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// POST /api/seo/analyze
export async function analyzeSEO(req, res) {
  try {
    const { url } = JSON.parse(req.body);
    if (!url || !/^https?:\/\//i.test(url)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'A valid http(s) URL is required.' }));
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let html;
    try {
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'SquidWeave-SEO/1.0 (+https://knol3j.github.io/squidweave)' },
        redirect: 'follow',
      });
      if (!upstream.ok) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Upstream returned ${upstream.status} for ${url}` }));
        return;
      }
      html = await upstream.text();
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Could not fetch ${url}: ${err.message}` }));
      return;
    } finally {
      clearTimeout(timer);
    }

    const decode = (s) => s
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
      .trim();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decode(titleMatch[1]) : '';
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i)
      || html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
    const description = descMatch ? decode(descMatch[1]) : '';
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1 = h1Match ? decode(h1Match[1].replace(/<[^>]+>/g, '')) : '';
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
    const hasLang = /<html[^>]+lang=/i.test(html);
    const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);

    const imgTags = html.match(/<img\b[^>]*>/gi) || [];
    const imgsMissingAlt = imgTags.filter((t) => !/\balt=["']/i.test(t)).length;
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    const wordCount = (text.match(/\b[\w'-]+\b/g) || []).length;

    const issues = [];
    const suggestions = [];
    let score = 100;
    const penalize = (pts, msg, fix) => { score -= pts; issues.push(msg); if (fix) suggestions.push(fix); };

    if (!title) penalize(20, 'Missing <title> tag', 'Add a descriptive <title> under 60 characters.');
    else if (title.length > 60) penalize(6, `Title is long (${title.length} chars)`, 'Keep the title under 60 characters.');
    if (!description) penalize(15, 'Missing meta description', 'Add a meta description around 120–158 characters.');
    else if (description.length < 70) penalize(6, `Meta description is short (${description.length} chars)`, 'Expand the meta description to ~120–158 characters.');
    if (!h1) penalize(12, 'No <h1> heading found', 'Add a single descriptive <h1>.');
    if (imgTags.length && imgsMissingAlt > 0) penalize(Math.min(10, imgsMissingAlt * 2), `${imgsMissingAlt} image(s) missing alt text`, 'Add descriptive alt attributes to images.');
    if (!hasViewport) penalize(8, 'Missing viewport meta tag', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
    if (!hasCanonical) penalize(4, 'No canonical link tag', 'Add a <link rel="canonical"> to avoid duplicate-content issues.');
    if (!hasLang) penalize(3, '<html> has no lang attribute', 'Set a lang attribute on <html> for accessibility and SEO.');
    if (!ogTitle) penalize(3, 'No Open Graph title', 'Add og:title/og:description for richer social sharing.');
    if (wordCount < 300) penalize(6, `Thin content (${wordCount} words)`, 'Aim for at least 300 words of substantive content.');

    score = Math.max(0, Math.min(100, score));
    const result = {
      url,
      score,
      issues,
      suggestions,
      wordCount,
      meta: { title, description, h1 },
      checks: { hasViewport, hasCanonical, hasLang, ogTitle, imagesTotal: imgTags.length, imgsMissingAlt },
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ===== AD PLATFORM CREDENTIALS =====

// POST /api/ads/google/connect
export async function connectGoogleAds(req, res) {
  try {
    const { clientId, clientSecret, developerToken, accountId } = JSON.parse(req.body);
    if (!developerToken || !accountId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'developerToken and accountId are required.' }));
      return;
    }
    // Google Ads requires an OAuth2 access token to hit the API; the connect
    // flow stores credentials and flags that OAuth must be completed before
    // live campaign data can be pulled. We verify the shape here.
    const ads = await loadJson(ADS_FILE);
    ads.google = {
      clientId, clientSecret, developerToken, accountId,
      connected: true, verified: false,
      notice: 'Credentials stored. Complete Google OAuth to pull live campaign data.',
      connectedAt: new Date().toISOString(),
    };
    await saveJson(ADS_FILE, ads);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, verified: false, message: 'Google Ads credentials stored — OAuth required for live data.' }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// POST /api/ads/meta/connect
export async function connectMetaAds(req, res) {
  try {
    const { appId, appSecret, accessToken, adAccountId } = JSON.parse(req.body);
    if (!accessToken) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'accessToken is required.' }));
      return;
    }
    // Validate the token live against the Graph API.
    const check = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(accessToken)}`);
    if (!check.ok) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: `Meta rejected the access token (HTTP ${check.status}).` }));
      return;
    }
    const me = await check.json().catch(() => ({}));
    const ads = await loadJson(ADS_FILE);
    ads.meta = { appId, appSecret, accessToken, adAccountId, accountName: me.name || me.id, connected: true, verified: true, connectedAt: new Date().toISOString() };
    await saveJson(ADS_FILE, ads);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, verified: true, message: 'Meta Ads connected and token verified.' }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// POST /api/ads/linkedin/connect
export async function connectLinkedInAds(req, res) {
  try {
    const { clientId, clientSecret, accessToken, accountId } = JSON.parse(req.body);
    if (!accessToken) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'accessToken is required.' }));
      return;
    }
    // Validate the token live against the LinkedIn userinfo endpoint.
    const check = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!check.ok) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: `LinkedIn rejected the access token (HTTP ${check.status}).` }));
      return;
    }
    const me = await check.json().catch(() => ({}));
    const ads = await loadJson(ADS_FILE);
    ads.linkedin = { clientId, clientSecret, accessToken, accountId, accountName: me.name, connected: true, verified: true, connectedAt: new Date().toISOString() };
    await saveJson(ADS_FILE, ads);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, verified: true, message: 'LinkedIn Ads connected and token verified.' }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// GET /api/ads/status
export async function getAdsStatus(req, res) {
  try {
    const ads = await loadJson(ADS_FILE);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      google: ads.google || { connected: false },
      meta: ads.meta || { connected: false },
      linkedin: ads.linkedin || { connected: false }
    }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ===== RETARGETING PIXELS =====

// GET /api/retargeting/pixels
export async function getPixels(req, res) {
  try {
    const pixels = await loadJson(PIXELS_FILE);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(pixels));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// POST /api/retargeting/pixels
export async function createPixel(req, res) {
  try {
    const pixel = JSON.parse(req.body);
    const pixels = await loadJson(PIXELS_FILE);
    const newPixel = {
      ...pixel,
      id: `px_${Date.now()}`,
      createdAt: new Date().toISOString(),
      code: generatePixelCode(pixel.platform, pixel.name)
    };
    pixels.push(newPixel);
    await saveJson(PIXELS_FILE, pixels);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, pixel: newPixel }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

function generatePixelCode(platform, name) {
  const id = Math.random().toString(36).substr(2, 9);
  switch (platform) {
    case 'meta':
      return `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;
    case 'google':
      return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-${id}');
</script>`;
    case 'linkedin':
      return `<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "${id}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${id}&fmt=gif" />
</noscript>`;
    case 'twitter':
      return `<!-- Twitter conversion tracking base code -->
<script>
!function(e,t,n,s,u,a){
e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${id}');
</script>
<!-- End Twitter conversion tracking base code -->`;
    default:
      return '';
  }
}

// ===== AD CAMPAIGNS =====

// GET /api/ads/campaigns
export async function getAdCampaigns(req, res) {
  try {
    const campaigns = [
      {id:'adc1',name:'Crypto Mining Keywords',platform:'google',status:'active',budget:50,spend:1240,impressions:45000,clicks:890,conversions:34,ctr:1.98,cpc:1.39,roas:2.8},
      {id:'adc2',name:'DeFi Audience',platform:'meta',status:'active',budget:40,spend:890,impressions:32000,clicks:560,conversions:22,ctr:1.75,cpc:1.59,roas:2.4},
      {id:'adc3',name:'LinkedIn B2B',platform:'linkedin',status:'paused',budget:75,spend:0,impressions:0,clicks:0,conversions:0,ctr:0,cpc:0,roas:0},
      {id:'adc4',name:'YouTube Pre-roll',platform:'google',status:'draft',budget:100,spend:0,impressions:0,clicks:0,conversions:0,ctr:0,cpc:0,roas:0},
    ];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(campaigns));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// POST /api/ads/campaigns
export async function createAdCampaign(req, res) {
  try {
    const campaign = JSON.parse(req.body);
    const ads = await loadJson(ADS_FILE);
    if (!ads.campaigns) ads.campaigns = [];
    const newCampaign = { ...campaign, id: `adc_${Date.now()}`, createdAt: new Date().toISOString() };
    ads.campaigns.push(newCampaign);
    await saveJson(ADS_FILE, ads);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, campaign: newCampaign }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}
