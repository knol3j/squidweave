#!/usr/bin/env node
/**
 * Daily autonomous OSINT pipeline.
 *
 * Runs without the HTTP server:
 *   1. Loads seed domains from config/osint-seeds.json
 *   2. Creates/updates one campaign per seed category
 *   3. Runs passive recon (pentest-osint + free-sources + vc-sourcing) per domain
 *   4. Scrapes discovered homepages and stores title/description/content
 *   5. Persists everything as research records and investor records
 *
 * Safety:
 *   - Set OSINT_PIPELINE_ENABLED=true to run live. Without it, the script
 *     exits after printing what it would do.
 *   - Only passive tools are used (theHarvester, subfinder, amass -passive).
 *   - Rate-limiting sleeps between domains to avoid hammering targets.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createApp } from "../src/server.mjs";
import { discoverDomains, mapCategory } from "../src/lib/search-discovery.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_PATH = process.env.OSINT_SEEDS_PATH || join(__dirname, "..", "config", "osint-seeds.json");
const ENABLED = String(process.env.OSINT_PIPELINE_ENABLED || "").toLowerCase() === "true";
const DRY_RUN = String(process.env.OSINT_PIPELINE_DRY_RUN || "").toLowerCase() === "true";
const DISCOVER_DOMAINS = String(process.env.OSINT_DISCOVER_DOMAINS || "").toLowerCase() === "true";
const MAX_DOMAINS_PER_SEED = Number.isFinite(Number(process.env.OSINT_MAX_DOMAINS_PER_SEED))
  ? Number(process.env.OSINT_MAX_DOMAINS_PER_SEED)
  : 12;
const DOMAIN_DELAY_MS = Number.isFinite(Number(process.env.OSINT_DOMAIN_DELAY_MS))
  ? Number(process.env.OSINT_DOMAIN_DELAY_MS)
  : 2000;
const SCRAPE_TIMEOUT_MS = Number.isFinite(Number(process.env.OSINT_SCRAPE_TIMEOUT_MS))
  ? Number(process.env.OSINT_SCRAPE_TIMEOUT_MS)
  : 8000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadSeeds() {
  const raw = await readFile(SEEDS_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.seeds || [];
}

async function expandSeedDomains(seed) {
  const shouldDiscover = seed.discover === true || DISCOVER_DOMAINS;
  if (!shouldDiscover) {
    return seed.domains || [];
  }

  const baseDomains = seed.domains || [];
  const searchQuery = seed.discoverQuery || seed.query;
  const category = mapCategory(seed.category);
  const limit = Math.min(
    seed.discoverLimit || seed.limit || 10,
    MAX_DOMAINS_PER_SEED,
  );

  console.log(`  🔍 discovering up to ${limit} ${category} domains for "${searchQuery}"`);
  const discovered = await discoverDomains({ category, query: searchQuery, limit });
  const discoveredDomains = discovered.map(item => item.domain).filter(Boolean);

  const combined = [...baseDomains, ...discoveredDomains];
  const seen = new Set();
  const unique = [];
  for (const domain of combined) {
    const normalized = domain.toLowerCase().trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
    if (unique.length >= MAX_DOMAINS_PER_SEED) break;
  }

  console.log(`  ✅ using ${unique.length} domains (${baseDomains.length} seeded + ${unique.length - baseDomains.length} discovered)`);
  return unique;
}

async function scrapeHomepage(domain) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);
    const response = await fetch(`https://${domain}`, {
      headers: {
        "user-agent": "squidweave-osint/0.1 (+https://localhost)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const html = await response.text();
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
    const description = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim()
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1]?.trim()
      || "";
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    return { ok: true, title, description, text, url: `https://${domain}` };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function runPipeline() {
  console.log(`[osint-pipeline] starting | enabled=${ENABLED} dryRun=${DRY_RUN}`);

  const seeds = await loadSeeds();
  if (seeds.length === 0) {
    console.log("[osint-pipeline] no seeds configured; exiting");
    return;
  }

  if (!ENABLED) {
    console.log(`[osint-pipeline] OSINT_PIPELINE_ENABLED is not set to true. Would process ${seeds.length} seed groups.`);
    for (const seed of seeds) {
      const domains = await expandSeedDomains(seed);
      console.log(`  - ${seed.campaignId}: ${domains.length} domains`);
      for (const domain of domains.slice(0, 8)) {
        console.log(`      → ${domain}`);
      }
      if (domains.length > 8) {
        console.log(`      ... and ${domains.length - 8} more`);
      }
    }
    console.log("[osint-pipeline] set OSINT_PIPELINE_ENABLED=true to run live.");
    return;
  }

  const { engines } = await createApp();
  const { sourceIngestionEngine, store } = engines;

  const summary = { campaigns: 0, domains: 0, records: 0, scraped: 0, errors: [] };

  for (const seed of seeds) {
    const campaign = {
      id: seed.campaignId,
      name: seed.name,
      objective: seed.query || `OSINT: ${seed.category}`,
      category: seed.category,
      lastOsintRunAt: new Date().toISOString(),
    };

    if (!DRY_RUN) {
      await store.upsertCampaign(campaign);
    }
    summary.campaigns += 1;
    const domains = await expandSeedDomains(seed);
    console.log(`[osint-pipeline] campaign ${seed.campaignId} (${domains.length} domains)`);

    for (const domain of domains) {
      summary.domains += 1;
      console.log(`  → recon ${domain}`);

      try {
        const ingestResult = await sourceIngestionEngine.ingestCampaign(seed.campaignId, {
          query: domain,
          limit: seed.limit || 10,
        });
        summary.records += ingestResult.researchRecords?.length || 0;
        console.log(`    ingested ${ingestResult.researchRecords?.length || 0} records`);

        if (seed.scrape) {
          console.log(`  → scrape ${domain}`);
          const page = await scrapeHomepage(domain);
          if (page.ok) {
            summary.scraped += 1;
            if (!DRY_RUN) {
              await store.addResearchRecord({
                campaignId: seed.campaignId,
                targetId: `scrape:${domain}`,
                source: "osint-scrape",
                company: page.title || domain,
                title: page.title || `${domain} homepage`,
                description: page.description || "",
                segment: "website-content",
                region: "global",
                preferredChannel: "email",
                channels: ["email"],
                website: page.url,
                domain,
                fitScore: 0.6,
                intentScore: 0.5,
                recencyScore: 0.8,
                metadata: {
                  sourceUrl: page.url,
                  evidence: [page.title, page.description].filter(Boolean),
                  sourceReliability: 0.7,
                  scrapedText: page.text,
                },
              });
            }
            console.log(`    scraped: ${page.title || "(no title)"}`);
          } else {
            console.log(`    scrape failed: ${page.error}`);
          }
        }
      } catch (error) {
        const msg = `${domain}: ${error.message}`;
        summary.errors.push(msg);
        console.error(`    error: ${msg}`);
      }

      await sleep(DOMAIN_DELAY_MS);
    }
  }

  console.log("[osint-pipeline] summary", {
    campaigns: summary.campaigns,
    domains: summary.domains,
    records: summary.records,
    scraped: summary.scraped,
    errors: summary.errors.length,
  });

  if (summary.errors.length) {
    console.error("[osint-pipeline] errors:", summary.errors);
  }
}

runPipeline()
  .then(() => {
    console.log("[osint-pipeline] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[osint-pipeline] fatal:", err.message);
    process.exit(1);
  });
