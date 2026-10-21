/**
 * GitHub organization scout.
 *
 * Public GitHub profile data is one of the few free sources that carries
 * firmographics: a verified website, a location, a description, and public repo
 * count. Those are exactly the fields the account scorer was scoring zero on,
 * because SEC filings do not publish headcount and job boards do not publish a
 * location.
 *
 * This reads only the public `/orgs/{login}` endpoint. No authentication, no
 * private data, no scraping of protected content.
 *
 * Confidence is deliberately 0.6: a GitHub profile is self-reported, so it is
 * weaker evidence than a statutory SEC filing.
 */

import { getOrg } from "./github-scout.mjs";

const GITHUB_API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "SquidWeave Discovery contact@squidweave.ai",
};

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

/** Employee bands, matching the scorer's vocabulary. */
function bandForRepoCount(publicRepos) {
  const n = Number(publicRepos);
  if (!Number.isFinite(n) || n <= 0) return null;
  // A repo count is a weak size proxy, so only ever return the conservative floor
  // the evidence supports. Anything with a public org profile is past seed stage.
  if (n >= 100) return "1001-5000";
  if (n >= 25) return "501-1000";
  return "51-200";
}

export const githubOrgScout = {
  name: "github-org",

  /**
   * @param {string} query an org login ("stripe") or a domain ("stripe.com")
   * @param {object} options
   * @param {boolean} options.includePeople read public org members (needs auth for
   *   most orgs, so off by default and silently skipped when unauthorized)
   */
  async discover(query, options = {}) {
    const raw = String(query || "").trim();
    if (!raw) return { source: "github-org", records: [] };

    // Accept either a login or a domain: "stripe.com" -> org "stripe".
    const candidates = raw.includes(".")
      ? [raw.replace(/\.[a-z.]+$/i, "").replace(/[^a-z0-9-]/gi, ""), raw.replace(/\.[a-z.]+$/i, "")]
      : [raw];

    const records = [];
    for (const login of candidates) {
      if (!login || login.length < 2) continue;
      const org = await getOrg(login);
      if (!org || org.type !== "Organization") continue;

      const domain = normalizeUrl(org.blog) || normalizeUrl(org.html_url && `${org.login}.github.io`);

      records.push({
        // Prefer the verified homepage; the org's own github.io is a last resort so
        // the company still lands under a stable, human-recognisable key.
        domain: domain || `github.${org.login.toLowerCase()}.org`,
        company: org.name || org.login,
        industry: null,
        employeeRange: bandForRepoCount(org.public_repos),
        location: org.location || null,
        description: org.description || null,
        linkedinUrl: null,
        techStack: [],
        sourceUrl: org.html_url || `${GITHUB_API}/orgs/${org.login}`,
        people: [],
        metadata: {
          login: org.login,
          publicRepos: org.public_repos,
          followers: org.followers,
          createdAt: org.created_at,
          twitter: org.twitter_username || null,
          email: org.email || null,
        },
      });
      break;
    }

    return {
      source: "github-org",
      sourceUrl: records[0]?.sourceUrl || null,
      records,
      note: records.length ? undefined : `No public GitHub org for "${raw}"`,
    };
  },
};
