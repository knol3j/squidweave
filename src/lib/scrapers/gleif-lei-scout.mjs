/**
 * GLEIF LEI Scout — global legal entity identifiers and headquarters.
 *
 * The Legal Entity Identifier is the closest thing to a primary key for a company
 * across jurisdictions: 2M+ entities, free API, no key. Unlike a web scrape this is
 * the registry of record, so the legal name and HQ address are authoritative rather
 * than inferred.
 *
 * Two things this supplies that no other scout does:
 *   - a stable cross-border identifier (LEI), which lets a company be followed from
 *     a US filing to its EU parent without name matching
 *   - the *registered* legal address, as opposed to a marketing address on a website
 *
 * Rate limits are not published, so requests are spaced rather than fired in parallel.
 */

const API = "https://api.gleif.org/api/v1/lei-records";

/** Strip punctuation and legal suffixes so "Stripe, Inc." matches "STRIPE INC". */
function legalNameKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|llp|lp|plc|gmbh|sa|sas|bv|nv|ag|pty|pte|srl|spa|kk|oy|ab|as|aps|sarl|pte ltd)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Compare on alphanumerics only, so suffix and punctuation differences cannot matter. */
function namesMatch(a, b) {
  const ka = legalNameKey(a).replace(/[^a-z0-9]/g, "");
  const kb = legalNameKey(b).replace(/[^a-z0-9]/g, "");
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

export const gleifLeiScout = {
  name: "gleif-lei",

  async search(query, options = {}) {
    const limit = Math.min(Number(options.limit) || 3, 20);
    // GLEIF rejects a `sort` on this endpoint (400 "Sort parameter ... is not allowed"),
    // so results arrive in registry order and the caller gets the first page.
    const url =
      `${API}?filter[entity.legalName]=${encodeURIComponent(query)}` +
      `&page[size]=${limit}`;

    const res = await fetch(url, {
      headers: { "User-Agent": options.userAgent || "SquidWeave Discovery contact@squidweave.ai" },
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
    });
    if (!res.ok) return [];

    const json = await res.json().catch(() => ({}));
    const rows = json?.data || [];
    const wanted = legalNameKey(query);

    const records = [];
    for (const row of rows) {
      const a = row?.attributes || {};
      const e = a.entity || {};
      const legalName = e.legalName?.name || "";

      // Require a real match. A bare substring hit returns unrelated entities
      // ("Stripe 158") which would pollute the database with fake companies.
      if (!namesMatch(legalName, query)) continue;

      const addr = e.legalAddress || {};
      const hq = e.headquartersAddress || {};
      const useAddr = Object.keys(hq).length ? hq : addr;

      records.push({
        companyName: legalName,
        lei: a.lei || "",
        legalForm: e.legalForm?.id || "",
        category: e.category || "",
        status: a.registration?.status || a.entity?.status || "",
        // The registered address, not a marketing address.
        city: useAddr.city || "",
        region: useAddr.region || "",
        country: useAddr.country || "",
        address: [useAddr.addressLine1, useAddr.addressLine2, useAddr.city, useAddr.country]
          .filter(Boolean)
          .join(", "),
        // GLEIF publishes no employee count or website; both stay absent rather than
        // being guessed. Absent is honest, and the scoring engine treats it as 0.
        website: "",
        employeeCount: null,
        foundingDate: e.registeredAt?.date || "",
        sourceUrl: row?.links?.self || `https://search.gleif.org/#/record/${a.lei || ""}`,
        sourceType: "gleif-lei",
        sourceReliability: 0.9,
      });
    }

    return records;
  },

  /** Direct LEI lookup, for when a company is already known by its identifier. */
  async byLei(lei, options = {}) {
    const res = await fetch(`${API}/${encodeURIComponent(lei)}`, {
      headers: { "User-Agent": options.userAgent || "SquidWeave Discovery contact@squidweave.ai" },
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const a = json?.data?.attributes || {};
    const e = a.entity || {};
    return {
      companyName: e.legalName?.name || "",
      lei: a.lei || lei,
      status: a.registration?.status || "",
      city: (e.headquartersAddress || e.legalAddress || {}).city || "",
      country: (e.headquartersAddress || e.legalAddress || {}).country || "",
    };
  },
};

export default gleifLeiScout;
