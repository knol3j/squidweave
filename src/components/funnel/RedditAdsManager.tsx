import { useState, useMemo, useCallback, useEffect } from "react";
import {
  MessageSquare, Target, DollarSign, Calendar, Users, Image, Plus, Trash2,
  Copy, BarChart3, MousePointer, TrendingUp, ArrowBigUp, ArrowBigDown, Save, Edit3, X, Check, Hash,
  Megaphone, Eye, Smartphone, Monitor, Tablet, Filter, Search, ArrowUpRight, Award, MessageCircle
} from "lucide-react";
import { createCampaign, updateCampaign, loadCampaigns, deleteCampaign, updateCampaignMetrics } from "@/lib/adCampaignStore";
import type { AdCampaign, AdCreative, AdTargeting } from "@/lib/adCampaignStore";

/* ────────────────────────────────────────────────────────────── */
/*  TYPES & CONSTANTS                                            */
/* ────────────────────────────────────────────────────────────── */

type RedditObjective = "Brand Awareness" | "Traffic" | "Conversions" | "App Installs" | "Video Views";
type RedditStatus = "draft" | "active" | "paused" | "completed" | "archived";
type RedditPlacement = "feed" | "conversations" | "both";
type CTAOption = "Learn More" | "Shop Now" | "Sign Up" | "Download" | "View More" | "Contact Us" | "Get Quote";

const OBJECTIVES: RedditObjective[] = ["Brand Awareness", "Traffic", "Conversions", "App Installs", "Video Views"];
const CTA_OPTIONS: CTAOption[] = ["Learn More", "Shop Now", "Sign Up", "Download", "View More", "Contact Us", "Get Quote"];

const SUGGESTED_SUBREDDITS = [
  "r/technology", "r/startups", "r/marketing", "r/programming", "r/business",
  "r/entrepreneur", "r/saas", "r/machinelearning", "r/webdev", "r/reactjs",
  "r/typescript", "r/Python", "r/artificial", "r/gamedev", "r/devops",
  "r/bigdata", "r/CloudComputing", "r/cybersecurity", "r/datascience", "r/blockchain"
];

const INTEREST_OPTIONS = [
  "Technology", "Gaming", "Business", "News", "Entertainment", "Sports",
  "Science", "Travel", "Health", "Food", "Music", "Movies", "Photography",
  "Design", "Finance", "Education", "Fashion", "Books", "Art", "Politics"
];

const LOCATION_OPTIONS = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany",
  "France", "Netherlands", "India", "Japan", "Brazil", "Sweden", "Norway"
];

const POPULAR_SUBREDDITS = [
  "r/technology", "r/startups", "r/programming", "r/webdev",
  "r/saas", "r/marketing", "r/business", "r/entrepreneur"
];

/* ────────────────────────────────────────────────────────────── */
/*  UTILITY COMPONENTS                                           */
/* ────────────────────────────────────────────────────────────── */

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ────────────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                               */
/* ────────────────────────────────────────────────────────────── */

type TabId = "campaigns" | "builder" | "creative" | "analytics";

