/**
 * ProPublica nonprofit (IRS 990) scout.
 *
 * Nonprofits file Form 990, which is public and carries something the corporate
 * sources do not: a verified mailing address, annual revenue, total assets, and an
 * NTEE sector code. That is firmographic data for a whole market segment that has no
 * SEC filing and no Crunchbase entry.
 *
 * Reads the public ProPublica Nonprofit Explorer API. No key, no scraping of
 * protected content.
 *
 * Confidence is 0.75: a 990 is a statutory filing, but self-reported.
 */

const SEARCH_URL = "https://projects.propublica.org/nonprofits/api/v2/search.json";
const ORG_URL = "https://projects.propublica.org/nonprofits/api/v2/organizations";
const HEADERS = { "User-Agent": "SquidWeave Discovery contact@squidweave.ai" };

/** NTEE major-group code -> a readable sector. */
const NTEE_SECTORS = {
  A: "Arts, Culture & Humanities",
  B: "Educational Institutions",
  C: "Environmental Quality",
  D: "Animal-Related",
  E: "Health Care",
  F: "Mental Health & Crisis",
  G: "Diseases & Disorders",
  H: "Medical Research",
  I: "Crime & Legal",
  J: "Employment",
  K: "Food & Nutrition",
  L: "Housing & Shelter",
  M: "Public Safety",
  N: "Recreation & Sports",
  O: "Youth Development",
  P: "Human Services",
  Q: "International Affairs",
  R: "Civil Rights & Advocacy",
  S: "Community Improvement",
  T: "Philanthropy",
  U: "Science & Technology",
  V: "Social Science Research",
  W: "Public & Societal Benefit",
  X: "Religion",
  Y: "Mutual & Membership Benefit",
  Z: "Unknown",
};

/** Employee band from 990-reported revenue. A floor, never a precise headcount. */
function bandFromRevenue(revenue) {
  const n = Number(revenue);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 100_000_000) return "5000+";
  if (n >= 10_000_000) return "1001-5000";
  if (n >= 1_000_000) return "501-1000";
  if (n >= 250_000) return "201-500";
  return "51-200";
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export const propublicaNonprofitScout = {
  name: "nonprofit-990",

  /**
   * @param {string} query an organization name, or an EIN ("58-1771391")
   * @param {object} options
   * @param {number} options.limit max orgs (default 10)
   * @param {boolean} options.detail fetch the per-org endpoint for revenue/assets
   */
  async discover(query, options = {}) {
    const limit = options.limit || 10;
    const needle = String(query || "").trim();
    if (!needle) return { source: "nonprofit-990", records: [] };

    let search;
    try {
      // An EIN goes straight to the detail endpoint: search by digits is unreliable.
      const ein = needle.replace(/\D/g, "");
      if (/^\d{9}$/.test(ein)) {
        const response = await fetch(`${ORG_URL}/${ein}.json`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(20000),
        });
        if (response.ok) {
          const detail = await response.json();
          search = detail?.organization ? [detail.organization] : [];
        }
      }

      if (!search) {
        const url = `${SEARCH_URL}?q=${encodeURIComponent(needle)}`;
        const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
        if (!response.ok) return { source: "nonprofit-990", records: [], note: `search returned ${response.status}` };
        const data = await response.json();
        search = (data.organizations || []).slice(0, limit);
      }
    } catch (error) {
      return { source: "nonprofit-990", records: [], note: `unreachable: ${error.message}` };
    }

    const records = [];
    for (const org of search) {
      // Search results omit the financial fields; the detail endpoint has them. Fetch
      // it per org, because revenue is what sizes the company. A failure here must not
      // lose the org — the rest of the row is still valid.
      let detail = null;
      const einDigits = String(org.ein || org.id || "").replace(/\D/g, "");
      if (options.detail !== false && /^\d{9}$/.test(einDigits)) {
        try {
          const response = await fetch(`${ORG_URL}/${einDigits}.json`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(20000),
          });
          if (response.ok) detail = (await response.json()).organization || null;
        } catch {
          // Leave detail null; the search row is still worth storing.
        }
      }
      const row = detail || org;
      const latestFiling = (row.filings_with_data || []).slice(-1)[0] || {};
      const ntee = String(row.ntee_code || "").toUpperCase();
      const sector = NTEE_SECTORS[ntee.charAt(0)] || null;
      const revenue = latestFiling.totrevenue ?? row.revenue_amount ?? null;

      records.push({
        // 990s carry a mailing address, not a website. The EIN key is stable and
        // unambiguous, so the domain is synthesised from it and a team-page read can
        // attach the real one later.
        domain: `irs.${einDigits}.org`,
        company: row.name,
        industry: sector,
        employeeRange: bandFromRevenue(revenue),
        location: [row.city, row.state].filter(Boolean).join(", ") || null,
        description: row.ntee_code
          ? `${sector || "Nonprofit"} (NTEE ${row.ntee_code})`
          : sector,
        sourceUrl: `https://projects.propublica.org/nonprofits/organizations/${einDigits}`,
        people: [],
        metadata: {
          ein: row.strein || row.ein,
          revenue,
          assets: latestFiling.totassetsend ?? row.asset_amount ?? null,
          rulingDate: row.ruling_date,
          taxPeriod: latestFiling.tax_prd,
        },
      });
    }

    return {
      source: "nonprofit-990",
      sourceUrl: records[0]?.sourceUrl || null,
      records,
      note: `${records.length} nonprofit(s) matched "${needle}"`,
    };
  },
};

export { NTEE_SECTORS, bandFromRevenue };
