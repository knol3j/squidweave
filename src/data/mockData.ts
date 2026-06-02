import type {
  Campaign,
  Connector,
  ResearchRecord,
  AnalyticsEvent,
  OutreachEvent,
  Target,
  Investor,
  ContentVariant,
  ABTest,
  ExecutionReceipt,
  DLQEntry,
  Playbook,
  TacticScore,
  ConsolidationEvent,
  KnowledgeNode,
  KnowledgeEdge,
  Stage,
} from '@/types';

export const initialStages: Stage[] = [
  { id: 0, name: 'Setup', status: 'active', accent: '#6366f1' },
  { id: 1, name: 'Ingest', status: 'locked', accent: '#06b6d4' },
  { id: 2, name: 'Decide', status: 'locked', accent: '#f59e0b' },
  { id: 3, name: 'Create', status: 'locked', accent: '#f43f5e' },
  { id: 4, name: 'Send', status: 'locked', accent: '#10b981' },
  { id: 5, name: 'Learn', status: 'locked', accent: '#8b5cf6' },
];

export const campaign: Campaign = {
  id: 'camp-001',
  name: 'Global SaaS Expansion',
  objective: 'Expand market presence in DACH and LATAM regions by targeting revenue leaders at mid-market SaaS companies. Drive 50+ qualified demo bookings through personalized outbound.',
  channel: 'multi-channel',
  locales: ['de-DE', 'pt-BR', 'en-US'],
  audience: 'Revenue leaders at mid-market SaaS',
  offer: 'Book a 20 min pipeline audit',
  theme: 'Professional urgency with localized cultural hooks',
  palette: ['#6366f1', '#06b6d4', '#f59e0b', '#f43f5e', '#10b981', '#8b5cf6'],
  guidelines: 'Use concise subject lines. Reference company-specific growth signals. Always include localized social proof. CTA above the fold.',
  contentAngles: ['Pipeline velocity', 'Revenue retention', 'Expansion revenue', 'CAC efficiency'],
  modules: [
    { id: 'm1', name: 'Prospect Research', enabled: true },
    { id: 'm2', name: 'Decision Engine', enabled: true },
    { id: 'm3', name: 'Content Studio', enabled: true },
    { id: 'm4', name: 'Outreach Hub', enabled: true },
    { id: 'm5', name: 'Memory Palace', enabled: false },
    { id: 'm6', name: 'Safety Center', enabled: true },
    { id: 'm7', name: 'Funding Radar', enabled: false },
    { id: 'm8', name: 'A/B Testing', enabled: true },
  ],
  active: true,
};

export const connectors: Connector[] = [
  {
    id: 'c1',
    name: 'OpenClaw',
    status: 'ready',
    mode: 'Reddit Scraper',
    baseUrl: 'https://api.openclaw.io/v1',
    health: 4,
    lastPull: '2024-01-15T09:30:00Z',
  },
  {
    id: 'c2',
    name: 'Clawdbot',
    status: 'dry-run',
    mode: 'Twitter/X Scraper',
    baseUrl: 'https://api.clawdbot.io/v2',
    health: 2,
    lastPull: '2024-01-14T16:45:00Z',
  },
  {
    id: 'c3',
    name: 'MoltBot',
    status: 'live',
    mode: 'Google/Blog Scraper',
    baseUrl: 'https://api.moltbot.io/v1',
    health: 5,
    lastPull: '2024-01-15T11:00:00Z',
  },
];

