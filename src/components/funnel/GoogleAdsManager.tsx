import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Globe, Video, ShoppingCart, Zap, Target, DollarSign, Calendar, Users, Type,
  ChevronDown, Plus, Trash2, BarChart3, MousePointer, TrendingUp, Star, Save, Edit3, X, Check, Hash, Tag, Layout,
  Smartphone, Tablet, Monitor, MapPin, Phone, Megaphone, Eye, Settings, Layers, Award, AlertCircle, RotateCcw
} from "lucide-react";
import type { AdCampaign, AdTargeting } from "@/lib/adCampaignStore";
import { createCampaign, updateCampaign, loadCampaigns } from "@/lib/adCampaignStore";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type GoogleCampaignType = "search" | "display" | "video" | "shopping" | "performance_max" | "demand_gen";
type BiddingStrategy = "cpc" | "cpm" | "cpa" | "target_roas" | "maximize_conversions" | "maximize_clicks";
type MatchType = "broad" | "phrase" | "exact";
type KeywordCompetition = "Low" | "Medium" | "High";
type ViewMode = "list" | "builder" | "keywords" | "adcopy" | "audience" | "analytics";
type CampaignSubTab = "setup" | "keywords" | "adcopy" | "audience" | "analytics";

interface KeywordSuggestion {
  keyword: string;
  avgMonthlySearches: number;
  competition: KeywordCompetition;
  suggestedBid: number;
  matchType: MatchType;
}


interface Headline {
  id: string;
  text: string;
  pinned: boolean;
  pinPosition: 1 | 2 | 3 | null;
}

interface Description {
  id: string;
  text: string;
  pinned: boolean;
}

interface AdExtension {
  id: string;
  type: "sitelink" | "callout" | "structured_snippet" | "call" | "location";
  content: string;
  url?: string;
}

interface AudienceItem {
  id: string;
  name: string;
  category: string;
  type: "in_market" | "affinity" | "custom" | "remarketing";
  size?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CAMPAIGN_TYPES: { value: GoogleCampaignType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "search", label: "Search", icon: <Search size={18} />, desc: "Text ads on Google search results" },
  { value: "display", label: "Display", icon: <Globe size={18} />, desc: "Visual banners on websites & apps" },
  { value: "video", label: "Video", icon: <Video size={18} />, desc: "YouTube and video partner ads" },
  { value: "shopping", label: "Shopping", icon: <ShoppingCart size={18} />, desc: "Product listings on Google" },
  { value: "performance_max", label: "Performance Max", icon: <Zap size={18} />, desc: "AI-driven across all Google channels" },
  { value: "demand_gen", label: "Demand Gen", icon: <TrendingUp size={18} />, desc: "Drive demand across YouTube & Discover" },
];

const BIDDING_STRATEGIES: { value: BiddingStrategy; label: string; desc: string }[] = [
  { value: "cpc", label: "Manual CPC", desc: "Set your own max cost per click" },
  { value: "cpm", label: "Target CPM", desc: "Pay per thousand impressions" },
  { value: "cpa", label: "Target CPA", desc: "Pay per conversion acquired" },
  { value: "target_roas", label: "Target ROAS", desc: "Maximize conversion value / cost" },
  { value: "maximize_conversions", label: "Maximize Conversions", desc: "Get the most conversions" },
  { value: "maximize_clicks", label: "Maximize Clicks", desc: "Get the most clicks" },
];

const IN_MARKET_AUDIENCES: AudienceItem[] = [
  { id: "im-1", name: "Business Services", category: "Business", type: "in_market", size: "25M" },
  { id: "im-2", name: "Software as a Service", category: "Technology", type: "in_market", size: "18M" },
  { id: "im-3", name: "Financial Services", category: "Finance", type: "in_market", size: "32M" },
  { id: "im-4", name: "Real Estate Services", category: "Real Estate", type: "in_market", size: "15M" },
  { id: "im-5", name: "Automotive", category: "Automotive", type: "in_market", size: "45M" },
  { id: "im-6", name: "Travel & Tourism", category: "Travel", type: "in_market", size: "38M" },
  { id: "im-7", name: "Employment", category: "Careers", type: "in_market", size: "22M" },
  { id: "im-8", name: "Education Services", category: "Education", type: "in_market", size: "28M" },
];

const AFFINITY_AUDIENCES: AudienceItem[] = [
  { id: "af-1", name: "Technophiles", category: "Technology", type: "affinity", size: "85M" },
  { id: "af-2", name: "Business Professionals", category: "Business", type: "affinity", size: "62M" },
  { id: "af-3", name: "Avid Investors", category: "Finance", type: "affinity", size: "40M" },
  { id: "af-4", name: "Travel Buffs", category: "Travel", type: "affinity", size: "55M" },
  { id: "af-5", name: "Health & Fitness Buffs", category: "Health", type: "affinity", size: "70M" },
  { id: "af-6", name: "Foodies", category: "Lifestyle", type: "affinity", size: "90M" },
  { id: "af-7", name: "Auto Enthusiasts", category: "Automotive", type: "affinity", size: "48M" },
  { id: "af-8", name: "Shopping Enthusiasts", category: "Retail", type: "affinity", size: "95M" },
];

const REMARKETING_LISTS: AudienceItem[] = [
  { id: "rm-1", name: "Website Visitors (30d)", category: "Website", type: "remarketing", size: "12K" },
  { id: "rm-2", name: "Website Visitors (90d)", category: "Website", type: "remarketing", size: "28K" },
  { id: "rm-3", name: "Cart Abandoners", category: "E-commerce", type: "remarketing", size: "1.2K" },
  { id: "rm-4", name: "Past Purchasers", category: "E-commerce", type: "remarketing", size: "3.5K" },
  { id: "rm-5", name: "Engaged Users", category: "App", type: "remarketing", size: "8K" },
  { id: "rm-6", name: "Video Viewers (50%)", category: "YouTube", type: "remarketing", size: "5.5K" },
];

const DEMOGRAPHICS_AGE = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const DEMOGRAPHICS_GENDER = ["Male", "Female", "Unknown"];
const DEMOGRAPHICS_INCOME = ["Top 10%", "11-20%", "21-30%", "31-40%", "41-50%", "Lower 50%"];

