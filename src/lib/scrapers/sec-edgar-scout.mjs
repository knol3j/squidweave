/**
 * SEC EDGAR scout.
 *
 * Public-company officers and directors, read from Form 4 insider-transaction
 * filings. This is the highest data-quality free source available: a Form 4 is a
 * legal document that names the reporting person, their officer title, and
 * whether they are an officer or director. It is free, structured, needs no key,
 * and covers exactly the large B2B accounts that are hardest to reach any other
 * way.
 *
 * Two facts about EDGAR that shape this file:
 *   1. `data.sec.gov/submissions/CIK##########.json` does NOT contain officer
 *      names. It lists filings. Officers come from the filing documents.
 *   2. The `primaryDocument` path renders through an XSL stylesheet and returns
 *      HTML. The raw XML lives at the accession directory without the `xsl*`
 *      prefix, and that is what this scout requests.
 *
 * EDGAR requires a declared User-Agent with contact details and rate-limits to
 * 10 requests/second. This scout paces itself well inside that.
 */

const USER_AGENT = "SquidWeave Discovery contact@squidweave.ai";
const SUBMISSIONS = "https://data.sec.gov/submissions/CIK##########.json";
const ARCHIVES = "https://www.sec.gov/Archives/edgar/data";

const JSON_HEADERS = { "User-Agent": USER_AGENT, Accept: "application/json" };
const XML_HEADERS = { "User-Agent": USER_AGENT, Accept: "application/xml" };

// Form 4 titles are verbose ("Vice Chair and President"). Keep the raw string
// and derive seniority from it rather than discarding detail.
const SENIORITY_FROM_FILING = [
  // Order matters: the first matching rule wins. "Vice Chair" is the most
  // specific qualifier in the titles EDGAR produces and outranks the bare
  // "President" or "Chair" words it usually appears alongside, so it is checked
  // first. Without this, "Vice Chair and President" scores as a CEO.
  { seniority: "vp", patterns: [/\bvice chair\b/i] },
  { seniority: "owner", patterns: [/\bchief executive\b/i, /\bceo\b/i, /\bchair(man|person|woman)\b/i, /^chair/i] },
  { seniority: "c_level", patterns: [/\bchief\b/i, /\bcfo\b/i, /\bcto\b/i, /\bcoo\b/i, /\bcmo\b/i, /\bpresident\b/i] },
  { seniority: "vp", patterns: [/\bvice president\b/i, /\bevp\b/i, /\bsvp\b/i, /\bvp\b/i] },
  { seniority: "manager", patterns: [/\bcontroller\b/i, /\btreasurer\b/i, /\bsecretary\b/i, /\bgeneral counsel\b/i, /\bdirector\b/i] },
];

export function seniorityFromFilingTitle(title) {
  if (!title) return "unknown";
  for (const rule of SENIORITY_FROM_FILING) {
    if (rule.patterns.some(pattern => pattern.test(title))) return rule.seniority;
  }
  return "individual_contributor";
}

