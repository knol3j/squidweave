import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STATE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/state.json");

const TEAM_PATHS = [
  "/team", "/about", "/partners", "/people", "/company",
  "/about/team", "/team/partners", "/our-team", "/about-us",
  "/who-we-are", "/leadership", "/about/people", "/about/leadership",
  "/the-team", "/meet-the-team", "/about/the-team",
];

const VC_KEYWORDS = /partner|venture|capital|investor|fund|portfolio|seed|growth|equity|managing|director|principal|associate|analyst/i;

const STOP_WORDS = new Set([
  "the","our","meet","about","team","contact","view","all","filter","sort",
  "get","power","menu","explore","more","expert","news","sign","login",
  "register","password","previous","request","connect","subscribe","search",
  "home","blog","careers","portfolio","companies","resources","events",
  "people","leadership","who","we","are","what","how","why","your",
  "recommended","related","latest","read","watch","listen","follow",
  "submit","email","phone","location","name","title","role","bio",
  "looking","work","job","apply","open","startup","investing","fund",
  "customer","value","institute","wealth","operations","support",
  "strategic","directors","regional","focus","application",
]);

function stripTags(s) {
  return (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function isRealName(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 5 || t.length > 40) return false;
  const parts = t.split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  for (const p of parts) {
    if (p.length < 2) return false;
    if (!/^[A-ZÀ-Ü]/.test(p)) return false;
    if (/[0-9]/.test(p)) return false;
  }
  const lower = t.toLowerCase();
  for (const w of STOP_WORDS) {
    if (lower === w || lower.startsWith(w + " ") || lower.endsWith(" " + w)) return false;
  }
  if (/(?:https?|www\.|\.com|\.org|\.io)/i.test(lower)) return false;
  return true;
}

function unique(arr) {
  return [...new Set(arr)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithTimeout(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SquidWeave/1.0; +https://squidweave.ai)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractTeamPage(html) {
  if (!html || html.length < 500) return null;

  const linkedinUrls = unique([...html.matchAll(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+/gi)].map(m => m[0].replace(/[?#].*$/, "")));
  const twitterUrls = unique([...html.matchAll(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/\w+/gi)].map(m => m[0].replace(/[?#].*$/, "")));

  const names = new Set();
  const peopleWithContext = [];

  function addCandidate(name, linkedIn, contextHtml = "") {
    if (!isRealName(name)) return;
    const key = name.toLowerCase();
    if (names.has(key)) return;
    names.add(key);
    peopleWithContext.push({
      name: name.trim(),
      linkedIn: linkedIn || null,
      _block: contextHtml.slice(0, 600),
    });
  }

  // Strategy 1: Find team member sections by class name
  const teamSectionPatterns = [
    /<(?:div|a|li|article|section)[^>]*\bclass="[^"]*\bteam-member[^"]*"[^>]*>[\s\S]{0,1500}?<\/(?:div|a|li|article|section)>/gi,
    /<(?:div|a|li|article|section)[^>]*\bclass="[^"]*\bteam-member-item[^"]*"[^>]*>[\s\S]{0,1500}?<\/(?:div|a|li|article|section)>/gi,
    /<(?:div|a|li|article|section)[^>]*\bclass="[^"]*\bpartner-card[^"]*"[^>]*>[\s\S]{0,1500}?<\/(?:div|a|li|article|section)>/gi,
    /<(?:div|a|li|article|section)[^>]*\bclass="[^"]*\bperson-card[^"]*"[^>]*>[\s\S]{0,1500}?<\/(?:div|a|li|article|section)>/gi,
    /<(?:div|a|li|article|section)[^>]*\bclass="[^"]*\bmember-card[^"]*"[^>]*>[\s\S]{0,1500}?<\/(?:div|a|li|article|section)>/gi,
  ];

  for (const pattern of teamSectionPatterns) {
    const sections = [...html.matchAll(pattern)];
    for (const section of sections) {
      const secHtml = section[0];

      // Extract name from .name element
      const nameEl = secHtml.match(/<([a-z]+)[^>]*\bclass="[^"]*\bname\b[^"]*"[^>]*>([\s\S]{0,100}?)<\/\1>/i);
      if (nameEl) {
        const name = stripTags(nameEl[2]);
        if (isRealName(name)) {
          const li = linkedinUrls.find(u => secHtml.includes(u)) || null;
          addCandidate(name, li, secHtml);
          continue;
        }
      }

      // Extract name from alt text of image
      const alt = secHtml.match(/alt="([^"]{3,50})"/i);
      if (alt) {
        const name = alt[1].trim();
        if (isRealName(name)) {
          const li = linkedinUrls.find(u => secHtml.includes(u)) || null;
          addCandidate(name, li, secHtml);
          continue;
        }
      }

      // Extract name from data-name attribute
      const dataName = secHtml.match(/data-name="([^"]{3,50})"/i);
      if (dataName) {
        const name = dataName[1].trim().replace(/\b\w/g, c => c.toUpperCase());
        if (isRealName(name)) {
          addCandidate(name, null, secHtml);
          continue;
        }
      }

      // Extract name from aria-label
      const ariaLabel = secHtml.match(/aria-label="([^"]{3,50})"/i);
      if (ariaLabel) {
        const name = ariaLabel[1].trim();
        if (isRealName(name)) {
          addCandidate(name, null, secHtml);
          continue;
        }
      }
    }
  }

  // Strategy 3: Next.js RSC payload with Strapi JSON (500.co pattern)
  // Matches \"name\":\"Name Surname\" in doubly-escaped JSON inside self.__next_f.push()
  const rscNamePattern = /\\"name\\":\\"([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\\"/g;
  const rscRolePattern = /\\"role\\":\\"([^\\"]+)\\"/g;
  const rscLiPattern = /\\"linkedin\\":\\"(https?:[^\\"]+)\\"/g;
  const rscNames = [...html.matchAll(rscNamePattern)];
  const rscRoles = [...html.matchAll(rscRolePattern)];
  const rscLis = [...html.matchAll(rscLiPattern)];
  if (rscNames.length >= 3 && rscNames.length <= 200) {
    const roleIndex = {}, liIndex = {};
    for (let i = 0; i < rscRoles.length; i++) roleIndex[rscRoles[i].index] = rscRoles[i][1];
    for (let i = 0; i < rscLis.length; i++) liIndex[rscLis[i].index] = rscLis[i][1];
    for (const m of rscNames) {
      const name = m[1];
      // Find nearest role after this name (within 800 chars)
      const nearestRole = Object.entries(roleIndex)
        .filter(e => parseInt(e[0]) > m.index && parseInt(e[0]) < m.index + 800)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))[0];
      const nearestLi = Object.entries(liIndex)
        .filter(e => parseInt(e[0]) > m.index && parseInt(e[0]) < m.index + 800)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))[0];
      const role = nearestRole ? nearestRole[1] : null;
      const linkedIn = nearestLi ? nearestLi[1] : null;
      if (isRealName(name)) addCandidate(name, linkedIn, `<rsc>${role || ""}${linkedIn || ""}</rsc>`);
    }
  }

  // Strategy 2: Find names in structured team member links (/team/name-surname)
  if (peopleWithContext.length < 3) {
    const teamLinks = [...html.matchAll(/href="([^"]*\/team\/[a-z]+(?:-[a-z]+)+)[^"]*"/gi)];
    const seenNames = new Set();
    for (const link of teamLinks) {
      const urlPath = link[1];
      const nameSlug = urlPath.split("/").pop();
      const name = nameSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      if (!seenNames.has(name) && isRealName(name)) {
        seenNames.add(name);
        addCandidate(name, null, `<a href="${urlPath}">`);
      }
    }
  }

  return {
    people: peopleWithContext.slice(0, 30),
    linkedinUrls: linkedinUrls.slice(0, 20),
    twitterUrls: twitterUrls.slice(0, 10),
    rawLength: html.length,
  };
}

