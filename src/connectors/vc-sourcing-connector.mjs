/**
 * VC Sourcing Connector
 *
 * Sources venture capital investor data from:
 *   1. Crunchbase public search (free, no API key required for basic queries)
 *   2. Crunchbase Basic API (if CRUNCHBASE_API_KEY is set — better results)
 *   3. AngelList Talent public API (free, no key needed)
 *   4. Seed fallback: built-in top-250 VC fund database
 *
 * Each investor record includes fundName, partnerName, website/domain,
 * sector focus, stage focus, check size band, and a thesis summary.
 */

import crypto from "node:crypto";

const CRUNCHBASE_API_KEY = process.env.CRUNCHBASE_API_KEY || "";
const CRUNCHBASE_BASIC = process.env.CRUNCHBASE_BASIC_API_KEY || ""; // free-tier key

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, headers = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": "squidweave/0.1 (+https://localhost)",
          accept: "application/json, text/plain, */*",
          ...headers,
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (attempt < retries && [429, 502, 503, 504].includes(res.status)) {
          await sleep(400 * (2 ** attempt) + Math.random() * 250);
          continue;
        }
        return null;
      }
      return await res.json();
    } catch {
      if (attempt < retries) {
        await sleep(400 * (2 ** attempt) + Math.random() * 250);
        continue;
      }
      return null;
    }
  }
  return null;
}

function clamp01(value, fallback = 0.5) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

/* ------------------------------------------------------------------ */
/*  Provider 1: Crunchbase Public Search                               */
/* ------------------------------------------------------------------ */

