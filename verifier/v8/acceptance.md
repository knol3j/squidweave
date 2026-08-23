# Acceptance Criteria v8 — Prospecting Funnel

**Date:** 2026-08-23
**Status:** COMPLETE — Prospecting funnel built and tested

## What Was Built

A 4-stage prospecting funnel that finds leads, contact info, and company intelligence without paid APIs.

### Architecture

| Component | File | Purpose |
|---|---|---|
| Main Engine | `src/lib/prospecting.mjs` | Orchestrates sourcing, enrichment, scoring, export |
| GitHub Scout | `src/lib/scrapers/github-scout.mjs` | Finds companies by tech stack, language, stars |
| Search Scout | `src/lib/scrapers/search-scout.mjs` | Web search via DuckDuckGo |
| WHOIS Scout | `src/lib/scrapers/whois-scout.mjs` | Domain registration intel via RDAP |
| Job Post Scout | `src/lib/scrapers/jobpost-scout.mjs` | Hiring intent from job boards |
| Email Permutator | `src/lib/scrapers/email-permutator.mjs` | Generates email patterns without paid APIs |
| CLI | `scripts/prospect.mjs` | Command-line interface |

### Free Data Sources Used

| Source | Data | Rate Limit | Paid? |
|---|---|---|---|
| GitHub REST API | Repos, orgs, languages, stars | 60/hr unauth | No |
| DuckDuckGo HTML | Web search results | ~unlimited | No |
| RDAP.org | WHOIS domain data | ~50/day | No |
| Lever/Greenhouse/Workable/Ashby | Job postings | Web scrape | No |
| DNS MX lookup | Domain validation | Unlimited | No |

### Test Results (2026-08-23 07:45Z)

**Query:** `language:Python stars:>10 mining`

**Results:**
- 10 unique companies found
- 6 with valid domains
- 5 with generated email permutations
- All enriched with hiring signals
- Exported to JSON + CSV

**Top leads:**
1. retentioneering (retentioneering.com) — Score 20/20
2. process-intelligence-solutions (processintelligence.solutions) — Score 20/20
3. QuipNetwork (quip.network) — Score 20/20
4. facebookresearch — Score 15/20
5. MiraGeoscience (mirageoscience.com) — Score 14/20

### Known Limitations

1. Web search (DuckDuckGo) times out in sandbox environment — works on local machine
2. Job board scraper has false positives — needs stricter matching
3. Email permutations are generic without real first/last names
4. Large companies (Microsoft, Facebook) can appear in results
5. GitHub unauth rate limit: 60/hour

### Acceptance Criteria Checklist

- [x] Can find 10+ companies matching a given ICP
- [x] Can enrich leads with domain + email permutations
- [x] Can score leads by fit (0-20 scale)
- [x] Outputs to JSON + CSV
- [x] Runs in < 5 minutes for a single ICP query
- [x] No paid API keys required
- [x] Modular scraper architecture for extensibility

### Usage

```bash
node scripts/prospect.mjs [description] [keyword] [language]

# Example:
node scripts/prospect.mjs "AI startups" "machine learning" "Python"
```

### Next Improvements

1. Add LinkedIn public profile scraper
2. Add Crunchbase free tier integration
3. Add Hunter.io free tier for email verification
4. Filter out Fortune 500 companies
5. Add company size estimation from employee count APIs

## Difference from v7

v7 documented VC outreach execution. v8 introduces the prospecting funnel module.
