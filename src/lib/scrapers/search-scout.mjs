export async function searchDuck(query, max = 30) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SquidWeave/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return [];
    const text = await r.text();
    const results = [];
    const re = /class="result__a"[^>]*href="\/\/duckduckgo.com\/l\/\?uddg=([^&"]+)[^"]*"[^>]*>(.*?)<\/a>/gi;
    let m;
    while ((m = re.exec(text)) !== null && results.length < max) {
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      const raw = decodeURIComponent(m[1]);
      if (raw && title) results.push({ title, url: raw, source: 'duck' });
    }
    return results;
  } catch (e) {
    console.warn(`searchDuck error: ${e.message}`);
    return [];
  }
}

export async function searchBing(query, max = 30) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${max}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return [];
    const text = await r.text();
    const results = [];
    const re = /<li class="b_algo">.*?<a href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>.*?<p>(.*?)<\/p>/gis;
    let m;
    while ((m = re.exec(text)) !== null && results.length < max) {
      const u = m[1];
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      const snippet = m[3].replace(/<[^>]+>/g, '').trim();
      if (u && title) results.push({ title, url: u, snippet, source: 'bing' });
    }
    return results;
  } catch (e) {
    console.warn(`searchBing error: ${e.message}`);
    return [];
  }
}

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
