/**
 * Job board scout.
 *
 * Reads public job board APIs to discover companies and their open roles. This
 * is the highest-volume free source for company + domain pairs: an ATS board is
 * a public JSON endpoint a company configures specifically so candidates can
 * find it, and it lists the company's own domain on every posting.
 *
 * Every board here exposes a public JSON API that needs no key. The company slug
 * is guessable from the domain, so a seed domain expands into a company record
 * with open-role signal attached.
 */

const DEFAULT_HEADERS = {
  "User-Agent": "SquidWeaveDiscovery/1.0 (+https://squidweave.ai)",
  Accept: "application/json",
};

// Role signals that indicate a buying function. A company hiring a VP of
// Engineering is a different account than one hiring a barista, and this is the
// cheapest available firmographic signal.
const ROLE_SIGNALS = {
  engineering: /\b(engineer|developer|architect|sre|devops|platform|infrastructure)\b/i,
  sales: /\b(sales|account executive|sdr|bdr|business development|revenue|account manager)\b/i,
  marketing: /\b(marketing|growth|demand gen|brand|content|seo|product marketing)\b/i,
  data: /\b(data|analytics|machine learning|ml |ai |scientist)\b/i,
  security: /\b(security|infosec|appsec|compliance)\b/i,
  leadership: /\b(vp|vice president|head of|director|chief|cto|cfo|coo|cmo)\b/i,
  finance: /\b(finance|accounting|controller|fp&a)\b/i,
  people: /\b(recruit|talent|people|hr|human resources)\b/i,
};

function slugCandidates(domain) {
  const clean = String(domain || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  if (!clean) return [];
  const bare = clean.split(".")[0];
  const noDashes = bare.replace(/-/g, "");
  const noSpaces = bare.replace(/[^a-z0-9]/g, "");
  return [...new Set([bare, noDashes, noSpaces])].filter(Boolean);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function signalsFromRoles(titles) {
  const signals = new Set();
  for (const title of titles) {
    for (const [signal, pattern] of Object.entries(ROLE_SIGNALS)) {
      if (pattern.test(title)) signals.add(signal);
    }
  }
  return [...signals];
}

// ── Per-board adapters ──────────────────────────────────────────
// Each returns { board, url, titles: string[] } or null. Kept as small pure
// functions so adding a board is one entry, not a branch in a chain.

async function lever(slug, domain) {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const data = await fetchJson(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    board: "lever",
    url: `https://jobs.lever.co/${slug}`,
    titles: data.map(job => job.text).filter(Boolean),
    companyName: data[0]?.categories?.team ? undefined : undefined,
    locations: [...new Set(data.map(job => job.categories?.location).filter(Boolean))],
  };
}

async function greenhouse(slug, domain) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  const data = await fetchJson(url);
  if (!data?.jobs || data.jobs.length === 0) return null;
  return {
    board: "greenhouse",
    url: `https://boards.greenhouse.io/${slug}`,
    titles: data.jobs.map(job => job.title).filter(Boolean),
    companyName: data.meta?.companyName || undefined,
    locations: [...new Set(data.jobs.map(job => job.location?.name).filter(Boolean))],
  };
}

async function ashby(slug, domain) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  const data = await fetchJson(url);
  if (!data?.jobs || data.jobs.length === 0) return null;
  return {
    board: "ashby",
    url: `https://jobs.ashbyhq.com/${slug}`,
    titles: data.jobs.map(job => job.title).filter(Boolean),
    locations: [...new Set(data.jobs.map(job => job.location).filter(Boolean))],
  };
}

async function workable(slug, domain) {
  const url = `https://apply.workable.com/api/v1/widget/accounts/${slug}`;
  const data = await fetchJson(url);
  if (!data?.jobs || data.jobs.length === 0) return null;
  return {
    board: "workable",
    url: `https://apply.workable.com/${slug}`,
    titles: data.jobs.map(job => job.title).filter(Boolean),
    locations: [...new Set(data.jobs.map(job => job.location?.city).filter(Boolean))],
  };
}

