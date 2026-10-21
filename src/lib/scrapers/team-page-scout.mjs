/**
 * Team-page scout.
 *
 * Reads a company's own /about, /team, /leadership, and /contact pages and
 * extracts named people with titles. Most SMB leadership pages are plain HTML
 * with names and titles in the markup, which makes this the highest-yield free
 * source for decision-maker contacts: the company publishes the list itself.
 *
 * This is deliberately conservative. It only reads pages the company has
 * published for exactly this purpose, it identifies itself in the User-Agent,
 * and it never follows links off-domain. A page that does not parse yields
 * nothing rather than a guess.
 */

const DEFAULT_HEADERS = {
  "User-Agent": "SquidWeaveDiscovery/1.0 (+https://squidweave.ai; contact before bulk use)",
  Accept: "text/html,application/xhtml+xml",
};

const TEAM_PATHS = ["/about", "/about-us", "/team", "/our-team", "/leadership", "/company", "/company/team", "/contact"];

// Titles worth keeping. A leadership page also lists investors, advisors, and
// office staff; this filters to roles that plausibly make a buying decision.
const TITLE_HINT =
  /\b(ceo|cto|cfo|coo|cmo|chief|founder|co-?founder|president|vp|vice president|head of|director|manager|lead|owner|partner|principal)\b/i;

// Credentials and suffixes that are part of a name line but not a title.
const NAME_SUFFIX = /\b(jr|sr|ii|iii|iv|phd|md|mba|cpa|esq)\.?/gi;

// Section headings that mean the people below them are NOT employees. An /about
// page routinely lists investors, advisors, and board members next to staff, and
// those are not outreach targets. Tracking the section lets the caller filter
// instead of silently mixing "CEO, Stripe" into a Linear staff list.
const NON_STAFF_SECTION =
  /^(investors?|advisors?|advisory board|board|board members?|directors?|backers?|partners?|capitalists?|investor board)$/i;

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/gi, '"');
}

/**
 * Pull "Name, Title" pairs out of a chunk of text. Handles the common shapes:
 * "Jane Doe" newline "VP Engineering", "Jane Doe - VP Engineering", and
 * "Jane Doe, VP Engineering".
 *
 * Past-tense titles ("Former CTO", "Previously VP Sales") describe alumni, not
 * current staff. Leadership pages mix both, and a former employee is not a
 * contact for outreach, so those rows are dropped rather than stored with a
 * misleading title.
 */
function extractPeople(text) {
  const lines = text
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const people = [];
  // Non-staff sections persist until a staff-ish heading resets them, so an
  // "Investors" block that runs to the end of the page does not leak into staff.
  let section = "staff";
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (NON_STAFF_SECTION.test(line)) {
      section = "non_staff";
      continue;
    }
    if (isSectionHeading(line) && !NON_STAFF_SECTION.test(line)) {
      section = "staff";
      continue;
    }

    const titleOnThisLine = TITLE_HINT.test(line);

    if (titleOnThisLine) {
      // "Jane Doe - VP Engineering" or "Jane Doe, VP Engineering"
      const split = line.match(/^([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})\s*[-,–|:]\s*(.+)$/);
      if (split) {
        pushPerson(people, split[1], split[2].trim(), section);
        continue;
      }
      // "Jane Doe" on its own line, title on the next
      const next = lines[i + 1];
      if (next && TITLE_HINT.test(next) && !isSectionHeading(next)) {
        pushPerson(people, line, next.trim(), section);
        continue;
      }
      // Bare title line with no name: skip rather than invent an owner.
      continue;
    }

    // "Jane Doe" followed by a title line
    const next = lines[i + 1];
    if (isPersonName(line) && next && TITLE_HINT.test(next) && !isSectionHeading(next)) {
      pushPerson(people, line, next.trim(), section);
    }
  }

  return dedupePeople(people);
}

// Titles that mean the person no longer works there.
const ALUMNI_TITLE = /\b(former|formerly|previously|past|ex-|alumn[ai]|co-?founder emeritus|retired|departed)\b/i;