export const researchRecords: ResearchRecord[] = [
  { id: 'r1', company: 'Salesforce', segment: 'Enterprise CRM', region: 'en-US', fitScore: 92, intentScore: 88, recencyScore: 95, notes: 'Hiring 50+ SDRs, expanding DACH office', sourceUrl: 'https://salesforce.com/careers', evidence: ['Job postings', 'Press release'] },
  { id: 'r2', company: 'HubSpot', segment: 'Mid-Market CRM', region: 'en-US', fitScore: 85, intentScore: 72, recencyScore: 80, notes: 'Launched new revenue ops product line', sourceUrl: 'https://hubspot.com/products', evidence: ['Product launch'] },
  { id: 'r3', company: 'SAP', segment: 'Enterprise ERP', region: 'de-DE', fitScore: 78, intentScore: 65, recencyScore: 70, notes: 'Partner ecosystem expansion in Berlin', sourceUrl: 'https://sap.com/partners', evidence: ['Partner blog'] },
  { id: 'r4', company: 'Zoho', segment: 'SMB Suite', region: 'en-US', fitScore: 45, intentScore: 30, recencyScore: 40, notes: 'Focus on India market, low DACH presence', sourceUrl: 'https://zoho.com/about', evidence: ['Annual report'] },
  { id: 'r5', company: 'Pipedrive', segment: 'Sales CRM', region: 'de-DE', fitScore: 88, intentScore: 82, recencyScore: 90, notes: 'Strong Berlin presence, hiring AEs', sourceUrl: 'https://pipedrive.com/jobs', evidence: ['Job board', 'LinkedIn'] },
  { id: 'r6', company: 'Monday.com', segment: 'Work OS', region: 'en-US', fitScore: 76, intentScore: 70, recencyScore: 75, notes: 'Expanding enterprise segment', sourceUrl: 'https://monday.com/enterprise', evidence: ['Blog post'] },
  { id: 'r7', company: 'Notion', segment: 'Collaboration', region: 'en-US', fitScore: 68, intentScore: 55, recencyScore: 60, notes: 'AI features launch, enterprise push', sourceUrl: 'https://notion.so/ai', evidence: ['Feature launch'] },
  { id: 'r8', company: 'Aircall', segment: 'Cloud Phone', region: 'de-DE', fitScore: 82, intentScore: 78, recencyScore: 85, notes: 'Paris-based, strong DACH telephony market', sourceUrl: 'https://aircall.io', evidence: ['Market analysis'] },
  { id: 'r9', company: 'Gong', segment: 'Revenue Intel', region: 'en-US', fitScore: 95, intentScore: 92, recencyScore: 98, notes: 'Perfect ICP — revenue intelligence leader', sourceUrl: 'https://gong.io', evidence: ['Product fit', 'Funding news'] },
  { id: 'r10', company: 'Outreach', segment: 'Sales Engage', region: 'en-US', fitScore: 90, intentScore: 85, recencyScore: 88, notes: 'SEQUOIA backed, expanding to EU', sourceUrl: 'https://outreach.io', evidence: ['Funding', 'Job posts'] },
  { id: 'r11', company: 'Pipefy', segment: 'Workflow BPM', region: 'pt-BR', fitScore: 72, intentScore: 68, recencyScore: 74, notes: 'Brazilian SaaS, expanding to US', sourceUrl: 'https://pipefy.com', evidence: ['Press release'] },
  { id: 'r12', company: 'Hotmart', segment: 'Digital Products', region: 'pt-BR', fitScore: 55, intentScore: 42, recencyScore: 50, notes: 'Consumer focus, less B2B fit', sourceUrl: 'https://hotmart.com', evidence: ['Market analysis'] },
];

function generateAnalyticsEvents(): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const types: Array<'impression' | 'click' | 'conversion'> = ['impression', 'click', 'conversion'];
  const weights = [0.7, 0.2, 0.1];
  for (let i = 0; i < 20; i++) {
    const rand = Math.random();
    let typeIdx = 0;
    let cum = 0;
    for (let j = 0; j < weights.length; j++) {
      cum += weights[j];
      if (rand < cum) { typeIdx = j; break; }
    }
    const type = types[typeIdx];
    events.push({
      id: `ae-${i}`,
      type,
      value: type === 'impression' ? Math.floor(Math.random() * 500 + 100) : type === 'click' ? Math.floor(Math.random() * 50 + 10) : Math.floor(Math.random() * 10 + 1),
      timestamp: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      campaignId: 'camp-001',
    });
  }
  return events;
}

export const analyticsEvents: AnalyticsEvent[] = generateAnalyticsEvents();

function generateOutreachEvents(): OutreachEvent[] {
  const channels = ['email', 'linkedin', 'twitter'];
  const types: Array<'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced'> = ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'];
  const targets = ['Salesforce', 'HubSpot', 'Pipedrive', 'Gong', 'Outreach', 'SAP', 'Aircall', 'Monday.com'];
  const events: OutreachEvent[] = [];
  for (let i = 0; i < 15; i++) {
    events.push({
      id: `oe-${i}`,
      targetId: `t-${i % 8}`,
      targetName: targets[i % 8],
      type: types[i % 6],
      channel: channels[i % 3],
      timestamp: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
      campaignId: 'camp-001',
    });
  }
  return events;
}

export const outreachEvents: OutreachEvent[] = generateOutreachEvents();

