/**
 * Ad Campaign Store — unified storage for all advertising platforms
 * localStorage-based. Fully local. Users own their data.
 */

export type AdPlatform = "meta" | "twitter" | "reddit" | "google" | "linkedin" | "cold" | "newsletter" | "tiktok";

export interface AdCampaign {
  id: string;
  platform: AdPlatform;
  name: string;
  objective: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  budget: { amount: number; type: "daily" | "lifetime"; currency: string };
  schedule: { startDate: string; endDate: string | null };
  targeting: AdTargeting;
  creatives: AdCreative[];
  metrics: AdMetrics;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface AdTargeting {
  locations: string[];
  ageRange: { min: number; max: number };
  genders: ("male" | "female" | "all")[];
  languages: string[];
  interests: string[];
  behaviors: string[];
  keywords: string[];
  customAudiences: string[];
  excludedAudiences: string[];
  placements: string[];
  devices: string[];
  // Platform-specific
  subreddits?: string[];        // Reddit
  jobTitles?: string[];         // LinkedIn
  industries?: string[];        // LinkedIn
  seniorities?: string[];       // LinkedIn
  companySizes?: string[];      // LinkedIn
  skills?: string[];            // LinkedIn
  followerTargets?: string[];   // Twitter
  searchKeywords?: string[];    // Google
  negativeKeywords?: string[];  // Google
}

export interface AdCreative {
  id: string;
  type: string;
  headline: string;
  description: string;
  body: string;
  cta: string;
  imageUrl: string;
  videoUrl: string;
  destinationUrl: string;
  utmParams: string;
  variants: { id: string; label: string; content: string }[];
}

export interface AdMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
  reach: number;
  frequency: number;
  engagement: number;
  videoViews: number;
  leads: number;
  // Platform-specific
  upvotes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  replies?: number;
  unsubscribes?: number;
  openRate?: number;
  qualityScore?: number;
}

export interface AdSequence {
  id: string;
  campaignId: string;
  name: string;
  steps: AdSequenceStep[];
  status: "draft" | "active" | "paused";
  createdAt: string;
}

export interface AdSequenceStep {
  id: string;
  templateId: string;
  delayDays: number;
  subject: string;
  body: string;
  channel: "email" | "linkedin" | "phone" | "sms";
  status: "pending" | "sent" | "replied" | "bounced";
  sentAt: string | null;
}

const STORAGE_KEY = "sw_ad_campaigns";
const SEQUENCES_KEY = "sw_ad_sequences";

// ─── CRUD ────────────────────────────────────────────────────────────

export function loadCampaigns(): AdCampaign[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function saveCampaigns(campaigns: AdCampaign[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns)); } catch { /* silent */ }
}

export function createCampaign(campaign: Omit<AdCampaign, "id" | "createdAt" | "updatedAt" | "metrics">): AdCampaign {
  const campaigns = loadCampaigns();
  const now = new Date().toISOString();
  const newCampaign: AdCampaign = {
    ...campaign,
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
    metrics: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      spend: 0,
      conversions: 0,
      costPerConversion: 0,
      roas: 0,
      reach: 0,
      frequency: 0,
      engagement: 0,
      videoViews: 0,
      leads: 0,
    },
  };
  campaigns.push(newCampaign);
  saveCampaigns(campaigns);
  return newCampaign;
}

export function updateCampaign(id: string, updates: Partial<AdCampaign>): AdCampaign | null {
  const campaigns = loadCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  campaigns[idx] = { ...campaigns[idx], ...updates, updatedAt: new Date().toISOString() };
  saveCampaigns(campaigns);
  return campaigns[idx];
}

export function deleteCampaign(id: string): boolean {
  const campaigns = loadCampaigns();
  const filtered = campaigns.filter(c => c.id !== id);
  if (filtered.length === campaigns.length) return false;
  saveCampaigns(filtered);
  return true;
}

export function getCampaign(id: string): AdCampaign | null {
  return loadCampaigns().find(c => c.id === id) || null;
}

export function getCampaignsByPlatform(platform: AdPlatform): AdCampaign[] {
  return loadCampaigns().filter(c => c.platform === platform);
}

// ─── Metrics ─────────────────────────────────────────────────────────

export function updateCampaignMetrics(id: string, metrics: Partial<AdMetrics>): AdCampaign | null {
  const campaigns = loadCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  campaigns[idx].metrics = { ...campaigns[idx].metrics, ...metrics };
  campaigns[idx].updatedAt = new Date().toISOString();
  saveCampaigns(campaigns);
  return campaigns[idx];
}

export function getTotalSpend(): number {
  return loadCampaigns().reduce((sum, c) => sum + c.metrics.spend, 0);
}

export function getTotalImpressions(): number {
  return loadCampaigns().reduce((sum, c) => sum + c.metrics.impressions, 0);
}

export function getTotalClicks(): number {
  return loadCampaigns().reduce((sum, c) => sum + c.metrics.clicks, 0);
}

export function getTotalConversions(): number {
  return loadCampaigns().reduce((sum, c) => sum + c.metrics.conversions, 0);
}

export function getPlatformBreakdown(): Record<AdPlatform, { campaigns: number; spend: number; impressions: number; clicks: number }> {
  const platforms: AdPlatform[] = ["meta", "twitter", "reddit", "google", "linkedin", "cold", "newsletter", "tiktok"];
  const result = {} as Record<AdPlatform, { campaigns: number; spend: number; impressions: number; clicks: number }>;
  for (const p of platforms) {
    const campaigns = loadCampaigns().filter(c => c.platform === p);
    result[p] = {
      campaigns: campaigns.length,
      spend: campaigns.reduce((s, c) => s + c.metrics.spend, 0),
      impressions: campaigns.reduce((s, c) => s + c.metrics.impressions, 0),
      clicks: campaigns.reduce((s, c) => s + c.metrics.clicks, 0),
    };
  }
  return result;
}

// ─── Sequences ───────────────────────────────────────────────────────

export function loadSequences(): AdSequence[] {
  try { const raw = localStorage.getItem(SEQUENCES_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export function saveSequence(sequence: AdSequence): void {
  const sequences = loadSequences();
  const idx = sequences.findIndex(s => s.id === sequence.id);
  if (idx >= 0) sequences[idx] = sequence;
  else sequences.push(sequence);
  try { localStorage.setItem(SEQUENCES_KEY, JSON.stringify(sequences)); } catch { /* silent */ }
}

export function deleteSequence(id: string): void {
  const sequences = loadSequences().filter(s => s.id !== id);
  try { localStorage.setItem(SEQUENCES_KEY, JSON.stringify(sequences)); } catch { /* silent */ }
}

// ─── Export ──────────────────────────────────────────────────────────

export function exportCampaignsAsCSV(): string {
  const campaigns = loadCampaigns();
  const headers = ["ID", "Platform", "Name", "Objective", "Status", "Budget", "Budget Type", "Spend", "Impressions", "Clicks", "CTR", "Conversions", "ROAS", "Created"];
  const rows = campaigns.map(c => [
    c.id,
    c.platform,
    c.name,
    c.objective,
    c.status,
    c.budget.amount,
    c.budget.type,
    c.metrics.spend,
    c.metrics.impressions,
    c.metrics.clicks,
    c.metrics.ctr,
    c.metrics.conversions,
    c.metrics.roas,
    c.createdAt,
  ]);
  return [headers, ...rows].map(r => r.join(",")).join("\n");
}

export function downloadCampaignsCSV(): void {
  const csv = exportCampaignsAsCSV();
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `squidweave-campaigns-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
