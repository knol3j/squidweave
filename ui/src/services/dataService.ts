/**
 * SquidWeave API Service
 * All data from real backend endpoints. Zero mock data.
 */

// ─── 1. API INFRASTRUCTURE ───────────────────────────────────────────────────

const RAILWAY_BASE = "https://squidweave-api-production.up.railway.app";
let API_BASE = RAILWAY_BASE;

// ─── Backend selection with localStorage persistence ───
const STORAGE_KEY = "sw_api_base";

function loadSavedBase(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function saveBase(base: string) {
  try { localStorage.setItem(STORAGE_KEY, base); } catch { /* silent */ }
}
function clearSavedBase() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* silent */ }
}

// Initialize: use saved base, or probe for local
const saved = loadSavedBase();
if (saved) {
  API_BASE = saved;
  console.log("[SquidWeave] Using saved backend:", API_BASE);
} else {
  // Probe for local backend once (backend may not be ready yet)
  const LOCAL_ENDPOINTS = ["http://127.0.0.1:4010", "http://localhost:4010"];
  (async () => {
    for (const ep of LOCAL_ENDPOINTS) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        const res = await fetch(`${ep}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) {
          API_BASE = ep;
          saveBase(ep);
          console.log("[SquidWeave] Auto-connected to local backend:", ep);
          return;
        }
      } catch { /* silent */ }
    }
    console.log("[SquidWeave] Using Railway backend");
  })();
}

// Manual switch (called from UI button)
export function switchToLocalBackend(endpoint: string): void {
  API_BASE = endpoint;
  saveBase(endpoint);
  console.log("[SquidWeave] Switched to:", API_BASE);
}

export function resetToRailway(): void {
  API_BASE = RAILWAY_BASE;
  clearSavedBase();
  console.log("[SquidWeave] Reset to Railway");
}

export function getApiBase(): string {
  return API_BASE;
}

const AUTH_KEY = "squidweave_auth";

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function getAuthEventName(): string {
  return "squidweave_auth_changed";
}

export function setAuthCredentials(user: string, pass: string): void {
  sessionStorage.setItem(AUTH_KEY, btoa(`${user}:${pass}`));
  window.dispatchEvent(new Event(getAuthEventName()));
}

export function clearAuthCredentials(): void {
  sessionStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event(getAuthEventName()));
}

export function hasAuthCredentials(): boolean {
  return !!sessionStorage.getItem(AUTH_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const stored = sessionStorage.getItem(AUTH_KEY);
  if (stored) return { Authorization: `Basic ${stored}` };
  return {};
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": "squidweave-local-dev",
      ...getAuthHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(AUTH_KEY);
      window.dispatchEvent(new Event(getAuthEventName()));
    }
    const text = await response.text();
    throw new ApiError(response.status, text);
  }
  return response.json() as Promise<T>;
}

// ─── 2. TYPE DEFINITIONS ─────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  status: string;
  goal: string;
  latestContentPack?: ContentPack | null;
  metrics?: CampaignMetrics;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ContentPack {
  id: string;
  campaignId: string;
  variants: Variation[];
  createdAt?: string;
  [key: string]: unknown;
}

export interface CampaignMetrics {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  sent?: number;
  opened?: number;
  replied?: number;
  booked?: number;
  [key: string]: unknown;
}

export interface Variation {
  id: string;
  locale: string;
  headline: string;
  body: string;
  cta: string;
  subject?: string;
  preheader?: string;
  angle?: string;
  tone?: string;
  status?: string;
  approved?: boolean;
  [key: string]: unknown;
}

export interface Persona {
  id: string;
  name: string;
  segment: string;
  painPoints: string[];
  channels: string[];
  fitScore: number;
  status: string;
  description?: string;
  estimatedReach?: number;
  [key: string]: unknown;
}

export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  change?: number;
  [key: string]: unknown;
}

export interface Keyword {
  id: string;
  term: string;
  volume: number;
  difficulty: number;
  intent: string;
  source: string;
  [key: string]: unknown;
}

export interface MemoryPlaybook {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  tactics: string[];
  observations: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface TargetProfile {
  id: string;
  campaignId: string;
  targetId: string;
  company: string;
  segment: string;
  fitScore: number;
  decisionMaker?: string;
  signals?: string[];
  enrichment?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
}

export interface MemoryRecall {
  campaignId: string;
  targetProfile?: TargetProfile;
  semanticMemories?: SemanticMemories;
  episodicMemories?: unknown[];
  tacticalInsights?: string[];
  [key: string]: unknown;
}

export interface SemanticMemories {
  tacticObservations?: string[];
  strategyPatterns?: string[];
  channelInsights?: string[];
  [key: string]: unknown;
}

export interface ConnectorStatus {
  connector: string;
  enabled: boolean;
  configured: boolean;
  lastSync?: string;
  error?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OpenClawDiagnostic {
  connector: string;
  reachable: boolean;
  latencyMs: number;
  error?: string;
  lastChecked?: string;
  [key: string]: unknown;
}

export interface ConnectorConfig {
  connector: string;
  settings: Record<string, unknown>;
  secrets?: string[];
  requiredFields?: string[];
  [key: string]: unknown;
}

export interface SetupRequirements {
  ready: boolean;
  missing: string[];
  optional: string[];
  [key: string]: unknown;
}

export interface OpenClawDiagnosticResponse {
  overall: string;
  checks: OpenClawDiagnostic[];
  timestamp: string;
  [key: string]: unknown;
}

export interface ResearchRecord {
  id: string;
  campaignId: string;
  source: string;
  url?: string;
  domain?: string;
  title?: string;
  insight?: string;
  summary?: string;
  finding?: string;
  content?: string;
  origin?: string;
  sourceUrl?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ProspectingPlan {
  id: string;
  campaignId: string;
  strategy: string;
  sources: string[];
  filters: Record<string, unknown>;
  idealPersona?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SourcedContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  linkedinUrl?: string;
  source: string;
  score?: number;
  status?: string;
  [key: string]: unknown;
}

export interface ProspectingRun {
  id: string;
  campaignId: string;
  status: string;
  source: string;
  contactsFound: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ProspectPipeline {
  campaignId: string;
  stages: ProspectStage[];
  totalProspects: number;
  lastUpdated?: string;
  [key: string]: unknown;
}

export interface ProspectStage {
  name: string;
  count: number;
  prospects: SourcedContact[];
  [key: string]: unknown;
}

export interface ActivationRun {
  id: string;
  campaignId: string;
  status: string;
  channels: string[];
  contactsActivated: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  [key: string]: unknown;
}

export interface FundingInvestor {
  id: string;
  campaignId: string;
  name: string;
  firm: string;
  type: string;
  status: string;
  matchScore: number;
  email?: string;
  linkedin?: string;
  checkSize?: string;
  focus?: string[];
  stage?: string;
  location?: string;
  enrichment?: Record<string, unknown>;
  lastEnrichedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface FundingPipeline {
  campaignId: string;
  investors: FundingInvestor[];
  stages: FundingStage[];
  summary: FundingSummary;
  lastUpdated?: string;
  [key: string]: unknown;
}

export interface FundingStage {
  name: string;
  count: number;
  investors: FundingInvestor[];
  [key: string]: unknown;
}

export interface FundingSummary {
  total: number;
  reached: number;
  responded: number;
  interested: number;
  committed: number;
  passed: number;
  [key: string]: unknown;
}

export interface FundingOutreachEvent {
  id: string;
  campaignId: string;
  investorId: string;
  investorName: string;
  type: string;
  channel: string;
  status: string;
  sentAt?: string;
  respondedAt?: string;
  subject?: string;
  body?: string;
  error?: string;
  [key: string]: unknown;
}

export interface FundingRun {
  id: string;
  campaignId: string;
  status: string;
  investorsTargeted: number;
  investorsReached: number;
  responses: number;
  meetingsBooked: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  [key: string]: unknown;
}

export interface OutreachEvent {
  id: string;
  campaignId: string;
  targetId?: string;
  type: string;
  channel: string;
  status: string;
  sentAt?: string;
  subject?: string;
  error?: string;
  [key: string]: unknown;
}

export interface DlqMessage {
  id: string;
  campaignId: string;
  error: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DlqState {
  messages: DlqMessage[];
  count: number;
  lastMessage?: string;
  [key: string]: unknown;
}

export interface SafetyExecution {
  id: string;
  campaignId: string;
  status: string;
  rule: string;
  checkedAt?: string;
  passed?: boolean;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AnalyticsEvent {
  id: string;
  campaignId: string;
  type: string;
  channel: string;
  count: number;
  date?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Contact {
  id: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Opportunity {
  id: string;
  pipelineId?: string;
  contactId?: string;
  name: string;
  status: string;
  monetaryValue?: number;
  stage?: string;
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Pipeline {
  id: string;
  locationId?: string;
  name: string;
  stages?: PipelineStage[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PipelineStage {
  id: string;
  name: string;
  position?: number;
  [key: string]: unknown;
}

export interface Workflow {
  id: string;
  locationId?: string;
  name: string;
  status?: string;
  steps?: WorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  position?: number;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Note {
  id: string;
  contactId: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  contactId?: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CalendarEvent {
  id: string;
  contactId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Tag {
  id: string;
  locationId?: string;
  name: string;
  color?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface IngestOutcomePayload {
  outcomes: Array<{
    type: string;
    source: string;
    data: Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

export interface AutomationPayload {
  campaignId?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface PromptAutopilotPayload {
  prompt: string;
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ContentGeneratePayload {
  campaignId: string;
  locales?: string[];
  reason?: string;
  [key: string]: unknown;
}

export interface GhlSyncOptions {
  locationId?: string;
  limit?: number;
  [key: string]: unknown;
}

// ─── 3. HELPER FUNCTIONS ─────────────────────────────────────────────────────

export function titleCase(str: string): string {
  return str
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function makeTimestamp(): string {
  return new Date().toISOString();
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function buildVariations(state: Record<string, unknown>): Variation[] {
  const cp = state?.latestContentPack as
    | ContentPack
    | undefined;
  if (cp && Array.isArray(cp.variants)) return cp.variants;
  return [];
}

export function buildMetrics(state: Record<string, unknown>): Metric[] {
  const m = state?.metrics as CampaignMetrics | undefined;
  if (!m) return [];
  const out: Metric[] = [];
  if (m.impressions != null)
    out.push({
      id: "impressions",
      name: "Impressions",
      value: m.impressions,
      unit: "count",
      timestamp: makeTimestamp(),
    });
  if (m.clicks != null)
    out.push({
      id: "clicks",
      name: "Clicks",
      value: m.clicks,
      unit: "count",
      timestamp: makeTimestamp(),
    });
  if (m.conversions != null)
    out.push({
      id: "conversions",
      name: "Conversions",
      value: m.conversions,
      unit: "count",
      timestamp: makeTimestamp(),
    });
  if (m.sent != null)
    out.push({
      id: "sent",
      name: "Sent",
      value: m.sent,
      unit: "count",
      timestamp: makeTimestamp(),
    });
  if (m.opened != null)
    out.push({
      id: "opened",
      name: "Opened",
      value: m.opened,
      unit: "count",
      timestamp: makeTimestamp(),
    });
  if (m.replied != null)
    out.push({
      id: "replied",
      name: "Replied",
      value: m.replied,
      unit: "count",
      timestamp: makeTimestamp(),
    });
  if (m.booked != null)
    out.push({
      id: "booked",
      name: "Booked",
      value: m.booked,
      unit: "count",
      timestamp: makeTimestamp(),
    });
  return out;
}

export function poll<T>(
  fetcher: () => Promise<T>,
  callback: (data: T) => void,
  intervalMs: number
): () => void {
  let alive = true;
  const tick = async () => {
    if (!alive) return;
    try {
      const data = await fetcher();
      if (alive) callback(data);
    } catch {
      /* silent */
    }
    if (alive) setTimeout(tick, intervalMs);
  };
  tick();
  return () => {
    alive = false;
  };
}


// ─── 4. DATA SERVICE EXPORT ──────────────────────────────────────────────────

export const dataService = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  async verifyCredentials(): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/state");
  },

  // ─── Campaigns ─────────────────────────────────────────────────────────────
  async getCampaign(campaignId: string): Promise<Campaign> {
    return api<Campaign>(`/campaigns/${encodeURIComponent(campaignId)}`);
  },

  async updateCampaign(
    campaignId: string,
    data: Record<string, unknown>
  ): Promise<Campaign> {
    return api<Campaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify({ id: campaignId, ...data }),
    });
  },

  async getCampaigns(): Promise<Campaign[]> {
    return api<Campaign[]>("/campaigns");
  },

  async getState(): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/state");
  },

  // ─── Memory ────────────────────────────────────────────────────────────────
  async getMemoryRecall(
    campaignId: string,
    targetId?: string
  ): Promise<MemoryRecall> {
    const qs = new URLSearchParams({ campaignId });
    if (targetId) qs.append("targetId", targetId);
    return api<MemoryRecall>(`/memory/recall?${qs.toString()}`);
  },

  async getPlaybooks(campaignId: string): Promise<MemoryPlaybook[]> {
    return api<MemoryPlaybook[]>(
      `/memory/playbooks?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async consolidateMemory(campaignId: string): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/memory/consolidate", {
      method: "POST",
      body: JSON.stringify({ campaignId }),
    });
  },

  // ─── Targets ───────────────────────────────────────────────────────────────
  async getTargets(campaignId: string): Promise<TargetProfile[]> {
    return api<TargetProfile[]>(
      `/targets?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async getTargetProfiles(campaignId: string): Promise<TargetProfile[]> {
    return api<TargetProfile[]>(
      `/memory/targets?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async getTargetDecision(
    campaignId: string
  ): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/targets/decide", {
      method: "POST",
      body: JSON.stringify({ campaignId }),
    });
  },

  async getReengagementQueue(
    campaignId: string
  ): Promise<Record<string, unknown>[]> {
    return api<Record<string, unknown>[]>(
      `/reengagement?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  // ─── Research ──────────────────────────────────────────────────────────────
  async getResearchRecords(campaignId: string): Promise<ResearchRecord[]> {
    return api<ResearchRecord[]>(
      `/research/records?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async addResearchRecord(
    record: Partial<ResearchRecord>
  ): Promise<ResearchRecord> {
    return api<ResearchRecord>("/research/records", {
      method: "POST",
      body: JSON.stringify(record),
    });
  },

  // ─── Prospecting ───────────────────────────────────────────────────────────
  async getProspectingPlan(campaignId: string): Promise<ProspectingPlan> {
    return api<ProspectingPlan>(
      `/prospecting/plan?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async generateProspects(
    campaignId: string,
    payload?: Record<string, unknown>
  ): Promise<ProspectingRun> {
    return api<ProspectingRun>("/prospecting/generate", {
      method: "POST",
      body: JSON.stringify({ campaignId, ...payload }),
    });
  },

  async getProspects(campaignId: string): Promise<SourcedContact[]> {
    return api<SourcedContact[]>(
      `/prospects?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async importProspects(
    campaignId: string,
    contacts: SourcedContact[],
    source?: string
  ): Promise<{ imported: number; skipped: number }> {
    return api<{ imported: number; skipped: number }>("/prospects/import", {
      method: "POST",
      body: JSON.stringify({ campaignId, contacts, source }),
    });
  },

  async getProspectingRuns(campaignId: string): Promise<ProspectingRun[]> {
    return api<ProspectingRun[]>(
      `/prospecting/runs?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async getProspectPipeline(campaignId: string): Promise<ProspectPipeline> {
    return api<ProspectPipeline>(
      `/prospects/pipeline?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async enrichProspects(
    campaignId: string,
    payload?: Record<string, unknown>
  ): Promise<{ enriched: number }> {
    return api<{ enriched: number }>("/prospects/enrich", {
      method: "POST",
      body: JSON.stringify({ campaignId, ...payload }),
    });
  },

  async sequenceProspects(
    campaignId: string,
    payload?: Record<string, unknown>
  ): Promise<{ sequenced: number }> {
    return api<{ sequenced: number }>("/prospects/sequence", {
      method: "POST",
      body: JSON.stringify({ campaignId, ...payload }),
    });
  },

  async getActivationRuns(campaignId: string): Promise<ActivationRun[]> {
    return api<ActivationRun[]>(
      `/prospects/activation-runs?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  // ─── Funding ───────────────────────────────────────────────────────────────
  async importFundingInvestors(
    campaignId: string,
    records: Partial<FundingInvestor>[]
  ): Promise<{ imported: number; errors: string[] }> {
    return api<{ imported: number; errors: string[] }>("/funding/investors", {
      method: "POST",
      body: JSON.stringify({ campaignId, records }),
    });
  },

  async getFundingInvestors(campaignId: string): Promise<FundingInvestor[]> {
    return api<FundingInvestor[]>(
      `/funding/investors?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async getFundingPipeline(campaignId: string): Promise<FundingPipeline> {
    return api<FundingPipeline>(
      `/funding/pipeline?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async runFundingSequence(
    campaignId: string,
    payload?: Record<string, unknown>
  ): Promise<FundingRun> {
    return api<FundingRun>("/funding/sequence", {
      method: "POST",
      body: JSON.stringify({ campaignId, ...payload }),
    });
  },

  async runFundingCampaign(
    campaignId: string,
    payload?: Record<string, unknown>
  ): Promise<FundingRun> {
    return api<FundingRun>("/funding/run", {
      method: "POST",
      body: JSON.stringify({ campaignId, ...payload }),
    });
  },

  async runFunding(campaignId: string): Promise<FundingRun> {
    return api<FundingRun>("/funding/run", {
      method: "POST",
      body: JSON.stringify({ campaignId }),
    });
  },

  async getFundingRuns(campaignId: string): Promise<FundingRun[]> {
    return api<FundingRun[]>(
      `/funding/runs?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async getFundingOutreachEvents(
    campaignId: string
  ): Promise<FundingOutreachEvent[]> {
    return api<FundingOutreachEvent[]>(
      `/funding/outreach-events?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async getEnrichmentProvidersStatus(): Promise<
    Array<{ provider: string; available: boolean }>
  > {
    return api<Array<{ provider: string; available: boolean }>>(
      "/funding/enrichment-status"
    );
  },

  async runEnrichment(
    campaignId: string
  ): Promise<{ enriched: number; errors: string[] }> {
    return api<{ enriched: number; errors: string[] }>("/funding/enrich", {
      method: "POST",
      body: JSON.stringify({ campaignId }),
    });
  },

  async sendInvestorDeck(
    campaignId: string,
    investorId: string
  ): Promise<{ sent: boolean }> {
    return api<{ sent: boolean }>("/funding/send-deck", {
      method: "POST",
      body: JSON.stringify({ campaignId, investorId }),
    });
  },

  async logInvestorEvent(
    campaignId: string,
    investorId: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/funding/log-event", {
      method: "POST",
      body: JSON.stringify({ campaignId, investorId, ...payload }),
    });
  },

  // ─── Analytics & Outreach ──────────────────────────────────────────────────
  async getAnalyticsEvents(campaignId: string): Promise<AnalyticsEvent[]> {
    return api<AnalyticsEvent[]>(
      `/analytics/events?campaignId=${encodeURIComponent(campaignId)}`
    );
  },

  async getOutreachEvents(
    campaignId: string,
    targetId?: string
  ): Promise<OutreachEvent[]> {
    const qs = new URLSearchParams({ campaignId });
    if (targetId) qs.append("targetId", targetId);
    return api<OutreachEvent[]>(`/outreach/events?${qs.toString()}`);
  },

  // ─── Connectors ────────────────────────────────────────────────────────────
  async getConnectorStatuses(
    probe?: boolean
  ): Promise<ConnectorStatus[]> {
    const qs = new URLSearchParams();
    if (probe !== undefined) qs.append("probe", String(probe));
    const query = qs.toString();
    return api<ConnectorStatus[]>(
      `/connectors/status${query ? `?${query}` : ""}`
    );
  },

  async getSetupRequirements(): Promise<SetupRequirements> {
    return api<SetupRequirements>("/setup/requirements");
  },

  async getOpenClawDiagnostics(): Promise<OpenClawDiagnosticResponse> {
    return api<OpenClawDiagnosticResponse>("/diagnostics/openclaw");
  },

  async getConnectorConfig(connector: string): Promise<ConnectorConfig> {
    return api<ConnectorConfig>(
      `/connectors/${encodeURIComponent(connector)}/config`
    );
  },

  async updateConnectorConfig(
    connector: string,
    payload: Record<string, unknown>
  ): Promise<ConnectorConfig> {
    return api<ConnectorConfig>(
      `/connectors/${encodeURIComponent(connector)}/config`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  // ─── Content & Automation ──────────────────────────────────────────────────
  async ingestOutcomes(
    payload: IngestOutcomePayload
  ): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/ingest/outcomes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async runAutomation(
    campaignId?: string,
    reason?: string
  ): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/automation/run", {
      method: "POST",
      body: JSON.stringify({ campaignId, reason: reason || "ui-request" }),
    });
  },

  async runPromptAutopilot(
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/automation/prompt-run", {
      method: "POST",
      body: JSON.stringify({ prompt, ...options }),
    });
  },

  async generateContent(
    campaignId: string,
    locales?: string[]
  ): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/content/generate", {
      method: "POST",
      body: JSON.stringify({
        campaignId,
        locales,
        reason: "ui-request",
      }),
    });
  },

  // ─── Dedupe ────────────────────────────────────────────────────────────────
  async dedupeCheck(key: string): Promise<{ exists: boolean; key: string }> {
    return api<{ exists: boolean; key: string }>(
      `/dedupe/check?key=${encodeURIComponent(key)}`
    );
  },

  // ─── DLQ & Safety ──────────────────────────────────────────────────────────
  async getDlq(campaignId: string): Promise<DlqState> {
    return api<DlqState>(`/dlq?campaignId=${encodeURIComponent(campaignId)}`);
  },

  async getSafetyExecutions(
    campaignId: string,
    status?: string
  ): Promise<SafetyExecution[]> {
    const qs = new URLSearchParams({ campaignId });
    if (status) qs.append("status", status);
    return api<SafetyExecution[]>(`/safety/executions?${qs.toString()}`);
  },

  // ─── Health ────────────────────────────────────────────────────────────────
  async getHealth(): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>("/health");
  },


  // ─── CRM - Contacts ────────────────────────────────────────────────────────
  async getContacts(
    locationId?: string,
    campaignId?: string
  ): Promise<Contact[]> {
    const qs = new URLSearchParams();
    if (locationId) qs.append("locationId", locationId);
    if (campaignId) qs.append("campaignId", campaignId);
    const query = qs.toString();
    return api<Contact[]>(`/contacts${query ? `?${query}` : ""}`);
  },

  async getContact(id: string): Promise<Contact> {
    return api<Contact>(`/contacts/${encodeURIComponent(id)}`);
  },

  async saveContact(data: Partial<Contact>): Promise<Contact> {
    return api<Contact>("/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteContact(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(`/contacts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ─── CRM - Opportunities ───────────────────────────────────────────────────
  async getOpportunities(
    pipelineId?: string,
    contactId?: string
  ): Promise<Opportunity[]> {
    const qs = new URLSearchParams();
    if (pipelineId) qs.append("pipelineId", pipelineId);
    if (contactId) qs.append("contactId", contactId);
    const query = qs.toString();
    return api<Opportunity[]>(`/opportunities${query ? `?${query}` : ""}`);
  },

  async getOpportunity(id: string): Promise<Opportunity> {
    return api<Opportunity>(`/opportunities/${encodeURIComponent(id)}`);
  },

  async saveOpportunity(data: Partial<Opportunity>): Promise<Opportunity> {
    return api<Opportunity>("/opportunities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteOpportunity(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(
      `/opportunities/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  },

  // ─── CRM - Pipelines ───────────────────────────────────────────────────────
  async getPipelines(locationId?: string): Promise<Pipeline[]> {
    const qs = new URLSearchParams();
    if (locationId) qs.append("locationId", locationId);
    const query = qs.toString();
    return api<Pipeline[]>(`/pipelines${query ? `?${query}` : ""}`);
  },

  async getPipeline(id: string): Promise<Pipeline> {
    return api<Pipeline>(`/pipelines/${encodeURIComponent(id)}`);
  },

  async savePipeline(data: Partial<Pipeline>): Promise<Pipeline> {
    return api<Pipeline>("/pipelines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deletePipeline(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(
      `/pipelines/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  },

  // ─── CRM - Workflows ───────────────────────────────────────────────────────
  async getWorkflows(locationId?: string): Promise<Workflow[]> {
    const qs = new URLSearchParams();
    if (locationId) qs.append("locationId", locationId);
    const query = qs.toString();
    return api<Workflow[]>(`/workflows${query ? `?${query}` : ""}`);
  },

  async getWorkflow(id: string): Promise<Workflow> {
    return api<Workflow>(`/workflows/${encodeURIComponent(id)}`);
  },

  async saveWorkflow(data: Partial<Workflow>): Promise<Workflow> {
    return api<Workflow>("/workflows", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteWorkflow(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(
      `/workflows/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  },

  // ─── CRM - Notes ───────────────────────────────────────────────────────────
  async getNotes(contactId?: string): Promise<Note[]> {
    const qs = new URLSearchParams();
    if (contactId) qs.append("contactId", contactId);
    const query = qs.toString();
    return api<Note[]>(`/notes${query ? `?${query}` : ""}`);
  },

  async saveNote(data: Partial<Note>): Promise<Note> {
    return api<Note>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteNote(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(`/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ─── CRM - Tasks ───────────────────────────────────────────────────────────
  async getTasks(contactId?: string): Promise<Task[]> {
    const qs = new URLSearchParams();
    if (contactId) qs.append("contactId", contactId);
    const query = qs.toString();
    return api<Task[]>(`/tasks${query ? `?${query}` : ""}`);
  },

  async saveTask(data: Partial<Task>): Promise<Task> {
    return api<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(`/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ─── CRM - Calendar ────────────────────────────────────────────────────────
  async getCalendarEvents(contactId?: string): Promise<CalendarEvent[]> {
    const qs = new URLSearchParams();
    if (contactId) qs.append("contactId", contactId);
    const query = qs.toString();
    return api<CalendarEvent[]>(
      `/calendarEvents${query ? `?${query}` : ""}`
    );
  },

  async saveCalendarEvent(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return api<CalendarEvent>("/calendarEvents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteCalendarEvent(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(
      `/calendarEvents/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  },

  // ─── CRM - Tags ────────────────────────────────────────────────────────────
  async getTags(locationId?: string): Promise<Tag[]> {
    const qs = new URLSearchParams();
    if (locationId) qs.append("locationId", locationId);
    const query = qs.toString();
    return api<Tag[]>(`/tags${query ? `?${query}` : ""}`);
  },

  async saveTag(data: Partial<Tag>): Promise<Tag> {
    return api<Tag>("/tags", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteTag(id: string): Promise<{ success: boolean }> {
    return api<{ success: boolean }>(`/tags/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ─── CRM - Relationships ───────────────────────────────────────────────────
  async getContactOpportunities(contactId: string): Promise<Opportunity[]> {
    return api<Opportunity[]>(
      `/contacts/${encodeURIComponent(contactId)}/opportunities`
    );
  },

  async getContactNotes(contactId: string): Promise<Note[]> {
    return api<Note[]>(`/contacts/${encodeURIComponent(contactId)}/notes`);
  },

  async getContactTasks(contactId: string): Promise<Task[]> {
    return api<Task[]>(`/contacts/${encodeURIComponent(contactId)}/tasks`);
  },

  async getPipelineOpportunities(pipelineId: string): Promise<Opportunity[]> {
    return api<Opportunity[]>(
      `/pipelines/${encodeURIComponent(pipelineId)}/opportunities`
    );
  },

  async getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
    return api<WorkflowStep[]>(
      `/workflows/${encodeURIComponent(workflowId)}/steps`
    );
  },


  // ─── GHL Integration ───────────────────────────────────────────────────────
  async ghlWebhook(
    body: Record<string, unknown>,
    campaignId?: string
  ): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams();
    if (campaignId) qs.append("campaignId", campaignId);
    const query = qs.toString();
    return api<Record<string, unknown>>(
      `/integrations/ghl/webhook${query ? `?${query}` : ""}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },

  async ghlSyncContacts(
    campaignId: string,
    options?: GhlSyncOptions
  ): Promise<{ synced: number; errors: string[] }> {
    return api<{ synced: number; errors: string[] }>(
      "/integrations/ghl/sync/contacts",
      {
        method: "POST",
        body: JSON.stringify({ campaignId, ...options }),
      }
    );
  },

  async ghlSyncOpportunities(
    campaignId: string,
    options?: GhlSyncOptions
  ): Promise<{ synced: number; errors: string[] }> {
    return api<{ synced: number; errors: string[] }>(
      "/integrations/ghl/sync/opportunities",
      {
        method: "POST",
        body: JSON.stringify({ campaignId, ...options }),
      }
    );
  },

  async ghlSyncPipelines(
    campaignId: string,
    options?: GhlSyncOptions
  ): Promise<{ synced: number; errors: string[] }> {
    return api<{ synced: number; errors: string[] }>(
      "/integrations/ghl/sync/pipelines",
      {
        method: "POST",
        body: JSON.stringify({ campaignId, ...options }),
      }
    );
  },

  async ghlSyncWorkflows(
    campaignId: string,
    options?: GhlSyncOptions
  ): Promise<{ synced: number; errors: string[] }> {
    return api<{ synced: number; errors: string[] }>(
      "/integrations/ghl/sync/workflows",
      {
        method: "POST",
        body: JSON.stringify({ campaignId, ...options }),
      }
    );
  },

  async ghlSyncForms(
    campaignId: string,
    options?: GhlSyncOptions
  ): Promise<{ synced: number; errors: string[] }> {
    return api<{ synced: number; errors: string[] }>(
      "/integrations/ghl/sync/forms",
      {
        method: "POST",
        body: JSON.stringify({ campaignId, ...options }),
      }
    );
  },

  async ghlSyncCalendars(
    campaignId: string,
    options?: GhlSyncOptions
  ): Promise<{ synced: number; errors: string[] }> {
    return api<{ synced: number; errors: string[] }>(
      "/integrations/ghl/sync/calendars",
      {
        method: "POST",
        body: JSON.stringify({ campaignId, ...options }),
      }
    );
  },

  async ghlFullSync(
    campaignId: string,
    options?: GhlSyncOptions
  ): Promise<Record<string, unknown>> {
    return api<Record<string, unknown>>(
      "/integrations/ghl/sync/full",
      {
        method: "POST",
        body: JSON.stringify({ campaignId, ...options }),
      }
    );
  },

  async ghlPushContact(
    contact: Partial<Contact>,
    campaignId?: string
  ): Promise<{ pushed: boolean; id?: string }> {
    return api<{ pushed: boolean; id?: string }>(
      "/integrations/ghl/push/contact",
      {
        method: "POST",
        body: JSON.stringify({ ...contact, campaignId }),
      }
    );
  },

  async ghlPushOpportunity(
    opportunity: Partial<Opportunity>,
    campaignId?: string
  ): Promise<{ pushed: boolean; id?: string }> {
    return api<{ pushed: boolean; id?: string }>(
      "/integrations/ghl/push/opportunity",
      {
        method: "POST",
        body: JSON.stringify({ ...opportunity, campaignId }),
      }
    );
  },

  // ─── Polling subscriptions ─────────────────────────────────────────────────
  subscribeToVariations(
    campaignId: string,
    callback: (variations: Variation[]) => void,
    intervalMs = 5000
  ): () => void {
    return poll(
      () => this.getState(),
      (state: Record<string, unknown>) => {
        const cid = campaignId;
        void cid;
        callback(buildVariations(state));
      },
      intervalMs
    );
  },

  subscribeToPersonas(
    campaignId: string,
    callback: (personas: Persona[]) => void,
    intervalMs = 5000
  ): () => void {
    return poll(
      () => this.getTargetProfiles(campaignId),
      (profiles: TargetProfile[]) => {
        const personas: Persona[] = profiles.map((p) => ({
          id: p.id,
          name: p.company || p.targetId || p.id,
          segment: p.segment || "",
          painPoints: p.signals || [],
          channels: [],
          fitScore: p.fitScore || 0,
          status: "active",
          description: p.enrichment
            ? JSON.stringify(p.enrichment).slice(0, 200)
            : "",
          estimatedReach: 0,
        }));
        callback(personas);
      },
      intervalMs
    );
  },

  subscribeToKeywords(
    campaignId: string,
    callback: (keywords: Keyword[]) => void,
    intervalMs = 5000
  ): () => void {
    return poll(
      () => this.getResearchRecords(campaignId),
      (records: ResearchRecord[]) => {
        const keywords: Keyword[] = records.slice(0, 20).map((r, i) => ({
          id: r.id || `kw-${i}`,
          term: r.title || r.source || `record-${i}`,
          volume: 0,
          difficulty: 0,
          intent: "research",
          source: r.source || "unknown",
        }));
        callback(keywords);
      },
      intervalMs
    );
  },

  subscribeToMetrics(
    campaignId: string,
    callback: (metrics: Metric[]) => void,
    intervalMs = 5000
  ): () => void {
    return poll(
      () => this.getState(),
      (state: Record<string, unknown>) => {
        const cid = campaignId;
        void cid;
        callback(buildMetrics(state));
      },
      intervalMs
    );
  },

  // ─── Stubs ─────────────────────────────────────────────────────────────────
  addVariation(): null {
    return null;
  },

  addPersona(): null {
    return null;
  },

  addMetric(): null {
    return null;
  },

  addKeyword(): null {
    return null;
  },
};
