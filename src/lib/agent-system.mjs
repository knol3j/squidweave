export const AGENT_DEFINITIONS = [
  { id: "ClientIntake", label: "Client Intake", stage: "Intake", description: "Captures the client brief, scope, constraints, and success criteria.", outcome: "Aligned mandate" },
  { id: "OfferArchitect", label: "Offer Architect", stage: "Strategy", description: "Shapes the core value proposition, offer ladder, and positioning.", outcome: "Offer clarity" },
  { id: "BrandStrategist", label: "Brand Strategist", stage: "Strategy", description: "Maintains voice, differentiators, category framing, and messaging hierarchy.", outcome: "Consistent narrative" },
  { id: "CreativeDirector", label: "Creative Director", stage: "Design", description: "Orchestrates visual direction, asset briefs, and campaign aesthetics.", outcome: "Creative cohesion" },
  { id: "LandingPageArchitect", label: "Landing Page Architect", stage: "Design", description: "Maps page structure, conversion paths, proofs, and CTA sequencing.", outcome: "Conversion-ready pages" },
  { id: "SeoMapper", label: "SEO Mapper", stage: "Acquisition", description: "Builds keyword clusters, content gaps, and search opportunity maps.", outcome: "Search coverage" },
  { id: "AudienceResearch", label: "Audience Research", stage: "Research", description: "Translates ICPs into persona clusters, jobs-to-be-done, and triggers.", outcome: "Audience model" },
  { id: "IntentMiner", label: "Intent Miner", stage: "Research", description: "Finds live demand, urgency signals, and timing windows from research inputs.", outcome: "Demand signals" },
  { id: "DataEnrichment", label: "Data Enrichment", stage: "Research", description: "Normalizes firmographic, technographic, and contact-level details.", outcome: "Enriched records" },
  { id: "SegmentScorer", label: "Segment Scorer", stage: "Research", description: "Ranks target segments by fit, intent, recency, and reach.", outcome: "Prioritized segments" },
  { id: "ChannelPlanner", label: "Channel Planner", stage: "Planning", description: "Selects acquisition and nurture channels per segment and offer.", outcome: "Channel mix" },
  { id: "ListHygiene", label: "List Hygiene", stage: "Planning", description: "Removes bad targets, stale contacts, and risky outreach paths.", outcome: "Clean pipeline" },
  { id: "Copywriter", label: "Copywriter", stage: "Outreach", description: "Generates lifecycle copy for ads, email, social, and follow-up sequences.", outcome: "Execution-ready copy" },
  { id: "Personalization", label: "Personalization", stage: "Outreach", description: "Injects segment, account, and persona-specific context into messaging.", outcome: "Higher relevance" },
  { id: "OutboundOrchestrator", label: "Outbound Orchestrator", stage: "Outreach", description: "Schedules outreach cadences and channel sequencing across targets.", outcome: "Coordinated campaigns" },
  { id: "AdOperator", label: "Ad Operator", stage: "Acquisition", description: "Controls paid distribution setup, routing, and budget-aware deployment.", outcome: "Paid activation" },
  { id: "SocialPublisher", label: "Social Publisher", stage: "Acquisition", description: "Packages and schedules social assets against channel-specific formats.", outcome: "Social throughput" },
  { id: "SalesHandoff", label: "Sales Handoff", stage: "Sales", description: "Packages qualified intent and context for direct sales follow-up.", outcome: "Faster conversion" },
  { id: "PipelineManager", label: "Pipeline Manager", stage: "Sales", description: "Tracks reply states, objections, meetings, and deal-stage transitions.", outcome: "Deal momentum" },
  { id: "OnboardingGuide", label: "Onboarding Guide", stage: "Retention", description: "Builds the first-value journey after acquisition or closed-won handoff.", outcome: "Adoption velocity" },
  { id: "RetentionOperator", label: "Retention Operator", stage: "Retention", description: "Watches churn signals, expansion signals, and reactivation triggers.", outcome: "Lower churn" },
  { id: "ExpansionPlanner", label: "Expansion Planner", stage: "Retention", description: "Designs upsell, cross-sell, and advocacy motions from usage and feedback.", outcome: "Revenue expansion" },
  { id: "AnalyticsWatch", label: "Analytics Watch", stage: "Measurement", description: "Collects outcome signals and keeps the brain grounded in observed data.", outcome: "Reliable telemetry" },
  { id: "ExperimentLab", label: "Experiment Lab", stage: "Measurement", description: "Turns performance gaps into controlled tests and winner promotion rules.", outcome: "Learning loops" },
  { id: "ComplianceSentinel", label: "Compliance Sentinel", stage: "Governance", description: "Checks claims, tone, channel risk, and operational guardrails.", outcome: "Safer execution" },
];

export const AGENT_IDS = AGENT_DEFINITIONS.map(agent => agent.id);

export const AGENT_STAGES = [...new Set(AGENT_DEFINITIONS.map(agent => agent.stage))];

export function getAgentsByStage(stage) {
  return AGENT_DEFINITIONS.filter(agent => agent.stage === stage);
}

export function getAgentById(id) {
  return AGENT_DEFINITIONS.find(agent => agent.id === id);
}