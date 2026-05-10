const API_BASE = import.meta.env.VITE_BRAIN_API_BASE || 'http://127.0.0.1:4010';

export interface Campaign {
  id: string;
  name?: string;
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API error ${response.status}`);
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

  async runAutomation(campaignId: string, reason = 'ui-request') {
    return api<any>('/automation/run', {
      method: 'POST',
      body: JSON.stringify({ campaignId, reason }),
    });
  },

  async generateContent(campaignId: string, locales?: string[]) {
    return api<any>('/content/generate', {
      method: 'POST',
      body: JSON.stringify({ campaignId, locales, reason: 'ui-request' }),
    });
  },
};