export const targets: Target[] = [
  { id: 't0', company: 'Gong', segment: 'Revenue Intel', score: 96, recommendedChannel: 'Email', status: 'ranked', lastTouch: '2024-01-10', nextTouch: '2024-01-18' },
  { id: 't1', company: 'Outreach', segment: 'Sales Engage', score: 91, recommendedChannel: 'LinkedIn', status: 'ranked', lastTouch: '2024-01-12', nextTouch: '2024-01-20' },
  { id: 't2', company: 'Salesforce', segment: 'Enterprise CRM', score: 88, recommendedChannel: 'Email', status: 'ranked', lastTouch: '2024-01-08', nextTouch: '2024-01-16' },
  { id: 't3', company: 'Pipedrive', segment: 'Sales CRM', score: 85, recommendedChannel: 'LinkedIn', status: 'ranked', lastTouch: '2024-01-11', nextTouch: '2024-01-19' },
  { id: 't4', company: 'Aircall', segment: 'Cloud Phone', score: 80, recommendedChannel: 'Email', status: 'ranked', lastTouch: '2024-01-09', nextTouch: '2024-01-17' },
  { id: 't5', company: 'HubSpot', segment: 'Mid-Market CRM', score: 77, recommendedChannel: 'Twitter', status: 'ranked', lastTouch: '2024-01-13', nextTouch: '2024-01-21' },
  { id: 't6', company: 'Monday.com', segment: 'Work OS', score: 73, recommendedChannel: 'Email', status: 'ranked', lastTouch: '2024-01-07', nextTouch: '2024-01-15' },
  { id: 't7', company: 'Pipefy', segment: 'Workflow BPM', score: 68, recommendedChannel: 'LinkedIn', status: 'enriched', lastTouch: '2024-01-14', nextTouch: '2024-01-22' },
];

export const investors: Investor[] = [
  { id: 'i1', name: 'Sarah Chen', firm: 'Accel Partners', thesisMatch: 90, stageMatch: 85, checkSizeMatch: 80, warmPath: 75, overallScore: 83, status: 'meeting' },
  { id: 'i2', name: 'Marcus Webb', firm: 'Bessemer VP', thesisMatch: 85, stageMatch: 90, checkSizeMatch: 85, warmPath: 60, overallScore: 81, status: 'responded' },
  { id: 'i3', name: 'Elena Rossi', firm: 'Index Ventures', thesisMatch: 80, stageMatch: 75, checkSizeMatch: 90, warmPath: 70, overallScore: 79, status: 'contacted' },
  { id: 'i4', name: 'David Park', firm: 'Sequoia Capital', thesisMatch: 95, stageMatch: 80, checkSizeMatch: 75, warmPath: 50, overallScore: 77, status: 'qualified' },
  { id: 'i5', name: 'Lisa Mueller', firm: 'Point Nine', thesisMatch: 75, stageMatch: 85, checkSizeMatch: 70, warmPath: 85, overallScore: 78, status: 'responded' },
  { id: 'i6', name: 'James Wright', firm: 'a16z', thesisMatch: 70, stageMatch: 70, checkSizeMatch: 80, warmPath: 65, overallScore: 71, status: 'contacted' },
  { id: 'i7', name: 'Ana Silva', firm: 'Monashees', thesisMatch: 65, stageMatch: 80, checkSizeMatch: 65, warmPath: 90, overallScore: 74, status: 'qualified' },
  { id: 'i8', name: 'Klaus Weber', firm: 'Target Global', thesisMatch: 80, stageMatch: 65, checkSizeMatch: 75, warmPath: 70, overallScore: 73, status: 'sourced' },
];