export default function RedditAdsManager() {
  const [activeTab, setActiveTabRaw] = useState<TabId>(() => {
    try { return (localStorage.getItem("sw_reddit_view") as TabId) || "campaigns"; } catch { return "campaigns"; }
  });
  const setActiveTab = (tab: TabId) => {
    setActiveTabRaw(tab);
    try { localStorage.setItem("sw_reddit_view", tab); } catch { /* silent */ }
  };
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignIdRaw] = useState<string | null>(() => {
    try { return localStorage.getItem("sw_reddit_selected") || null; } catch { return null; }
  });
  const setSelectedCampaignId = (id: string | null) => {
    setSelectedCampaignIdRaw(id);
    try { if (id) localStorage.setItem("sw_reddit_selected", id); else localStorage.removeItem("sw_reddit_selected"); } catch { /* silent */ }
  };
  const [filterObjective, setFilterObjective] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Builder state
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [builderName, setBuilderName] = useState("");
  const [builderObjective, setBuilderObjective] = useState<RedditObjective>("Traffic");
  const [builderBudgetType, setBuilderBudgetType] = useState<"daily" | "lifetime">("daily");
  const [builderBudgetAmount, setBuilderBudgetAmount] = useState("");
  const [builderStartDate, setBuilderStartDate] = useState("");
  const [builderEndDate, setBuilderEndDate] = useState("");
  const [builderPlacement, setBuilderPlacement] = useState<RedditPlacement>("both");
  const [builderSubreddits, setBuilderSubreddits] = useState<string[]>([]);
  const [builderSubredditInput, setBuilderSubredditInput] = useState("");
  const [builderInterests, setBuilderInterests] = useState<string[]>([]);
  const [builderLocations, setBuilderLocations] = useState<string[]>([]);
  const [builderDevices, setBuilderDevices] = useState<string[]>(["desktop", "mobile"]);
  const [builderKeywords, setBuilderKeywords] = useState<string[]>([]);
  const [builderKeywordInput, setBuilderKeywordInput] = useState("");
  const [builderCustomAudiences, setBuilderCustomAudiences] = useState<string[]>([]);
  const [builderCustomAudienceInput, setBuilderCustomAudienceInput] = useState("");
  const [builderNotes, setBuilderNotes] = useState("");
  const [showSubredditSuggestions, setShowSubredditSuggestions] = useState(false);

  // Creative builder state
  const [creativeHeadline, setCreativeHeadline] = useState("");
  const [creativeBody, setCreativeBody] = useState("");
  const [creativeCta, setCreativeCta] = useState<CTAOption>("Learn More");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [creativeImageUrl, setCreativeImageUrl] = useState("");
  const [creativeAllowComments, setCreativeAllowComments] = useState(true);
  const [creativeModerationKeywords, setCreativeModerationKeywords] = useState<string[]>([]);
  const [creativeModKeywordInput, setCreativeModKeywordInput] = useState("");
  const [creativeUpvoteSeed, setCreativeUpvoteSeed] = useState(5);

  // Analytics state
  const [analyticsView, setAnalyticsView] = useState<"overview" | "subreddits" | "interests">("overview");

  const refreshCampaigns = useCallback(() => {
    const redditCampaigns = loadCampaigns().filter(c => c.platform === "reddit");
    setCampaigns(redditCampaigns);
  }, []);

  // ── Init: load user-created campaigns only (no seed data)
  useEffect(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

  // ── Derived data ────────────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (filterObjective !== "all" && c.objective !== filterObjective) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [campaigns, filterObjective, filterStatus, searchQuery]);

  const selectedCampaign = useMemo(
    () => campaigns.find(c => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const totalMetrics = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.metrics.impressions,
        clicks: acc.clicks + c.metrics.clicks,
        spend: acc.spend + c.metrics.spend,
        conversions: acc.conversions + c.metrics.conversions,
        upvotes: (acc.upvotes || 0) + (c.metrics.upvotes || 0),
        downvotes: (acc.downvotes || 0) + Math.floor((c.metrics.upvotes || 0) * 0.15),
        comments: (acc.comments || 0) + (c.metrics.comments || 0),
        awards: (acc.awards || 0) + Math.floor((c.metrics.upvotes || 0) * 0.02),
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, upvotes: 0, downvotes: 0, comments: 0, awards: 0 }
    );
  }, [campaigns]);

  // ── Actions ─────────────────────────────────────────────────

  const resetBuilder = () => {
    setEditingCampaign(null);
    setBuilderName("");
    setBuilderObjective("Traffic");
    setBuilderBudgetType("daily");
    setBuilderBudgetAmount("");
    setBuilderStartDate("");
    setBuilderEndDate("");
    setBuilderPlacement("both");
    setBuilderSubreddits([]);
    setBuilderSubredditInput("");
    setBuilderInterests([]);
    setBuilderLocations([]);
    setBuilderDevices(["desktop", "mobile"]);
    setBuilderKeywords([]);
    setBuilderKeywordInput("");
    setBuilderCustomAudiences([]);
    setBuilderCustomAudienceInput("");
    setBuilderNotes("");
  };

  const handleSaveCampaign = () => {
    if (!builderName.trim() || !builderBudgetAmount || !builderStartDate) return;

    const targeting: AdTargeting = {
      locations: builderLocations,
      ageRange: { min: 18, max: 65 },
      genders: ["all"],
      languages: ["English"],
      interests: builderInterests,
      behaviors: [],
      keywords: builderKeywords,
      customAudiences: builderCustomAudiences,
      excludedAudiences: [],
      placements: builderPlacement === "both" ? ["feed", "conversations"] : [builderPlacement],
      devices: builderDevices,
      subreddits: builderSubreddits,
    };

    if (editingCampaign) {
      updateCampaign(editingCampaign.id, {
        name: builderName,
        objective: builderObjective,
        budget: { amount: parseFloat(builderBudgetAmount), type: builderBudgetType, currency: "USD" },
        schedule: { startDate: builderStartDate, endDate: builderEndDate || null },
        targeting,
        notes: builderNotes,
      });
    } else {
      createCampaign({
        platform: "reddit",
        name: builderName,
        objective: builderObjective,
        status: "draft",
        budget: { amount: parseFloat(builderBudgetAmount), type: builderBudgetType, currency: "USD" },
        schedule: { startDate: builderStartDate, endDate: builderEndDate || null },
        targeting,
        creatives: [],
        notes: builderNotes,
      });
    }
    resetBuilder();
    refreshCampaigns();
    setActiveTab("campaigns");
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("Delete this campaign?")) {
      deleteCampaign(id);
      refreshCampaigns();
      if (selectedCampaignId === id) setSelectedCampaignId(null);
    }
  };

  const handleDuplicateCampaign = (campaign: AdCampaign) => {
    createCampaign({
      platform: "reddit",
      name: campaign.name + " (Copy)",
      objective: campaign.objective,
      status: "draft",
      budget: { ...campaign.budget },
      schedule: { ...campaign.schedule },
      targeting: JSON.parse(JSON.stringify(campaign.targeting)),
      creatives: JSON.parse(JSON.stringify(campaign.creatives)),
      notes: campaign.notes,
    });
    refreshCampaigns();
  };

  const handleEditCampaign = (campaign: AdCampaign) => {
    setEditingCampaign(campaign);
    setBuilderName(campaign.name);
    setBuilderObjective(campaign.objective as RedditObjective);
    setBuilderBudgetType(campaign.budget.type);
    setBuilderBudgetAmount(String(campaign.budget.amount));
    setBuilderStartDate(campaign.schedule.startDate);
    setBuilderEndDate(campaign.schedule.endDate || "");
    const placements = campaign.targeting.placements || [];
    setBuilderPlacement(
      placements.includes("feed") && placements.includes("conversations") ? "both" :
      placements.includes("conversations") ? "conversations" : "feed"
    );
    setBuilderSubreddits(campaign.targeting.subreddits || []);
    setBuilderInterests(campaign.targeting.interests || []);
    setBuilderLocations(campaign.targeting.locations || []);
    setBuilderDevices(campaign.targeting.devices || ["desktop", "mobile"]);
    setBuilderKeywords(campaign.targeting.keywords || []);
    setBuilderCustomAudiences(campaign.targeting.customAudiences || []);
    setBuilderNotes(campaign.notes);
    setActiveTab("builder");
  };

  const handleSaveCreative = () => {
    if (!selectedCampaignId || !creativeHeadline.trim()) return;
    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!campaign) return;

    const newCreative: AdCreative = {
      id: `cr-${Date.now()}`,
      type: "promoted_post",
      headline: creativeHeadline,
      description: creativeBody.slice(0, 120),
      body: creativeBody,
      cta: creativeCta,
      imageUrl: creativeImageUrl,
      videoUrl: "",
      destinationUrl: creativeUrl,
      utmParams: `utm_source=reddit&utm_medium=cpc&utm_campaign=${encodeURIComponent(campaign.name)}`,
      variants: [],
    };

    updateCampaign(selectedCampaignId, {
      creatives: [...campaign.creatives, newCreative],
    });
    refreshCampaigns();
    setCreativeHeadline("");
    setCreativeBody("");
    setCreativeCta("Learn More");
    setCreativeUrl("");
    setCreativeImageUrl("");
    setCreativeAllowComments(true);
    setCreativeModerationKeywords([]);
    setCreativeModKeywordInput("");
    setCreativeUpvoteSeed(5);
  };

  const handleDeleteCreative = (creativeId: string) => {
    if (!selectedCampaignId) return;
    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!campaign) return;
    updateCampaign(selectedCampaignId, {
      creatives: campaign.creatives.filter(cr => cr.id !== creativeId),
    });
    refreshCampaigns();
  };

  const handleToggleStatus = (campaign: AdCampaign) => {
    const next: RedditStatus = campaign.status === "active" ? "paused" : campaign.status === "paused" ? "active" : "active";
    updateCampaign(campaign.id, { status: next });
    refreshCampaigns();
  };

  // ── Subreddit analytics data ────────────────────────────────
  const subredditPerformance = useMemo(() => {
    const perf: Record<string, { impressions: number; clicks: number; upvotes: number; comments: number; campaigns: number }> = {};
    for (const c of campaigns) {
      const subs = c.targeting.subreddits || [];
      for (const sub of subs) {
        if (!perf[sub]) perf[sub] = { impressions: 0, clicks: 0, upvotes: 0, comments: 0, campaigns: 0 };
        perf[sub].impressions += c.metrics.impressions;
        perf[sub].clicks += c.metrics.clicks;
        perf[sub].upvotes += c.metrics.upvotes || 0;
        perf[sub].comments += c.metrics.comments || 0;
        perf[sub].campaigns += 1;
      }
    }
    return Object.entries(perf).sort((a, b) => b[1].upvotes - a[1].upvotes);
  }, [campaigns]);

  const interestPerformance = useMemo(() => {
    const perf: Record<string, { impressions: number; clicks: number; engagements: number; campaigns: number }> = {};
    for (const c of campaigns) {
      for (const interest of c.targeting.interests || []) {
        if (!perf[interest]) perf[interest] = { impressions: 0, clicks: 0, engagements: 0, campaigns: 0 };
        perf[interest].impressions += c.metrics.impressions;
        perf[interest].clicks += c.metrics.clicks;
        perf[interest].engagements += c.metrics.engagement;
        perf[interest].campaigns += 1;
      }
    }
    return Object.entries(perf).sort((a, b) => b[1].engagements - a[1].engagements);
  }, [campaigns]);

  // ── Tag input helpers ───────────────────────────────────────
  const addTag = (tag: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) => {
    const t = tag.trim();
    if (t && !list.includes(t)) { setList([...list, t]); setInput(""); }
  };
  const removeTag = (tag: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(x => x !== tag));
  };

  // ── Status badge ────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      draft: "bg-slate-700 text-slate-300",
      active: "bg-emerald-900/60 text-emerald-400",
      paused: "bg-amber-900/60 text-amber-400",
      completed: "bg-blue-900/60 text-blue-400",
      archived: "bg-gray-700 text-gray-400",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF4500]/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#FF4500]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Reddit Ads Manager</h1>
              <p className="text-xs text-slate-400">Create, manage, and analyze Reddit campaigns</p>
            </div>
          </div>
          <button
            onClick={() => { resetBuilder(); setActiveTab("builder"); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#e63e00] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 border-b border-slate-700/50">
        {([
          { id: "campaigns" as TabId, label: "Campaigns", icon: Megaphone },
          { id: "builder" as TabId, label: "Campaign Builder", icon: Target },
          { id: "creative" as TabId, label: "Creative Builder", icon: Edit3 },
          { id: "analytics" as TabId, label: "Analytics", icon: BarChart3 },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#FF4500] text-[#FF4500]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── CAMPAIGNS TAB ─────────────────────────────────── */}
      {activeTab === "campaigns" && (
        <div className="p-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: "Impressions", value: formatNum(totalMetrics.impressions), icon: Eye, color: "text-blue-400" },
              { label: "Clicks", value: formatNum(totalMetrics.clicks), icon: MousePointer, color: "text-emerald-400" },
              { label: "Spend", value: formatCurrency(totalMetrics.spend), icon: DollarSign, color: "text-rose-400" },
              { label: "Conversions", value: formatNum(totalMetrics.conversions), icon: TrendingUp, color: "text-violet-400" },
              { label: "Upvotes", value: formatNum(totalMetrics.upvotes), icon: ArrowBigUp, color: "text-orange-400" },
              { label: "Comments", value: formatNum(totalMetrics.comments), icon: MessageCircle, color: "text-cyan-400" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-slate-400">{s.label}</span>
                </div>
                <p className="text-lg font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50 w-56"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={filterObjective}
                onChange={e => setFilterObjective(e.target.value)}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-[#FF4500]/50"
              >
                <option value="all">All Objectives</option>
                {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-[#FF4500]/50"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Campaign cards */}
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20">
              <Megaphone className="w-12 h-12 text-[#FF4500] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-200">No Reddit campaigns yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Create your first Reddit campaign to start reaching communities.</p>
              <button
                onClick={() => { resetBuilder(); setActiveTab("builder"); }}
                className="mt-5 px-5 py-2.5 bg-[#FF4500] hover:bg-[#e63e00] text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#FF4500]/20"
              >
                <Plus className="w-4 h-4" /> Create Campaign
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map(campaign => (
                <div
                  key={campaign.id}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:border-[#FF4500]/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FF4500]/15 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-[#FF4500]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{campaign.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={campaign.status} />
                          <span className="text-xs text-slate-500">{campaign.objective}</span>
                          <span className="text-xs text-slate-600">{campaign.budget.type === "daily" ? "/day" : "lifetime"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditCampaign(campaign)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateCampaign(campaign)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(campaign)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          campaign.status === "active"
                            ? "hover:bg-amber-900/40 text-amber-400"
                            : "hover:bg-emerald-900/40 text-emerald-400"
                        }`}
                        title={campaign.status === "active" ? "Pause" : "Activate"}
                      >
                        {campaign.status === "active" ? <ArrowBigDown className="w-4 h-4" /> : <ArrowBigUp className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-1.5 hover:bg-red-900/40 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {[
                      { label: "Budget", value: campaign.budget.type === "daily" ? `$${campaign.budget.amount}/day` : `$${campaign.budget.amount}` },
                      { label: "Spend", value: formatCurrency(campaign.metrics.spend) },
                      { label: "Impressions", value: formatNum(campaign.metrics.impressions) },
                      { label: "Clicks", value: formatNum(campaign.metrics.clicks) },
                      { label: "CTR", value: `${campaign.metrics.ctr}%` },
                      { label: "CPC", value: formatCurrency(campaign.metrics.cpc) },
                      { label: "Upvote Rate", value: `${((campaign.metrics.upvotes || 0) / Math.max(campaign.metrics.impressions * 0.01, 1) * 100).toFixed(1)}%` },
                      { label: "Conv.", value: String(campaign.metrics.conversions) },
                    ].map(m => (
                      <div key={m.label}>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{m.label}</p>
                        <p className="text-sm font-semibold text-slate-200">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Targeting preview */}
                  <div className="mt-3 pt-3 border-t border-slate-700/30 flex flex-wrap items-center gap-2">
                    {(campaign.targeting.subreddits || []).slice(0, 4).map(sub => (
                      <span key={sub} className="px-2 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-400 flex items-center gap-1">
                        <Hash className="w-3 h-3" />{sub}
                      </span>
                    ))}
                    {(campaign.targeting.subreddits || []).length > 4 && (
                      <span className="text-[10px] text-slate-500">+{(campaign.targeting.subreddits || []).length - 4} more</span>
                    )}
                    <span className="text-slate-600 mx-1">|</span>
                    <span className="text-[10px] text-slate-500">
                      {(campaign.targeting.placements || []).join(", ")}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCampaignId(campaign.id);
                        setActiveTab("analytics");
                      }}
                      className="ml-auto flex items-center gap-1 text-xs text-[#FF4500] hover:text-[#ff6a33] transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      View Analytics
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── BUILDER TAB ─────────────────────────────────────── */}
      {activeTab === "builder" && (
        <div className="p-6 max-w-4xl">
          <h2 className="text-lg font-bold text-white mb-4">
            {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
          </h2>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Name</label>
              <input
                type="text"
                value={builderName}
                onChange={e => setBuilderName(e.target.value)}
                placeholder="e.g., SaaS Product Launch Q2"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
              />
            </div>

            {/* Objective */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Objective</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj}
                    onClick={() => setBuilderObjective(obj)}
                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      builderObjective === obj
                        ? "border-[#FF4500] bg-[#FF4500]/10 text-[#FF4500]"
                        : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {obj}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Budget Type</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-700/50">
                  <button
                    onClick={() => setBuilderBudgetType("daily")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      builderBudgetType === "daily" ? "bg-[#FF4500] text-white" : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/50"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setBuilderBudgetType("lifetime")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      builderBudgetType === "lifetime" ? "bg-[#FF4500] text-white" : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/50"
                    }`}
                  >
                    Lifetime
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Budget Amount {builderBudgetType === "daily" ? "(per day)" : ""}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    value={builderBudgetAmount}
                    onChange={e => setBuilderBudgetAmount(e.target.value)}
                    placeholder="50"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                <input
                  type="text"
                  value="USD"
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700/30 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={builderStartDate}
                    onChange={e => setBuilderStartDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-[#FF4500]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">End Date (optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={builderEndDate}
                    onChange={e => setBuilderEndDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-[#FF4500]/50"
                  />
                </div>
              </div>
            </div>

            {/* Placements */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ad Placement</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "feed" as RedditPlacement, label: "Feed", desc: "Home, Popular, Profile feeds" },
                  { id: "conversations" as RedditPlacement, label: "Conversations", desc: "Post comments, discussion threads" },
                  { id: "both" as RedditPlacement, label: "Both", desc: "Maximize reach across placements" },
                ]).map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => setBuilderPlacement(pl.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      builderPlacement === pl.id
                        ? "border-[#FF4500] bg-[#FF4500]/10"
                        : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${builderPlacement === pl.id ? "text-[#FF4500]" : "text-slate-300"}`}>
                      {pl.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{pl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Targeting Section ── */}
            <div className="border-t border-slate-700/50 pt-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FF4500]" />
                Targeting
              </h3>

              {/* Subreddits */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Subreddits</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={builderSubredditInput}
                    onChange={e => setBuilderSubredditInput(e.target.value)}
                    onFocus={() => setShowSubredditSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSubredditSuggestions(false), 200)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(builderSubredditInput, builderSubreddits, setBuilderSubreddits, setBuilderSubredditInput); } }}
                    placeholder="Type a subreddit and press Enter..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                  />
                  {showSubredditSuggestions && builderSubredditInput.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-auto">
                      {SUGGESTED_SUBREDDITS.filter(s => s.toLowerCase().includes(builderSubredditInput.toLowerCase()) && !builderSubreddits.includes(s)).map(sub => (
                        <button
                          key={sub}
                          onMouseDown={() => addTag(sub, builderSubreddits, setBuilderSubreddits, setBuilderSubredditInput)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {builderSubreddits.map(sub => (
                    <span key={sub} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF4500]/15 text-[#FF4500] rounded-full text-xs font-medium">
                      {sub}
                      <button onClick={() => removeTag(sub, builderSubreddits, setBuilderSubreddits)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">Popular: {SUGGESTED_SUBREDDITS.slice(0, 6).join(", ")}</p>
              </div>

              {/* Interests */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        if (builderInterests.includes(interest)) {
                          setBuilderInterests(builderInterests.filter(i => i !== interest));
                        } else {
                          setBuilderInterests([...builderInterests, interest]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        builderInterests.includes(interest)
                          ? "border-[#FF4500] bg-[#FF4500]/10 text-[#FF4500]"
                          : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {builderInterests.includes(interest) && <Check className="w-3 h-3 inline mr-1" />}
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Locations</label>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_OPTIONS.map(loc => (
                    <button
                      key={loc}
                      onClick={() => {
                        if (builderLocations.includes(loc)) {
                          setBuilderLocations(builderLocations.filter(l => l !== loc));
                        } else {
                          setBuilderLocations([...builderLocations, loc]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        builderLocations.includes(loc)
                          ? "border-[#FF4500] bg-[#FF4500]/10 text-[#FF4500]"
                          : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {builderLocations.includes(loc) && <Check className="w-3 h-3 inline mr-1" />}
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Devices */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Devices</label>
                <div className="flex gap-3">
                  {[
                    { id: "desktop", label: "Desktop", icon: Monitor },
                    { id: "mobile", label: "Mobile", icon: Smartphone },
                    { id: "tablet", label: "Tablet", icon: Tablet },
                  ].map(dev => (
                    <button
                      key={dev.id}
                      onClick={() => {
                        if (builderDevices.includes(dev.id)) {
                          if (builderDevices.length > 1) setBuilderDevices(builderDevices.filter(d => d !== dev.id));
                        } else {
                          setBuilderDevices([...builderDevices, dev.id]);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                        builderDevices.includes(dev.id)
                          ? "border-[#FF4500] bg-[#FF4500]/10 text-[#FF4500]"
                          : "border-slate-700/50 bg-slate-800/40 text-slate-400"
                      }`}
                    >
                      <dev.icon className="w-4 h-4" />
                      {dev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Keywords</label>
                <input
                  type="text"
                  value={builderKeywordInput}
                  onChange={e => setBuilderKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(builderKeywordInput, builderKeywords, setBuilderKeywords, setBuilderKeywordInput); } }}
                  placeholder="Type keyword and press Enter..."
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {builderKeywords.map(kw => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs">
                      {kw}
                      <button onClick={() => removeTag(kw, builderKeywords, setBuilderKeywords)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Audiences */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Custom Audiences</label>
                <input
                  type="text"
                  value={builderCustomAudienceInput}
                  onChange={e => setBuilderCustomAudienceInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(builderCustomAudienceInput, builderCustomAudiences, setBuilderCustomAudiences, setBuilderCustomAudienceInput); } }}
                  placeholder="e.g., Website Visitors, App Installers..."
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {builderCustomAudiences.map(aud => (
                    <span key={aud} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs">
                      <Users className="w-3 h-3" />
                      {aud}
                      <button onClick={() => removeTag(aud, builderCustomAudiences, setBuilderCustomAudiences)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-slate-700/50 pt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
              <textarea
                value={builderNotes}
                onChange={e => setBuilderNotes(e.target.value)}
                placeholder="Internal notes about this campaign..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleSaveCampaign}
                disabled={!builderName.trim() || !builderBudgetAmount || !builderStartDate}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#FF4500] hover:bg-[#e63e00] disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingCampaign ? "Update Campaign" : "Save Campaign"}
              </button>
              <button
                onClick={() => { resetBuilder(); setActiveTab("campaigns"); }}
                className="px-6 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATIVE TAB ────────────────────────────────────── */}
      {activeTab === "creative" && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Creative Form */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#FF4500]" />
                Creative Builder
              </h2>

              {/* Campaign selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Campaign</label>
                <select
                  value={selectedCampaignId || ""}
                  onChange={e => setSelectedCampaignId(e.target.value || null)}
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-[#FF4500]/50"
                >
                  <option value="">Choose a campaign...</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedCampaign && (
                <div className="space-y-4">
                  {/* Headline */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Post Headline</label>
                    <p className="text-[11px] text-slate-500 mb-1">{creativeHeadline.length} / 300</p>
                    <input
                      type="text"
                      value={creativeHeadline}
                      onChange={e => setCreativeHeadline(e.target.value.slice(0, 300))}
                      placeholder="Write an engaging headline..."
                      className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Post Body</label>
                    <p className="text-[11px] text-slate-500 mb-1">{creativeBody.length.toLocaleString()} / 40,000</p>
                    <textarea
                      value={creativeBody}
                      onChange={e => setCreativeBody(e.target.value.slice(0, 40000))}
                      placeholder="Write your post body. Be authentic — Redditors value genuine content..."
                      rows={6}
                      className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50 resize-none"
                    />
                  </div>

                  {/* CTA */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Call to Action</label>
                    <div className="flex flex-wrap gap-2">
                      {CTA_OPTIONS.map(cta => (
                        <button
                          key={cta}
                          onClick={() => setCreativeCta(cta)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            creativeCta === cta
                              ? "border-[#FF4500] bg-[#FF4500]/10 text-[#FF4500]"
                              : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          {cta}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Destination URL */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Destination URL</label>
                    <input
                      type="url"
                      value={creativeUrl}
                      onChange={e => setCreativeUrl(e.target.value)}
                      placeholder="https://yoursite.com/landing-page"
                      className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                    />
                  </div>

                  {/* Media */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Media URL (optional)</label>
                    <div className="relative">
                      <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="url"
                        value={creativeImageUrl}
                        onChange={e => setCreativeImageUrl(e.target.value)}
                        placeholder="https://yoursite.com/image.jpg"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                      />
                    </div>
                  </div>

                  {/* Comment Management */}
                  <div className="border-t border-slate-700/50 pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-[#FF4500]" />
                      Comment Management
                    </h4>
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => setCreativeAllowComments(!creativeAllowComments)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${creativeAllowComments ? "bg-[#FF4500]" : "bg-slate-700"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${creativeAllowComments ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                      <span className="text-sm text-slate-300">Allow comments</span>
                    </div>

                    {/* Moderation keywords */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Auto-moderation Keywords</label>
                      <input
                        type="text"
                        value={creativeModKeywordInput}
                        onChange={e => setCreativeModKeywordInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(creativeModKeywordInput, creativeModerationKeywords, setCreativeModerationKeywords, setCreativeModKeywordInput); } }}
                        placeholder="spam, scam, fake, etc."
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF4500]/50"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {creativeModerationKeywords.map(kw => (
                          <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/30 text-red-400 rounded-full text-xs">
                            {kw}
                            <button onClick={() => removeTag(kw, creativeModerationKeywords, setCreativeModerationKeywords)} className="hover:text-white">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Upvote Seed */}
                  <div className="border-t border-slate-700/50 pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <ArrowBigUp className="w-4 h-4 text-[#FF4500]" />
                      Upvote Seed
                    </h4>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={50}
                        value={creativeUpvoteSeed}
                        onChange={e => setCreativeUpvoteSeed(Number(e.target.value))}
                        className="flex-1 accent-[#FF4500]"
                      />
                      <span className="text-sm font-medium text-[#FF4500] w-8">{creativeUpvoteSeed}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Simulate initial upvotes to boost visibility at launch</p>
                  </div>

                  {/* Save */}
                  <button
                    onClick={handleSaveCreative}
                    disabled={!creativeHeadline.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#FF4500] hover:bg-[#e63e00] disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Add Creative
                  </button>
                </div>
              )}

              {!selectedCampaign && (
                <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700/50">
                  <Target className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Select a campaign to add creatives</p>
                </div>
              )}
            </div>

            {/* Preview + Existing Creatives */}
            <div>
              {/* Live Preview */}
              {creativeHeadline && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Live Preview</h3>
                  <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-4">
                    {/* Mock Reddit post */}
                    <div className="flex items-start gap-3">
                      {/* Vote column */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <ArrowBigUp className="w-6 h-6 text-slate-500 hover:text-[#FF4500] cursor-pointer" />
                        <span className="text-xs font-bold text-slate-400">{creativeUpvoteSeed + 42}</span>
                        <ArrowBigDown className="w-6 h-6 text-slate-500 hover:text-blue-500 cursor-pointer" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {creativeImageUrl && (
                          <div className="w-full h-40 bg-slate-800 rounded-lg mb-3 overflow-hidden">
                            <img src={creativeImageUrl} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                          </div>
                        )}
                        <h4 className="text-[15px] font-semibold text-white leading-snug mb-1">{creativeHeadline}</h4>
                        <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{creativeBody}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                          <span className="text-[#FF4500] font-medium">promoted</span>
                          <span>by u/{selectedCampaign?.name?.split(" ")[0]?.toLowerCase() || "yourbrand"}</span>
                          <span>• just now</span>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <button className="px-4 py-1.5 bg-[#FF4500] text-white text-xs font-medium rounded-full hover:bg-[#e63e00] transition-colors">
                            {creativeCta}
                          </button>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {creativeAllowComments ? "Comments enabled" : "Comments disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing creatives */}
              {selectedCampaign && selectedCampaign.creatives.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Existing Creatives ({selectedCampaign.creatives.length})</h3>
                  <div className="space-y-3">
                    {selectedCampaign.creatives.map(cr => (
                      <div key={cr.id} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-semibold text-white">{cr.headline}</h4>
                          <button
                            onClick={() => handleDeleteCreative(cr.id)}
                            className="p-1 hover:bg-red-900/40 rounded text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-2">{cr.body}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 bg-[#FF4500]/15 text-[#FF4500] rounded">{cr.cta}</span>
                          {cr.destinationUrl && (
                            <a href={cr.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 truncate max-w-[200px]">
                              {cr.destinationUrl}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ANALYTICS TAB ───────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="p-6">
          {/* Top metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            {[
              { label: "Impressions", value: formatNum(totalMetrics.impressions), icon: Eye, accent: "border-blue-500/30" },
              { label: "Clicks", value: formatNum(totalMetrics.clicks), icon: MousePointer, accent: "border-emerald-500/30" },
              { label: "CTR", value: `${totalMetrics.impressions > 0 ? ((totalMetrics.clicks / totalMetrics.impressions) * 100).toFixed(2) : 0}%`, icon: TrendingUp, accent: "border-violet-500/30" },
              { label: "CPC", value: formatCurrency(totalMetrics.clicks > 0 ? totalMetrics.spend / totalMetrics.clicks : 0), icon: DollarSign, accent: "border-rose-500/30" },
              { label: "Spend", value: formatCurrency(totalMetrics.spend), icon: DollarSign, accent: "border-orange-500/30" },
              { label: "Upvotes", value: formatNum(totalMetrics.upvotes), icon: ArrowBigUp, accent: "border-orange-400/30" },
              { label: "Downvotes", value: formatNum(totalMetrics.downvotes), icon: ArrowBigDown, accent: "border-red-500/30" },
              { label: "Comments", value: formatNum(totalMetrics.comments), icon: MessageCircle, accent: "border-cyan-500/30" },
            ].map(m => (
              <div key={m.label} className={`bg-slate-800/60 rounded-lg p-4 border ${m.accent}`}>
                <div className="flex items-center gap-2 mb-1">
                  <m.icon className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</span>
                </div>
                <p className="text-lg font-bold text-white">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Awards", value: formatNum(totalMetrics.awards), icon: Award },
              { label: "Conversions", value: formatNum(totalMetrics.conversions), icon: TrendingUp },
              { label: "Cost/Conv", value: formatCurrency(totalMetrics.conversions > 0 ? totalMetrics.spend / totalMetrics.conversions : 0), icon: DollarSign },
              { label: "Upvote Rate", value: `${totalMetrics.impressions > 0 ? ((totalMetrics.upvotes / totalMetrics.impressions) * 100).toFixed(2) : 0}%`, icon: ArrowBigUp },
            ].map(m => (
              <div key={m.label} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30 flex items-center gap-3">
                <m.icon className="w-5 h-5 text-[#FF4500]" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</p>
                  <p className="text-base font-bold text-white">{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Campaign selector */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-slate-400">Campaign:</span>
            <select
              value={selectedCampaignId || "all"}
              onChange={e => setSelectedCampaignId(e.target.value === "all" ? null : e.target.value)}
              className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-[#FF4500]/50"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Engagement Quality Score */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF4500]" />
              Engagement Quality Score
            </h3>
            <div className="flex items-center gap-6">
              {campaigns.map(c => {
                const score = c.metrics.qualityScore || 0;
                const upvoteRatio = c.metrics.upvotes ? (c.metrics.upvotes / (c.metrics.upvotes + (c.metrics.comments || 0) * 10 + 1)) * 10 : 0;
                const finalScore = score > 0 ? score : Math.min(10, Math.max(1, upvoteRatio));
                return (
                  <div key={c.id} className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">{c.name}</span>
                      <span className={`text-sm font-bold ${finalScore >= 7 ? "text-emerald-400" : finalScore >= 4 ? "text-amber-400" : "text-red-400"}`}>
                        {finalScore.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          finalScore >= 7 ? "bg-emerald-500" : finalScore >= 4 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${finalScore * 10}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-slate-500">
                      <span>Upvotes: {formatNum(c.metrics.upvotes || 0)}</span>
                      <span>Comments: {formatNum(c.metrics.comments || 0)}</span>
                      <span>Saves: {formatNum(c.metrics.saves || 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Analytics sub-tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-slate-700/50">
            {([
              { id: "overview" as const, label: "Overview" },
              { id: "subreddits" as const, label: "Subreddit Performance" },
              { id: "interests" as const, label: "Interest Targeting" },
            ]).map(v => (
              <button
                key={v.id}
                onClick={() => setAnalyticsView(v.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  analyticsView === v.id ? "border-[#FF4500] text-[#FF4500]" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {analyticsView === "overview" && (
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.id} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">{c.name}</h4>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {[
                      { label: "Impressions", value: formatNum(c.metrics.impressions) },
                      { label: "Clicks", value: formatNum(c.metrics.clicks) },
                      { label: "CTR", value: `${c.metrics.ctr}%` },
                      { label: "CPC", value: formatCurrency(c.metrics.cpc) },
                      { label: "Spend", value: formatCurrency(c.metrics.spend) },
                      { label: "Conversions", value: String(c.metrics.conversions) },
                    ].map(m => (
                      <div key={m.label}>
                        <p className="text-[10px] uppercase text-slate-500">{m.label}</p>
                        <p className="text-sm font-semibold text-slate-200">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-700/30">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Upvotes</p>
                      <p className="text-sm font-semibold text-orange-400 flex items-center gap-1">
                        <ArrowBigUp className="w-4 h-4" />
                        {formatNum(c.metrics.upvotes || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Downvotes</p>
                      <p className="text-sm font-semibold text-red-400 flex items-center gap-1">
                        <ArrowBigDown className="w-4 h-4" />
                        {formatNum(Math.floor((c.metrics.upvotes || 0) * 0.15))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Upvote Rate</p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {((c.metrics.upvotes || 0) / Math.max(c.metrics.impressions * 0.01, 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Comments</p>
                      <p className="text-sm font-semibold text-cyan-400 flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {formatNum(c.metrics.comments || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subreddit Performance */}
          {analyticsView === "subreddits" && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#FF4500]" />
                <h3 className="text-sm font-semibold text-white">Subreddit Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {["Subreddit", "Campaigns", "Impressions", "Clicks", "CTR", "Upvotes", "Comments", "Engagement"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subredditPerformance.map(([sub, data]) => (
                      <tr key={sub} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-white">{sub}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{data.campaigns}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{formatNum(data.impressions)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{formatNum(data.clicks)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400">{(data.impressions > 0 ? (data.clicks / data.impressions * 100) : 0).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-orange-400">{formatNum(data.upvotes)}</td>
                        <td className="px-4 py-3 text-sm text-cyan-400">{formatNum(data.comments)}</td>
                        <td className="px-4 py-3">
                          <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#FF4500] rounded-full"
                              style={{ width: `${Math.min(100, (data.upvotes / Math.max(data.impressions, 1)) * 500)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Interest Targeting */}
          {analyticsView === "interests" && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FF4500]" />
                <h3 className="text-sm font-semibold text-white">Interest Targeting Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {["Interest", "Campaigns", "Impressions", "Clicks", "CTR", "Engagements", "Share"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {interestPerformance.map(([interest, data]) => {
                      const totalEng = interestPerformance.reduce((s, [, d]) => s + d.engagements, 0);
                      return (
                        <tr key={interest} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-white">{interest}</td>
                          <td className="px-4 py-3 text-sm text-slate-400">{data.campaigns}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{formatNum(data.impressions)}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{formatNum(data.clicks)}</td>
                          <td className="px-4 py-3 text-sm text-emerald-400">{(data.impressions > 0 ? (data.clicks / data.impressions * 100) : 0).toFixed(2)}%</td>
                          <td className="px-4 py-3 text-sm text-[#FF4500]">{formatNum(data.engagements)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#FF4500] rounded-full"
                                  style={{ width: `${totalEng > 0 ? (data.engagements / totalEng * 100) : 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {totalEng > 0 ? (data.engagements / totalEng * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