async function smartrecruiters(slug, domain) {
  const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings`;
  const data = await fetchJson(url);
  if (!data?.content || data.content.length === 0) return null;
  return {
    board: "smartrecruiters",
    url: `https://jobs.smartrecruiters.com/${slug}`,
    titles: data.content.map(job => job.name).filter(Boolean),
    companyName: data.content[0]?.company?.name || undefined,
    locations: [
      ...new Set(
        data.content.map(job => [job.location?.city, job.location?.region].filter(Boolean).join(", ")).filter(Boolean),
      ),
    ],
  };
}

async function recruitee(slug, domain) {
  const url = `https://${slug}.recruitee.com/api/offers/`;
  const data = await fetchJson(url);
  if (!Array.isArray(data?.offers) || data.offers.length === 0) return null;
  return {
    board: "recruitee",
    url: `https://${slug}.recruitee.com`,
    titles: data.offers.map(job => job.title).filter(Boolean),
    locations: [...new Set(data.offers.map(job => job.location).filter(Boolean))],
  };
}

async function jazzhr(slug, domain) {
  const url = `https://api.jazz.co/boards/${slug}`;
  const data = await fetchJson(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    board: "jazzhr",
    url: `https://${slug}.applytojob.com`,
    titles: data.map(job => job.title).filter(Boolean),
  };
}

async function personio(slug, domain) {
  const url = `https://${slug}.jobs.personio.de/xml`;
  const response = await fetch(url, { headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const xml = await response.text();
  const titles = [...xml.matchAll(/<position>[\s\S]*?<name>([\s\S]*?)<\/name>/gi)]
    .map(match => match[1]?.trim())
    .filter(Boolean);
  if (titles.length === 0) return null;
  return { board: "personio", url: `https://${slug}.jobs.personio.de`, titles };
}

const BOARDS = { lever, greenhouse, ashby, workable, smartrecruiters, recruitee, jazzhr, personio };

export const jobBoardScout = {
  name: "job-board",

  async health() {
    // Greenhouse's public board API answers for a known-active company, so a
    // pass proves the JSON path works, not merely that DNS resolved.
    try {
      const data = await fetchJson("https://boards-api.greenhouse.io/v1/boards/stripe/jobs");
      return { ok: Boolean(data?.jobs), endpoint: "https://boards-api.greenhouse.io/v1/boards/stripe/jobs" };
    } catch (err) {
      return { ok: false, note: err.message };
    }
  },

  /**
   * @param {string} domain Company domain. Slugs are derived from it.
   * @param {object} options { boards?: string[] }
   */
  async discover(domain, options = {}) {
    const clean = String(domain || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    if (!clean) return { source: "job-board", records: [] };

    const slugs = slugCandidates(clean);
    const boardNames = options.boards || Object.keys(BOARDS);
    const hits = [];
    const attempts = [];

    for (const slug of slugs) {
      for (const boardName of boardNames) {
        const adapter = BOARDS[boardName];
        if (!adapter) continue;
        attempts.push(`${boardName}:${slug}`);
        try {
          const hit = await adapter(slug, clean);
          if (hit) hits.push({ ...hit, slug });
        } catch {
          // A 404 or timeout on one board is the normal case, not an error.
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    const allTitles = hits.flatMap(hit => hit.titles);
    const companyName = hits.find(hit => hit.companyName)?.companyName || null;
    const locations = [...new Set(hits.flatMap(hit => hit.locations || []))];

    return {
      source: "job-board",
      records: [
        {
          domain: clean,
          company: companyName,
          location: locations[0] || null,
          sourceUrl: hits[0]?.url || `https://${clean}/`,
          people: [],
          metadata: {
            boards: hits.map(hit => ({ board: hit.board, slug: hit.slug, url: hit.url })),
            openRoles: allTitles.length,
            roleSignals: signalsFromRoles(allTitles),
            sampleTitles: allTitles.slice(0, 15),
            locations,
            attempts: attempts.length,
          },
        },
      ],
    };
  },
};

export { BOARDS, slugCandidates, signalsFromRoles };