export const contentVariants: ContentVariant[] = [
  { id: 'cv1', locale: 'de-DE', subject: 'Steigern Sie Ihre Pipeline-Geschwindigkeit', body: 'Hallo {{name}},\n\nich habe gesehen, dass {{company}} gerade sein DACH-Team ausbaut. Revenue-Teams, die mit uns arbeiten, steigern ihre Pipeline-Geschwindigkeit um durchschnittlich 34 %.\n\nMöchten Sie in einem kurzen 20-minütigen Gespräch herausfinden, wo der größte Hebel in Ihrem Funnel liegt?', cta: 'Termin buchen', status: 'approved' },
  { id: 'cv2', locale: 'de-DE', subject: 'Ihr Wachstum in DACH — ein Gespräch wert?', body: 'Guten Tag {{name}},\n\n{{company}} wächst stark im DACH-Raum. Unsere Pipeline-Audits helfen Revenue-Leadern wie Ihnen, Engpässe zu identifizieren und Conversion-Raten zu optimieren.\n\nHaben Sie 20 Minuten nächste Woche?', cta: 'Audit anfordern', status: 'draft' },
  { id: 'cv3', locale: 'pt-BR', subject: 'Acelere seu funil de vendas', body: 'Olá {{name}},\n\nVi que {{company}} está expandindo na América Latina. Times de revenue que usam nossa metodologia aumentam a velocidade do pipeline em 34% em média.\n\nQue tal uma conversa de 20 minutos para mapear oportunidades no seu funil?', cta: 'Agendar conversa', status: 'approved' },
  { id: 'cv4', locale: 'pt-BR', subject: 'Crescimento em LATAM — vamos conversar?', body: 'Oi {{name}},\n\nA expansão da {{company}} no Brasil é impressionante. Nossos audits de pipeline ajudam líderes de revenue a identificar gargalos e otimizar taxas de conversão.\n\nTem 20 minutos na próxima semana?', cta: 'Solicitar audit', status: 'draft' },
  { id: 'cv5', locale: 'en-US', subject: 'Your pipeline has untapped potential', body: 'Hi {{name}},\n\nI noticed {{company}} is scaling its revenue team. Teams that run our pipeline audits typically identify 30%+ velocity improvements within the first 30 days.\n\nWorth a 20-minute conversation to find your biggest lever?', cta: 'Book a time', status: 'approved' },
  { id: 'cv6', locale: 'en-US', subject: 'Revenue leaders are auditing their funnels', body: 'Hi {{name}},\n\n{{company}}\'s growth trajectory caught my eye. Our 20-minute pipeline audits help revenue leaders like you spot bottlenecks and optimize conversion rates across the entire funnel.\n\nOpen to a brief chat next week?', cta: 'Get audit', status: 'sent' },
];

export const abTests: ABTest[] = [
  {
    id: 'ab1',
    name: 'Subject Line: Velocity vs. Curiosity',
    status: 'running',
    variants: ['cv1', 'cv2'],
    winner: null,
    startDate: '2024-01-10',
    results: [
      { variantId: 'cv1', impressions: 450, clicks: 68, conversions: 12 },
      { variantId: 'cv2', impressions: 440, clicks: 52, conversions: 8 },
    ],
  },
  {
    id: 'ab2',
    name: 'CTA: Book vs. Request Audit',
    status: 'completed',
    variants: ['cv5', 'cv6'],
    winner: 'cv5',
    startDate: '2024-01-01',
    endDate: '2024-01-08',
    results: [
      { variantId: 'cv5', impressions: 800, clicks: 142, conversions: 28 },
      { variantId: 'cv6', impressions: 790, clicks: 118, conversions: 19 },
    ],
  },
];

export const executionReceipts: ExecutionReceipt[] = [
  { id: 'er1', action: 'Send batch to Gong (email, de-DE)', status: 'pending', timestamp: '2024-01-15T10:00:00Z' },
  { id: 'er2', action: 'Send batch to Outreach (linkedin, en-US)', status: 'pending', timestamp: '2024-01-15T10:05:00Z' },
  { id: 'er3', action: 'Send batch to Pipedrive (email, de-DE)', status: 'approved', timestamp: '2024-01-15T09:30:00Z' },
  { id: 'er4', action: 'Send batch to Salesforce (email, en-US)', status: 'pending', timestamp: '2024-01-15T10:10:00Z' },
  { id: 'er5', action: 'Send batch to Aircall (linkedin, de-DE)', status: 'approved', timestamp: '2024-01-15T09:45:00Z' },
];

export const dlqEntries: DLQEntry[] = [
  { id: 'dlq1', target: 'Salesforce — email (en-US)', error: 'SMTP rate limit exceeded (454 4.7.1)', timestamp: '2024-01-15T08:23:00Z', retries: 2 },
  { id: 'dlq2', target: 'HubSpot — linkedin (pt-BR)', error: 'LinkedIn API: TOO_MANY_REQUESTS (429)', timestamp: '2024-01-15T08:45:00Z', retries: 1 },
  { id: 'dlq3', target: 'SAP — email (de-DE)', error: 'DNS lookup failed for mx.sap.com', timestamp: '2024-01-15T09:12:00Z', retries: 3 },
];