// EDGAR names are uppercase with no comma ("SMITH BRADFORD L"). Convert to a
// readable form and keep the middle initial, which matters for dedupe.
//
// EDGAR does not standardize name order across filers. Most submit surname-first
// ("SMITH BRADFORD L" -> Bradford L. Smith), which is what this parses. A minority
// submit given-name-first ("HUANG JEN HSUN" -> Jen-Hsun Huang), and those come
// out misordered: there is no signal in the filing that distinguishes the two
// without an external name dictionary. The misordered rows are tagged
// `nameOrderUncertain` so a later pass or a human can correct them, rather than
// guessed at here and silently wrong for most filers.
function normalizeEdgarName(raw) {
  const cleaned = String(raw || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const parts = cleaned.split(" ").filter(Boolean);
  const surname = parts[0] || "";
  const given = parts[1] || "";
  const middle = parts.slice(2).join(" ");

  const titleCase = word =>
    word
      .toLowerCase()
      .replace(/(^|[^a-z])'(.)/g, (m, p1, p2) => `${p1}'${p2.toUpperCase()}`)
      .replace(/^./, c => c.toUpperCase());

  const middleInitials = [middle].filter(Boolean).join(" ");

  return {
    fullName: [titleCase(given), middleInitials, titleCase(surname)].filter(Boolean).join(" "),
    firstName: titleCase(given) || null,
    lastName: titleCase(surname) || null,
    // True when the name has no trailing single-letter initial, the shape that
    // makes surname-first parsing ambiguous.
    nameOrderUncertain: parts.length >= 3 && parts[parts.length - 1].length > 1,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: JSON_HEADERS, signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers: XML_HEADERS, signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  return response.text();
}

function firstTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return null;
  return match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

/** Resolve a company name or ticker to CIK records via EDGAR company search. */
async function searchCompanies(name) {
  const url = new URL("https://www.sec.gov/cgi-bin/browse-edgar");
  url.search = new URLSearchParams({
    action: "getcompany",
    company: name,
    type: "4",
    dateb: "",
    owner: "include",
    count: "10",
    output: "atom",
  }).toString();

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/atom+xml" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return [];
  const xml = await response.text();

  // The CIK lives in the feed-level <company-info> block, NOT inside the
  // <entry> elements (those are individual filings). Reading it from the wrong
  // place is what made this return nothing on the first pass.
  const cik = xml.match(/<company-info>[\s\S]*?<cik>(\d+)<\/cik>/i)?.[1];
  const name_ = xml.match(/<company-info>[\s\S]*?<conformed-name>([\s\S]*?)<\/conformed-name>/i)?.[1];
  if (!cik) return [];

  const tickers = [...xml.matchAll(/<ticker>([\s\S]*?)<\/ticker>/gi)].map(match => match[1].trim());
  const exchanges = [...xml.matchAll(/<exchange>([\s\S]*?)<\/exchange>/gi)].map(match => match[1].trim());

  return [
    {
      cik: String(Number(cik)),
      name: (name_ || name || "").replace(/\s+/g, " ").trim(),
      tickers,
      exchanges,
    },
  ];
}

/**
 * Read a company's recent Form 4 filings and pull named officers and directors.
 * Stops early once `maxFilings` documents have been read or `maxPeople` distinct
 * people are found, because Form 4s repeat the same insiders filing after every
 * equity transaction.
 */
/**
 * Map an EDGAR `entityType` to the employee band the scorer understands.
 *
 * EDGAR does not publish headcount, but filer status is a statutory classification
 * with published public-float thresholds, so it bounds company size. Every one of
 * these categories is a public company, which means well over 500 employees, so the
 * returned band is a deliberate floor.
 *
 * Returns null for anything unrecognised: the scorer scores a missing band as
 * unknown (0), which is honest, whereas a wrong band would silently mis-rank.
 *
 * @param {string | undefined | null} entityType
 * @returns {string | null}
 */
export function employeeBandFromFilerStatus(entityType) {
  const value = String(entityType || "").toLowerCase();
  if (!value) return null;
  // Smaller Reporting Companies and Emerging Growth Companies still float above
  // 500 employees in practice, but the safest shared floor for all SEC registrants
  // is 501-1000, and non-accelerated filers cluster there.
  if (value.includes("non-accelerated")) return "501-1000";
  if (value.includes("accelerated")) return "1001-5000";
  if (value.includes("large accelerated")) return "5000+";
  // Any other registered category (operating company, REIT, fund, ...) is a public
  // issuer; use the conservative floor rather than guessing a larger size.
  return "501-1000";
}

async function officersFromFilings(cik, options = {}) {
  const maxFilings = options.maxFilings || 25;
  const maxPeople = options.maxPeople || 25;

  const data = await fetchJson(SUBMISSIONS.replace("##########", cik.padStart(10, "0")));
  const recent = data.filings?.recent;
  if (!recent?.form) return { company: null, people: [], filingsRead: 0 };

  const company = {
    domain: data.website || null,
    name: data.name || null,
    industry: data.sicDescription || null,
    location: [data.addresses?.business?.city, data.addresses?.business?.stateOrCountry]
      .filter(Boolean)
      .join(", ") || null,
    // EDGAR publishes no headcount. The filer status is the closest public
    // signal, and the SEC's thresholds are statutory, so the band is a documented
    // floor rather than a guess. Null when the status is absent or unrecognised,
    // because the scorer treats a missing band as unknown rather than inventing one.
    employeeRange: employeeBandFromFilerStatus(data.entityType),
    description: data.name || null,
    sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}`,
    metadata: {
      cik,
      tickers: data.tickers || [],
      exchanges: data.exchanges || [],
      entityType: data.entityType || null,
      stateOfIncorporation: data.stateOfIncorporationDescription || null,
    },
  };

  const people = new Map();
  let filingsRead = 0;

  for (let i = 0; i < recent.form.length && filingsRead < maxFilings && people.size < maxPeople; i += 1) {
    const form = recent.form[i];
    // Form 4 names the reporting insider. Form 3 is the initial statement of
    // beneficial ownership and also carries name plus title.
    if (form !== "4" && form !== "3") continue;

    const accession = (recent.accessionNumber[i] || "").replace(/-/g, "");
    const primaryDoc = recent.primaryDocument[i];
    if (!accession || !primaryDoc) continue;

    // primaryDocument is the XSL path (renders HTML). The raw XML sits beside it
    // in the accession directory under the same leaf name.
    const xmlUrl = `${ARCHIVES}/${cik}/${accession}/${primaryDoc.split("/").pop()}`;
    filingsRead += 1;

    try {
      const xml = await fetchText(xmlUrl);
      if (!xml) continue;

      const rawName = firstTag(xml, "rptOwnerName");
      const title = firstTag(xml, "officerTitle");
      if (!rawName) continue;

      const isOfficer = firstTag(xml, "isOfficer") === "1" || firstTag(xml, "isOfficer") === "true";
      const isDirector = firstTag(xml, "isDirector") === "1" || firstTag(xml, "isDirector") === "true";
      if (!isOfficer && !isDirector && !title) continue;

      const name = normalizeEdgarName(rawName);
      if (!name) continue;

      const key = name.fullName.toLowerCase();
      const existing = people.get(key);
      if (existing) {
        // Prefer the filing with an actual officer title over a bare director row.
        if (!existing.title && title) {
          existing.title = title;
          existing.seniority = seniorityFromFilingTitle(title);
          existing.sourceUrl = xmlUrl;
        }
        continue;
      }

      people.set(key, {
        ...name,
        title: title || (isDirector ? "Director" : null),
        seniority: title ? seniorityFromFilingTitle(title) : isDirector ? "board" : "unknown",
        department: null,
        sourceUrl: xmlUrl,
        metadata: {
          isOfficer,
          isDirector,
          filingDate: recent.filingDate[i],
          form,
          // Surfaced so a reviewer can spot the given-name-first filers whose
          // surname/given order this parser cannot resolve from the filing alone.
          nameOrderUncertain: name.nameOrderUncertain || false,
        },
      });
    } catch {
      // One unreadable filing must not abort the company.
    }

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return { company, people: [...people.values()], filingsRead };
}

export const secEdgarScout = {
  name: "sec-edgar",

  async health() {
    try {
      await fetchJson(SUBMISSIONS.replace("##########", "0000789019"));
      return { ok: true, endpoint: SUBMISSIONS };
    } catch (err) {
      return { ok: false, note: err.message };
    }
  },

  /**
   * @param {string} query Company name or ticker
   * @param {object} options { limit?: number, maxFilings?: number, maxPeople?: number }
   */
  async discover(query, options = {}) {
    const limit = options.limit || 3;
    const matches = await searchCompanies(String(query || "").trim());
    if (matches.length === 0) {
      return { source: "sec-edgar", records: [], note: `No EDGAR match for "${query}"` };
    }

    const records = [];
    const seenCiks = new Set();

    for (const match of matches.slice(0, limit)) {
      // browse-edgar returns one entry per filing form, so the same company can
      // appear several times. Dedupe on CIK before spending requests on it.
      if (seenCiks.has(match.cik)) continue;
      seenCiks.add(match.cik);

      try {
        const { company, people, filingsRead } = await officersFromFilings(match.cik, options);
        records.push({
          domain: company?.domain || null,
          company: company?.name || match.name,
          industry: company?.industry || null,
          employeeRange: company?.employeeRange || null,
          location: company?.location || null,
          description: company?.description || null,
          sourceUrl:
            company?.sourceUrl || `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${match.cik}`,
          people,
          metadata: { ...(company?.metadata || { cik: match.cik }), filingsRead },
        });
      } catch (err) {
        records.push({
          domain: null,
          company: match.name,
          error: err.message,
          sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${match.cik}`,
          people: [],
          metadata: { cik: match.cik },
        });
      }
    }

    return { source: "sec-edgar", records };
  },
};

export { searchCompanies, officersFromFilings, normalizeEdgarName };
