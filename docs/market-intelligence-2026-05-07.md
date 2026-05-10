# Market Intelligence Ingest

Date: `2026-05-07`
Campaign: `main-campaign`

## Summary

This ingest seeded LocaleWeave's memory layer with externally sourced market signals for:

- DACH B2B tech/SaaS decision-makers
- Brazil B2B tech/SaaS decision-makers
- Global review/comparison-intent software buyers
- Enterprise shortlist-stage buyers
- AI-personalization-ready marketing teams
- Global localization-opportunity planning

The records were written into [data/state.json](C:/Users/Nweec/.lmstudio/projects/marketing-autopilot/data/state.json) as `researchRecords`, then consolidated into `targetProfiles` and `tacticObservations`.

## Source Signals

### LinkedIn B2B Benchmark 2025
Source:
- https://www.linkedin.com/business/marketing/blog/marketing-collective/2025-b2b-marketing-benchmar-the-video-influence-effect-starts-with-trust
- https://www.linkedin.com/business/marketing/blog/content-marketing/b2b-influencer-video
- https://www.linkedin.com/business/marketing/blog/linkedin-ads/b2b-creator-marketing-linkedin

Signals used:
- `94%` of B2B marketers say trust is key to success
- `78%` of B2B marketers use video
- `82%` of B2B buyers say creator content influences buying decisions
- `59%` of B2B buyers consume creator content on LinkedIn
- `79%` engage with creator content at least monthly

Operational implication:
- Trust-first LinkedIn/video/creator outreach is a strong initial route for DACH and Brazil B2B tech/SaaS segments

### TrustRadius Review Quality Report 2025
Source:
- https://solutions.trustradius.com/vendor-blog/building-buyer-trust-review-quality-report-2025/

Signals used:
- `73%` of organic traffic visited reviews, pricing, and competitive comparisons
- `56%` of buyers planned to make a purchase within 3 months

Operational implication:
- Mid-funnel buyers should be routed to proof-heavy assets: comparisons, pricing clarity, demos, and reviews

### TrustRadius Shortlist Research 2025
Source:
- https://solutions.trustradius.com/vendor-blog/how-vendors-can-get-on-buyers-shortlists/
- https://solutions.trustradius.com/vendor-blog/bridging-the-trust-gap-b2b-tech-buying-in-the-age-of-ai/

Signals used:
- average shortlist size `2.6`
- `79%` knew the product before starting research
- `89%` for enterprise buyers
- `82%` had a top product in mind when shortlisting
- `72%` determined decision criteria before making a shortlist
- channel usage: `77%` Google, `52%` vendor website, `29%` YouTube, `25%` TrustRadius

Operational implication:
- Enterprise targets require pre-research mindshare and self-serve proof, not generic outbound alone

### HubSpot Marketing Trends 2026
Source:
- https://blog.hubspot.com/marketing/hubspot-blog-marketing-industry-trends-report

Signals used:
- `93.2%` say personalized or segmented experiences led to more leads and purchases
- `93.8%` say lead quality improved
- `86.4%` of marketing teams use AI in at least a few areas
- only `65%` say they have high-quality audience data
- only `12.6%` use hyper-personalization

Operational implication:
- AI-enabled personalization buyers are strong prospects, especially when messaging addresses data-quality and orchestration gaps

### CSA Language Opportunity
Source:
- https://csa-research.com/

Signals used:
- just `17` languages each control at least `1%` of global online GDP

Operational implication:
- localization expansion should be prioritized, not sprayed broadly across low-opportunity languages

## Current Memory Result

After consolidation:

- `6` target profiles
- `20` tactic observations
- `0` promoted playbooks

No playbooks were promoted yet because there are no real `outreachEvents` or `analyticsEvents` proving repeat success or failure.

## Next Data Needed

To move from research memory to procedural skill memory, ingest:

- `outreachEvents`
- `analyticsEvents`
- localized asset performance by segment/channel
- follow-up outcomes such as `open`, `click`, `reply`, `positive_reply`, `unsubscribe`, `meeting_booked`

Once those exist, the memory engine can promote trusted channel/cadence playbooks automatically.