export const playbooks: Playbook[] = [
  { id: 'p1', segment: 'Revenue Intel', region: 'en-US', channel: 'Email', cadence: '3 touches over 7 days', winRate: 12.5, riskRate: 3.2, confidence: 92, rationale: 'High-intent segment with strong product-market fit signals. Email performs best for initial outreach before LinkedIn follow-up.' },
  { id: 'p2', segment: 'Sales CRM', region: 'de-DE', channel: 'LinkedIn', cadence: '4 touches over 10 days', winRate: 9.8, riskRate: 4.1, confidence: 85, rationale: 'DACH market responds better to LinkedIn than cold email. German professionals prefer professional network context.' },
  { id: 'p3', segment: 'Cloud Phone', region: 'de-DE', channel: 'Email', cadence: '2 touches over 5 days', winRate: 8.2, riskRate: 2.8, confidence: 78, rationale: 'Smaller addressable market but high relevance. Short cadence avoids fatigue in niche segment.' },
  { id: 'p4', segment: 'Workflow BPM', region: 'pt-BR', channel: 'LinkedIn', cadence: '3 touches over 8 days', winRate: 6.5, riskRate: 5.1, confidence: 71, rationale: 'LATAM market shows promise but lower confidence due to limited sample size. Monitor closely.' },
];

export const tacticScores: TacticScore[] = [
  { channel: 'Email', score: 84, trend: 'up' },
  { channel: 'LinkedIn', score: 62, trend: 'up' },
  { channel: 'Reddit', score: 34, trend: 'down' },
  { channel: 'Twitter', score: 45, trend: 'flat' },
];

export const consolidationEvents: ConsolidationEvent[] = [
  { id: 'ce1', timestamp: '2024-01-15T06:00:00Z', type: 'observation', description: 'Consolidated 12 research observations into target profiles', items: 12 },
  { id: 'ce2', timestamp: '2024-01-14T06:00:00Z', type: 'event', description: 'Merged 8 outreach events with existing target records', items: 8 },
  { id: 'ce3', timestamp: '2024-01-13T06:00:00Z', type: 'reflection', description: 'Tactical reflection: email outperforming LinkedIn in DACH by 22%', items: 1 },
  { id: 'ce4', timestamp: '2024-01-12T06:00:00Z', type: 'observation', description: 'Consolidated 6 new research records from MoltBot pull', items: 6 },
  { id: 'ce5', timestamp: '2024-01-11T06:00:00Z', type: 'event', description: 'Processed 15 analytics events into funnel metrics', items: 15 },
  { id: 'ce6', timestamp: '2024-01-10T06:00:00Z', type: 'observation', description: 'Updated target scores based on new intent signals', items: 8 },
  { id: 'ce7', timestamp: '2024-01-09T06:00:00Z', type: 'reflection', description: 'Weekly reflection: Gong and Outreach remain top ICP targets', items: 2 },
  { id: 'ce8', timestamp: '2024-01-08T06:00:00Z', type: 'event', description: 'Consolidated 5 outreach replies into engagement profiles', items: 5 },
];

export const knowledgeNodes: KnowledgeNode[] = [
  { id: 'kn1', label: 'Campaign Core', type: 'core', x: 200, y: 150 },
  { id: 'kn2', label: 'Playbooks', type: 'playbook', x: 80, y: 60 },
  { id: 'kn3', label: 'Targets', type: 'target', x: 320, y: 60 },
  { id: 'kn4', label: 'Observations', type: 'observation', x: 360, y: 180 },
  { id: 'kn5', label: 'Content Packs', type: 'content', x: 240, y: 260 },
  { id: 'kn6', label: 'Decisions', type: 'decision', x: 80, y: 200 },
  { id: 'kn7', label: 'Funding', type: 'observation', x: 160, y: 40 },
];

export const knowledgeEdges: KnowledgeEdge[] = [
  { from: 'kn1', to: 'kn2' },
  { from: 'kn1', to: 'kn3' },
  { from: 'kn1', to: 'kn4' },
  { from: 'kn1', to: 'kn5' },
  { from: 'kn1', to: 'kn6' },
  { from: 'kn3', to: 'kn4' },
  { from: 'kn2', to: 'kn5' },
  { from: 'kn6', to: 'kn3' },
  { from: 'kn1', to: 'kn7' },
];
