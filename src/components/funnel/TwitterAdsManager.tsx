"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Twitter, Target, DollarSign, Users, Type, Hash, Plus, Trash2,
  Copy, BarChart3, MousePointer, TrendingUp, MessageCircle, Heart, Share2, Save, X, Check, Repeat2,
  Eye, Play, Globe, Smartphone, Monitor, Tablet, Search,
  ArrowRight, Pause, Image, Video, Link2, Settings, ChevronLeft, ChevronRight, Megaphone
} from "lucide-react";
import { createCampaign, updateCampaign, loadCampaigns } from "@/lib/adCampaignStore";
import type { AdCampaign, AdCreative, AdTargeting } from "@/lib/adCampaignStore";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

type View = "list" | "builder" | "analytics";
type BuildStep = "details" | "targeting" | "creative" | "review";

interface TweetThread {
  id: string;
  text: string;
  mediaType: "none" | "image" | "video";
  mediaUrl: string;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const TWITTER_OBJECTIVES = [
  { id: "reach", label: "Reach", icon: Eye, desc: "Maximize unique users who see your ad" },
  { id: "video_views", label: "Video Views", icon: Play, desc: "Get more people to watch your video" },
  { id: "engagement", label: "Engagement", icon: MessageCircle, desc: "Drive replies, retweets, and likes" },
  { id: "website_traffic", label: "Website Traffic", icon: Globe, desc: "Send users to your website" },
  { id: "conversions", label: "Conversions", icon: Target, desc: "Drive specific actions on your site" },
  { id: "followers", label: "Followers", icon: Users, desc: "Grow your follower base" },
  { id: "app_installs", label: "App Installs", icon: Smartphone, desc: "Get users to install your app" },
] as const;

const CTA_OPTIONS = [
  "Visit Site", "Shop Now", "Learn More", "Sign Up", "Download", "Book", "Order Now", "Subscribe", "Watch Now"
];

const INTEREST_OPTIONS = [
  "Technology", "Business", "Marketing", "AI / ML", "Startups", "SaaS",
  "E-commerce", "Finance", "Crypto", "Design", "Photography", "Gaming",
  "Music", "Sports", "News", "Science", "Travel", "Food & Drink",
  "Health & Fitness", "Education", "Real Estate", "Entertainment"
];

const BEHAVIOR_OPTIONS = [
  "Engaged Shoppers", "WiFi Users", "Mobile Device Users", "Recent Travelers",
  "Small Business Owners", "IT Decision Makers", "C-level Executives",
  "Android Users", "iOS Users", "Event Goers"
];

const DEVICE_OPTIONS = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "mobile_ios", label: "Mobile iOS", icon: Smartphone },
  { id: "mobile_android", label: "Mobile Android", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
];

const GENDER_OPTIONS = ["all", "male", "female"] as const;

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Japanese", "Portuguese",
  "Korean", "Italian", "Arabic", "Hindi", "Chinese", "Russian"
];

const LOCATION_OPTIONS = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Japan", "Brazil", "India", "Mexico", "Spain", "Netherlands",
  "Italy", "South Korea", "Argentina", "Colombia", "Chile", "Turkey",
  "Saudi Arabia", "UAE", "Indonesia", "Thailand", "Philippines", "Nigeria"
];

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  paused:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
  draft:    "bg-slate-500/20 text-slate-400 border-slate-500/30",
  completed:"bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

/* ═══════════════════════════════════════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════════════════════════════════════ */

const fmtNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtNum1 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const fmtCurr = (n: number) => `$${n.toFixed(2)}`;

function getObjectiveLabel(id: string) {
  return TWITTER_OBJECTIVES.find(o => o.id === id)?.label || id;
}

function getEngagementRate(campaign: AdCampaign) {
  return campaign.metrics.impressions > 0
    ? ((campaign.metrics.engagement / campaign.metrics.impressions) * 100).toFixed(2)
    : "0.00";
}

