/**
 * SEC company-index scout.
 *
 * EDGAR publishes a flat file of every company with a ticker: CIK, ticker, and the
 * legal name as it appears in filings. That is 10,000+ companies in one request, and
 * it is the discovery layer the rest of the B2B pipeline was missing — before this,
 * the only way into EDGAR was to already know a company's exact filing name.
 *
 * This scout answers "which companies exist" and resolves a name to a CIK. It does
 * not fetch officers; that is `sec-edgar-scout`, which reads Form 4 filings once a
 * CIK is known. Keeping the two separate means the index costs one request for any
 * number of companies.
 *
 * Public data, one documented endpoint, no authentication.
 */

import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const TICKER_FILE = "https://www.sec.gov/files/company_tickers.json";
const CACHE_DIR = "/tmp/squidweave-cache";
const CACHE_FILE = join(CACHE_DIR, "sec-company-tickers.json");
// EDGAR refreshes this file daily; a 12h cache keeps bulk discovery cheap without
// going stale within a working session.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const HEADERS = { "User-Agent": "SquidWeave Discovery contact@squidweave.ai" };

async function loadIndex() {
  try {
    const stat = await import("node:fs/promises").then(fs => fs.stat(CACHE_FILE));
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      const cached = JSON.parse(await readFile(CACHE_FILE, "utf8"));
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }
  } catch {
    // Cache miss or unreadable: fall through to a fresh fetch.
  }

  const response = await fetch(TICKER_FILE, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`SEC ticker index returned ${response.status}`);
  const raw = await response.json();

  // The file is an object keyed by row id; flatten to an array once.
  const rows = Object.values(raw).map(row => ({
    cik: String(row.cik_str).padStart(10, "0"),
    ticker: row.ticker || null,
    name: row.title || null,
  }));

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(rows));
  } catch {
    // Caching is an optimisation, never a requirement.
  }

  return rows;
}

async function writeFile(path, contents) {
  const { writeFile: write } = await import("node:fs/promises");
  return write(path, contents);
}

/** Normalise a legal name for matching: strip suffixes and punctuation. */
function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|corp|corporation|co|company|ltd|llc|lp|llp|plc|nv|sa|ag|se|holdings?|group|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const secIndexScout = {
  name: "sec-index",

  /**
   * @param {string} query a company name, a ticker, or "all"
   * @param {object} options
   * @param {number} options.limit max companies to return (default 50)
   * @param {boolean} options.withDomain only return rows we can attach a domain to
   */
  async discover(query, options = {}) {
    const limit = options.limit || 50;
    const rows = await loadIndex();
    const needle = String(query || "").trim();

    let matches;
    if (!needle || needle.toLowerCase() === "all") {
      matches = rows.slice(0, limit);
    } else {
      const upper = needle.toUpperCase();
      const normalizedNeedle = normalizeName(needle);

      // Exact ticker is the strongest signal, so check it before any text match.
      const byTicker = rows.filter(r => r.ticker && r.ticker.toUpperCase() === upper);
      if (byTicker.length > 0) {
        matches = byTicker.slice(0, limit);
      } else {
        const exactName = rows.filter(r => normalizeName(r.name) === normalizedNeedle);
        const prefix = rows.filter(
          r => normalizeName(r.name).startsWith(normalizedNeedle) && r.name !== needle,
        );
        matches = (exactName.length > 0 ? exactName : prefix).slice(0, limit);
      }
    }

    const records = matches.map(row => ({
      // No website is published in this file. The ingestion engine synthesises a
      // stable key so these companies are stored and later enriched by the
      // EDGAR filing scout or a team-page read.
      domain: null,
      company: row.name,
      industry: null,
      employeeRange: null,
      location: null,
      description: `${row.ticker ? `${row.ticker} — ` : ""}SEC registrant (CIK ${row.cik})`,
      sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${row.cik}&type=10-K`,
      people: [],
      metadata: { cik: row.cik, ticker: row.ticker, source: "sec-company-index" },
    }));

    return {
      source: "sec-index",
      records,
      note: `${rows.length} companies in the SEC index; ${matches.length} matched "${needle}"`,
    };
  },
};

export { loadIndex as loadSecCompanyIndex, normalizeName };
