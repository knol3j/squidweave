// In production behind a reverse proxy (Cloudflare tunnel, nginx, etc.),
// use relative paths so the browser hits the same origin.
// In dev (localhost), fall back to explicit host:port.
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_BASE = import.meta.env.VITE_BRAIN_API_BASE || (isDev ? 'http://127.0.0.1:4010' : '');

// ── Auth helpers ──────────────────────────────────────────────
// Store/retrieve Basic Auth credentials in sessionStorage so the
// frontend can include Authorization headers in every API call.
// This avoids the browser limitation where fetch() fails when the
// page URL contains embedded credentials (user:pass@host).
const AUTH_KEY = 'squidweave_auth';
const AUTH_EVENT = 'squidweave-auth-changed';

function getAuthHeaders(): Record<string, string> {
  const stored = sessionStorage.getItem(AUTH_KEY);
  if (stored) {
    return { Authorization: `Basic ${stored}` };
  }
  return {};
}

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
}

export function setAuthCredentials(user: string, pass: string) {
  sessionStorage.setItem(AUTH_KEY, btoa(`${user}:${pass}`));
  notifyAuthChange();
}

export function clearAuthCredentials() {
  sessionStorage.removeItem(AUTH_KEY);
  notifyAuthChange();
}

export function hasAuthCredentials(): boolean {
  return !!sessionStorage.getItem(AUTH_KEY);
}

