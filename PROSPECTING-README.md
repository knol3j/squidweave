# SquidWeave Prospecting Funnel

Find leads, contact info, and company intelligence **without paid APIs**.

## Quick Start

```bash
node scripts/prospect.mjs [description] [keyword] [language]

# Example:
node scripts/prospect.mjs "AI fintech startups" "fintech" "TypeScript"
```

## Architecture

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Source    │ → │   Enrich    │ → │    Score    │ → │   Export    │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
      │                  │                  │                  │
   GitHub API        WHOIS (RDAP)      Custom algo       JSON + CSV
   Web Search        DNS MX check      (0-20 scale)
   DuckDuckGo        Job boards
   Job Boards        Email permute
   Lever/Greenhouse
```

## Free Data Sources

| Source | Data | Rate Limit | Paid? |
|---|---|---|---|
| GitHub REST API | Repos, orgs, languages | 60/hr unauth | No |
| DuckDuckGo HTML | Web search results | Unlimited | No |
| RDAP.org | WHOIS domain data | ~50/day | No |
| DNS MX Lookup | Domain validation | Unlimited | No |
| Job Boards | Hiring intent | Web scrape | No |

## ICP Parameters

```javascript
const icp = {
  description: 'AI crypto mining startups',  // Human-readable target
  keyword: 'crypto mining',                    // Search keyword
  language: 'Python',                         // Primary language
  minStars: 10,                               // Minimum GitHub stars
  preferredLanguages: ['Python','TypeScript','Rust','Go']
};
```

## Output Format

### JSON
`data/prospects/prospects-{timestamp}.json`

```json
{
  generatedAt: '2026-08-23T07:50:00Z',
  count: 10,
  leads: [
    {
      name: 'retentioneering',
      domain: 'retentioneering.com',
      url: 'https://retentioneering.com',
      source: 'github',
      stars: 1000,
      language: 'Python',
      emails: ['founder@retentioneering.com','ceo@retentioneering.com'],
      jobs: { hiring: true, boards: ['workable'], roles: ['Data Engineer'] },
      score: 20
    }
  ]
}
```

### CSV
`data/prospects/prospects-{timestamp}.csv`

| name | domain | url | source | score | emails | hiring | language |
|---|---|---|---|---|---|---|---|
| retentioneering | retentioneering.com | https://... | github | 20 | founder@... | yes | Python |

## Scoring Algorithm (0-20)

| Signal | Points |
|---|---|
| Base confidence | 0-10 (stars/100) |
| Preferred language | +5 |
| 100+ stars | +3 |
| Actively hiring | +4 |
| Valid domain | +2 |
| WHOIS data | +1 |
| Generated emails | +2 |

## Extending

Add a new scraper to `src/lib/scrapers/` and import it in `src/lib/prospecting.mjs`:

```javascript
import { myScout } from './scrapers/my-scout.mjs';

// In ProspectingEngine.run():
const myLeads = await myScout(icp);
```

## Known Limitations

1. DuckDuckGo search times out in some sandbox environments
2. Job board scraper can have false positives
3. Email permutations are generic without real names
4. Large companies may appear in results
5. GitHub unauthenticated rate limit: 60/hour

## License

MIT