function getCostPerResult(campaign: AdCampaign) {
  const m = campaign.metrics;
  if (m.spend <= 0) return "$0.00";
  switch (campaign.objective) {
    case "followers": return fmtCurr(m.spend / (m.engagement || 1));
    case "video_views": return fmtCurr(m.spend / (m.videoViews || 1));
    case "website_traffic":
    case "conversions": return fmtCurr(m.cpc || 0);
    case "engagement": return fmtCurr(m.spend / (m.engagement || 1));
    default: return fmtCurr(m.spend / (m.clicks || 1));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function TwitterAdsManager() {
  const [view, setView] = useState<View>("list");
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [objectiveFilter, setObjectiveFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Builder state
  const [buildStep, setBuildStep] = useState<BuildStep>("details");
  const [campaignName, setCampaignName] = useState("");
  const [selectedObjective, setSelectedObjective] = useState<string>("");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [budgetAmount, setBudgetAmount] = useState<number>(100);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Targeting state
  const [targeting, setTargeting] = useState<AdTargeting>({
    locations: [], ageRange: { min: 18, max: 65 }, genders: ["all"], languages: [],
    interests: [], behaviors: [], keywords: [], customAudiences: [],
    excludedAudiences: [], placements: ["timeline"], devices: [], followerTargets: [],
  });

  // Creative / Thread state
  const [tweets, setTweets] = useState<TweetThread[]>([{ id: "t-1", text: "", mediaType: "none", mediaUrl: "" }]);
  const [cta, setCta] = useState("Visit Site");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [includePoll, setIncludePoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState(24);
  const [hasWebsiteCard, setHasWebsiteCard] = useState(true);
  const [websiteHeadline, setWebsiteHeadline] = useState("");

  // Notifications
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Init: load user-created campaigns only (no seed data)
  useEffect(() => {
    const loaded = loadCampaigns().filter(c => c.platform === "twitter");
    setCampaigns(loaded);
  }, []);

  // ── Toast helper
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Refresh campaigns
  const refresh = useCallback(() => {
    setCampaigns(loadCampaigns().filter(c => c.platform === "twitter"));
  }, []);

  // ── Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (objectiveFilter !== "all" && c.objective !== objectiveFilter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [campaigns, statusFilter, objectiveFilter, searchTerm]);

  // ── Totals
  const totals = useMemo(() => {
    return campaigns.reduce((acc, c) => ({
      impressions: acc.impressions + c.metrics.impressions,
      spend: acc.spend + c.metrics.spend,
      clicks: acc.clicks + c.metrics.clicks,
      engagement: acc.engagement + c.metrics.engagement,
    }), { impressions: 0, spend: 0, clicks: 0, engagement: 0 });
  }, [campaigns]);

  // ── Selected campaign (for analytics)
  const selectedCampaign = useMemo(() =>
    campaigns.find(c => c.id === selectedCampaignId) || null
  , [campaigns, selectedCampaignId]);

  // ── Reset builder
  const resetBuilder = useCallback(() => {
    setBuildStep("details");
    setCampaignName("");
    setSelectedObjective("");
    setBudgetType("daily");
    setBudgetAmount(100);
    setStartDate("");
    setEndDate("");
    setTargeting({
      locations: [], ageRange: { min: 18, max: 65 }, genders: ["all"], languages: [],
      interests: [], behaviors: [], keywords: [], customAudiences: [],
      excludedAudiences: [], placements: ["timeline"], devices: [], followerTargets: [],
    });
    setTweets([{ id: "t-1", text: "", mediaType: "none", mediaUrl: "" }]);
    setCta("Visit Site");
    setDestinationUrl("");
    setIncludePoll(false);
    setPollOptions(["", ""]);
    setPollDuration(24);
    setHasWebsiteCard(true);
    setWebsiteHeadline("");
  }, []);

  // ── Save campaign
  const saveCampaign = useCallback(() => {
    if (!campaignName.trim() || !selectedObjective) {
      showToast("Campaign name and objective are required", "error");
      return;
    }
    if (!startDate) {
      showToast("Start date is required", "error");
      return;
    }

    const creatives: AdCreative[] = tweets.map((t, idx) => ({
      id: `tc-${Date.now()}-${idx}`,
      type: idx === 0 && hasWebsiteCard ? "website_card" : "promoted_tweet",
      headline: idx === 0 ? websiteHeadline : "",
      description: "",
      body: t.text,
      cta: idx === 0 ? cta : "",
      imageUrl: t.mediaType === "image" ? t.mediaUrl : "",
      videoUrl: t.mediaType === "video" ? t.mediaUrl : "",
      destinationUrl: idx === 0 ? destinationUrl : "",
      utmParams: "",
      variants: [],
    }));

    createCampaign({
      platform: "twitter",
      name: campaignName,
      objective: selectedObjective,
      status: "draft",
      budget: { amount: budgetAmount, type: budgetType, currency: "USD" },
      schedule: { startDate, endDate: endDate || null },
      targeting,
      creatives,
      notes: "",
    });

    refresh();
    resetBuilder();
    setView("list");
    showToast("Campaign created successfully!");
  }, [campaignName, selectedObjective, budgetType, budgetAmount, startDate, endDate, targeting, tweets, cta, destinationUrl, hasWebsiteCard, websiteHeadline, refresh, resetBuilder, showToast]);

  // ── Duplicate campaign
  const duplicateCampaign = useCallback((campaign: AdCampaign) => {
    createCampaign({
      platform: "twitter",
      name: `${campaign.name} (Copy)`,
      objective: campaign.objective,
      status: "draft",
      budget: { ...campaign.budget },
      schedule: { ...campaign.schedule },
      targeting: JSON.parse(JSON.stringify(campaign.targeting)),
      creatives: JSON.parse(JSON.stringify(campaign.creatives)),
      notes: campaign.notes,
    });
    refresh();
    showToast("Campaign duplicated!");
  }, [refresh, showToast]);

  // ── Toggle status
  const toggleStatus = useCallback((campaign: AdCampaign) => {
    const next = campaign.status === "active" ? "paused" :
                 campaign.status === "paused" ? "active" :
                 campaign.status === "draft" ? "active" : campaign.status;
    updateCampaign(campaign.id, { status: next as AdCampaign["status"] });
    refresh();
    showToast(`Campaign ${next === "active" ? "activated" : "paused"}!`);
  }, [refresh, showToast]);

  // ── Add tweet to thread
  const addTweet = useCallback(() => {
    setTweets(prev => [...prev, { id: `t-${Date.now()}`, text: "", mediaType: "none", mediaUrl: "" }]);
  }, []);

  // ── Remove tweet
  const removeTweet = useCallback((id: string) => {
    setTweets(prev => prev.length > 1 ? prev.filter(t => t.id !== id) : prev);
  }, []);

  // ── Update tweet
  const updateTweet = useCallback((id: string, updates: Partial<TweetThread>) => {
    setTweets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  // ── Toggle array targeting
  const toggleTargetingArray = useCallback((field: keyof AdTargeting, value: string) => {
    setTargeting(prev => {
      const arr = (prev[field] as string[]) || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }, []);

  // ── Toggle single targeting
  const toggleTargetingSingle = useCallback((field: "genders", value: string) => {
    setTargeting(prev => ({ ...prev, [field]: [value] as any }));
  }, []);

  // ── Toggle keyword from input
  const [keywordInput, setKeywordInput] = useState("");
  const addKeyword = useCallback(() => {
    if (keywordInput.trim() && !targeting.keywords.includes(keywordInput.trim())) {
      setTargeting(prev => ({ ...prev, keywords: [...prev.keywords, keywordInput.trim()] }));
      setKeywordInput("");
    }
  }, [keywordInput, targeting.keywords]);

  // ── Toggle follower target from input
  const [followerInput, setFollowerInput] = useState("");
  const addFollowerTarget = useCallback(() => {
    const handle = followerInput.trim().startsWith("@") ? followerInput.trim() : `@${followerInput.trim()}`;
    if (handle.length > 1 && !targeting.followerTargets?.includes(handle)) {
      setTargeting(prev => ({ ...prev, followerTargets: [...(prev.followerTargets || []), handle] }));
      setFollowerInput("");
    }
  }, [followerInput, targeting.followerTargets]);

  // ── Toggle custom audience from input
  const [audienceInput, setAudienceInput] = useState("");
  const addCustomAudience = useCallback(() => {
    if (audienceInput.trim() && !targeting.customAudiences.includes(audienceInput.trim())) {
      setTargeting(prev => ({ ...prev, customAudiences: [...prev.customAudiences, audienceInput.trim()] }));
      setAudienceInput("");
    }
  }, [audienceInput, targeting.customAudiences]);

  // ── Add poll option
  const addPollOption = useCallback(() => {
    if (pollOptions.length < 4) setPollOptions(prev => [...prev, ""]);
  }, [pollOptions.length]);

  /* ── Render ────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1DA1F2]/20 flex items-center justify-center">
              <Twitter size={20} className="text-[#1DA1F2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Twitter / X Ads Manager</h1>
              <p className="text-xs text-slate-400">Create, manage, and analyze your campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view !== "list" && (
              <button onClick={() => { setView("list"); setSelectedCampaignId(null); }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition-colors flex items-center gap-1.5">
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {view === "list" && (
              <button onClick={() => { resetBuilder(); setView("builder"); }}
                className="px-4 py-2 rounded-lg bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-[#1DA1F2]/20">
                <Plus size={16} /> New Campaign
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === "list" && <CampaignListView />}
        {view === "builder" && <BuilderView />}
        {view === "analytics" && <AnalyticsView />}
      </main>
    </div>
  );

  /* ── SUB-VIEWS ────────────────────────────────────────────────────────────── */

  function CampaignListView() {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Spend", value: fmtCurr(totals.spend), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Impressions", value: fmtNum(totals.impressions), icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Total Clicks", value: fmtNum(totals.clicks), icon: MousePointer, color: "text-violet-400", bg: "bg-violet-500/10" },
            { label: "Engagements", value: fmtNum(totals.engagement), icon: MessageCircle, color: "text-[#1DA1F2]", bg: "bg-[#1DA1F2]/10" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-md ${card.bg} flex items-center justify-center`}>
                  <card.icon size={14} className={card.color} />
                </div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-500" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search campaigns..."
              className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none w-44" />
          </div>
          <div className="h-5 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-slate-500" />
            <select value={objectiveFilter} onChange={e => setObjectiveFilter(e.target.value)}
              className="bg-slate-700/50 text-sm text-slate-200 rounded-lg px-2 py-1.5 border border-slate-600 outline-none focus:border-[#1DA1F2]">
              <option value="all">All Objectives</option>
              {TWITTER_OBJECTIVES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <FilterIcon />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-700/50 text-sm text-slate-200 rounded-lg px-2 py-1.5 border border-slate-600 outline-none focus:border-[#1DA1F2]">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-slate-500">{filteredCampaigns.length} campaigns</span>
        </div>

        {/* Campaign Cards */}
        <div className="grid gap-4">
          {filteredCampaigns.map(campaign => (
            <div key={campaign.id}
              className="group rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/70 hover:border-[#1DA1F2]/30 transition-all p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1DA1F2]/10 flex items-center justify-center flex-shrink-0">
                    <Twitter size={18} className="text-[#1DA1F2]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-[#1DA1F2] transition-colors">{campaign.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[campaign.status] || STATUS_STYLES.draft}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Target size={10} /> {getObjectiveLabel(campaign.objective)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {campaign.budget.type === "daily" ? "Daily" : "Lifetime"} · {fmtCurr(campaign.budget.amount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleStatus(campaign)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      campaign.status === "active"
                        ? "hover:bg-amber-500/20 text-amber-400"
                        : "hover:bg-emerald-500/20 text-emerald-400"
                    }`} title={campaign.status === "active" ? "Pause" : "Activate"}>
                    {campaign.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button onClick={() => duplicateCampaign(campaign)}
                    className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors" title="Duplicate">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => { setSelectedCampaignId(campaign.id); setView("analytics"); }}
                    className="p-1.5 rounded-lg hover:bg-violet-500/20 text-violet-400 transition-colors" title="Analytics">
                    <BarChart3 size={14} />
                  </button>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-3 border-t border-slate-700/30">
                <Metric label="Spend" value={fmtCurr(campaign.metrics.spend)} />
                <Metric label="Impressions" value={fmtNum(campaign.metrics.impressions)} />
                <Metric label="Engagements" value={fmtNum(campaign.metrics.engagement)} />
                <Metric label="Eng. Rate" value={`${getEngagementRate(campaign)}%`} />
                <Metric label="Clicks" value={fmtNum(campaign.metrics.clicks)} />
                <Metric label="CTR" value={`${campaign.metrics.ctr?.toFixed(2) ?? "0.00"}%`} />
                <Metric label="CPC" value={fmtCurr(campaign.metrics.cpc || 0)} />
                <Metric label="Cost/Result" value={getCostPerResult(campaign)} accent />
              </div>

              {/* Creative Preview */}
              {campaign.creatives.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <Type size={10} /> Tweet preview
                  </p>
                  <p className="text-sm text-slate-300 line-clamp-2">{campaign.creatives[0].body}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-16 rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20">
            <Megaphone size={40} className="mx-auto text-[#1DA1F2] mb-3" />
            <h3 className="text-lg font-semibold text-slate-200">No Twitter campaigns yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Create your first Twitter campaign to start reaching your audience.</p>
            <button onClick={() => { resetBuilder(); setView("builder"); }}
              className="mt-5 px-5 py-2.5 rounded-lg bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#1DA1F2]/20">
              <Plus size={18} /> Create Campaign
            </button>
          </div>
        )}
      </div>
    );
  }

  function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-semibold ${accent ? "text-[#1DA1F2]" : "text-white"}`}>{value}</p>
      </div>
    );
  }

  function FilterIcon() {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    );
  }

  /* ═════════════════════════════════════════════════════════════════════════════
     BUILDER VIEW
     ═════════════════════════════════════════════════════════════════════════════ */

  function BuilderView() {
    const stepLabels: { id: BuildStep; label: string; icon: React.ElementType }[] = [
      { id: "details", label: "Details", icon: Settings },
      { id: "targeting", label: "Targeting", icon: Target },
      { id: "creative", label: "Creative", icon: Type },
      { id: "review", label: "Review", icon: Check },
    ];

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {stepLabels.map((s, idx) => {
            const Icon = s.icon;
            const isActive = buildStep === s.id;
            const isPast = stepLabels.findIndex(x => x.id === buildStep) > idx;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <button onClick={() => setBuildStep(s.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    isActive
                      ? "bg-[#1DA1F2]/10 border-[#1DA1F2]/40 text-[#1DA1F2]"
                      : isPast
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}>
                  <Icon size={14} />
                  {s.label}
                  {isPast && <Check size={12} />}
                </button>
                {idx < stepLabels.length - 1 && (
                  <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6 backdrop-blur-sm">
          {buildStep === "details" && <DetailsStep />}
          {buildStep === "targeting" && <TargetingStep />}
          {buildStep === "creative" && <CreativeStep />}
          {buildStep === "review" && <ReviewStep />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => { resetBuilder(); setView("list"); }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition-colors">
            Cancel
          </button>
          <div className="flex gap-2">
            {buildStep !== "details" && (
              <button onClick={() => {
                const steps: BuildStep[] = ["details", "targeting", "creative", "review"];
                const idx = steps.indexOf(buildStep);
                setBuildStep(steps[idx - 1]);
              }} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition-colors">
                Previous
              </button>
            )}
            {buildStep !== "review" ? (
              <button onClick={() => {
                const steps: BuildStep[] = ["details", "targeting", "creative", "review"];
                const idx = steps.indexOf(buildStep);
                setBuildStep(steps[idx + 1]);
              }} className="px-4 py-2 rounded-lg bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium transition-colors flex items-center gap-1.5">
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={saveCampaign}
                className="px-4 py-2 rounded-lg bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-[#1DA1F2]/20">
                <Save size={14} /> Save Campaign
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Details Step ──────────────────────────────────────────────────────────── */

  function DetailsStep() {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings size={18} className="text-[#1DA1F2]" /> Campaign Details
        </h2>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Campaign Name</label>
          <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
            placeholder="e.g., Summer Product Launch 2024"
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 placeholder-slate-500 text-sm outline-none focus:border-[#1DA1F2] focus:ring-1 focus:ring-[#1DA1F2]/30 transition-all" />
        </div>

        {/* Objective */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Objective</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TWITTER_OBJECTIVES.map(obj => {
              const Icon = obj.icon;
              const selected = selectedObjective === obj.id;
              return (
                <button key={obj.id} onClick={() => setSelectedObjective(obj.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? "border-[#1DA1F2]/50 bg-[#1DA1F2]/10 ring-1 ring-[#1DA1F2]/30"
                      : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className={selected ? "text-[#1DA1F2]" : "text-slate-400"} />
                    <span className={`text-sm font-medium ${selected ? "text-white" : "text-slate-300"}`}>{obj.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{obj.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Budget Type</label>
            <div className="flex gap-2">
              {(["daily", "lifetime"] as const).map(t => (
                <button key={t} onClick={() => setBudgetType(t)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm capitalize transition-all ${
                    budgetType === t
                      ? "border-[#1DA1F2]/50 bg-[#1DA1F2]/10 text-white"
                      : "border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Budget Amount (USD)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="number" min={1} value={budgetAmount} onChange={e => setBudgetAmount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2] transition-all" />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2] transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">End Date <span className="text-slate-500">(optional)</span></label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2] transition-all" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Targeting Step ────────────────────────────────────────────────────────── */

  function TargetingStep() {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Target size={18} className="text-[#1DA1F2]" /> Audience Targeting
        </h2>

        {/* Locations */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Locations</label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg border border-slate-700/50 bg-slate-900/30">
            {LOCATION_OPTIONS.map(loc => (
              <button key={loc} onClick={() => toggleTargetingArray("locations", loc)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${
                  targeting.locations.includes(loc)
                    ? "bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                }`}>
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Age & Gender Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Age Range</label>
            <div className="flex items-center gap-3">
              <input type="number" min={13} max={100} value={targeting.ageRange.min}
                onChange={e => setTargeting(prev => ({ ...prev, ageRange: { ...prev.ageRange, min: Number(e.target.value) } }))}
                className="w-20 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm text-center outline-none focus:border-[#1DA1F2]" />
              <span className="text-slate-500">to</span>
              <input type="number" min={13} max={100} value={targeting.ageRange.max}
                onChange={e => setTargeting(prev => ({ ...prev, ageRange: { ...prev.ageRange, max: Number(e.target.value) } }))}
                className="w-20 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm text-center outline-none focus:border-[#1DA1F2]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map(g => (
                <button key={g} onClick={() => toggleTargetingSingle("genders", g)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm capitalize transition-all ${
                    targeting.genders[0] === g
                      ? "border-[#1DA1F2]/50 bg-[#1DA1F2]/10 text-white"
                      : "border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Languages</label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_OPTIONS.map(lang => (
              <button key={lang} onClick={() => toggleTargetingArray("languages", lang)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${
                  targeting.languages.includes(lang)
                    ? "bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                }`}>
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Tweet Keywords</label>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={keywordInput} onChange={e => setKeywordInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addKeyword()}
                placeholder="Add keyword (press Enter)"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2] transition-all" />
            </div>
            <button onClick={addKeyword}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors">
              <Plus size={16} />
            </button>
          </div>
          {targeting.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {targeting.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1DA1F2]/10 text-[#1DA1F2] text-xs border border-[#1DA1F2]/30">
                  {kw}
                  <button onClick={() => toggleTargetingArray("keywords", kw)} className="hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Follower Look-alikes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Follower Look-alikes</label>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={followerInput} onChange={e => setFollowerInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addFollowerTarget()}
                placeholder="@username to target their followers"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2] transition-all" />
            </div>
            <button onClick={addFollowerTarget}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors">
              <Plus size={16} />
            </button>
          </div>
          {targeting.followerTargets && targeting.followerTargets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {targeting.followerTargets.map(handle => (
                <span key={handle} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 text-xs border border-violet-500/30">
                  {handle}
                  <button onClick={() => setTargeting(prev => ({ ...prev, followerTargets: (prev.followerTargets || []).filter(h => h !== handle) }))} className="hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Interests</label>
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_OPTIONS.map(interest => (
              <button key={interest} onClick={() => toggleTargetingArray("interests", interest)}
                className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                  targeting.interests.includes(interest)
                    ? "bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                }`}>
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Behaviors */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Behaviors</label>
          <div className="flex flex-wrap gap-1.5">
            {BEHAVIOR_OPTIONS.map(behavior => (
              <button key={behavior} onClick={() => toggleTargetingArray("behaviors", behavior)}
                className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                  targeting.behaviors.includes(behavior)
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                }`}>
                {behavior}
              </button>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Devices</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DEVICE_OPTIONS.map(device => {
              const Icon = device.icon;
              const selected = targeting.devices.includes(device.id);
              return (
                <button key={device.id} onClick={() => toggleTargetingArray("devices", device.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    selected
                      ? "border-[#1DA1F2]/50 bg-[#1DA1F2]/10 text-white"
                      : "border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200"
                  }`}>
                  <Icon size={14} /> {device.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Audiences */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Custom Audiences</label>
          <div className="flex gap-2 mb-2">
            <input value={audienceInput} onChange={e => setAudienceInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomAudience()}
              placeholder="Add custom audience name"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2] transition-all" />
            <button onClick={addCustomAudience}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors">
              <Plus size={16} />
            </button>
          </div>
          {targeting.customAudiences.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {targeting.customAudiences.map(aud => (
                <span key={aud} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs border border-amber-500/30">
                  {aud}
                  <button onClick={() => toggleTargetingArray("customAudiences", aud)} className="hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Creative Step ─────────────────────────────────────────────────────────── */

  function CreativeStep() {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Type size={18} className="text-[#1DA1F2]" /> Tweet / Creative Builder
        </h2>

        {/* Website Card Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/30">
          <button onClick={() => setHasWebsiteCard(!hasWebsiteCard)}
            className={`w-10 h-6 rounded-full transition-all ${hasWebsiteCard ? "bg-[#1DA1F2]" : "bg-slate-600"} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hasWebsiteCard ? "translate-x-4.5" : "translate-x-0.5"}`}
              style={{ transform: hasWebsiteCard ? "translateX(18px)" : "translateX(2px)" }} />
          </button>
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-slate-400" />
            <span className="text-sm text-slate-300">Include Website Card (headline + CTA)</span>
          </div>
        </div>

        {/* Website Card Fields */}
        {hasWebsiteCard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-900/30 border border-slate-700/30">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Website Headline</label>
              <input value={websiteHeadline} onChange={e => setWebsiteHeadline(e.target.value)}
                placeholder="e.g., Transform Your Workflow"
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">CTA Button</label>
              <select value={cta} onChange={e => setCta(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2]">
                {CTA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Destination URL</label>
              <input value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)}
                placeholder="https://example.com/landing-page"
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2]" />
            </div>
          </div>
        )}

        {/* Tweets */}
        <div className="space-y-4">
          {tweets.map((tweet, idx) => (
            <div key={tweet.id} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#1DA1F2] bg-[#1DA1F2]/10 px-2 py-0.5 rounded-full">
                    {idx === 0 ? "Lead Tweet" : `Reply ${idx}`}
                  </span>
                  {idx > 0 && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Repeat2 size={10} /> Thread
                    </span>
                  )}
                </div>
                {tweets.length > 1 && (
                  <button onClick={() => removeTweet(tweet.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Tweet text */}
              <div className="mb-3">
                <textarea value={tweet.text}
                  onChange={e => updateTweet(tweet.id, { text: e.target.value.slice(0, 280) })}
                  placeholder={idx === 0 ? "What's happening?" : "Add to the thread..."}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600 text-slate-200 text-sm outline-none focus:border-[#1DA1F2] resize-none transition-all" />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${tweet.text.length > 260 ? "text-amber-400" : "text-slate-500"}`}>
                    {tweet.text.length}/280
                  </span>
                </div>
              </div>

              {/* Media toggle */}
              <div className="flex items-center gap-2">
                {(["none", "image", "video"] as const).map(mt => {
                  const icons = { none: Type, image: Image, video: Video };
                  const Icon = icons[mt];
                  return (
                    <button key={mt} onClick={() => updateTweet(tweet.id, { mediaType: mt })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
                        tweet.mediaType === mt
                          ? "bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                      }`}>
                      <Icon size={12} /> {mt === "none" ? "Text" : mt.charAt(0).toUpperCase() + mt.slice(1)}
                    </button>
                  );
                })}
                {tweet.mediaType !== "none" && (
                  <input value={tweet.mediaUrl}
                    onChange={e => updateTweet(tweet.id, { mediaUrl: e.target.value })}
                    placeholder="Media URL"
                    className="flex-1 ml-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-none focus:border-[#1DA1F2]" />
                )}
              </div>
            </div>
          ))}

          <button onClick={addTweet}
            className="w-full py-2.5 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/40 transition-all flex items-center justify-center gap-2 text-sm">
            <Plus size={14} /> Add Tweet to Thread
          </button>
        </div>

        {/* Poll */}
        <div>
          <button onClick={() => setIncludePoll(!includePoll)}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-[#1DA1F2] transition-colors mb-2">
            <div className={`w-4 h-4 rounded border ${includePoll ? "bg-[#1DA1F2] border-[#1DA1F2]" : "border-slate-600"} flex items-center justify-center`}>
              {includePoll && <Check size={10} className="text-white" />}
            </div>
            Add Poll (first tweet only)
          </button>

          {includePoll && (
            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/30 space-y-3">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-6">{i + 1}.</span>
                  <input value={opt} onChange={e => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }} placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm outline-none focus:border-[#1DA1F2]" />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded"><X size={12} /></button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button onClick={addPollOption}
                  className="text-xs text-[#1DA1F2] hover:text-[#1a91da] transition-colors flex items-center gap-1">
                  <Plus size={12} /> Add option
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Duration:</span>
                <select value={pollDuration} onChange={e => setPollDuration(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 outline-none">
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>1 day</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Review Step ───────────────────────────────────────────────────────────── */

  function ReviewStep() {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Check size={18} className="text-[#1DA1F2]" /> Review Campaign
        </h2>

        {/* Review Card */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 divide-y divide-slate-700/30">
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-1">Campaign Name</h3>
            <p className="text-white font-medium">{campaignName || "—"}</p>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-1">Objective</h3>
            <p className="text-white">{getObjectiveLabel(selectedObjective)}</p>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-1">Budget</h3>
            <p className="text-white">{fmtCurr(budgetAmount)} / {budgetType}</p>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-1">Schedule</h3>
            <p className="text-white">{startDate || "—"} {endDate ? `to ${endDate}` : "(no end date)"}</p>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Targeting Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Locations:</span> <span className="text-slate-300">{targeting.locations.length ? targeting.locations.join(", ") : "All"}</span></div>
              <div><span className="text-slate-500">Age:</span> <span className="text-slate-300">{targeting.ageRange.min}-{targeting.ageRange.max}</span></div>
              <div><span className="text-slate-500">Gender:</span> <span className="text-slate-300 capitalize">{targeting.genders[0]}</span></div>
              <div><span className="text-slate-500">Languages:</span> <span className="text-slate-300">{targeting.languages.length ? targeting.languages.join(", ") : "All"}</span></div>
              <div><span className="text-slate-500">Interests:</span> <span className="text-slate-300">{targeting.interests.length ? targeting.interests.join(", ") : "—"}</span></div>
              <div><span className="text-slate-500">Devices:</span> <span className="text-slate-300">{targeting.devices.length ? targeting.devices.join(", ") : "All"}</span></div>
              <div className="col-span-2"><span className="text-slate-500">Keywords:</span> <span className="text-slate-300">{targeting.keywords.length ? targeting.keywords.join(", ") : "—"}</span></div>
              {(targeting.followerTargets?.length ?? 0) > 0 && (
                <div className="col-span-2"><span className="text-slate-500">Follower Targets:</span> <span className="text-slate-300">{(targeting.followerTargets ?? []).join(", ")}</span></div>
              )}
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Tweet Preview</h3>
            {tweets.map((t, i) => (
              <div key={t.id} className="mb-2 p-3 rounded-lg bg-[#0f172a] border border-slate-800">
                {i === 0 && hasWebsiteCard && websiteHeadline && (
                  <div className="mb-2 p-2 rounded bg-slate-800/50 border border-slate-700/50">
                    <p className="text-sm font-medium text-white">{websiteHeadline}</p>
                    {destinationUrl && <p className="text-xs text-slate-500">{destinationUrl}</p>}
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#1DA1F2]/20 text-[#1DA1F2] text-xs">{cta}</span>
                  </div>
                )}
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.text || "(empty tweet)"}</p>
                {includePoll && i === 0 && (
                  <div className="mt-2 space-y-1">
                    {pollOptions.filter(o => o.trim()).map((opt, j) => (
                      <div key={j} className="h-7 rounded bg-slate-800 border border-slate-700 flex items-center px-2 text-xs text-slate-400">{opt}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════════════════
     ANALYTICS VIEW
     ═════════════════════════════════════════════════════════════════════════════ */

  function AnalyticsView() {
    if (!selectedCampaign) {
      return (
        <div className="text-center py-16">
          <p className="text-slate-500">Select a campaign to view analytics</p>
        </div>
      );
    }

    const m = selectedCampaign.metrics;
    const engagementRate = getEngagementRate(selectedCampaign);

    // Engagement breakdown data
    const engagementData = [
      { label: "Likes", value: Math.round(m.engagement * 0.45), color: "bg-rose-500" },
      { label: "Retweets", value: Math.round(m.engagement * 0.20), color: "bg-emerald-500" },
      { label: "Replies", value: m.replies || Math.round(m.engagement * 0.15), color: "bg-blue-500" },
      { label: "Link Clicks", value: m.clicks, color: "bg-violet-500" },
      { label: "Follows", value: Math.round(m.engagement * 0.10), color: "bg-[#1DA1F2]" },
      { label: "Shares", value: m.shares || Math.round(m.engagement * 0.10), color: "bg-amber-500" },
    ];

    const maxEngVal = Math.max(...engagementData.map(d => d.value), 1);

    // Top tweets table data
    const topTweets = [
      { text: selectedCampaign.creatives[0]?.body?.slice(0, 80) + "..." || "Promoted Tweet 1", impressions: Math.round(m.impressions * 0.6), engagement: Math.round(m.engagement * 0.55), ctr: (m.ctr * 1.1).toFixed(2) },
      { text: "Promoted Tweet 2 (variant)", impressions: Math.round(m.impressions * 0.4), engagement: Math.round(m.engagement * 0.45), ctr: (m.ctr * 0.85).toFixed(2) },
    ];

    // Audience interests breakdown
    const audienceInterests = selectedCampaign.targeting.interests.length > 0
      ? selectedCampaign.targeting.interests.map((interest, i) => ({
          interest,
          pct: [35, 25, 20, 15, 12, 10, 8, 5][i] || 5,
        }))
      : [
          { interest: "Technology", pct: 38 },
          { interest: "Business", pct: 27 },
          { interest: "SaaS", pct: 18 },
          { interest: "Startups", pct: 12 },
          { interest: "Marketing", pct: 5 },
        ];

    return (
      <div className="space-y-6">
        {/* Campaign Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView("list"); setSelectedCampaignId(null); }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">{selectedCampaign.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[selectedCampaign.status]}`}>
                  {selectedCampaign.status.charAt(0).toUpperCase() + selectedCampaign.status.slice(1)}
                </span>
                <span className="text-xs text-slate-400">{getObjectiveLabel(selectedCampaign.objective)}</span>
              </div>
            </div>
          </div>
          <button onClick={() => toggleStatus(selectedCampaign)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              selectedCampaign.status === "active"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
            }`}>
            {selectedCampaign.status === "active" ? <Pause size={14} /> : <Play size={14} />}
            {selectedCampaign.status === "active" ? "Pause" : "Activate"}
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Impressions", value: fmtNum(m.impressions), icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Engagements", value: fmtNum(m.engagement), icon: MessageCircle, color: "text-[#1DA1F2]", bg: "bg-[#1DA1F2]/10" },
            { label: "Eng. Rate", value: `${engagementRate}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Clicks", value: fmtNum(m.clicks), icon: MousePointer, color: "text-violet-400", bg: "bg-violet-500/10" },
            { label: "CTR", value: `${m.ctr?.toFixed(2) ?? "0.00"}%`, icon: BarChart3, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Spend", value: fmtCurr(m.spend), icon: DollarSign, color: "text-rose-400", bg: "bg-rose-500/10" },
          ].map(metric => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3">
                <div className={`w-7 h-7 rounded-md ${metric.bg} flex items-center justify-center mb-2`}>
                  <Icon size={14} className={metric.color} />
                </div>
                <p className="text-lg font-bold text-white">{metric.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{metric.label}</p>
              </div>
            );
          })}
        </div>

        {/* Second Row Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "CPC", value: fmtCurr(m.cpc || 0) },
            { label: "Video Views", value: fmtNum(m.videoViews || 0) },
            { label: "Follows", value: fmtNum(Math.round(m.engagement * 0.10)) },
            { label: "Cost per Follow", value: m.engagement > 0 ? fmtCurr(m.spend / (m.engagement * 0.10)) : "$0.00" },
          ].map(metric => (
            <div key={metric.label} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3">
              <p className="text-sm font-semibold text-white">{metric.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engagement Breakdown Bar Chart */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-[#1DA1F2]" /> Engagement Breakdown
            </h3>
            <div className="space-y-3">
              {engagementData.map(d => (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{d.label}</span>
                    <span className="text-xs text-slate-300 font-medium">{fmtNum(d.value)}</span>
                  </div>
                  <div className="h-5 rounded-md bg-slate-900/60 overflow-hidden">
                    <div className={`h-full ${d.color} rounded-md transition-all`}
                      style={{ width: `${Math.max((d.value / maxEngVal) * 100, 5)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audience Interests */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={14} className="text-[#1DA1F2]" /> Audience Interests
            </h3>
            <div className="space-y-3">
              {audienceInterests.map(d => (
                <div key={d.interest}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{d.interest}</span>
                    <span className="text-xs text-slate-300 font-medium">{d.pct}%</span>
                  </div>
                  <div className="h-5 rounded-md bg-slate-900/60 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1DA1F2] to-[#1DA1F2]/60 rounded-md transition-all"
                      style={{ width: `${Math.max(d.pct, 5)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Tweets Table */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
          <div className="p-4 border-b border-slate-700/30">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Twitter size={14} className="text-[#1DA1F2]" /> Top Tweets
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/30 bg-slate-900/30">
                  <th className="text-left text-xs text-slate-500 font-medium uppercase tracking-wider px-4 py-2">Tweet</th>
                  <th className="text-right text-xs text-slate-500 font-medium uppercase tracking-wider px-4 py-2">Impressions</th>
                  <th className="text-right text-xs text-slate-500 font-medium uppercase tracking-wider px-4 py-2">Engagements</th>
                  <th className="text-right text-xs text-slate-500 font-medium uppercase tracking-wider px-4 py-2">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {topTweets.map((tweet, i) => (
                  <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{tweet.text}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{fmtNum(tweet.impressions)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{fmtNum(tweet.engagement)}</td>
                    <td className="px-4 py-3 text-right text-[#1DA1F2] font-medium">{tweet.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform-Specific Metrics */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Heart size={14} className="text-rose-400" /> Detailed Engagement
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Likes", value: fmtNum(Math.round(m.engagement * 0.45)), icon: Heart, color: "text-rose-400" },
              { label: "Retweets", value: fmtNum(Math.round(m.engagement * 0.20)), icon: Repeat2, color: "text-emerald-400" },
              { label: "Replies", value: fmtNum(m.replies || Math.round(m.engagement * 0.15)), icon: MessageCircle, color: "text-blue-400" },
              { label: "Shares", value: fmtNum(m.shares || Math.round(m.engagement * 0.10)), icon: Share2, color: "text-amber-400" },
              { label: "Video Views", value: fmtNum(m.videoViews || 0), icon: Play, color: "text-violet-400" },
              { label: "Leads", value: fmtNum(m.leads || 0), icon: Users, color: "text-[#1DA1F2]" },
            ].map(d => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="text-center p-3 rounded-lg bg-slate-900/40">
                  <Icon size={16} className={`mx-auto mb-1 ${d.color}`} />
                  <p className="text-base font-bold text-white">{d.value}</p>
                  <p className="text-[10px] text-slate-500">{d.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign Notes */}
        {selectedCampaign.notes && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-1">Notes</h3>
            <p className="text-sm text-slate-300">{selectedCampaign.notes}</p>
          </div>
        )}
      </div>
    );
  }
}
