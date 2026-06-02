export type StageStatus = 'locked' | 'configuring' | 'ready' | 'completed' | 'active';

export interface Stage {
  id: number;
  name: string;
  status: StageStatus;
  accent: string;
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  channel: string;
  locales: string[];
  audience: string;
  offer: string;
  theme: string;
  palette: string[];
  guidelines: string;
  contentAngles: string[];
  modules: CampaignModule[];
  active: boolean;
}

export interface CampaignModule {
  id: string;
  name: string;
  enabled: boolean;
}

export type ConnectorStatus = 'ready' | 'dry-run' | 'live' | 'error';

export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
  mode: string;
  baseUrl: string;
  health: number; // 0-5
  lastPull: string;
}

export interface ResearchRecord {
  id: string;
  company: string;
  segment: string;
  region: string;
  fitScore: number;
  intentScore: number;
  recencyScore: number;
  notes: string;
  sourceUrl: string;
  evidence: string[];
}

export interface AnalyticsEvent {
  id: string;
  type: 'impression' | 'click' | 'conversion';
  value: number;
  timestamp: string;
  campaignId: string;
}

export interface OutreachEvent {
  id: string;
  targetId: string;
  targetName: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced';
  channel: string;
  timestamp: string;
  campaignId: string;
}

export interface Target {
  id: string;
  company: string;
  segment: string;
  score: number;
  recommendedChannel: string;
  status: 'raw' | 'enriched' | 'qualified' | 'ranked';
  lastTouch?: string;
  nextTouch?: string;
}

export interface Investor {
  id: string;
  name: string;
  firm: string;
  thesisMatch: number;
  stageMatch: number;
  checkSizeMatch: number;
  warmPath: number;
  overallScore: number;
  status: 'sourced' | 'qualified' | 'contacted' | 'responded' | 'meeting';
}

export interface ContentVariant {
  id: string;
  locale: string;
  subject: string;
  body: string;
  cta: string;
  status: 'draft' | 'approved' | 'sent';
}

export interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'draft';
  variants: string[];
  winner: string | null;
  startDate: string;
  endDate?: string;
  results?: ABTestResult[];
}

export interface ABTestResult {
  variantId: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface ExecutionReceipt {
  id: string;
  action: string;
  status: 'pending' | 'approved' | 'denied';
  timestamp: string;
}

export interface DLQEntry {
  id: string;
  target: string;
  error: string;
  timestamp: string;
  retries: number;
}

export interface Playbook {
  id: string;
  segment: string;
  region: string;
  channel: string;
  cadence: string;
  winRate: number;
  riskRate: number;
  confidence: number;
  rationale: string;
}

export interface FunnelStep {
  id: string;
  name: string;
  type: 'form' | 'redirect' | 'delay' | 'email';
  config: Record<string, string>;
}

export interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TacticScore {
  channel: string;
  score: number;
  trend: 'up' | 'down' | 'flat';
}

export interface ConsolidationEvent {
  id: string;
  timestamp: string;
  type: 'observation' | 'event' | 'reflection';
  description: string;
  items: number;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'core' | 'playbook' | 'target' | 'observation' | 'content' | 'decision';
  x: number;
  y: number;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
}