export function getApiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export function getAuthEventName() {
  return AUTH_EVENT;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface Campaign {
  id: string;
  name?: string;
  clientName?: string;
  connector?: string;
  connectors?: string[];
  activePrompt: string;
  activeTab: string;
  updatedAt?: string;
  enabledModules?: string[];
  locales?: string[];
  sourceLocale?: string;
  objective?: string;
  audience?: string;
  offer?: string;
  brandVoice?: string;
  channel?: string;
  automationEnabled?: boolean;
  clientNeed?: string;
  intakeStatus?: string;
  successDefinition?: string;
  constraints?: string;
  differentiators?: string;
  researchNotes?: string;
  markets?: string[];
  researchObjectives?: string[];
  successMetrics?: string[];
  designTheme?: string;
  designPalette?: string[];
  designGuidelines?: string[];
  contentAngles?: string[];
  baseBody?: string;
  baseHeadline?: string;
  baseSubject?: string;
  basePreheader?: string;
  baseCta?: string;
}

export interface Variation {
  id: string;
  label: string;
  copy: string;
  ctr: number | null;
  conv: number | null;
  image?: string | null;
  status: 'winner' | 'contender' | null;
  platform: string | null;
  audience: string | null;
  trend: 'up' | 'down' | 'stable' | null;
}

export interface Persona {
  id: string;
  name: string;
  demographics: string;
  pains: string[];
  gains: string[];
  engagementScore: number;
}

export interface Metric {
  id: string;
  timestamp: { toDate: () => Date };
  ctr: number;
  conv: number;
  spend: number;
}

export interface Keyword {
  id: string;
  term: string;
  volume: string;
  difficulty: string;
  intent: string;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface MemoryPlaybook {
  id: string;
  campaignId: string;
  segment: string;
  region: string;
  recommendedChannel: string;
  cadenceDays: number;
  minSamples: number;
  winRate: number;
  riskRate: number;
  confidence: number;
  rationale: string;
  lastValidatedAt: string | null;
  status: string;
}

export interface TargetProfile {
  id: string;
  campaignId: string;
  targetId: string;
  company: string;
  contactName: string;
  title: string;
  segment: string;
  region: string;
  preferredChannel: string;
  channels: string[];
  fitScore: number | null;
  intentScore: number | null;
  recencyScore: number | null;
  memoryScore: number | null;
  status: string;
  latestResearchAt: string | null;
  lastEngagementAt: string | null;
  nextEligibleAt: string | null;
  estimatedReach: number | null;
}

export interface MemoryRecall {
  updatedAt: string;
  targetProfile: TargetProfile | null;
  episodicMemories: {
    researchRecords: any[];
    outreachEvents: any[];
    decisions: any[];
  };
  semanticMemories: {
    targetProfiles: TargetProfile[];
    tacticObservations: any[];
  };
  proceduralMemories: MemoryPlaybook[];
}

export interface ConnectorStatus {
  connector: string;
  configured: boolean;
  dryRun: boolean;
  baseUrl: string | null;
  tokenConfigured: boolean;
  mode: string;
  reachable: boolean | null;
  checkedAt: string;
  error: string | null;
  tokenLikelyRotated?: boolean;
  lastAuthErrorAt?: string | null;
  diagnosis?: OpenClawDiagnostic;
}

export interface OpenClawDiagnostic {
  connector: string;
  configured: boolean;
  baseUrl: string | null;
  gatewayReachable: boolean;
  authAccepted: boolean;
  openAiHttpSurfaceReachable: boolean;
  requiresOpenAiHttpSurface: boolean;
  ready: boolean;
  summary: string;
  recommendations: string[];
}

export interface ConnectorConfig {
  connector: string;
  baseUrl: string | null;
  dryRun: boolean;
  tokenConfigured: boolean;
  updatedAt: string | null;
}

export interface SetupRequirements {
  generatedAt: string;
  environment: {
    requiredForLiveConnectors: string[];
    operational: string[];
  };
  outreachEventTypes: string[];
  analyticsEventTypes: string[];
  requiredResearchFields: string[];
  recommendedResearchFields: string[];
  sourceSystems: {
    research: string[];
    outreach: string[];
    analytics: string[];
  };
}

export interface OpenClawDiagnosticResponse {
  generatedAt: string;
  diagnostics: OpenClawDiagnostic[];
}

export interface ResearchRecord {
  id: string;
  campaignId: string;
  targetId: string;
  source: string;
  company: string;
  contactName: string;
  title: string;
  segment: string;
  region: string;
  preferredChannel: string;
  channels: string[];
  fitScore: number | null;
  intentScore: number | null;
  recencyScore: number | null;
  estimatedReach: number | null;
  notes: string;
  capturedAt: string;
  metadata?: {
    sourceUrl?: string;
    supportingUrls?: string[];
    publishedAt?: string;
    evidence?: string[];
    scoreMapping?: Record<string, string>;
  };
}

export interface ProspectingPlan {
  campaignId: string;
  generatedAt: string;
  objective: string;
  audience: string;
  offer: string;
  channel: string;
  topAccounts: Array<{
    targetId: string;
    company: string;
    segment: string;
    region: string;
    sourceMix: string[];
    roleClusters: string[];
    preferredChannel: string | null;
    evidence: string[];
  }>;
  sourcingWorkflow: string[];
  enrichmentChecklist: string[];
  proceduralSignals: Array<{
    segment: string;
    region: string;
    channel: string;
    confidence: number;
  }>;
  targetSummary: {
    totalTargets: number;
    actionableTargets: number;
  };
}

export interface SourcedContact {
  id: string;
  campaignId: string;
  targetId: string;
  company: string;
  fullName?: string;
  title?: string;
  role?: string;
  email?: string;
  linkedinUrl?: string;
  companyWebsite?: string;
  phone?: string;
  region?: string;
  segment?: string;
  preferredChannel?: string;
  sourceMix?: string[];
  searchQuery?: string;
  contactStatus: string;
  complianceStatus: string;
  enrichmentStatus?: string;
  verificationStatus?: string;
  sequenceStatus?: string;
  sequencePlan?: {
    channel: string;
    offer: string;
    steps: string[];
    personalizationAngles: string[];
    createdAt: string;
  };
  source?: string;
  score?: number;
  evidence?: string[];
  notes?: string;
  createdAt: string;
}

export interface ProspectingRun {
  id: string;
  campaignId: string;
  createdAt: string;
  reason: string;
  generatedCandidates: number;
  plan: ProspectingPlan;
}

export interface ProspectPipeline {
  campaignId: string;
  generatedAt: string;
  counts: {
    total: number;
    readyForEnrichment: number;
    readyForSequencing: number;
    sequenced: number;
    suppressed: number;
    byStatus: Record<string, number>;
    byCompliance: Record<string, number>;
    bySequence: Record<string, number>;
  };
  recentRuns: ActivationRun[];
}

export interface ActivationRun {
  id: string;
  campaignId: string;
  action: string;
  status: string;
  provider?: string;
  processedContacts: number;
  createdAt: string;
  connectorResults?: any[];
}

export interface FundingInvestor {
  id: string;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  fundName: string;
  partnerName: string | null;
  stageFocus: string[];
  geoFocus: string[];
  sectors: string[];
  checkSize: string | null;
  thesis: string;
  warmIntroPath: string;
  thesisMatch: number;
  stageMatch: number;
  checkSizeMatch: number;
  warmPath: number;
  status: string;
  notes: string;
  lastContactAt: string | null;
  nextActionAt: string | null;
  sequenceStep: number;
}

export interface FundingPipeline {
  campaignId: string;
  generatedAt: string;
  counts: {
    total: number;
    byStatus: Record<string, number>;
  };
  prioritized: Array<FundingInvestor & {
    score: number;
    reasons: string[];
    campaignStage: string | null;
  }>;
}

export interface FundingOutreachEvent {
  id: string;
  campaignId: string;
  investorId: string;
  type: string;
  channel: string;
  timestamp: string;
  sequenceStep: number;
  metadata?: {
    score?: number;
    reasons?: string[];
  };
}

export interface FundingRun {
  id: string;
  campaignId: string;
  createdAt: string;
  type: string;
  processedInvestors: number;
  status: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...getAuthHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      clearAuthCredentials();
    }
    throw new ApiError(response.status, text || `API error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function makeTimestamp(value?: string) {
  const date = value ? new Date(value) : new Date();
  return { toDate: () => date };
}

function buildVariations(state: any): Variation[] {
  const campaign = state.campaigns?.['main-campaign'] || Object.values(state.campaigns || {})[0] as Campaign | undefined;
  const packs = state.contentPacks || [];
  const latestPack = packs.at(-1);

  if (!latestPack?.variants?.length || !campaign) {
    return [];
  }

  return latestPack.variants.map((variant: any, index: number) => ({
    id: variant.id || `${latestPack.id}-${variant.locale}-${index}`,
    label: `${variant.locale} Variant ${String.fromCharCode(65 + index)}`,
    copy: variant.body,
    ctr: typeof variant.ctr === 'number' ? variant.ctr : null,
    conv: typeof variant.conv === 'number' ? variant.conv : null,
    image: variant.image || null,
    status: variant.status === 'winner' || variant.status === 'contender' ? variant.status : null,
    platform: variant.channel || campaign.channel || null,
    audience: variant.audience || campaign.audience || null,
    trend: variant.trend === 'up' || variant.trend === 'down' || variant.trend === 'stable' ? variant.trend : null,
  }));
}

function buildMetrics(state: any): Metric[] {
  const decisions = state.decisions || [];
  return decisions.map((decision: any, index: number) => ({
    id: decision.id || `metric-${index}`,
    timestamp: makeTimestamp(decision.createdAt),
    ctr: Number((((decision.summary?.derived?.ctr || 0) * 100)).toFixed(2)),
    conv: Number((((decision.summary?.derived?.cvr || 0) * 100)).toFixed(2)),
    spend: Number((decision.summary?.totals?.spend || 0).toFixed(2)),
  }));
}

function poll<T>(fetcher: () => Promise<T>, callback: (data: T) => void, intervalMs = 4000) {
  let active = true;
  const run = async () => {
    try {
      const data = await fetcher();
      if (active) {
        callback(data);
      }
    } catch (error) {
      console.error(error);
    }
  };
  run();
  const timer = window.setInterval(run, intervalMs);
  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

export const dataService = {
  async verifyCredentials() {
    return api<any>('/state');
  },

  async getCampaign(campaignId: string) {
    return api<Campaign | null>(`/campaigns/${campaignId}`);
  },

  async updateCampaign(campaignId: string, data: Partial<Campaign>) {
    return api<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        id: campaignId,
        ...(data.name ? { name: data.name } : {}),
        ...data,
      }),
    });
  },

  async getState() {
    return api<any>('/state');
  },

  async getMemoryRecall(campaignId: string, targetId?: string) {
    const search = new URLSearchParams({ campaignId });
    if (targetId) {
      search.set('targetId', targetId);
    }
    return api<MemoryRecall>(`/memory/recall?${search.toString()}`);
  },

  async getPlaybooks(campaignId: string) {
    return api<MemoryPlaybook[]>(`/memory/playbooks?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getTargets(campaignId: string) {
    return api<any[]>(`/targets?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getTargetProfiles(campaignId: string) {
    return api<TargetProfile[]>(`/memory/targets?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getReengagementQueue(campaignId: string) {
    return api<{ campaignId: string; updatedAt: string; queue: any[] }>(`/reengagement?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getResearchRecords(campaignId: string) {
    return api<ResearchRecord[]>(`/research/records?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getProspectingPlan(campaignId: string) {
    return api<ProspectingPlan>(`/prospecting/plan?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async generateProspects(campaignId: string, payload?: { reason?: string; limit?: number }) {
    return api<{ run: ProspectingRun; plan: ProspectingPlan; candidates: SourcedContact[] }>('/prospecting/generate', {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        ...payload,
      }),
    });
  },

  async getProspects(campaignId: string) {
    return api<SourcedContact[]>(`/prospects?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async importProspects(campaignId: string, contacts: Partial<SourcedContact>[], source = 'manual-import') {
    return api<SourcedContact[]>('/prospects/import', {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        source,
        contacts,
      }),
    });
  },

  async getProspectingRuns(campaignId: string) {
    return api<ProspectingRun[]>(`/prospecting/runs?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getProspectPipeline(campaignId: string) {
    return api<ProspectPipeline>(`/prospects/pipeline?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async enrichProspects(campaignId: string, payload?: { provider?: string; limit?: number; dispatch?: boolean; connectors?: string[] }) {
    return api<{ run: ActivationRun; contacts: SourcedContact[]; pipeline: ProspectPipeline }>('/prospects/enrich', {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        ...payload,
      }),
    });
  },

  async sequenceProspects(campaignId: string, payload?: { limit?: number; dispatch?: boolean; connectors?: string[] }) {
    return api<{ run: ActivationRun; contacts: SourcedContact[]; pipeline: ProspectPipeline }>('/prospects/sequence', {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        ...payload,
      }),
    });
  },

  async getActivationRuns(campaignId: string) {
    return api<ActivationRun[]>(`/prospects/activation-runs?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async importFundingInvestors(campaignId: string, records: Array<Partial<FundingInvestor>>) {
    return api<FundingInvestor[]>('/funding/investors', {
      method: 'POST',
      body: JSON.stringify({ campaignId, records }),
    });
  },

  async getFundingInvestors(campaignId: string) {
    return api<FundingInvestor[]>(`/funding/investors?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getFundingPipeline(campaignId: string) {
    return api<FundingPipeline>(`/funding/pipeline?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async runFundingSequence(campaignId: string, payload?: { limit?: number }) {
    return api<{ run: FundingRun; events: FundingOutreachEvent[]; pipeline: FundingPipeline }>('/funding/sequence', {
      method: 'POST',
      body: JSON.stringify({ campaignId, ...payload }),
    });
  },

  async runFundingCampaign(campaignId: string, payload?: { limit?: number }) {
    return api<{ campaignId: string; pipeline: FundingPipeline; sequence: { run: FundingRun; events: FundingOutreachEvent[]; pipeline: FundingPipeline } }>('/funding/run', {
      method: 'POST',
      body: JSON.stringify({ campaignId, ...payload }),
    });
  },

  /** Alias: runFunding */
  async runFunding(campaignId: string) {
    return this.runFundingCampaign(campaignId);
  },

  async getFundingRuns(campaignId: string) {
    return api<FundingRun[]>(`/funding/runs?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getFundingOutreachEvents(campaignId: string) {
    return api<FundingOutreachEvent[]>(`/funding/outreach-events?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getEnrichmentProvidersStatus() {
    return api<{ hunter: { configured: boolean; keyPrefix: string | null }; apollo: { configured: boolean; keyPrefix: string | null } }>('/funding/enrichment-status');
  },

  async runEnrichment(campaignId: string) {
    return api<{ enriched: number; skipped: number; errors: number }>('/funding/enrich', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
  },

  async sendInvestorDeck(campaignId: string, investorId: string) {
    return api<FundingOutreachEvent>('/funding/send-deck', {
      method: 'POST',
      body: JSON.stringify({ campaignId, investorId }),
    });
  },

  async logInvestorEvent(campaignId: string, investorId: string, payload: { type: string; channel: string; notes?: string }) {
    return api<FundingOutreachEvent>('/funding/log-event', {
      method: 'POST',
      body: JSON.stringify({ campaignId, investorId, ...payload }),
    });
  },

  async addResearchRecord(record: Partial<ResearchRecord> & { campaignId: string; targetId: string }) {
    return api<ResearchRecord>('/research/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async getAnalyticsEvents(campaignId: string) {
    return api<any[]>(`/analytics/events?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getOutreachEvents(campaignId: string, targetId?: string) {
    const search = new URLSearchParams({ campaignId });
    if (targetId) {
      search.set('targetId', targetId);
    }
    return api<any[]>(`/outreach/events?${search.toString()}`);
  },

  async getTargetDecision(campaignId: string) {
    return api<any>('/targets/decide', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
  },

  async getConnectorStatuses(probe = false) {
    return api<ConnectorStatus[]>(`/connectors/status?probe=${probe ? 'true' : 'false'}`);
  },

  async getSetupRequirements() {
    return api<SetupRequirements>('/setup/requirements');
  },

  async getOpenClawDiagnostics() {
    return api<OpenClawDiagnosticResponse>('/diagnostics/openclaw');
  },

  async getConnectorConfig(connector: string) {
    return api<ConnectorConfig>(`/connectors/${encodeURIComponent(connector)}/config`);
  },

  async updateConnectorConfig(connector: string, payload: { baseUrl: string; token: string; dryRun?: boolean; probe?: boolean }) {
    return api<{ config: ConnectorConfig; status: ConnectorStatus }>(`/connectors/${encodeURIComponent(connector)}/config`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async ingestOutcomes(payload: { campaignId: string; researchRecords?: any[]; outreachEvents?: any[]; analyticsEvents?: any[] }) {
    return api<any>('/ingest/outcomes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  subscribeToVariations(campaignId: string, callback: (variations: Variation[]) => void) {
    return poll(async () => buildVariations(await this.getState()), callback);
  },

  async addVariation() {
    return null;
  },

  subscribeToPersonas(campaignId: string, callback: (personas: Persona[]) => void) {
    return poll(async () => {
      const profiles = await this.getTargetProfiles(campaignId);
      const grouped = new Map<string, TargetProfile[]>();
      for (const profile of profiles) {
        const key = `${profile.segment || 'unknown'}::${profile.region || 'global'}`;
        grouped.set(key, [...(grouped.get(key) || []), profile]);
      }
      return [...grouped.entries()].map(([key, items]) => {
        const [segment, region] = key.split('::');
        const topTitles = [...new Set(items.map(item => item.title).filter(Boolean))].slice(0, 3);
        const topChannels = [...new Set(items.flatMap(item => item.channels || []).filter(Boolean))].slice(0, 3);
        const avgScore = items.reduce((sum, item) => {
          const parts = [item.fitScore, item.intentScore, item.recencyScore].filter((value): value is number => typeof value === 'number');
          return sum + (parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0);
        }, 0) / Math.max(items.length, 1);
        return {
          id: `persona-${segment}-${region}`,
          name: `${titleCase(segment)} ${region === 'global' ? 'Operators' : titleCase(region)}`,
          demographics: `${items.length} live targets`,
          pains: topTitles.length ? topTitles.map(title => `Active title cluster: ${title}`) : ['No title signals captured yet'],
          gains: topChannels.length ? topChannels.map(channel => `Best observed automation rail: ${channel}`) : ['No preferred channel captured yet'],
          engagementScore: Number(avgScore.toFixed(2)),
        };
      });
    }, callback);
  },

  async addPersona() {
    return null;
  },

  async addMetric() {
    return null;
  },

  subscribeToKeywords(campaignId: string, callback: (keywords: Keyword[]) => void) {
    return poll(async () => {
      const records = await this.getResearchRecords(campaignId);
      const tally = new Map<string, number>();
      for (const record of records) {
        const fragments = [
          record.segment,
          record.region,
          record.title,
          record.company,
          ...(record.metadata?.evidence || []),
        ]
          .filter(Boolean)
          .flatMap(value => String(value).toLowerCase().split(/[^a-z0-9+#-]+/g))
          .filter(token => token.length >= 4);

        for (const token of fragments) {
          tally.set(token, (tally.get(token) || 0) + 1);
        }
      }

      return [...tally.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([term, count], index) => ({
          id: `keyword-${index}-${term}`,
          term,
          volume: `${count} signals`,
          difficulty: count >= 4 ? 'high' : count >= 2 ? 'medium' : 'low',
          intent: 'backend-derived',
        }));
    }, callback);
  },

  async addKeyword() {
    return null;
  },

  subscribeToMetrics(campaignId: string, callback: (metrics: Metric[]) => void) {
    return poll(async () => buildMetrics(await this.getState()), callback);
  },

  async runAutomation(campaignId?: string, reason = 'ui-request') {
    return api<any>('/automation/run', {
      method: 'POST',
      body: JSON.stringify({ campaignId, reason }),
    });
  },

  async runPromptAutopilot(prompt: string, options?: {
    campaignId?: string;
    reason?: string;
    locales?: string[];
    enrichLimit?: number;
    sequenceLimit?: number;
    fundingLimit?: number;
  }) {
    return api<any>('/automation/prompt-run', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        campaignId: options?.campaignId,
        reason: options?.reason || 'ui-prompt-autopilot',
        locales: options?.locales,
        enrichLimit: options?.enrichLimit,
        sequenceLimit: options?.sequenceLimit,
        fundingLimit: options?.fundingLimit,
      }),
    });
  },

  async generateContent(campaignId: string, locales?: string[]) {
    return api<any>('/content/generate', {
      method: 'POST',
      body: JSON.stringify({ campaignId, locales, reason: 'ui-request' }),
    });
  },

  // ── Entity type definitions ───────────────────────────────────
  async getContacts(locationId?: string, campaignId?: string) {
    const search = new URLSearchParams();
    if (locationId) search.set('locationId', locationId);
    if (campaignId) search.set('campaignId', campaignId);
    const qs = search.toString();
    return api<any[]>(`/contacts${qs ? '?' + qs : ''}`);
  },

  async getContact(id: string) {
    return api<any>(`/contacts/${id}`);
  },

  async saveContact(data: any) {
    return api<any>('/contacts', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteContact(id: string) {
    return api<any>(`/contacts/${id}`, { method: 'DELETE' });
  },

  async getOpportunities(pipelineId?: string, contactId?: string) {
    const search = new URLSearchParams();
    if (pipelineId) search.set('pipelineId', pipelineId);
    if (contactId) search.set('contactId', contactId);
    const qs = search.toString();
    return api<any[]>(`/opportunities${qs ? '?' + qs : ''}`);
  },

  async getOpportunity(id: string) {
    return api<any>(`/opportunities/${id}`);
  },

  async saveOpportunity(data: any) {
    return api<any>('/opportunities', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteOpportunity(id: string) {
    return api<any>(`/opportunities/${id}`, { method: 'DELETE' });
  },

  async getPipelines(locationId?: string) {
    const search = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
    return api<any[]>(`/pipelines${search}`);
  },

  async getPipeline(id: string) {
    return api<any>(`/pipelines/${id}`);
  },

  async savePipeline(data: any) {
    return api<any>('/pipelines', { method: 'POST', body: JSON.stringify(data) });
  },

  async deletePipeline(id: string) {
    return api<any>(`/pipelines/${id}`, { method: 'DELETE' });
  },

  async getWorkflows(locationId?: string) {
    const search = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
    return api<any[]>(`/workflows${search}`);
  },

  async getWorkflow(id: string) {
    return api<any>(`/workflows/${id}`);
  },

  async saveWorkflow(data: any) {
    return api<any>('/workflows', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteWorkflow(id: string) {
    return api<any>(`/workflows/${id}`, { method: 'DELETE' });
  },

  async getNotes(contactId?: string) {
    const search = contactId ? `?contactId=${encodeURIComponent(contactId)}` : '';
    return api<any[]>(`/notes${search}`);
  },

  async saveNote(data: any) {
    return api<any>('/notes', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteNote(id: string) {
    return api<any>(`/notes/${id}`, { method: 'DELETE' });
  },

  async getTasks(contactId?: string) {
    const search = contactId ? `?contactId=${encodeURIComponent(contactId)}` : '';
    return api<any[]>(`/tasks${search}`);
  },

  async saveTask(data: any) {
    return api<any>('/tasks', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteTask(id: string) {
    return api<any>(`/tasks/${id}`, { method: 'DELETE' });
  },

  async getCalendarEvents(contactId?: string) {
    const search = contactId ? `?contactId=${encodeURIComponent(contactId)}` : '';
    return api<any[]>(`/calendarEvents${search}`);
  },

  async saveCalendarEvent(data: any) {
    return api<any>('/calendarEvents', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteCalendarEvent(id: string) {
    return api<any>(`/calendarEvents/${id}`, { method: 'DELETE' });
  },

  async getTags(locationId?: string) {
    const search = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
    return api<any[]>(`/tags${search}`);
  },

  async saveTag(data: any) {
    return api<any>('/tags', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteTag(id: string) {
    return api<any>(`/tags/${id}`, { method: 'DELETE' });
  },

  // ── Relationship queries ──────────────────────────────────────
  async getContactOpportunities(contactId: string) {
    return api<any[]>(`/contacts/${contactId}/opportunities`);
  },

  async getContactNotes(contactId: string) {
    return api<any[]>(`/contacts/${contactId}/notes`);
  },

  async getContactTasks(contactId: string) {
    return api<any[]>(`/contacts/${contactId}/tasks`);
  },

  async getPipelineOpportunities(pipelineId: string) {
    return api<any[]>(`/pipelines/${pipelineId}/opportunities`);
  },

  async getWorkflowSteps(workflowId: string) {
    return api<any[]>(`/workflows/${workflowId}/steps`);
  },

  // ── GHL Bridge ────────────────────────────────────────────────
  async ghlWebhook(body: any, campaignId?: string) {
    const search = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
    return api<any>(`/integrations/ghl/webhook${search}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async ghlSyncContacts(campaignId: string, options?: any) {
    return api<any>('/integrations/ghl/sync/contacts', {
      method: 'POST',
      body: JSON.stringify({ campaignId, options }),
    });
  },

  async ghlSyncOpportunities(campaignId: string, options?: any) {
    return api<any>('/integrations/ghl/sync/opportunities', {
      method: 'POST',
      body: JSON.stringify({ campaignId, options }),
    });
  },

  async ghlSyncPipelines(campaignId: string, options?: any) {
    return api<any>('/integrations/ghl/sync/pipelines', {
      method: 'POST',
      body: JSON.stringify({ campaignId, options }),
    });
  },

  async ghlSyncWorkflows(campaignId: string, options?: any) {
    return api<any>('/integrations/ghl/sync/workflows', {
      method: 'POST',
      body: JSON.stringify({ campaignId, options }),
    });
  },

  async ghlSyncForms(campaignId: string, options?: any) {
    return api<any>('/integrations/ghl/sync/forms', {
      method: 'POST',
      body: JSON.stringify({ campaignId, options }),
    });
  },

  async ghlSyncCalendars(campaignId: string, options?: any) {
    return api<any>('/integrations/ghl/sync/calendars', {
      method: 'POST',
      body: JSON.stringify({ campaignId, options }),
    });
  },

  async ghlFullSync(campaignId: string, options?: any) {
    return api<any>('/integrations/ghl/sync/full', {
      method: 'POST',
      body: JSON.stringify({ campaignId, options }),
    });
  },

  async ghlPushContact(contact: any, campaignId?: string) {
    return api<any>('/integrations/ghl/push/contact', {
      method: 'POST',
      body: JSON.stringify({ contact, campaignId }),
    });
  },

  async ghlPushOpportunity(opportunity: any, campaignId?: string) {
    return api<any>('/integrations/ghl/push/opportunity', {
      method: 'POST',
      body: JSON.stringify({ opportunity, campaignId }),
    });
  },

  async ghlPushNote(note: any, campaignId?: string) {
    return api<any>('/integrations/ghl/push/note', {
      method: 'POST',
      body: JSON.stringify({ note, campaignId }),
    });
  },

  async ghlPushTask(task: any, campaignId?: string) {
    return api<any>('/integrations/ghl/push/task', {
      method: 'POST',
      body: JSON.stringify({ task, campaignId }),
    });
  },

  async migrateSourcedContacts() {
    return api<{ migrated: number }>('/migration/migrate-sourced');
  },
};