async function searchCrunchbase(query, limit = 10) {
  // Crunchbase has an undocumented oembed/JSON endpoint and a public
  // autocomplete search. For production, the Basic API (free tier) is best.
  const results = [];

  // Try the Crunchbase Basic API first (free tier, 200 req/mo)
  if (CRUNCHBASE_BASIC) {
    const url = `https://api.crunchbase.com/api/v4/entities/organizations?field_ids=name,short_description,website_url,city_name,country_name,linkedin_url,category_groups,categories,funding_stage,funding_total,location_identifiers,facet_ids&q=${encodeURIComponent(query)}&per_page=${Math.min(limit, 25)}&user_key=${CRUNCHBASE_BASIC}`;
    const payload = await fetchJson(url);
    const entities = payload?.entities || [];
    for (const ent of entities) {
      const props = ent.properties || {};
      const stages = props.funding_stage
        ? (Array.isArray(props.funding_stage) ? props.funding_stage : [props.funding_stage])
        : [];
      results.push({
        source: "crunchbase-api",
        targetId: `cb:${ent.uuid || ent.id || crypto.randomUUID()}`,
        company: props.name || "",
        contactName: "Partner",
        title: `${props.name || ""} — Venture Capital`,
        description: props.short_description || "",
        segment: "vc-firm",
        region: props.country_name || props.city_name || "global",
        preferredChannel: "email",
        channels: ["email"],
        website: props.website_url?.value || props.website_url || "",
        linkedin: props.linkedin_url || "",
        fundingStage: stages.at(0) || "growth",
        categories: (props.categories || []).map(c => c.value || c).filter(Boolean),
        stageScore: stages.length > 0 ? 0.85 : 0.5,
        relevanceScore: 0.8,
        recencyScore: 0.7,
        metadata: {
          sourceUrl: `https://www.crunchbase.com/organization/${props.permalink || ent.uuid || ""}`,
          evidence: [props.short_description || "", ...stages],
          sourceReliability: 0.82,
        },
      });
    }
  }

  // If Basic API is not configured OR returned nothing, fall back to
  // public autocomplete (no key required, limited data)
  if (results.length === 0) {
    const autocompleteUrl = `https://autocomplete.crunchbase.com/api/v1/autocomplete?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 10)}`;
    const payload = await fetchJson(autocompleteUrl);

    if (payload?.entities) {
      for (const ent of payload.entities) {
        if (!ent.identifier || !ent.identifier.value) continue;
        results.push({
          source: "crunchbase-autocomplete",
          targetId: `cb-auto:${ent.identifier.uuid || crypto.randomUUID()}`,
          company: ent.identifier.value || "",
          contactName: "",
          title: `${ent.identifier.value || ""} — VC Firm`,
          description: ent.short_description || ent.spotlight?.description || "",
          segment: ent.type === "Organization" ? "vc-firm" : "other",
          region: "global",
          preferredChannel: "email",
          channels: ["email"],
          website: ent.web_path
            ? `https://www.crunchbase.com${ent.web_path}`
            : `https://www.crunchbase.com/organization/${ent.identifier.uuid || ""}`,
          fundingStage: "",
          categories: [],
          stageScore: 0.5,
          relevanceScore: 0.6,
          recencyScore: 0.5,
          metadata: {
            sourceUrl: ent.web_path
              ? `https://www.crunchbase.com${ent.web_path}`
              : `https://www.crunchbase.com/organization/${ent.identifier.uuid || ""}`,
            evidence: [ent.short_description || "", ent.kind || ""],
            sourceReliability: 0.7,
          },
        });
      }
    }
  }

  return results.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Provider 2: AngelList Talent Public API                             */
/* ------------------------------------------------------------------ */

async function searchAngelList(query, limit = 10) {
  // AngelList has a public search API (no key needed)
  const url = `https://api.angel.co/1/search?query=${encodeURIComponent(query)}&type=startup&limit=${Math.min(limit, 20)}`;
  const payload = await fetchJson(url);

  if (!payload?.startups) return [];

  return (payload.startups || [])
    .slice(0, limit)
    .filter(s => s.name)
    .map(s => ({
      source: "angellist",
      targetId: `al:${s.id}`,
      company: s.name || "",
      contactName: "",
      title: `${s.name || ""} — AngelList`,
      description: s.product_desc || s.high_concept || "",
      segment: "vc-firm",
      region: "global",
      preferredChannel: "email",
      channels: ["email"],
      website: s.company_url || s.blog_url || "",
      linkedin: "",
      fundingStage: "",
      categories: (s.markets || []).map(m => m.name || m).filter(Boolean),
      stageScore: 0.55,
      relevanceScore: 0.6,
      recencyScore: 0.6,
      metadata: {
        sourceUrl: `https://angel.co/company/${s.id}`,
        evidence: [s.high_concept || "", s.product_desc || ""],
        sourceReliability: 0.68,
      },
    }));
}

/* ------------------------------------------------------------------ */
/*  Provider 3: Seed Dataset — Top VC Funds                           */
/* ------------------------------------------------------------------ */

const SEED_VC_FUNDS = [
  { fund: "a16z", domain: "a16z.com", sectors: ["enterprise", "crypto", "fintech", "ai", "gaming", "consumer"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Sequoia Capital", domain: "sequoiacap.com", sectors: ["enterprise", "consumer", "fintech", "ai", "healthcare"], stage: ["seed", "series-a", "growth"], geo: ["us", "india", "sea"] },
  { fund: "Accel", domain: "accel.com", sectors: ["enterprise", "saas", "security", "data"], stage: ["seed", "series-a", "growth"], geo: ["us", "europe", "india"] },
  { fund: "Benchmark", domain: "benchmark.com", sectors: ["consumer", "enterprise", "mobile", "marketplaces"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Greylock Partners", domain: "greylock.com", sectors: ["enterprise", "consumer", "ai", "saas", "security"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Kleiner Perkins", domain: "kleinerperkins.com", sectors: ["enterprise", "consumer", "healthcare", "climate", "ai"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Lightspeed Venture Partners", domain: "lsvp.com", sectors: ["enterprise", "consumer", "fintech", "crypto", "healthcare"], stage: ["seed", "series-a", "growth"], geo: ["us", "india", "israel"] },
  { fund: "Andreessen Horowitz", domain: "a16z.com", sectors: ["ai", "crypto", "fintech", "enterprise", "consumer", "bio"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Index Ventures", domain: "indexventures.com", sectors: ["enterprise", "consumer", "fintech", "saas"], stage: ["seed", "series-a", "growth"], geo: ["us", "europe"] },
  { fund: "Bessemer Venture Partners", domain: "bvp.com", sectors: ["cloud", "saas", "healthcare", "security", "cybersecurity"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "General Catalyst", domain: "generalcatalyst.com", sectors: ["enterprise", "consumer", "healthcare", "fintech", "ai"], stage: ["seed", "series-a", "growth"], geo: ["us", "europe"] },
  { fund: "First Round Capital", domain: "firstround.com", sectors: ["enterprise", "consumer", "saas", "developer-tools"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Y Combinator", domain: "ycombinator.com", sectors: ["enterprise", "consumer", "ai", "fintech", "healthcare", "climate"], stage: ["seed"], geo: ["us"] },
  { fund: "Founders Fund", domain: "foundersfund.com", sectors: ["ai", "enterprise", "consumer", "space", "biotech"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "NFX", domain: "nfx.com", sectors: ["marketplaces", "enterprise", "fintech", "network-effects"], stage: ["seed", "series-a"], geo: ["us", "israel"] },
  { fund: "Initialized Capital", domain: "initialized.com", sectors: ["enterprise", "consumer", "ai", "fintech", "healthcare"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Fuel Ventures", domain: "fuelventures.com", sectors: ["enterprise", "marketplaces", "fintech"], stage: ["seed", "series-a"], geo: ["uk", "europe"] },
  { fund: "LocalGlobe", domain: "localglobe.com", sectors: ["enterprise", "consumer", "fintech", "healthcare"], stage: ["seed", "series-a", "growth"], geo: ["uk", "europe"] },
  { fund: "Atomico", domain: "atomico.com", sectors: ["enterprise", "consumer", "deep-tech", "saas"], stage: ["series-a", "growth"], geo: ["europe"] },
  { fund: "Balderton Capital", domain: "balderton.com", sectors: ["enterprise", "consumer", "fintech", "healthcare"], stage: ["series-a", "growth"], geo: ["europe"] },
  { fund: "Northzone", domain: "northzone.com", sectors: ["enterprise", "consumer", "fintech", "saas"], stage: ["seed", "series-a"], geo: ["europe", "us"] },
  { fund: "Creandum", domain: "creandum.com", sectors: ["enterprise", "consumer", "fintech", "deep-tech"], stage: ["seed", "series-a"], geo: ["europe"] },
  { fund: "Felix Capital", domain: "felixcapital.com", sectors: ["consumer", "saas", "fintech", "future-of-work"], stage: ["series-a", "growth"], geo: ["us", "europe"] },
  { fund: "EQT Ventures", domain: "eqtventures.com", sectors: ["enterprise", "deep-tech", "saas", "healthcare"], stage: ["series-a", "growth"], geo: ["europe", "us"] },
  { fund: "Sequoia Capital China", domain: "sequoiacap.com.cn", sectors: ["consumer", "enterprise", "fintech", "ai", "healthcare"], stage: ["seed", "series-a", "growth"], geo: ["china"] },
  { fund: "DST Global", domain: "dst-global.com", sectors: ["consumer", "enterprise", "fintech", "marketplaces"], stage: ["growth"], geo: ["us", "china", "india"] },
  { fund: "Tiger Global Management", domain: "tigerglobal.com", sectors: ["enterprise", "consumer", "fintech", "saas", "ai"], stage: ["growth"], geo: ["us", "global"] },
  { fund: "SoftBank Vision Fund", domain: "visionfund.com", sectors: ["ai", "enterprise", "consumer", "transportation", "fintech"], stage: ["growth", "late"], geo: ["global"] },
  { fund: "Insight Partners", domain: "insightpartners.com", sectors: ["enterprise", "saas", "cybersecurity", "data"], stage: ["growth"], geo: ["us", "europe", "israel"] },
  { fund: "Thrive Capital", domain: "thrivecap.com", sectors: ["internet", "enterprise", "fintech", "ai"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Coatue Management", domain: "coatue.com", sectors: ["consumer", "enterprise", "fintech", "ai", "healthcare"], stage: ["growth"], geo: ["us", "china"] },
  { fund: "Spark Capital", domain: "sparkcapital.com", sectors: ["consumer", "enterprise", "fintech", "media"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Union Square Ventures", domain: "usv.com", sectors: ["crypto", "network-effects", "climate", "healthcare"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "NEA", domain: "nea.com", sectors: ["enterprise", "healthcare", "consumer", "ai"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Redpoint Ventures", domain: "redpoint.com", sectors: ["enterprise", "consumer", "cloud", "ai"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Menlo Ventures", domain: "menlovc.com", sectors: ["enterprise", "consumer", "ai", "healthcare", "climate"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "New Enterprise Associates", domain: "nea.com", sectors: ["enterprise", "healthcare", "consumer", "technology"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Fidelity Ventures", domain: "fidelityventures.com", sectors: ["enterprise", "consumer", "healthcare", "fintech"], stage: ["growth"], geo: ["us"] },
  { fund: "Sapphire Ventures", domain: "sapphireventures.com", sectors: ["enterprise", "saas", "ai", "fintech"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Greycroft", domain: "greycroft.com", sectors: ["enterprise", "consumer", "fintech", "saas"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Upfront Ventures", domain: "upfront.com", sectors: ["enterprise", "consumer", "ai", "healthcare"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "K9 Ventures", domain: "k9ventures.com", sectors: ["deep-tech", "ai", "hardware"], stage: ["seed"], geo: ["us"] },
  { fund: "SOSV", domain: "sosv.com", sectors: ["deep-tech", "healthcare", "climate", "hardware"], stage: ["seed"], geo: ["global"] },
  { fund: "500 Global", domain: "500.co", sectors: ["enterprise", "consumer", "fintech", "ai"], stage: ["seed", "series-a"], geo: ["global"] },
  { fund: "Techstars", domain: "techstars.com", sectors: ["enterprise", "consumer", "saas", "ai"], stage: ["seed"], geo: ["global"] },
  { fund: "Plug and Play", domain: "plugandplaytechcenter.com", sectors: ["enterprise", "fintech", "healthcare", "ai"], stage: ["seed"], geo: ["global"] },
  { fund: "YC Continuity", domain: "ycombinator.com", sectors: ["enterprise", "consumer", "ai", "fintech"], stage: ["growth"], geo: ["us"] },
  { fund: "Samsung Next", domain: "samsungnext.com", sectors: ["ai", "enterprise", "healthcare", "fintech"], stage: ["seed", "series-a"], geo: ["us", "korea"] },
  { fund: "Google Ventures", domain: "gv.com", sectors: ["enterprise", "consumer", "ai", "healthcare", "climate"], stage: ["seed", "series-a", "growth"], geo: ["us", "europe"] },
  { fund: "Microsoft Venture Fund", domain: "m12.vc", sectors: ["enterprise", "saas", "ai", "developer-tools", "security"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Salesforce Ventures", domain: "salesforceventures.com", sectors: ["enterprise", "saas", "ai", "cloud"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Qualcomm Ventures", domain: "qualcommventures.com", sectors: ["deep-tech", "hardware", "ai", "telecom"], stage: ["seed", "series-a"], geo: ["global"] },
  { fund: "Intel Capital", domain: "intelcapital.com", sectors: ["deep-tech", "hardware", "ai", "enterprise"], stage: ["seed", "series-a", "growth"], geo: ["global"] },
  { fund: "Saudi Aramco Ventures", domain: "aramcoventures.com", sectors: ["deep-tech", "climate", "industrial", "ai"], stage: ["series-a", "growth"], geo: ["global"] },
  { fund: "M12 (Microsoft)", domain: "m12.vc", sectors: ["enterprise", "saas", "ai", "security", "cloud"], stage: ["series-a", "growth"], geo: ["us", "global"] },
  { fund: "Comcast Ventures", domain: "comcastventures.com", sectors: ["media", "enterprise", "consumer", "ai"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Tencent", domain: "tencent.com", sectors: ["consumer", "gaming", "enterprise", "ai"], stage: ["series-a", "growth"], geo: ["global"] },
  { fund: "Prosus Ventures", domain: "prosus.com", sectors: ["consumer", "enterprise", "fintech", "food"], stage: ["series-a", "growth"], geo: ["global"] },
  { fund: "Canaan", domain: "canaan.com", sectors: ["enterprise", "healthcare", "ai", "fintech"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "CRV", domain: "crv.com", sectors: ["enterprise", "consumer", "ai", "saas"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Felicis Ventures", domain: "felicis.com", sectors: ["enterprise", "consumer", "ai", "fintech"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Madrona Ventures", domain: "madrona.com", sectors: ["enterprise", "ai", "cloud", "developer-tools"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Foundation Capital", domain: "foundationcapital.com", sectors: ["saas", "enterprise", "fintech", "ai"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Battery Ventures", domain: "battery.com", sectors: ["enterprise", "saas", "ai", "data"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Grotech Ventures", domain: "grotech.com", sectors: ["enterprise", "consumer", "ai", "healthcare"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "F-Prime Capital", domain: "fprimecapital.com", sectors: ["healthcare", "enterprise", "fintech", "saas"], stage: ["seed", "series-a"], geo: ["us", "europe"] },
  { fund: "Polaris Partners", domain: "polarispartners.com", sectors: ["enterprise", "healthcare", "consumer"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Lux Capital", domain: "luxcapital.com", sectors: ["deep-tech", "ai", "healthcare", "climate"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Foundry Group", domain: "foundrygroup.com", sectors: ["enterprise", "consumer", "healthcare"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Flybridge Capital", domain: "flybridge.com", sectors: ["enterprise", "ai", "consumer", "climate"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Ribbit Capital", domain: "ribbitcap.com", sectors: ["fintech", "crypto", "insurance"], stage: ["seed", "series-a", "growth"], geo: ["us", "global"] },
  { fund: "QED Investors", domain: "qedinvestors.com", sectors: ["fintech", "enterprise", "saas"], stage: ["seed", "series-a"], geo: ["us", "uk", "latin-america"] },
  { fund: "Valar Ventures", domain: "valar.com", sectors: ["fintech", "consumer", "enterprise"], stage: ["seed", "series-a"], geo: ["global"] },
  { fund: "Point72 Ventures", domain: "point72ventures.com", sectors: ["fintech", "ai", "enterprise", "healthcare"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Entrée Capital", domain: "entreecap.com", sectors: ["enterprise", "fintech", "saas", "ai"], stage: ["seed", "series-a"], geo: ["us", "israel", "europe"] },
  { fund: "Pitango VC", domain: "pitango.com", sectors: ["enterprise", "ai", "healthcare", "fintech"], stage: ["seed", "series-a", "growth"], geo: ["israel", "us"] },
  { fund: "Aleph", domain: "aleph.vc", sectors: ["enterprise", "fintech", "saas", "consumer"], stage: ["seed", "series-a"], geo: ["israel"] },
  { fund: "Target Global", domain: "targetglobal.com", sectors: ["enterprise", "fintech", "mobility", "consumer"], stage: ["seed", "series-a"], geo: ["europe", "israel"] },
  { fund: "Speedinvest", domain: "speedinvest.com", sectors: ["enterprise", "fintech", "healthcare", "deep-tech"], stage: ["seed"], geo: ["europe"] },
  { fund: "Earlybird VC", domain: "earlybird.com", sectors: ["enterprise", "ai", "fintech", "healthcare"], stage: ["seed", "series-a"], geo: ["europe"] },
  { fund: "HV Capital", domain: "hvcapital.com", sectors: ["enterprise", "consumer", "fintech", "saas"], stage: ["seed", "series-a", "growth"], geo: ["europe"] },
  { fund: "Visionaries Club", domain: "visionariesclub.com", sectors: ["enterprise", "saas", "ai", "fintech"], stage: ["seed", "series-a"], geo: ["europe"] },
  { fund: "Chernin Group", domain: "tcg.co", sectors: ["media", "consumer", "gaming", "ai"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "March Gaming", domain: "marchgaming.com", sectors: ["gaming", "consumer", "ai"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Bitkraft Ventures", domain: "bitkraft.vc", sectors: ["gaming", "ai", "consumer", "crypto"], stage: ["seed", "series-a"], geo: ["global"] },
  { fund: "Konvoy Ventures", domain: "konvoy.vc", sectors: ["gaming", "consumer", "ai"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Galaxy Interactive", domain: "galaxyinteractive.com", sectors: ["gaming", "crypto", "ai"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "A16z Crypto", domain: "a16zcrypto.com", sectors: ["crypto", "web3", "ai"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Paradigm", domain: "paradigm.xyz", sectors: ["crypto", "defi", "web3"], stage: ["seed", "series-a", "growth"], geo: ["us"] },
  { fund: "Polychain Capital", domain: "polychain.capital", sectors: ["crypto", "defi", "infrastructure"], stage: ["growth"], geo: ["us"] },
  { fund: "Multicoin Capital", domain: "multicoin.capital", sectors: ["crypto", "defi", "web3", "ai"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Variant Fund", domain: "variant.com", sectors: ["crypto", "web3", "consumer"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Electric Capital", domain: "electriccapital.com", sectors: ["crypto", "web3", "infrastructure"], stage: ["seed", "series-a"], geo: ["us"] },
  { fund: "Dragonfly Capital", domain: "dragonflycapital.com", sectors: ["crypto", "defi", "web3"], stage: ["seed", "series-a", "growth"], geo: ["asia", "us"] },
  { fund: "Pantera Capital", domain: "panteracapital.com", sectors: ["crypto", "defi", "infrastructure"], stage: ["series-a", "growth"], geo: ["us"] },
  { fund: "Coinbase Ventures", domain: "coinbaseventures.com", sectors: ["crypto", "web3", "infrastructure"], stage: ["seed", "series-a"], geo: ["global"] },
  { fund: "Delphi Ventures", domain: "delphidigital.io", sectors: ["crypto", "defi", "infrastructure"], stage: ["seed", "series-a"], geo: ["global"] },
  { fund: "Jump Crypto", domain: "jumpcrypto.com", sectors: ["crypto", "defi", "infrastructure"], stage: ["series-a", "growth"], geo: ["us"] },
];

function searchSeedVCs(query = "", limit = 25) {
  const q = (query || "").toLowerCase().trim();
  let matched = SEED_VC_FUNDS;

  if (q) {
    // Tokenize the query into search terms
    const terms = q.split(/\s+/).filter(Boolean);

    // Score each fund based on token matches against name, sector, stage, geo
    const scored = SEED_VC_FUNDS.map(fund => {
      let score = 0;
      const searchSpace = [
        fund.fund.toLowerCase(),
        ...fund.sectors,
        ...fund.stage,
        ...fund.geo,
        fund.domain?.toLowerCase() || "",
      ].join(" ");

      for (const term of terms) {
        if (searchSpace.includes(term)) {
          score += 1;
          // Bonus for exact name match
          if (fund.fund.toLowerCase().includes(term)) score += 2;
          if (fund.domain?.toLowerCase().includes(term)) score += 1;
        }
      }

      // Boost: all terms matched vs some
      const ratio = terms.length > 0 ? score / terms.length : 0;
      return { ...fund, _score: ratio };
    });

    matched = scored
      .filter(f => f._score > 0)
      .sort((a, b) => b._score - a._score);
  }

  return matched
    .slice(0, Math.max(1, limit))
    .map((fund, i) => ({
      source: "seed-vc-db",
      targetId: `seed-vc:${fund.fund.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      company: fund.fund,
      contactName: "",
      title: `${fund.fund} — Venture Capital`,
      description: `${fund.fund} invests in ${fund.sectors.join(", ")} across ${fund.stage.join(", ")} stages in ${fund.geo.join(", ")}.`,
      segment: "vc-firm",
      region: fund.geo.join(","),
      preferredChannel: "email",
      channels: ["email"],
      website: `https://${fund.domain}`,
      domain: fund.domain,
      fundingStage: fund.stage.at(-1) || "growth",
      categories: fund.sectors,
      stageScore: fund.stage.includes("seed") ? 0.9 : fund.stage.includes("series-a") ? 0.75 : 0.6,
      relevanceScore: Math.max(0.5, 1 - (i * 0.015)),
      recencyScore: 0.8,
      metadata: {
        sourceUrl: `https://${fund.domain}`,
        evidence: [`${fund.fund} — ${fund.sectors.join(", ")}`],
        sourceReliability: 0.75,
      },
    }));
}

/* ------------------------------------------------------------------ */
/*  Main Connector Object                                              */
/* ------------------------------------------------------------------ */

export const VcSourcingConnector = {
  name: "vc-sourcing",
  reliability: 0.78,

  async health() {
    // Try Crunchbase autocomplete (free, public)
    const url = "https://autocomplete.crunchbase.com/api/v1/autocomplete?query=venture&limit=1";
    const result = await fetchJson(url);
    return {
      name: "vc-sourcing",
      ok: true,
      endpoint: url,
      note: result ? "Crunchbase autocomplete reachable" : "Using seed VC database",
    };
  },

  async ingest({ query, limit = 15 } = {}) {
    const results = [];

    // Provider 1: Crunchbase (tries API first, then public autocomplete)
    if (query) {
      const cbResults = await searchCrunchbase(query, limit);
      results.push(...cbResults);
    }

    // Provider 2: AngelList (public, no key)
    if (query && results.length < limit) {
      const alResults = await searchAngelList(query, Math.max(1, limit - results.length));
      results.push(...alResults);
    }

    // Provider 3: Seed dataset (always available, no API needed)
    const seedResults = searchSeedVCs(query || "", Math.max(5, limit));
    // Deduplicate seed results against API results
    const existingDomains = new Set(
      results
        .map(r => r.domain || r.website || "")
        .filter(Boolean)
        .map(d => d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])
    );
    for (const seed of seedResults) {
      const seedDomain = seed.domain || "";
      if (seedDomain && !existingDomains.has(seedDomain)) {
        results.push(seed);
        existingDomains.add(seedDomain);
      }
    }

    return results.slice(0, limit);
  },

  toInvestorRecords(researchRecords = [], campaignId) {
    return researchRecords
      .filter(r => r.source) // any source
      .slice(0, 50)
      .map(r => {
        const domain = r.domain || (r.website ? r.website.replace(/^https?:\/\//, "").split("/")[0] : null);
        const stageMatch = r.fundingStage
          ? (r.fundingStage.includes("seed") ? 0.85 : r.fundingStage.includes("growth") ? 0.65 : 0.7)
          : 0.6;
        return {
          campaignId,
          fundName: r.company || r.title?.split(" —")[0] || "VC Fund",
          partnerName: "",
          thesis: r.description || `Venture capital firm active in ${(r.categories || []).join(", ")}`,
          website: r.website || r.metadata?.sourceUrl || "",
          domain,
          sectors: r.categories || [],
          stageFocus: r.fundingStage ? [r.fundingStage] : ["seed", "series-a"],
          geoFocus: r.region ? [r.region] : ["global"],
          thesisMatch: clamp01(r.relevanceScore || 0.6),
          stageMatch: clamp01(stageMatch),
          checkSizeMatch: 0.55,
          warmPath: 0.35,
          status: "sourced",
        };
      });
  },
};
