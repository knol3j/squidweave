/**
 * CourtListener RECAP Scout — federal litigation signals.
 *
 * RECAP is the free public archive of US federal court dockets and filings, maintained
 * by the Free Law Project. No key, no fee, no rate limit worth respecting at our volume.
 *
 * Why litigation belongs in a B2B database at all: it is a *timing* signal. A company
 * being sued for IP infringement is shopping for counsel and often re-platforming; a
 * company that just won a large judgment is solvent and spending. Neither shows up in
 * headcount or funding data, so this is a genuinely different input, not a duplicate.
 *
 * The party-name search is deliberately fuzzy and therefore noisy — a search for
 * "Stripe" returns cases involving unrelated entities. Records carry the raw case name
 * and the matched party so a human can judge, and `confidence` stays low because the
 * association is inferred rather than confirmed.
 */

const API = "https://www.courtlistener.com/api/rest/v4/search/";

export const courtListenerScout = {
  name: "court-listener",

  async search(query, options = {}) {
    const limit = Math.min(Number(options.limit) || 10, 30);
    const url =
      `${API}?q=${encodeURIComponent(`"${query}"`)}&type=o` +
      `&order_by=score%20desc&highlight=off`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": options.userAgent || "SquidWeave Discovery contact@squidweave.ai",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(options.timeoutMs || 25000),
    });
    if (!res.ok) return [];

    const json = await res.json().catch(() => ({}));
    const results = json?.results || [];
    const needle = String(query).toLowerCase();

    const records = [];
    for (const r of results.slice(0, limit)) {
      const caseName = String(r.caseName || "").trim();
      if (!caseName) continue;

      // Confirm the query actually appears in the case name or caption. Without this
      // the API's relevance ranking leaks in loosely-related cases.
      const hay = `${caseName} ${r.caption || ""}`.toLowerCase();
      if (!hay.includes(needle)) continue;

      records.push({
        caseName,
        docketNumber: r.docketNumber || "",
        court: r.court || "",
        courtId: r.court_id || "",
        dateFiled: r.dateFiled || "",
        // 'o' is the RECAP opinion type; dockets and filings are separate endpoints.
        documentType: r.type || "opinion",
        snippet: String(r.snippet || "").replace(/<[^>]+>/g, "").slice(0, 300),
        judge: r.judge || "",
        sourceUrl: r.absolute_url
          ? `https://www.courtlistener.com${r.absolute_url}`
          : `https://www.courtlistener.com/?q=${encodeURIComponent(query)}`,
        sourceType: "court-listener",
        // Low on purpose: a party-name hit is a lead, not a confirmed relationship.
        sourceReliability: 0.6,
      });
    }

    return records;
  },

  /**
   * Summarise a set of litigation records into signals the scoring engine can read.
   *
   * Litigation is only worth scoring when it is recent — a 2017 case says nothing about
   * today's budget. Anything older than `recentYears` is counted but not treated as a
   * live trigger.
   */
  summarize(records, options = {}) {
    const recentYears = Number(options.recentYears) || 3;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - recentYears);
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    const total = records.length;
    const recent = records.filter(r => (r.dateFiled || "") >= cutoffIso).length;
    const courts = [...new Set(records.map(r => r.court).filter(Boolean))];
    const latest = records
      .map(r => r.dateFiled || "")
      .filter(Boolean)
      .sort()
      .at(-1) || null;

    return {
      litigationTotal: total,
      litigationRecent: recent,
      litigationCourts: courts.slice(0, 5),
      litigationLatest: latest,
      // A live signal needs recency AND more than an isolated dispute.
      hasLitigationSignal: recent > 0,
      signalStrength: Math.min(1, recent / 5),
    };
  },
};

export default courtListenerScout;
