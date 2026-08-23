# Prospecting Funnel Build Plan

## Objective
Build a Node.js prospecting system that discovers companies, enriches them with contact info and intel, scores them, and exports results — all without Apollo/ZoomInfo/Clearbit or other paid SaaS.

## Architecture

### 5-Stage Pipeline
| Stage | Module | Free Data Source |
|---|---|---|
| Source | GitHub + Web Search | GitHub REST API (60/hr), DuckDuckGo HTML |
| Extract | Company Parser | Homepage extraction, domain parsing |
| Enrich | WHOIS + Jobs + Email | RDAP.org, Lever/Greenhouse/Workable, DNS MX |
| Score | Lead Scorer | Custom algorithm (0-20) |
| Export | JSON + CSV | File system |

### File Structure
```
src/lib/
  prospecting.mjs          — Main engine (orchestrates pipeline)
  scrapers/
    github-scout.mjs        — GitHub API repo search, org extraction
    search-scout.mjs        — DuckDuckGo/Bing HTML scraping
    whois-scout.mjs         — RDAP WHOIS lookups
    jobpost-scout.mjs       — Job board intent scraping
    email-permutator.mjs    — Email pattern generation + MX validation

scripts/
  prospect.mjs             — CLI entry point

data/prospects/            — Output directory
```

## Stage 1: Source (GitHub)
**Goal:** Find companies matching ICP via public GitHub repos.

**ICP Parameters:**
- `keyword`: search term (e.g., "crypto mining")
- `language`: primary language (e.g., "Python")
- `minStars`: minimum stars threshold (default 10)
- `industry`: sector tag

**API:** `GET https://api.github.com/search/repositories?q={query}&sort=updated&order=desc`
- Query format: `language:Python stars:>10 crypto mining`
- Rate limit: 60/hr unauthenticated, 5000/hr with PAT

**Extraction:**
- Filter repos where `owner.type === 'Organization'`
- Extract: org name, stars, language, topics, homepage URL
- Deduplicate by org name

## Stage 2: Source (Web Search)
**Goal:** Supplement GitHub results with DuckDuckGo search.

**API:** `https://html.duckduckgo.com/html/?q={query}`
- Parse result titles and URLs
- Extract domains, deduplicate against GitHub results

## Stage 3: Enrich (Domain Intel)
**Goal:** Validate domains and gather registration data.

**WHOIS via RDAP:**
- `GET https://rdap.org/domain/{domain}`
- Extract: registrar, creation date, expiry

**MX Validation:**
- `dns.resolveMx(domain)` via Node.js built-in
- Confirms domain has mail servers (email deliverability signal)

## Stage 4: Enrich (Hiring Signals)
**Goal:** Detect active hiring as a growth/intent signal.

**Job Boards to Check:**
- Lever: `https://jobs.lever.co/{company}`
- Greenhouse: `https://boards.greenhouse.io/{company}`
- Workable: `https://apply.workable.com/{company}`
- Ashby: `https://jobs.ashbyhq.com/{company}`

**Extraction:**
- Scrape job titles from each board
- Classify: engineering, sales, marketing
- Signal: `hiring: true/false`, `boards: []`, `roles: []`

## Stage 5: Enrich (Email Discovery)
**Goal:** Generate likely email addresses without paid APIs.

**Permutation Engine (8 patterns):**
- `first@domain` (e.g., john@company.com)
- `last@domain` (e.g., smith@company.com)
- `first.last@domain` (e.g., john.smith@company.com)
- `flast@domain` (e.g., jsmith@company.com)
- `firstl@domain` (e.g., johns@company.com)
- `first_last@domain` (e.g., john_smith@company.com)
- `f.last@domain` (e.g., j.smith@company.com)
- `last.first@domain` (e.g., smith.john@company.com)

**Validation:**
- MX check before generating (skip if no mail servers)
- Optional: scrape company website for emails matching domain

## Stage 6: Scoring
**Goal:** Rank leads by fit (0-20 scale).

| Signal | Weight |
|---|---|
| Base confidence (stars/100, max 10) | 0-10 |
| Language matches ICP preference | +5 |
| 100+ stars | +3 |
| Actively hiring | +4 |
| Valid domain (MX pass) | +2 |
| WHOIS data available | +1 |
| Emails generated | +2 |
| **Max** | **20** |

## Stage 7: Export
**Goal:** Save results in JSON + CSV.

**JSON:** Full object with all fields
**CSV:** Flattened: name, domain, url, source, score, emails, hiring, language

## CLI Interface
```bash
node scripts/prospect.mjs [description] [keyword] [language]

# Examples:
node scripts/prospect.mjs "AI crypto mining startups" "crypto mining" "Python"
node scripts/prospect.mjs "AI fintech" "fintech" "TypeScript"
```

## Testing Plan
1. Run with `crypto mining` query
2. Verify 10+ companies found
3. Check enrichment (WHOIS, jobs, emails)
4. Validate scoring sorts correctly
5. Confirm JSON + CSV exports

## No-Paid-API Guarantee
| Feature | Paid Alternative | Our Free Replacement |
|---|---|---|
| Company DB | Apollo, ZoomInfo | GitHub + Web search |
| Contact info | Clearbit, Hunter.io | Email permutations + MX |
| Firmographics | Crunchbase | WHOIS + GitHub metadata |
| Intent data | Bombora | Job board scraping |
