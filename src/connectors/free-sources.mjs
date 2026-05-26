import crypto from "node:crypto";

const DEFAULT_HEADERS = {
  "user-agent": "squidweave/0.1 (+https://localhost)",
  accept: "application/json, text/plain, */*",
};

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers: { ...DEFAULT_HEADERS, ...headers } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

function clamp01(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function scoreRecency(dateValue) {
  const ms = new Date(dateValue).getTime();
  if (!Number.isFinite(ms)) return 0.5;
  const days = (Date.now() - ms) / (24 * 60 * 60 * 1000);
  if (days <= 7) return 0.95;
  if (days <= 30) return 0.8;
  if (days <= 90) return 0.65;
  if (days <= 365) return 0.5;
  return 0.35;
}

export function createFreeSourceConnectors() {
  return [
    {
      name: "reddit",
      reliability: 0.58,
      async health() {
        const url = "https://www.reddit.com/r/marketing/new.json?limit=1";
        await fetchJson(url);
        return { name: "reddit", ok: true, endpoint: url };
      },
      async ingest({ query, limit = 5 }) {
        const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${Math.max(1, limit)}`;
        const payload = await fetchJson(url);
        const posts = payload?.data?.children?.map(item => item?.data).filter(Boolean) || [];
        return posts.map(post => ({
          source: "reddit",
          targetId: `reddit:${post.id}`,
          company: post.subreddit_name_prefixed || post.subreddit || "Reddit",
          contactName: post.author || "",
          title: post.title || "",
          segment: "community",
          region: "global",
          preferredChannel: "social",
          channels: ["social"],
          fitScore: clamp01((post.score || 1) / 200),
          intentScore: clamp01((post.num_comments || 0) / 100),
          recencyScore: scoreRecency((post.created_utc || 0) * 1000),
          metadata: {
            sourceUrl: `https://reddit.com${post.permalink || ""}`,
            publishedAt: new Date((post.created_utc || 0) * 1000).toISOString(),
            evidence: [post.title || "", `comments:${post.num_comments || 0}`],
            sourceReliability: 0.58,
          },
        }));
      },
    },
    {
      name: "hn",
      reliability: 0.62,
      async health() {
        const url = "https://hn.algolia.com/api/v1/search?query=saas&tags=story&hitsPerPage=1";
        await fetchJson(url);
        return { name: "hn", ok: true, endpoint: url };
      },
      async ingest({ query, limit = 5 }) {
        const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${Math.max(1, limit)}`;
        const payload = await fetchJson(url);
        const hits = payload?.hits || [];
        return hits.map(item => ({
          source: "hn",
          targetId: `hn:${item.objectID}`,
          company: "Hacker News",
          contactName: item.author || "",
          title: item.title || item.story_title || "",
          segment: "developer-community",
          region: "global",
          preferredChannel: "social",
          channels: ["social"],
          fitScore: clamp01((item.points || 1) / 200),
          intentScore: clamp01((item.num_comments || 0) / 120),
          recencyScore: scoreRecency(item.created_at),
          metadata: {
            sourceUrl: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
            publishedAt: item.created_at,
            evidence: [item.title || "", `points:${item.points || 0}`],
            sourceReliability: 0.62,
          },
        }));
      },
    },
    {
      name: "github",
      reliability: 0.71,
      async health() {
        const url = "https://api.github.com/search/repositories?q=marketing+automation&per_page=1";
        await fetchJson(url, { "x-github-api-version": "2022-11-28" });
        return { name: "github", ok: true, endpoint: url };
      },
      async ingest({ query, limit = 5 }) {
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${Math.max(1, limit)}`;
        const payload = await fetchJson(url, { "x-github-api-version": "2022-11-28" });
        const items = payload?.items || [];
        return items.map(repo => ({
          source: "github",
          targetId: `gh:${repo.id}`,
          company: repo.owner?.login || repo.full_name,
          contactName: repo.owner?.login || "",
          title: repo.full_name,
          segment: "open-source",
          region: "global",
          preferredChannel: "email",
          channels: ["email", "social"],
          fitScore: clamp01((repo.stargazers_count || 0) / 5000),
          intentScore: clamp01((repo.watchers_count || 0) / 2000),
          recencyScore: scoreRecency(repo.pushed_at),
          metadata: {
            sourceUrl: repo.html_url,
            publishedAt: repo.pushed_at,
            evidence: [repo.description || "", `stars:${repo.stargazers_count || 0}`],
            sourceReliability: 0.71,
          },
        }));
      },
    },
    {
      name: "wikidata",
      reliability: 0.77,
      async health() {
        const query = "SELECT ?item ?itemLabel WHERE { ?item wdt:P31 wd:Q4830453 . SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. } } LIMIT 1";
        const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
        await fetchJson(url);
        return { name: "wikidata", ok: true, endpoint: "https://query.wikidata.org/sparql" };
      },
      async ingest({ query, limit = 5 }) {
        const sparql = `SELECT ?item ?itemLabel WHERE { ?item rdfs:label ?itemLabel . FILTER(CONTAINS(LCASE(STR(?itemLabel)), LCASE('${String(query).replace(/'/g, "\\'")}'))) FILTER(LANG(?itemLabel)='en') } LIMIT ${Math.max(1, limit)}`;
        const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
        const payload = await fetchJson(url);
        const rows = payload?.results?.bindings || [];
        return rows.map(row => ({
          source: "wikidata",
          targetId: `wikidata:${row.item?.value?.split('/').at(-1) || crypto.randomUUID()}`,
          company: row.itemLabel?.value || "",
          contactName: "",
          title: row.itemLabel?.value || "",
          segment: "knowledge-graph",
          region: "global",
          preferredChannel: "email",
          channels: ["email"],
          fitScore: 0.6,
          intentScore: 0.5,
          recencyScore: 0.5,
          metadata: {
            sourceUrl: row.item?.value || "",
            evidence: [row.itemLabel?.value || ""],
            sourceReliability: 0.77,
          },
        }));
      },
    },
    {
      name: "sec",
      reliability: 0.88,
      async health() {
        const url = "https://data.sec.gov/submissions/CIK0000320193.json";
        await fetchJson(url);
        return { name: "sec", ok: true, endpoint: url };
      },
      async ingest({ query, limit = 5 }) {
        const tickers = await fetchJson("https://www.sec.gov/files/company_tickers.json");
        const entries = Object.values(tickers || {})
          .filter(item => String(item?.title || "").toLowerCase().includes(String(query || "").toLowerCase()))
          .slice(0, Math.max(1, limit));

        return entries.map(item => ({
          source: "sec",
          targetId: `sec:${item.cik_str}`,
          company: item.title || "",
          contactName: "Investor Relations",
          title: `${item.ticker || ""} public filing entity`.trim(),
          segment: "public-company",
          region: "us",
          preferredChannel: "email",
          channels: ["email"],
          fitScore: 0.72,
          intentScore: 0.64,
          recencyScore: 0.7,
          metadata: {
            sourceUrl: `https://data.sec.gov/submissions/CIK${String(item.cik_str).padStart(10, "0")}.json`,
            evidence: [item.title || "", `ticker:${item.ticker || ""}`],
            sourceReliability: 0.88,
          },
        }));
      },
      toInvestorRecords(researchRecords = [], campaignId) {
        return researchRecords
          .filter(record => record.source === "sec")
          .map(record => ({
            campaignId,
            fundName: `${record.company} Ventures`,
            partnerName: "Investor Relations",
            thesis: `Public market signal from ${record.company}`,
            warmIntroPath: record.metadata?.sourceUrl || "",
            thesisMatch: clamp01(record.fitScore),
            stageMatch: 0.55,
            checkSizeMatch: 0.5,
            warmPath: 0.45,
            status: "sourced",
          }));
      },
    },
    {
      name: "gdelt",
      reliability: 0.66,
      async health() {
        const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=saas&mode=artlist&maxrecords=1&format=json";
        await fetchJson(url);
        return { name: "gdelt", ok: true, endpoint: url };
      },
      async ingest({ query, limit = 5 }) {
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${Math.max(1, limit)}&format=json`;
        const payload = await fetchJson(url);
        const articles = payload?.articles || [];
        return articles.map(article => ({
          source: "gdelt",
          targetId: `gdelt:${Buffer.from(article.url || article.title || Math.random().toString()).toString("base64").slice(0, 18)}`,
          company: article.domain || "",
          contactName: "",
          title: article.title || "",
          segment: "news",
          region: "global",
          preferredChannel: "social",
          channels: ["social"],
          fitScore: 0.58,
          intentScore: clamp01((article.socialimage ? 0.7 : 0.5)),
          recencyScore: scoreRecency(article.seendate || article.date),
          metadata: {
            sourceUrl: article.url,
            publishedAt: article.seendate || article.date,
            evidence: [article.title || "", article.domain || ""],
            sourceReliability: 0.66,
          },
        }));
      },
    },
  ];
}
