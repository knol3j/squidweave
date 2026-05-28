# Scraper Development Sessions

## Goal
Build a free-scraping enrichment engine that gathers contact data (name, title, LinkedIn) from public website sources, replacing the blocked paid-API enrichment waterfall.

## Constraints
- No paid API keys available (Hunter, Apollo, etc.)
- Must use free/public data sources (company website, public search)
- Must integrate with existing `email-enrichment-engine.mjs` interface
- SPA-based sites (a16z, sequoiacap, accel/Sanity, benchmark) load team data client-side via API calls — cannot parse without headless browser

## Status — 2026-05-27

### Done
- Created `/home/gnul/squidweave/src/lib/scrape-enrichment-engine.mjs`
- Strategy 1 (team section class patterns): works for BVP (30), KSL (30), khoslaventures (30)
- Strategy 2 (/team/name-surname URL-path fallback): fallback for sites without class patterns
- Strategy 3 (Next.js RSC/Strapi JSON extraction): added — matches `\"name\":\"...\"` in doubly-escaped JSON from `self.__next_f.push()` payloads, also extracts `\"role\"` and `\"linkedin\"` fields
- 500.co tested: 30 people extracted with roles and LinkedIn URLs
- Wired scraper into email-enrichment-engine.mjs as `huntWithScrape` (first waterfall provider)
- Verified bvp.com unchanged (30 people)

### SPA Sites — No Data
- **a16z.com**: 4.4MB page, non-Next.js framework, team data loaded client-side
- **sequoiacap.com**: 78KB, non-Next.js, team data loaded client-side
- **accel.com**: Uses Next.js RSC but team data comes from Sanity.io CMS via client-side API call
- **benchmark.com**: Returns 395-byte redirect/shell
- **flybridge.com**: 291KB, non-Next.js

### Remaining
- Crunchbase blocks scrapers (5494-byte shell page on all queries)
- Wikipedia has no structured partner lists for most VC firms
- LinkedIn URL extraction limited: only 500.co embeds LinkedIn URLs in its page data

## Extraction Strategies

| # | Strategy | Works For | Method |
|---|---|---|---|
| 1 | Team section class patterns | BVP, KSL, khoslaventures | Class-based section regex + name/title extraction |
| 2 | /team/name URL path | Sites without class patterns | Slug-to-name conversion |
| 3 | Next.js RSC JSON payloads | 500.co | `\"name\":\"...\"` extraction from `__next_f.push()` blocks |
| — | No SPA solution yet | a16z, sequoiacap, accel, etc. | Client-side API fetches; needs headless browser or API reverse-engineering |

## Next Tasks
1. Add Crunchbase free API tier (limited but gives structured data)
2. Add Google search `site:linkedin.com/in "VC Name"` heuristic for LinkedIn URL resolution
3. Run full batch enrichment sweep across all 94 fund domains
4. Clean up duplicate contacts post-enrichment