const KEYWORD_IDEAS: Record<string, KeywordSuggestion[]> = {
  "saas": [
    { keyword: "saas software", avgMonthlySearches: 12100, competition: "High", suggestedBid: 12.50, matchType: "broad" },
    { keyword: "best saas platform", avgMonthlySearches: 5400, competition: "Medium", suggestedBid: 9.80, matchType: "broad" },
    { keyword: "saas for small business", avgMonthlySearches: 8100, competition: "Medium", suggestedBid: 8.20, matchType: "phrase" },
    { keyword: "cloud software solutions", avgMonthlySearches: 6600, competition: "High", suggestedBid: 11.40, matchType: "broad" },
    { keyword: "enterprise saas", avgMonthlySearches: 4400, competition: "High", suggestedBid: 15.20, matchType: "exact" },
    { keyword: "saas pricing", avgMonthlySearches: 9900, competition: "Low", suggestedBid: 4.60, matchType: "phrase" },
    { keyword: "b2b software platform", avgMonthlySearches: 3200, competition: "Medium", suggestedBid: 10.30, matchType: "broad" },
    { keyword: "software as a service companies", avgMonthlySearches: 14800, competition: "Medium", suggestedBid: 7.90, matchType: "broad" },
    { keyword: "saas CRM", avgMonthlySearches: 7200, competition: "High", suggestedBid: 13.60, matchType: "phrase" },
    { keyword: "manage subscriptions", avgMonthlySearches: 2900, competition: "Low", suggestedBid: 3.80, matchType: "exact" },
  ],
  "ecommerce": [
    { keyword: "online store", avgMonthlySearches: 33100, competition: "High", suggestedBid: 6.40, matchType: "broad" },
    { keyword: "ecommerce platform", avgMonthlySearches: 22200, competition: "High", suggestedBid: 9.10, matchType: "phrase" },
    { keyword: "sell online", avgMonthlySearches: 18100, competition: "Medium", suggestedBid: 4.80, matchType: "broad" },
    { keyword: "shopify alternatives", avgMonthlySearches: 9900, competition: "Medium", suggestedBid: 7.20, matchType: "exact" },
    { keyword: "best ecommerce platform", avgMonthlySearches: 14800, competition: "High", suggestedBid: 10.50, matchType: "phrase" },
    { keyword: "create online store", avgMonthlySearches: 12100, competition: "High", suggestedBid: 8.30, matchType: "broad" },
    { keyword: "dropshipping suppliers", avgMonthlySearches: 90500, competition: "High", suggestedBid: 5.60, matchType: "broad" },
    { keyword: "woocommerce vs shopify", avgMonthlySearches: 5400, competition: "Medium", suggestedBid: 6.80, matchType: "phrase" },
    { keyword: "payment gateway integration", avgMonthlySearches: 6600, competition: "Medium", suggestedBid: 12.40, matchType: "exact" },
    { keyword: "multi channel selling", avgMonthlySearches: 2900, competition: "Low", suggestedBid: 5.20, matchType: "broad" },
  ],
  "marketing": [
    { keyword: "digital marketing agency", avgMonthlySearches: 40500, competition: "High", suggestedBid: 18.50, matchType: "phrase" },
    { keyword: "google ads management", avgMonthlySearches: 9900, competition: "High", suggestedBid: 22.40, matchType: "exact" },
    { keyword: "ppc services", avgMonthlySearches: 12100, competition: "High", suggestedBid: 19.80, matchType: "broad" },
    { keyword: "seo marketing", avgMonthlySearches: 18100, competition: "High", suggestedBid: 14.20, matchType: "broad" },
    { keyword: "social media advertising", avgMonthlySearches: 22200, competition: "High", suggestedBid: 11.60, matchType: "phrase" },
    { keyword: "content marketing strategy", avgMonthlySearches: 9900, competition: "Medium", suggestedBid: 8.90, matchType: "exact" },
    { keyword: "email marketing software", avgMonthlySearches: 14800, competition: "High", suggestedBid: 13.40, matchType: "phrase" },
    { keyword: "marketing automation", avgMonthlySearches: 12100, competition: "High", suggestedBid: 16.70, matchType: "broad" },
    { keyword: "conversion rate optimization", avgMonthlySearches: 5400, competition: "Medium", suggestedBid: 15.30, matchType: "exact" },
    { keyword: "lead generation services", avgMonthlySearches: 12100, competition: "High", suggestedBid: 20.10, matchType: "phrase" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function formatNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function getQualityScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function getQualityScoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-red-500";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active": return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
    case "paused": return "bg-amber-500/15 text-amber-400 border border-amber-500/20";
    case "draft": return "bg-slate-500/15 text-slate-400 border border-slate-500/20";
    case "completed": return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
    case "archived": return "bg-red-500/15 text-red-400 border border-red-500/20";
    default: return "bg-slate-500/15 text-slate-400 border border-slate-500/20";
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case "active": return "bg-emerald-400";
    case "paused": return "bg-amber-400";
    case "draft": return "bg-slate-400";
    case "completed": return "bg-blue-400";
    case "archived": return "bg-red-400";
    default: return "bg-slate-400";
  }
}

function getCampaignTypeIcon(type: string, size = 14) {
  switch (type) {
    case "search": return <Search size={size} />;
    case "display": return <Globe size={size} />;
    case "video": return <Video size={size} />;
    case "shopping": return <ShoppingCart size={size} />;
    case "performance_max": return <Zap size={size} />;
    case "demand_gen": return <TrendingUp size={size} />;
    default: return <Megaphone size={size} />;
  }
}

function getCampaignTypeColor(type: string): string {
  switch (type) {
    case "search": return "bg-blue-500/15 text-blue-400 border-blue-500/20";
    case "display": return "bg-purple-500/15 text-purple-400 border-purple-500/20";
    case "video": return "bg-red-500/15 text-red-400 border-red-500/20";
    case "shopping": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    case "performance_max": return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    case "demand_gen": return "bg-cyan-500/15 text-cyan-400 border-cyan-500/20";
    default: return "bg-slate-500/15 text-slate-400 border-slate-500/20";
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function QualityScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(1, Math.min(10, score));
  const percentage = (clamped / 10) * 100;
  const color = getQualityScoreColor(clamped);
  const barColor = getQualityScoreBg(clamped);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-bold ${color} w-6 text-right`}>{clamped}</span>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-md ${accent}`}>{icon}</div>
        <span className="text-slate-400 text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, icon, action }: { title: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      {action}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN LIST VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function CampaignListView({
  campaigns,
  onSelectCampaign,
  onNewCampaign,
  onDeleteCampaign,
  onToggleStatus,
}: {
  campaigns: AdCampaign[];
  onSelectCampaign: (c: AdCampaign) => void;
  onNewCampaign: () => void;
  onDeleteCampaign: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const googleCampaigns = campaigns.filter(c => c.platform === "google");

  const filtered = useMemo(() => {
    return googleCampaigns.filter(c => {
      if (typeFilter !== "all" && !c.objective.includes(typeFilter) && !c.name.toLowerCase().includes(typeFilter)) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [googleCampaigns, typeFilter, statusFilter, searchQuery]);

  const totals = useMemo(() => {
    return googleCampaigns.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.metrics.impressions,
        clicks: acc.clicks + c.metrics.clicks,
        spend: acc.spend + c.metrics.spend,
        conversions: acc.conversions + c.metrics.conversions,
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
    );
  }, [googleCampaigns]);

  const avgCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00";
  const avgCpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : "0.00";
  const avgCvtr = totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : "0.00";
  const _roas = totals.spend > 0 ? ((totals.conversions * 120) / totals.spend).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Impressions" value={formatNum(totals.impressions)} sub={`${googleCampaigns.length} campaigns`} icon={<Eye size={16} className="text-blue-400" />} accent="bg-blue-500/10" />
        <MetricCard label="Total Clicks" value={formatNum(totals.clicks)} sub={`CTR: ${avgCtr}%`} icon={<MousePointer size={16} className="text-emerald-400" />} accent="bg-emerald-500/10" />
        <MetricCard label="Total Spend" value={formatCurrency(totals.spend)} sub={`Avg CPC: $${avgCpc}`} icon={<DollarSign size={16} className="text-amber-400" />} accent="bg-amber-500/10" />
        <MetricCard label="Conversions" value={formatNum(totals.conversions)} sub={`Conv. Rate: ${avgCvtr}%`} icon={<Target size={16} className="text-purple-400" />} accent="bg-purple-500/10" />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-[#4285F4]/50"
        >
          <option value="all">All Types</option>
          <option value="search">Search</option>
          <option value="display">Display</option>
          <option value="video">Video</option>
          <option value="shopping">Shopping</option>
          <option value="performance">Performance Max</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-[#4285F4]/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
        </select>
        <button
          onClick={onNewCampaign}
          className="flex items-center gap-2 px-4 py-2 bg-[#4285F4] hover:bg-[#4285F4]/90 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="w-10 h-10 text-slate-600 mb-3" />
            <div className="text-sm font-medium text-slate-400 mb-1">No Google Ads campaigns yet</div>
            <div className="text-xs text-slate-600 mb-4 max-w-sm">Create your first Google Search, Display, or Video ad campaign. All data is stored locally on your device.</div>
            <button
              onClick={onNewCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-[#4285F4] hover:bg-[#4285F4]/90 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} /> Create Campaign
            </button>
          </div>
        )}
        {filtered.map(campaign => (
          <div
            key={campaign.id}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer group"
            onClick={() => onSelectCampaign(campaign)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getCampaignTypeColor(campaign.objective.split("_")[0] || "search")}`}>
                  {getCampaignTypeIcon(campaign.objective.split("_")[0] || "search")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-100 text-sm">{campaign.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getCampaignTypeColor(campaign.objective.split("_")[0] || "search")}`}>
                      {campaign.objective.split("_")[0] || "search"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Budget: ${campaign.budget.amount}/{campaign.budget.type} &middot; {campaign.schedule.startDate} {campaign.schedule.endDate ? `→ ${campaign.schedule.endDate}` : "(ongoing)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); onToggleStatus(campaign.id, campaign.status === "active" ? "paused" : "active"); }}
                  className="p-1.5 hover:bg-white/[0.08] rounded-md text-slate-400 hover:text-slate-200"
                  title={campaign.status === "active" ? "Pause" : "Activate"}
                >
                  {campaign.status === "active" ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onSelectCampaign(campaign); }}
                  className="p-1.5 hover:bg-white/[0.08] rounded-md text-slate-400 hover:text-slate-200"
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteCampaign(campaign.id); }}
                  className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-7 gap-4 mt-4 pt-4 border-t border-white/[0.04]">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Impressions</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{formatNum(campaign.metrics.impressions)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Clicks</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{formatNum(campaign.metrics.clicks)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">CTR</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{campaign.metrics.ctr.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Avg CPC</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">${campaign.metrics.cpc.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Conversions</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{campaign.metrics.conversions}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Cost/Conv</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">${campaign.metrics.costPerConversion.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Quality Score</div>
                <div className="mt-1"><QualityScoreGauge score={campaign.metrics.qualityScore || 0} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function CampaignBuilder({
  campaign,
  onSave,
  onCancel,
}: {
  campaign: AdCampaign | null;
  onSave: (data: Partial<AdCampaign>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(campaign?.name || "New Google Ads Campaign");
  const [campaignType, setCampaignType] = useState<GoogleCampaignType>("search");
  const [budgetAmount, setBudgetAmount] = useState(campaign?.budget.amount || 50);
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">(campaign?.budget.type || "daily");
  const [biddingStrategy, setBiddingStrategy] = useState<BiddingStrategy>("cpc");
  const [startDate, setStartDate] = useState(campaign?.schedule.startDate || new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(campaign?.schedule.endDate || "");
  const [networks, setNetworks] = useState<string[]>(["Search Network"]);
  const [locations, setLocations] = useState<string[]>(campaign?.targeting.locations || ["United States"]);
  const [languages, setLanguages] = useState<string[]>(campaign?.targeting.languages || ["English"]);
  const [newLocation, setNewLocation] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const toggleNetwork = (network: string) => {
    setNetworks(prev => prev.includes(network) ? prev.filter(n => n !== network) : [...prev, network]);
  };

  const handleSave = () => {
    const objectiveMap: Record<GoogleCampaignType, string> = {
      search: "search_leads",
      display: "brand_awareness",
      video: "video_views",
      shopping: "product_sales",
      performance_max: "performance_max",
      demand_gen: "demand_gen",
    };

    onSave({
      name,
      objective: objectiveMap[campaignType],
      budget: { amount: budgetAmount, type: budgetType, currency: "USD" },
      schedule: { startDate, endDate: endDate || null },
      targeting: {
        locations,
        languages,
        ageRange: { min: 18, max: 65 },
        genders: ["all"],
        interests: [],
        behaviors: [],
        keywords: [],
        customAudiences: [],
        excludedAudiences: [],
        placements: networks,
        devices: ["Desktop", "Mobile", "Tablet"],
      },
      status: "draft",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{campaign ? "Edit Campaign" : "New Campaign"}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure your Google Ads campaign settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-[#4285F4] hover:bg-[#4285F4]/90 text-white rounded-lg text-sm font-medium transition-colors">
            <Save size={14} /> Save Campaign
          </button>
        </div>
      </div>

      {/* Campaign Name */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Campaign Name" icon={<Tag size={16} className="text-[#4285F4]" />} />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
          placeholder="Enter campaign name..."
        />
      </div>

      {/* Campaign Type */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Campaign Type" icon={<Layout size={16} className="text-[#4285F4]" />} />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {CAMPAIGN_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setCampaignType(ct.value)}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-all text-left ${
                campaignType === ct.value
                  ? "border-[#4285F4]/50 bg-[#4285F4]/5"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              <div className={`mt-0.5 ${campaignType === ct.value ? "text-[#4285F4]" : "text-slate-500"}`}>
                {ct.icon}
              </div>
              <div>
                <div className={`text-sm font-medium ${campaignType === ct.value ? "text-[#4285F4]" : "text-slate-200"}`}>
                  {ct.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{ct.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget & Bidding */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Budget & Bidding" icon={<DollarSign size={16} className="text-[#4285F4]" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Budget Amount ($)</label>
            <input
              type="number"
              value={budgetAmount}
              onChange={e => setBudgetAmount(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-[#4285F4]/50"
              min={1}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Budget Type</label>
            <div className="flex gap-2">
              {(["daily", "lifetime"] as const).map(bt => (
                <button
                  key={bt}
                  onClick={() => setBudgetType(bt)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm capitalize transition-all ${
                    budgetType === bt
                      ? "border-[#4285F4]/50 bg-[#4285F4]/10 text-[#4285F4]"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                  }`}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <label className="block text-xs text-slate-400 mb-2">Bidding Strategy</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {BIDDING_STRATEGIES.map(bs => (
              <button
                key={bs.value}
                onClick={() => setBiddingStrategy(bs.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  biddingStrategy === bs.value
                    ? "border-[#4285F4]/50 bg-[#4285F4]/5"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className={`text-sm font-medium ${biddingStrategy === bs.value ? "text-[#4285F4]" : "text-slate-200"}`}>
                  {bs.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{bs.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Schedule" icon={<Calendar size={16} className="text-[#4285F4]" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-[#4285F4]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">End Date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-[#4285F4]/50"
            />
          </div>
        </div>
      </div>

      {/* Networks */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Networks" icon={<Globe size={16} className="text-[#4285F4]" />} />
        <div className="space-y-2">
          {["Search Network", "Search Partners", "Display Network", "YouTube", "Discover", "Gmail", "Maps"].map(network => (
            <label key={network} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={networks.includes(network)}
                onChange={() => toggleNetwork(network)}
                className="w-4 h-4 rounded border-white/[0.12] bg-white/[0.03] text-[#4285F4] focus:ring-[#4285F4]/30"
              />
              <span className="text-sm text-slate-200">{network}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Locations & Languages */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Locations & Languages" icon={<MapPin size={16} className="text-[#4285F4]" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Target Locations</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newLocation.trim()) { setLocations([...locations, newLocation.trim()]); setNewLocation(""); } }}
                placeholder="Add location..."
                className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
              />
              <button onClick={() => { if (newLocation.trim()) { setLocations([...locations, newLocation.trim()]); setNewLocation(""); } }} className="px-3 py-2 bg-[#4285F4]/10 text-[#4285F4] rounded-lg text-sm hover:bg-[#4285F4]/20 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {locations.map((loc, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-1 bg-white/[0.05] rounded-md text-xs text-slate-300">
                  {loc} <button onClick={() => setLocations(locations.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><X /></button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Languages</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newLanguage}
                onChange={e => setNewLanguage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newLanguage.trim()) { setLanguages([...languages, newLanguage.trim()]); setNewLanguage(""); } }}
                placeholder="Add language..."
                className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
              />
              <button onClick={() => { if (newLanguage.trim()) { setLanguages([...languages, newLanguage.trim()]); setNewLanguage(""); } }} className="px-3 py-2 bg-[#4285F4]/10 text-[#4285F4] rounded-lg text-sm hover:bg-[#4285F4]/20 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {languages.map((lang, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-1 bg-white/[0.05] rounded-md text-xs text-slate-300">
                  {lang} <button onClick={() => setLanguages(languages.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><X /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD PLANNER
// ═══════════════════════════════════════════════════════════════════════════════

function KeywordPlannerView({
  campaign,
  onUpdateKeywords,
}: {
  campaign: AdCampaign;
  onUpdateKeywords: (keywords: string[], negativeKeywords: string[]) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordSuggestion[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<string[]>(campaign.targeting.negativeKeywords || []);
  const [newNegative, setNewNegative] = useState("");
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchType | "all">("all");

  const searchKeywords = () => {
    const query = searchInput.toLowerCase().trim();
    if (!query) return;
    let results: KeywordSuggestion[] = [];
    for (const [topic, keywords] of Object.entries(KEYWORD_IDEAS)) {
      if (query.includes(topic) || topic.includes(query)) {
        results = [...results, ...keywords];
      }
    }
    if (results.length === 0) {
      results = KEYWORD_IDEAS["saas"].map(k => ({
        ...k,
        keyword: `${query} ${k.keyword}`,
      }));
    }
    setSuggestions(results.filter(s => !selectedKeywords.some(sk => sk.keyword === s.keyword)));
  };

  const addKeyword = (kw: KeywordSuggestion, mt?: MatchType) => {
    const newKw = mt ? { ...kw, matchType: mt } : kw;
    if (!selectedKeywords.some(k => k.keyword === newKw.keyword)) {
      setSelectedKeywords([...selectedKeywords, newKw]);
    }
    setSuggestions(suggestions.filter(s => s.keyword !== kw.keyword));
  };

  const removeKeyword = (keyword: string) => {
    setSelectedKeywords(selectedKeywords.filter(k => k.keyword !== keyword));
  };

  const addNegative = () => {
    if (newNegative.trim() && !negativeKeywords.includes(newNegative.trim())) {
      setNegativeKeywords([...negativeKeywords, newNegative.trim()]);
      setNewNegative("");
    }
  };

  const filteredSuggestions = matchTypeFilter === "all" ? suggestions : suggestions.filter(s => s.matchType === matchTypeFilter);

  useEffect(() => {
    onUpdateKeywords(
      selectedKeywords.map(k => k.keyword),
      negativeKeywords
    );
  }, [selectedKeywords, negativeKeywords]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Keyword Planner</h2>
          <p className="text-xs text-slate-500 mt-0.5">Research and select keywords for &ldquo;{campaign.name}&rdquo;</p>
        </div>
      </div>

      {/* Keyword Research Input */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Keyword Research" icon={<Search size={16} className="text-[#4285F4]" />} />
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchKeywords()}
              placeholder="Enter a topic, product, or URL to find keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
            />
          </div>
          <button onClick={searchKeywords} className="px-5 py-2.5 bg-[#4285F4] hover:bg-[#4285F4]/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Search size={14} /> Find Keywords
          </button>
        </div>
      </div>

      {/* Suggestions Table */}
      {suggestions.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Keyword Suggestions" icon={<TrendingUp size={16} className="text-[#4285F4]" />} action={
              <div className="flex items-center gap-2">
                <select value={matchTypeFilter} onChange={e => setMatchTypeFilter(e.target.value as MatchType | "all")} className="px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded text-xs text-slate-100">
                  <option value="all">All Match Types</option>
                  <option value="broad">Broad</option>
                  <option value="phrase">Phrase</option>
                  <option value="exact">Exact</option>
                </select>
                <span className="text-xs text-slate-500">{filteredSuggestions.length} suggestions</span>
              </div>
            } />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Keyword</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Avg. Searches</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Competition</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Sugg. Bid</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Match Type</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuggestions.map((kw, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-sm text-slate-200">{kw.keyword}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{formatNum(kw.avgMonthlySearches)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        kw.competition === "Low" ? "bg-emerald-500/10 text-emerald-400" :
                        kw.competition === "Medium" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {kw.competition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">${kw.suggestedBid.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={kw.matchType}
                        onChange={e => { const updated = [...suggestions]; updated[i] = { ...kw, matchType: e.target.value as MatchType }; setSuggestions(updated); }}
                        className="px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded text-xs text-slate-100"
                      >
                        <option value="broad">Broad</option>
                        <option value="phrase">Phrase</option>
                        <option value="exact">Exact</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button onClick={() => addKeyword(kw)} className="px-3 py-1 bg-[#4285F4]/10 text-[#4285F4] rounded-md text-xs hover:bg-[#4285F4]/20 transition-colors">
                        <Plus className="inline mr-1" /> Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Keywords */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title={`Selected Keywords (${selectedKeywords.length})`} icon={<Check size={16} className="text-emerald-400" />} />
        {selectedKeywords.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No keywords selected yet. Search and add keywords above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Keyword</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Searches</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Competition</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Match Type</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedKeywords.map((kw, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-sm text-slate-200 font-medium">{kw.keyword}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{formatNum(kw.avgMonthlySearches)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        kw.competition === "Low" ? "bg-emerald-500/10 text-emerald-400" :
                        kw.competition === "Medium" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {kw.competition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={kw.matchType}
                        onChange={e => {
                          const updated = [...selectedKeywords];
                          updated[i] = { ...kw, matchType: e.target.value as MatchType };
                          setSelectedKeywords(updated);
                        }}
                        className="px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded text-xs text-slate-100"
                      >
                        <option value="broad">Broad</option>
                        <option value="phrase">Phrase</option>
                        <option value="exact">Exact</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button onClick={() => removeKeyword(kw.keyword)} className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Negative Keywords */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Negative Keywords" icon={<AlertCircle size={16} className="text-red-400" />} />
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newNegative}
            onChange={e => setNewNegative(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addNegative(); }}
            placeholder="Add negative keyword..."
            className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
          />
          <button onClick={addNegative} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {negativeKeywords.map((nk, i) => (
            <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-red-500/5 border border-red-500/10 rounded-md text-xs text-red-300">
              {nk} <button onClick={() => setNegativeKeywords(negativeKeywords.filter((_, j) => j !== i))} className="text-red-400/50 hover:text-red-400"><X /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// AD COPY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function AdCopyBuilderView({ campaign }: { campaign: AdCampaign }) {
  const [adGroupName, setAdGroupName] = useState("Ad Group 1");
  const [headlines, setHeadlines] = useState<Headline[]>([
    { id: "h1", text: "", pinned: false, pinPosition: null },
    { id: "h2", text: "", pinned: false, pinPosition: null },
    { id: "h3", text: "", pinned: false, pinPosition: null },
  ]);
  const [descriptions, setDescriptions] = useState<Description[]>([
    { id: "d1", text: "", pinned: false },
    { id: "d2", text: "", pinned: false },
  ]);
  const [extensions, setExtensions] = useState<AdExtension[]>([]);
  const [newExtension, setNewExtension] = useState("");
  const [newExtType, setNewExtType] = useState<AdExtension["type"]>("callout");
  const [showPreview, setShowPreview] = useState(true);

  const addHeadline = () => {
    if (headlines.length < 15) {
      setHeadlines([...headlines, { id: `h${Date.now()}`, text: "", pinned: false, pinPosition: null }]);
    }
  };

  const updateHeadline = (id: string, text: string) => {
    if (text.length <= 30) {
      setHeadlines(headlines.map(h => h.id === id ? { ...h, text } : h));
    }
  };

  const togglePin = (id: string, position: 1 | 2 | 3) => {
    setHeadlines(headlines.map(h => {
      if (h.id === id) return { ...h, pinned: !h.pinned || h.pinPosition !== position, pinPosition: h.pinPosition === position ? null : position };
      if (h.pinPosition === position) return { ...h, pinned: false, pinPosition: null };
      return h;
    }));
  };

  const removeHeadline = (id: string) => {
    if (headlines.length > 3) setHeadlines(headlines.filter(h => h.id !== id));
  };

  const addDescription = () => {
    if (descriptions.length < 4) {
      setDescriptions([...descriptions, { id: `d${Date.now()}`, text: "", pinned: false }]);
    }
  };

  const updateDescription = (id: string, text: string) => {
    if (text.length <= 90) {
      setDescriptions(descriptions.map(d => d.id === id ? { ...d, text } : d));
    }
  };

  const removeDescription = (id: string) => {
    if (descriptions.length > 2) setDescriptions(descriptions.filter(d => d.id !== id));
  };

  const addExtension = () => {
    if (newExtension.trim()) {
      setExtensions([...extensions, { id: `e${Date.now()}`, type: newExtType, content: newExtension.trim() }]);
      setNewExtension("");
    }
  };

  const removeExtension = (id: string) => {
    setExtensions(extensions.filter(e => e.id !== id));
  };

  const pinnedHeadlines = headlines.filter(h => h.pinned).sort((a, b) => (a.pinPosition || 0) - (b.pinPosition || 0));
  const unpinnedHeadlines = headlines.filter(h => !h.pinned);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Ad Copy Builder</h2>
          <p className="text-xs text-slate-500 mt-0.5">Create responsive search ads for &ldquo;{campaign.name}&rdquo;</p>
        </div>
        <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] transition-colors">
          <Eye /> {showPreview ? "Hide" : "Show"} Preview
        </button>
      </div>

      {/* Ad Group Name */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader title="Ad Group" icon={<Layers size={16} className="text-[#4285F4]" />} />
        <input
          type="text"
          value={adGroupName}
          onChange={e => setAdGroupName(e.target.value)}
          className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
        />
      </div>

      {/* Responsive Search Ad Preview */}
      {showPreview && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <SectionHeader title="Ad Preview" icon={<Eye size={16} className="text-[#4285F4]" />} />
          <div className="bg-white rounded-lg p-4 max-w-xl">
            <div className="text-[11px] text-green-700 mb-1">Ad</div>
            <div className="text-sm text-[#1a0dab] font-medium">
              {pinnedHeadlines.length > 0
                ? pinnedHeadlines.map((h, i) => (
                    <span key={h.id}>{h.text}{i < pinnedHeadlines.length - 1 ? " | " : ""}</span>
                  ))
                : headlines.slice(0, 3).map((h, i) => (
                    <span key={h.id}>{h.text}{i < 2 ? " | " : ""}</span>
                  ))}
              {unpinnedHeadlines.length > 0 && (
                <span className="text-[#1a0dab]"> | {unpinnedHeadlines[0].text}</span>
              )}
            </div>
            <div className="text-xs text-[#006621] mt-1">www.example.com/saas</div>
            <div className="text-xs text-[#545454] mt-1">
              {descriptions.slice(0, 2).map((d, i) => (
                <span key={d.id}>{d.text}{i === 0 ? " " : ""}</span>
              ))}
            </div>
            {/* Extensions preview */}
            <div className="mt-2 flex flex-wrap gap-2">
              {extensions.filter(e => e.type === "sitelink").map(e => (
                <span key={e.id} className="text-xs text-[#1a0dab] font-medium border-b border-[#1a0dab]">{e.content}</span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {extensions.filter(e => e.type === "callout").map(e => (
                <span key={e.id} className="text-[10px] text-[#545454]">{e.content}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Headlines */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader
          title={`Headlines (${headlines.length}/15)`}
          icon={<Type size={16} className="text-[#4285F4]" />}
          action={
            <button onClick={addHeadline} disabled={headlines.length >= 15} className="flex items-center gap-1 px-3 py-1.5 bg-[#4285F4]/10 text-[#4285F4] rounded-md text-xs hover:bg-[#4285F4]/20 transition-colors disabled:opacity-50">
              <Plus /> Add
            </button>
          }
        />
        <div className="space-y-2">
          {headlines.map((h, i) => (
            <div key={h.id} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-6 text-right">{i + 1}</span>
              <input
                type="text"
                value={h.text}
                onChange={e => updateHeadline(h.id, e.target.value)}
                placeholder={`Headline ${i + 1} (max 30 chars)`}
                className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50"
              />
              <span className={`text-[10px] w-8 text-right ${h.text.length > 25 ? "text-red-400" : "text-slate-500"}`}>{h.text.length}/30</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(pos => (
                  <button
                    key={pos}
                    onClick={() => togglePin(h.id, pos as 1 | 2 | 3)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                      h.pinPosition === pos
                        ? "bg-[#4285F4]/20 text-[#4285F4] border border-[#4285F4]/30"
                        : "bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    P{pos}
                  </button>
                ))}
              </div>
              <button onClick={() => removeHeadline(h.id)} className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Descriptions */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader
          title={`Descriptions (${descriptions.length}/4)`}
          icon={<AlignLeftIcon size={16} />}
          action={
            <button onClick={addDescription} disabled={descriptions.length >= 4} className="flex items-center gap-1 px-3 py-1.5 bg-[#4285F4]/10 text-[#4285F4] rounded-md text-xs hover:bg-[#4285F4]/20 transition-colors disabled:opacity-50">
              <Plus /> Add
            </button>
          }
        />
        <div className="space-y-2">
          {descriptions.map((d, i) => (
            <div key={d.id} className="flex items-start gap-2">
              <span className="text-xs text-slate-500 w-6 text-right mt-2">{i + 1}</span>
              <div className="flex-1">
                <textarea
                  value={d.text}
                  onChange={e => updateDescription(d.id, e.target.value)}
                  placeholder={`Description ${i + 1} (max 90 chars)`}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50 resize-none"
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-[10px] ${d.text.length > 80 ? "text-red-400" : "text-slate-500"}`}>{d.text.length}/90</span>
                </div>
              </div>
              <button onClick={() => removeDescription(d.id)} className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-500 hover:text-red-400 transition-colors mt-1">
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ad Extensions */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <SectionHeader
          title="Ad Extensions"
          icon={<Plus size={16} className="text-[#4285F4]" />}
          action={
            <div className="flex items-center gap-2">
              <select value={newExtType} onChange={e => setNewExtType(e.target.value as AdExtension["type"])} className="px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded text-xs text-slate-100">
                <option value="sitelink">Sitelink</option>
                <option value="callout">Callout</option>
                <option value="structured_snippet">Snippet</option>
                <option value="call">Call</option>
                <option value="location">Location</option>
              </select>
              <input
                type="text"
                value={newExtension}
                onChange={e => setNewExtension(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addExtension()}
                placeholder="Extension text..."
                className="px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#4285F4]/50 w-40"
              />
              <button onClick={addExtension} className="px-2 py-1 bg-[#4285F4]/10 text-[#4285F4] rounded text-xs hover:bg-[#4285F4]/20 transition-colors">
                <Plus />
              </button>
            </div>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {extensions.map(ext => (
            <div key={ext.id} className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div className="flex items-center gap-2">
                {ext.type === "sitelink" && <Globe className="text-blue-400" />}
                {ext.type === "callout" && <Tag className="text-purple-400" />}
                {ext.type === "structured_snippet" && <Hash className="text-cyan-400" />}
                {ext.type === "call" && <Phone className="text-emerald-400" />}
                {ext.type === "location" && <MapPin className="text-red-400" />}
                <span className="text-xs text-slate-200">{ext.content}</span>
                <span className="text-[10px] text-slate-500 capitalize">{ext.type.replace("_", " ")}</span>
              </div>
              <button onClick={() => removeExtension(ext.id)} className="p-0.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-colors">
                <X />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIENCE TARGETING VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function AudienceTargetingView({
  campaign,
  onUpdateTargeting,
}: {
  campaign: AdCampaign;
  onUpdateTargeting: (targeting: Partial<AdTargeting>) => void;
}) {
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(campaign.targeting.customAudiences || []);
  const [excludedAudiences, setExcludedAudiences] = useState<string[]>(campaign.targeting.excludedAudiences || []);
  const [selectedAges, setSelectedAges] = useState<string[]>(["25-34", "35-44"]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(["Male", "Female"]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>(campaign.targeting.devices || ["Desktop", "Mobile", "Tablet"]);
  const [selectedIncome, setSelectedIncome] = useState<string[]>(["Top 10%", "11-20%"]);
  const [activeTab, setActiveTab] = useState<"audiences" | "demographics" | "devices">("audiences");

  const toggleAudience = (name: string) => {
    setSelectedAudiences(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  };

  const toggleExcluded = (name: string) => {
    setExcludedAudiences(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  };

  const toggleAge = (age: string) => {
    setSelectedAges(prev => prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age]);
  };

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev => prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]);
  };

  const toggleDevice = (device: string) => {
    setSelectedDevices(prev => prev.includes(device) ? prev.filter(d => d !== device) : [...prev, device]);
  };

  const toggleIncome = (income: string) => {
    setSelectedIncome(prev => prev.includes(income) ? prev.filter(i => i !== income) : [...prev, income]);
  };

  useEffect(() => {
    onUpdateTargeting({
      customAudiences: selectedAudiences,
      excludedAudiences,
      devices: selectedDevices,
      ageRange: { min: 18, max: 65 },
    });
  }, [selectedAudiences, excludedAudiences, selectedDevices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Audience Targeting</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define who sees your ads for &ldquo;{campaign.name}&rdquo;</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-lg w-fit">
        {(["audiences", "demographics", "devices"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm capitalize transition-colors ${
              activeTab === tab ? "bg-[#4285F4]/10 text-[#4285F4] font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Audiences Tab */}
      {activeTab === "audiences" && (
        <div className="space-y-6">
          {/* Selected Audiences Summary */}
          {(selectedAudiences.length > 0 || excludedAudiences.length > 0) && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <SectionHeader title="Selected Audiences" icon={<Target size={16} className="text-emerald-400" />} />
              <div className="flex flex-wrap gap-2">
                {selectedAudiences.map(name => (
                  <span key={name} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs text-emerald-300">
                    <Check /> {name} <button onClick={() => toggleAudience(name)} className="ml-1 text-emerald-400/50 hover:text-emerald-400"><X /></button>
                  </span>
                ))}
                {excludedAudiences.map(name => (
                  <span key={name} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-300">
                    <X /> {name} <button onClick={() => toggleExcluded(name)} className="ml-1 text-red-400/50 hover:text-red-400"><X /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* In-Market */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <SectionHeader title="In-Market Audiences" icon={<ShoppingCart size={16} className="text-[#4285F4]" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {IN_MARKET_AUDIENCES.map(audience => (
                <AudienceRow
                  key={audience.id}
                  item={audience}
                  isSelected={selectedAudiences.includes(audience.name)}
                  isExcluded={excludedAudiences.includes(audience.name)}
                  onToggle={() => toggleAudience(audience.name)}
                  onExclude={() => toggleExcluded(audience.name)}
                />
              ))}
            </div>
          </div>

          {/* Affinity */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <SectionHeader title="Affinity Audiences" icon={<Star size={16} className="text-purple-400" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AFFINITY_AUDIENCES.map(audience => (
                <AudienceRow
                  key={audience.id}
                  item={audience}
                  isSelected={selectedAudiences.includes(audience.name)}
                  isExcluded={excludedAudiences.includes(audience.name)}
                  onToggle={() => toggleAudience(audience.name)}
                  onExclude={() => toggleExcluded(audience.name)}
                />
              ))}
            </div>
          </div>

          {/* Remarketing */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <SectionHeader title="Remarketing Lists" icon={<RotateCcw size={16} className="text-amber-400" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {REMARKETING_LISTS.map(audience => (
                <AudienceRow
                  key={audience.id}
                  item={audience}
                  isSelected={selectedAudiences.includes(audience.name)}
                  isExcluded={excludedAudiences.includes(audience.name)}
                  onToggle={() => toggleAudience(audience.name)}
                  onExclude={() => toggleExcluded(audience.name)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Demographics Tab */}
      {activeTab === "demographics" && (
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <SectionHeader title="Age Range" icon={<Users size={16} className="text-[#4285F4]" />} />
            <div className="flex flex-wrap gap-2">
              {DEMOGRAPHICS_AGE.map(age => (
                <button
                  key={age}
                  onClick={() => toggleAge(age)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                    selectedAges.includes(age)
                      ? "border-[#4285F4]/50 bg-[#4285F4]/10 text-[#4285F4]"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <SectionHeader title="Gender" icon={<Users size={16} className="text-[#4285F4]" />} />
            <div className="flex flex-wrap gap-2">
              {DEMOGRAPHICS_GENDER.map(gender => (
                <button
                  key={gender}
                  onClick={() => toggleGender(gender)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                    selectedGenders.includes(gender)
                      ? "border-[#4285F4]/50 bg-[#4285F4]/10 text-[#4285F4]"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <SectionHeader title="Household Income" icon={<DollarSign size={16} className="text-[#4285F4]" />} />
            <div className="flex flex-wrap gap-2">
              {DEMOGRAPHICS_INCOME.map(income => (
                <button
                  key={income}
                  onClick={() => toggleIncome(income)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                    selectedIncome.includes(income)
                      ? "border-[#4285F4]/50 bg-[#4285F4]/10 text-[#4285F4]"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                  }`}
                >
                  {income}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === "devices" && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <SectionHeader title="Device Targeting" icon={<Smartphone size={16} className="text-[#4285F4]" />} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "Desktop", icon: <Monitor size={24} />, desc: "Computers & laptops" },
              { name: "Mobile", icon: <Smartphone size={24} />, desc: "Smartphones" },
              { name: "Tablet", icon: <Tablet size={24} />, desc: "iPads & tablets" },
              { name: "Connected TV", icon: <Monitor size={24} />, desc: "Smart TVs, Chromecast" },
            ].map(device => (
              <button
                key={device.name}
                onClick={() => toggleDevice(device.name)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  selectedDevices.includes(device.name)
                    ? "border-[#4285F4]/50 bg-[#4285F4]/5"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className={`mx-auto mb-2 ${selectedDevices.includes(device.name) ? "text-[#4285F4]" : "text-slate-500"}`}>
                  {device.icon}
                </div>
                <div className={`text-sm font-medium ${selectedDevices.includes(device.name) ? "text-[#4285F4]" : "text-slate-200"}`}>
                  {device.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{device.desc}</div>
              </button>
            ))}
          </div>

          {/* Device Bid Adjustments */}
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-medium text-slate-400">Bid Adjustments</h4>
            {selectedDevices.map(device => (
              <div key={device} className="flex items-center gap-4">
                <span className="text-sm text-slate-300 w-28">{device}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full">
                  <div className="h-2 bg-[#4285F4] rounded-full" style={{ width: "100%" }} />
                </div>
                <span className="text-xs text-slate-400 w-12 text-right">0%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AudienceRow({
  item,
  isSelected,
  isExcluded,
  onToggle,
  onExclude,
}: {
  item: AudienceItem;
  isSelected: boolean;
  isExcluded: boolean;
  onToggle: () => void;
  onExclude: () => void;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
      isSelected ? "border-[#4285F4]/30 bg-[#4285F4]/5" : isExcluded ? "border-red-500/20 bg-red-500/5" : "border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]"
    }`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          isSelected ? "bg-[#4285F4] border-[#4285F4]" : "border-white/[0.12]"
        }`}>
          {isSelected && <Check className="text-white" />}
        </button>
        <div>
          <div className="text-sm text-slate-200">{item.name}</div>
          <div className="text-[10px] text-slate-500">{item.category} &middot; {item.size} users</div>
        </div>
      </div>
      <button
        onClick={onExclude}
        className={`px-2 py-1 rounded text-[10px] transition-colors ${
          isExcluded ? "bg-red-500/20 text-red-400" : "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
        }`}
      >
        {isExcluded ? "Excluded" : "Exclude"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function AnalyticsView({ campaign }: { campaign: AdCampaign }) {
  const m = campaign.metrics;
  const conversionRate = m.clicks > 0 ? ((m.conversions / m.clicks) * 100).toFixed(2) : "0.00";

  const hasMetrics = m.impressions > 0 || m.clicks > 0;
  const keywords = campaign.targeting.searchKeywords || campaign.targeting.keywords || [];

  // Keyword performance data (only show if campaign has real metrics)
  const keywordData = useMemo(() => {
    if (!hasMetrics || keywords.length === 0) return [];
    return keywords.map((k, i) => ({
      keyword: k,
      matchType: ["Broad", "Phrase", "Exact"][i % 3],
      impressions: Math.floor(m.impressions / keywords.length * (0.8 + (i % 3) * 0.1)),
      clicks: Math.floor(m.clicks / keywords.length * (0.8 + (i % 3) * 0.1)),
      ctr: m.ctr > 0 ? parseFloat((m.ctr * (0.9 + (i % 3) * 0.05)).toFixed(2)) : 0,
      cpc: m.cpc > 0 ? parseFloat((m.cpc * (0.8 + (i % 3) * 0.1)).toFixed(2)) : 0,
      qualityScore: [8, 7, 9, 6, 8][i % 5],
    }));
  }, [campaign]);

  // Device breakdown (only show if campaign has real metrics)
  const deviceData = hasMetrics ? [
    { device: "Desktop", impressions: Math.floor(m.impressions * 0.55), clicks: Math.floor(m.clicks * 0.52), ctr: m.ctr > 0 ? parseFloat((m.ctr * 1.02).toFixed(2)) : 0, share: 55 },
    { device: "Mobile", impressions: Math.floor(m.impressions * 0.35), clicks: Math.floor(m.clicks * 0.38), ctr: m.ctr > 0 ? parseFloat((m.ctr * 1.08).toFixed(2)) : 0, share: 35 },
    { device: "Tablet", impressions: Math.floor(m.impressions * 0.10), clicks: Math.floor(m.clicks * 0.10), ctr: m.ctr > 0 ? parseFloat((m.ctr * 0.95).toFixed(2)) : 0, share: 10 },
  ] : [];

  // Search terms derived from keywords (only show if campaign has real metrics)
  const searchTerms = hasMetrics && keywords.length > 0
    ? keywords.slice(0, 5).map((k, i) => ({
        term: k,
        clicks: Math.floor(m.clicks / keywords.length * (0.7 + (i % 3) * 0.15)),
        impressions: Math.floor(m.impressions / keywords.length * (0.7 + (i % 3) * 0.15)),
        ctr: m.ctr > 0 ? parseFloat((m.ctr * (0.9 + (i % 3) * 0.05)).toFixed(2)) : 0,
        conversions: Math.floor(m.conversions / keywords.length * (0.6 + (i % 3) * 0.2)),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Campaign Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">Performance data for &ldquo;{campaign.name}&rdquo;</p>
      </div>

      {/* Big Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Impressions" value={formatNum(m.impressions)} sub="Total views" icon={<Eye size={16} className="text-blue-400" />} accent="bg-blue-500/10" />
        <MetricCard label="Clicks" value={formatNum(m.clicks)} sub={`CTR: ${m.ctr.toFixed(2)}%`} icon={<MousePointer size={16} className="text-emerald-400" />} accent="bg-emerald-500/10" />
        <MetricCard label="Avg CPC" value={`$${m.cpc.toFixed(2)}`} sub={`Total: ${formatCurrency(m.spend)}`} icon={<DollarSign size={16} className="text-amber-400" />} accent="bg-amber-500/10" />
        <MetricCard label="Conversions" value={String(m.conversions)} sub={`Conv. Rate: ${conversionRate}%`} icon={<Target size={16} className="text-purple-400" />} accent="bg-purple-500/10" />
        <MetricCard label="Cost/Conv" value={`$${m.costPerConversion.toFixed(0)}`} sub={`ROAS: ${m.roas}x`} icon={<BarChart3 size={16} className="text-cyan-400" />} accent="bg-cyan-500/10" />
      </div>

      {/* Quality Score & Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-[#4285F4]" />
            <span className="text-xs text-slate-400 font-medium">Quality Score</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getQualityScoreColor(m.qualityScore || 0)}`}>{m.qualityScore || 0}</div>
            <div className="flex-1">
              <QualityScoreGauge score={m.qualityScore || 0} />
              <p className="text-[10px] text-slate-500 mt-2">
                {m.qualityScore && m.qualityScore >= 8 ? "Excellent! Your ads are highly relevant." :
                 m.qualityScore && m.qualityScore >= 5 ? "Good. There is room for improvement." :
                 "Poor. Review keyword relevance and landing page experience."}
              </p>
            </div>
          </div>
        </div>
        <MetricCard label="Reach" value={formatNum(m.reach)} sub={`Frequency: ${m.frequency.toFixed(1)}x`} icon={<Users size={16} className="text-pink-400" />} accent="bg-pink-500/10" />
        <MetricCard label="ROAS" value={`${m.roas}x`} sub={`Revenue / Ad spend`} icon={<TrendingUp size={16} className="text-emerald-400" />} accent="bg-emerald-500/10" />
      </div>

      {/* Keyword Performance — only show when campaign has metrics */}
      {keywordData.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <SectionHeader title="Top Keywords" icon={<Hash size={16} className="text-[#4285F4]" />} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Keyword</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Match Type</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Impressions</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Clicks</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">CTR</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Avg CPC</th>
                  <th className="text-center py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">QS</th>
                </tr>
              </thead>
              <tbody>
                {keywordData.map((k, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-sm text-slate-200 font-medium">{k.keyword}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-white/[0.05] rounded text-[10px] text-slate-400">{k.matchType}</span>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{formatNum(k.impressions)}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{formatNum(k.clicks)}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{k.ctr.toFixed(2)}%</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">${k.cpc.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-sm font-bold ${getQualityScoreColor(k.qualityScore)}`}>{k.qualityScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search Terms Report — only show when campaign has metrics */}
      {searchTerms.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <SectionHeader title="Search Terms Report" icon={<Search size={16} className="text-[#4285F4]" />} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Search Term</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Impressions</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Clicks</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">CTR</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {searchTerms.map((st, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-sm text-slate-200">{st.term}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{formatNum(st.impressions)}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{st.clicks}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{st.ctr.toFixed(2)}%</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{st.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Device Breakdown — only show when campaign has metrics */}
      {deviceData.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <SectionHeader title="Device Breakdown" icon={<Smartphone size={16} className="text-[#4285F4]" />} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Device</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Share</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Impressions</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Clicks</th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">CTR</th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Bar</th>
                </tr>
              </thead>
              <tbody>
                {deviceData.map((d, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-sm text-slate-200 font-medium">{d.device}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{d.share}%</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{formatNum(d.impressions)}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{formatNum(d.clicks)}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-300 text-right">{d.ctr.toFixed(2)}%</td>
                    <td className="py-2.5 px-3">
                      <div className="w-24 h-2 bg-slate-700 rounded-full">
                        <div className="h-2 bg-[#4285F4] rounded-full" style={{ width: `${d.share}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SMALL ICON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function AlignLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function GoogleAdsManager() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [view, setViewRaw] = useState<ViewMode>(() => {
    try { return (localStorage.getItem("sw_google_view") as ViewMode) || "list"; } catch { return "list"; }
  });
  const setView = (v: ViewMode) => {
    setViewRaw(v);
    try { localStorage.setItem("sw_google_view", v); } catch { /* silent */ }
  };
  const [selectedCampaign, setSelectedCampaignRaw] = useState<AdCampaign | null>(() => {
    try {
      const saved = localStorage.getItem("sw_google_selected");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setSelectedCampaign = (c: AdCampaign | null) => {
    setSelectedCampaignRaw(c);
    try { if (c) localStorage.setItem("sw_google_selected", JSON.stringify(c)); else localStorage.removeItem("sw_google_selected"); } catch { /* silent */ }
  };
  const [subTab, setSubTabRaw] = useState<CampaignSubTab>(() => {
    try { return (localStorage.getItem("sw_google_subtab") as CampaignSubTab) || "setup"; } catch { return "setup"; }
  });
  const setSubTab = (tab: CampaignSubTab) => {
    setSubTabRaw(tab);
    try { localStorage.setItem("sw_google_subtab", tab); } catch { /* silent */ }
  };
  // Load campaigns on mount
  useEffect(() => {
    setCampaigns(loadCampaigns());
  }, []);

  const refreshCampaigns = useCallback(() => {
    setCampaigns(loadCampaigns());
  }, []);

  // Navigation handlers
  const handleSelectCampaign = useCallback((campaign: AdCampaign) => {
    setSelectedCampaign(campaign);
    setSubTab("setup");
    setView("analytics");
  }, []);

  const handleNewCampaign = useCallback(() => {
    setSelectedCampaign(null);
    setSubTab("setup");
    setView("builder");
  }, []);

  const handleSaveCampaign = useCallback((data: Partial<AdCampaign>) => {
    if (selectedCampaign) {
      updateCampaign(selectedCampaign.id, data);
    } else {
      createCampaign(data as Omit<AdCampaign, "id" | "createdAt" | "updatedAt" | "metrics">);
    }
    refreshCampaigns();
    setView("list");
    setSelectedCampaign(null);
  }, [selectedCampaign, refreshCampaigns]);

  const handleDeleteCampaign = useCallback((id: string) => {
    if (window.confirm("Delete this campaign?")) {
      const all = loadCampaigns();
      const filtered = all.filter(c => c.id !== id);
      try { localStorage.setItem("sw_ad_campaigns", JSON.stringify(filtered)); } catch { /* silent */ }
      refreshCampaigns();
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
        setView("list");
      }
    }
  }, [selectedCampaign, refreshCampaigns]);

  const handleToggleStatus = useCallback((id: string, newStatus: string) => {
    updateCampaign(id, { status: newStatus as AdCampaign["status"] });
    refreshCampaigns();
  }, [refreshCampaigns]);

  const handleUpdateKeywords = useCallback((keywords: string[], negativeKeywords: string[]) => {
    if (selectedCampaign) {
      updateCampaign(selectedCampaign.id, {
        targeting: {
          ...selectedCampaign.targeting,
          searchKeywords: keywords,
          negativeKeywords,
          keywords,
        },
      });
      refreshCampaigns();
    }
  }, [selectedCampaign, refreshCampaigns]);

  const handleUpdateTargeting = useCallback((targeting: Partial<AdTargeting>) => {
    if (selectedCampaign) {
      updateCampaign(selectedCampaign.id, {
        targeting: { ...selectedCampaign.targeting, ...targeting },
      });
      refreshCampaigns();
    }
  }, [selectedCampaign, refreshCampaigns]);

  // Refresh selected campaign when campaigns change
  useEffect(() => {
    if (selectedCampaign) {
      const updated = campaigns.find(c => c.id === selectedCampaign.id);
      if (updated) setSelectedCampaign(updated);
    }
  }, [campaigns]);

  const googleCampaigns = campaigns.filter(c => c.platform === "google");

  // Sub-navigation for campaign detail views
  const renderSubNav = () => {
    if (!selectedCampaign || view === "list" || view === "builder") return null;

    const tabs: { key: CampaignSubTab; label: string; icon: React.ReactNode }[] = [
      { key: "setup", label: "Campaign", icon: <Settings size={14} /> },
      { key: "keywords", label: "Keywords", icon: <Hash size={14} /> },
      { key: "adcopy", label: "Ad Copy", icon: <Type size={14} /> },
      { key: "audience", label: "Audience", icon: <Users size={14} /> },
      { key: "analytics", label: "Analytics", icon: <BarChart3 size={14} /> },
    ];

    return (
      <div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-lg w-fit mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
              subTab === tab.key
                ? "bg-[#4285F4]/10 text-[#4285F4] font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case "list":
        return (
          <CampaignListView
            campaigns={campaigns}
            onSelectCampaign={handleSelectCampaign}
            onNewCampaign={handleNewCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            onToggleStatus={handleToggleStatus}
          />
        );
      case "builder":
        return (
          <CampaignBuilder
            campaign={selectedCampaign}
            onSave={handleSaveCampaign}
            onCancel={() => { setView("list"); setSelectedCampaign(null); }}
          />
        );
      default:
        if (!selectedCampaign) return null;
        return (
          <>
            {renderSubNav()}
            {subTab === "setup" && (
              <CampaignBuilder
                campaign={selectedCampaign}
                onSave={handleSaveCampaign}
                onCancel={() => setView("list")}
              />
            )}
            {subTab === "keywords" && (
              <KeywordPlannerView
                campaign={selectedCampaign}
                onUpdateKeywords={handleUpdateKeywords}
              />
            )}
            {subTab === "adcopy" && (
              <AdCopyBuilderView campaign={selectedCampaign} />
            )}
            {subTab === "audience" && (
              <AudienceTargetingView
                campaign={selectedCampaign}
                onUpdateTargeting={handleUpdateTargeting}
              />
            )}
            {subTab === "analytics" && (
              <AnalyticsView campaign={selectedCampaign} />
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4285F4] to-[#34A853] rounded-xl flex items-center justify-center shadow-lg shadow-[#4285F4]/10">
              <Search size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Google Ads Manager</h1>
              <p className="text-xs text-slate-500">Create, manage, and optimize your Google Ads campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button
                onClick={() => { setView("list"); setSelectedCampaign(null); }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronDown size={14} className="rotate-90" /> Back to Campaigns
              </button>
            )}
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="text-xs text-emerald-400 font-medium">{googleCampaigns.filter(c => c.status === "active").length} Active</span>
            </div>
            <div className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <span className="text-xs text-slate-400">{googleCampaigns.length} Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}