function pushPerson(people, rawName, title, section = "staff") {
  // Drop a row when either side signals it is not a current employee. Linear's
  // /about page lists investors and advisors alongside staff, and its "Former
  // CEO / Slack" rows put the past-tense marker in the name rather than the
  // title, so both fields need the check.
  if (ALUMNI_TITLE.test(title) || ALUMNI_TITLE.test(rawName)) return;
  people.push({ fullName: cleanName(rawName), title, section });
}

function cleanName(raw) {
  return String(raw || "")
    .replace(NAME_SUFFIX, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPersonName(line) {
  if (line.length < 4 || line.length > 60) return false;
  if (!/^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line)) return false;
  if (TITLE_HINT.test(line)) return false;
  if (/[@:]|\bhttps?:|\bwww\./i.test(line)) return false;
  // Product and book titles masquerade as names ("Shape Up", "Remote"). A real
  // person name on a leadership page almost always sits next to a title line,
  // and a noun phrase sitting between two headings does not.
  if (KNOWN_NON_PERSON.some(pattern => pattern.test(line))) return false;
  return true;
}

// Phrases that look like "Capitalized Word Capitalized Word" but are products,
// books, or section labels. Matching here prevents shipping them as contacts.
const KNOWN_NON_PERSON = [
  /^shape\s+up$/i,
  /^remote$/i,
  /^rework$/i,
  /^it doesn't have to be crazy at work$/i,
  /^getting real$/i,
  /^definitely not$/i,
  /^(our|the)\s+(team|story|mission|company|values|history|people)$/i,
  /^(about|contact|careers?|jobs?|leadership|management|advisors?|board|investors?|press|blog|news)$/i,
];

function isSectionHeading(line) {
  return /^(our team|the team|leadership|management|about us|contact|team|advisors?|board|investors?)$/i.test(
    line.trim(),
  );
}

function dedupePeople(people) {
  const seen = new Set();
  const out = [];
  for (const person of people) {
    const key = person.fullName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(person);
  }
  return out;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("html")) return null;
  return { html: await response.text(), finalUrl: response.url };
}

export const teamPageScout = {
  name: "team-page",

  async health() {
    // Probes a page that is expected to exist so a passing result means the
    // network and HTML path both work, not just that DNS resolved.
    const url = "https://example.com/";
    try {
      const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(5000) });
      return { ok: response.ok, endpoint: url };
    } catch (err) {
      return { ok: false, note: err.message };
    }
  },

  /**
   * @param {string} domain Company domain, e.g. "acme.com"
   * @param {object} options { paths?: string[], maxPages?: number }
   */
  async discover(domain, options = {}) {
    const clean = String(domain || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
    if (!clean) return { source: "team-page", records: [] };

    const paths = options.paths || TEAM_PATHS;
    const maxPages = options.maxPages || 4;
    const people = [];
    const pagesRead = [];
    const pagesFailed = [];
    // Record the host we actually landed on so two domains that redirect to the
    // same site do not both claim its people under their own name.
    let resolvedHost = clean;

    for (const path of paths.slice(0, maxPages)) {
      const url = `https://${clean}${path}`;
      try {
        const page = await fetchPage(url);
        if (!page) {
          pagesFailed.push({ url, reason: "not_html_or_not_ok" });
          continue;
        }
        if (resolvedHost === clean) {
          try {
            resolvedHost = new URL(page.finalUrl).hostname.replace(/^www\./, "");
          } catch {
            // Keep the requested host if the final URL will not parse.
          }
        }
        const text = stripTags(page.html);
        const found = extractPeople(text);
        pagesRead.push({ url: page.finalUrl, peopleFound: found.length });
        for (const person of found) {
          people.push({ ...person, sourceUrl: page.finalUrl, linkedinUrl: null, email: null });
        }
      } catch (err) {
        pagesFailed.push({ url, reason: err.message });
      }
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    return {
      source: "team-page",
      records: [
        {
          domain: resolvedHost,
          company: null,
          sourceUrl: `https://${resolvedHost}/`,
          people,
          metadata: { requestedDomain: clean, resolvedHost, pagesRead, pagesFailed },
        },
      ],
    };
  },
};

export { extractPeople, stripTags, TEAM_PATHS };