export async function scrapeFundTeam(domain) {
  const allPeople = [];
  const allLinkedIn = [];
  const allTwitter = [];

  for (const path of TEAM_PATHS) {
    const url = `https://${domain}${path}`;
    const html = await fetchWithTimeout(url);
    if (!html) continue;
    const result = extractTeamPage(html);
    if (!result || result.people.length === 0) continue;
    allPeople.push(...result.people);
    allLinkedIn.push(...result.linkedinUrls);
    allTwitter.push(...result.twitterUrls);
  }

  const seen = new Set();
  const uniquePeople = [];
  for (const p of allPeople) {
    const key = p.name.toLowerCase();
    if (!seen.has(key)) { seen.add(key); uniquePeople.push(p); }
  }

  return {
    people: uniquePeople.slice(0, 30),
    linkedinUrls: [...new Set(allLinkedIn)].slice(0, 20),
    twitterUrls: [...new Set(allTwitter)].slice(0, 10),
  };
}

const DOMAIN_TIMEOUT_MS = 60_000;

async function scrapeWithTimeout(domain, ms = DOMAIN_TIMEOUT_MS) {
  let timer;
  const result = await Promise.race([
    scrapeFundTeam(domain),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Domain timeout after ${ms}ms`)), ms);
    }),
  ]);
  clearTimeout(timer);
  return result;
}

async function tryResolveLinkedIn(name, domain) {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
  if (!slug || slug.length < 3) return null;
  const urls = [
    `https://www.linkedin.com/in/${slug}`,
    `https://linkedin.com/in/${slug}`,
  ];
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "manual" });
      clearTimeout(timer);
      if (res.status === 200 || res.status === 301 || res.status === 302) {
        return url.replace(/^https?:\/\//, "https://");
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function runScrapeEnrichment({ dryRun = false } = {}) {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const contacts = state.sourcedContacts || [];

  const contactIndex = {};
  for (const c of contacts) {
    const domain = c.email?.split("@")[1];
    if (domain && c.sourceMix?.includes("pattern-guess")) {
      if (!contactIndex[domain]) contactIndex[domain] = [];
      contactIndex[domain].push(c);
    }
  }

  const uniqueDomains = Object.keys(contactIndex);
  console.log(`Domains with pattern-guess contacts: ${uniqueDomains.length}`);

  let totalEnriched = 0;
  let totalTimeouts = 0;
  const results = [];

  for (let i = 0; i < uniqueDomains.length; i++) {
    const domain = uniqueDomains[i];
    const domainContacts = contactIndex[domain];
    const skip = domainContacts.every(c => c.enrichmentStatus === "enriched" || c.enrichmentStatus === "scrape-attempted");
    if (skip) {
      console.log(`  [${i + 1}/${uniqueDomains.length}] ${domain} — already enriched, skipping`);
      continue;
    }

    console.log(`  [${i + 1}/${uniqueDomains.length}] ${domain} — scraping...`);

    if (dryRun) {
      results.push({ domain, contactCount: domainContacts.length, scraped: 0 });
      continue;
    }

    let result, timedOut = false;
    try {
      result = await scrapeWithTimeout(domain);
    } catch (err) {
      if (err.message?.includes("Domain timeout")) {
        console.log(`    ⏱ timed out — ${domainContacts.length} contacts marked scrape-attempted`);
        timedOut = true;
        totalTimeouts++;
      } else {
        throw err;
      }
    }

    if (timedOut) {
      for (const c of domainContacts) {
        c.enrichmentStatus = "scrape-attempted";
        c.enrichedAt = new Date().toISOString();
        c.notes = "scrape-timed-out";
      }
      results.push({ domain, contactCount: domainContacts.length, scraped: 0, timedOut: true });
      await sleep(200);
      continue;
    }

    const people = result.people;

    if (people.length === 0) {
      console.log(`    ${domainContacts.length} contacts — no people found`);
      for (const c of domainContacts) {
        if (c.enrichmentStatus !== "enriched") {
          c.enrichmentStatus = "scrape-attempted";
          c.enrichedAt = new Date().toISOString();
        }
      }
      continue;
    }

    console.log(`    found ${people.length} people, ${result.linkedinUrls.length} LinkedIn URLs`);

    for (let pi = 0; pi < Math.min(people.length, domainContacts.length); pi++) {
      const person = people[pi];
      const contact = domainContacts[pi];
      if (!contact) continue;

      const nameParts = person.name.split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");

      contact.firstName = firstName;
      contact.lastName = lastName;
      if (person.linkedIn) contact.linkedinUrl = person.linkedIn;
      if (result.linkedinUrls.length > 0 && !contact.linkedinUrl) {
        contact.linkedinUrl = result.linkedinUrls[Math.min(pi, result.linkedinUrls.length - 1)];
      }
      contact.enrichmentStatus = "enriched";
      contact.enrichedAt = new Date().toISOString();
      contact.confidence = 0.7;
      contact.notes = "scraped-from-website";
      totalEnriched++;
    }

    const matchedCount = Math.min(people.length, domainContacts.length);
    for (const c of domainContacts.slice(matchedCount)) {
      c.enrichmentStatus = "scrape-attempted";
      c.enrichedAt = new Date().toISOString();
    }

    await sleep(400 + Math.random() * 600);

    if ((i + 1) % 10 === 0) {
      const enrichedNow = state.sourcedContacts.filter(c => c.enrichmentStatus === "enriched").length;
      console.log(`  [checkpoint] writing state with ${enrichedNow} enriched contacts...`);
      const cpPath = STATE_PATH + ".tmp";
      fs.writeFileSync(cpPath, JSON.stringify(state, null, 2), "utf8");
      fs.renameSync(cpPath, STATE_PATH);
      const verify = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
      const verifyEnriched = verify.sourcedContacts.filter(c => c.enrichmentStatus === "enriched").length;
      console.log(`  [checkpoint] saved after domain ${i + 1} — verified ${verifyEnriched} enriched in file`);
    }
  }

  console.log(`\nScraping done. Enriched: ${totalEnriched}, Timed out: ${totalTimeouts}`);
  console.log("Resolving LinkedIn URLs for enriched contacts missing them...");

  let linkedInResolved = 0;
  for (const c of contacts) {
    if (c.enrichmentStatus === "enriched" && !c.linkedinUrl && (c.firstName || c.fullName)) {
      const name = c.fullName || `${c.firstName} ${c.lastName || ""}`.trim();
      const domain = c.email?.split("@")[1];
      if (name && domain) {
        const url = await tryResolveLinkedIn(name, domain);
        if (url) {
          c.linkedinUrl = url;
          c.confidence = 0.5;
          linkedInResolved++;
        }
        await sleep(100 + Math.random() * 200);
      }
    }
  }

  console.log(`LinkedIn URLs resolved via name guessing: ${linkedInResolved}`);

  let linkedInResolvedAll = 0;
  for (const c of contacts) {
    if (!c.enrichmentStatus && !c.linkedinUrl && (c.firstName || c.fullName)) {
      const name = c.fullName || `${c.firstName} ${c.lastName || ""}`.trim();
      const domain = c.email?.split("@")[1];
      if (name && domain) {
        const url = await tryResolveLinkedIn(name, domain);
        if (url) {
          c.linkedinUrl = url;
          linkedInResolvedAll++;
        }
        await sleep(100 + Math.random() * 200);
      }
    }
  }
  console.log(`LinkedIn URLs resolved for all other contacts: ${linkedInResolvedAll}`);

  const tmpPath = STATE_PATH + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmpPath, STATE_PATH);

  const verify = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const enrichedCount = verify.sourcedContacts.filter(c => c.enrichmentStatus === "enriched").length;
  const attemptedCount = verify.sourcedContacts.filter(c => c.enrichmentStatus === "scrape-attempted").length;

  console.log("\nDone.");
  console.log(`Enriched: ${enrichedCount}`);
  console.log(`Scrape-attempted (no data): ${attemptedCount}`);
  console.log(`Total SC: ${verify.sourcedContacts.length}`);
  console.log(`Total IR: ${verify.investorRecords.length}`);

  return {
    ok: true,
    domainsScraped: uniqueDomains.length,
    peopleFound: totalEnriched,
    totalSC: verify.sourcedContacts.length,
    enriched: enrichedCount,
    scrapeAttempted: attemptedCount,
  };
}

if (process.argv[1]?.endsWith("scrape-enrichment-engine.mjs")) {
  const dryRun = process.argv.includes("--dry-run");
  runScrapeEnrichment({ dryRun }).catch(err => {
    console.error("Fatal:", err.message);
    process.exit(1);
  });
}
