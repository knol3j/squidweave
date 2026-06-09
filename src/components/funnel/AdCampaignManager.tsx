import { useState, useMemo, useCallback } from "react";
import {
  LayoutDashboard, TrendingUp, DollarSign, Target, Users, MousePointer, BarChart3, Calendar,
  Facebook, Linkedin, Twitter, MessageSquare, Search, Mail, Phone, ChevronDown, Filter, Download, Plus, Pause, Play, Trash2, Edit3, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { loadCampaigns, getPlatformBreakdown, getTotalSpend, getTotalImpressions, getTotalClicks, getTotalConversions, downloadCampaignsCSV } from "@/lib/adCampaignStore";
import type { AdCampaign, AdPlatform } from "@/lib/adCampaignStore";

/* ── platform meta ─────────────────────────────────────────────────── */

const PLATFORM_META: Record<AdPlatform, { label: string; icon: typeof Facebook; color: string; border: string; bg: string }> = {
  meta:        { label: "Meta",        icon: Facebook,     color: "#1877F2", border: "border-[#1877F2]/40", bg: "bg-[#1877F2]/10" },
  google:      { label: "Google",      icon: Search,       color: "#4285F4", border: "border-[#4285F4]/40", bg: "bg-[#4285F4]/10" },
  twitter:     { label: "Twitter",     icon: Twitter,      color: "#1DA1F2", border: "border-[#1DA1F2]/40", bg: "bg-[#1DA1F2]/10" },
  reddit:      { label: "Reddit",      icon: MessageSquare,color: "#FF4500", border: "border-[#FF4500]/40", bg: "bg-[#FF4500]/10" },
  linkedin:    { label: "LinkedIn",    icon: Linkedin,     color: "#0A66C2", border: "border-[#0A66C2]/40", bg: "bg-[#0A66C2]/10" },
  cold:        { label: "Cold Outreach",icon: Phone,       color: "#10b981", border: "border-[#10b981]/40", bg: "bg-[#10b981]/10" },
  newsletter:  { label: "Newsletter",  icon: Mail,         color: "#f59e0b", border: "border-[#f59e0b]/40", bg: "bg-[#f59e0b]/10" },
  tiktok:      { label: "TikTok",      icon: MessageSquare,color: "#ff0050", border: "border-[#ff0050]/40", bg: "bg-[#ff0050]/10" },
};

const PLATFORMS: AdPlatform[] = ["meta", "google", "twitter", "reddit", "linkedin", "cold", "newsletter", "tiktok"];

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  paused:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  draft:     "bg-slate-500/15 text-slate-400 border-slate-500/20",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  archived:  "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

/* ── number formatters ─────────────────────────────────────────────── */

const fmt = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
    : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K`
    : n.toFixed(n % 1 === 0 ? 0 : 1);

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

/* ── no simulated data — all metrics come from user-created campaigns ── */

/* ════════════════════════════════════════════════════════════════════
   AdCampaignManager — central hub for ALL advertising campaigns
   ════════════════════════════════════════════════════════════════════ */

type SortKey = "name" | "platform" | "objective" | "status" | "budget" | "spend" | "impressions" | "clicks" | "ctr" | "conversions" | "roas";
type SortDir = "asc" | "desc";
type TimelineMetric = "impressions" | "clicks" | "spend" | "conversions";

export default function AdCampaignManager() {
  /* ── base data ─────────────────────────────────────────────────── */
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(loadCampaigns);
  const [, setRefresh] = useState(0);

  const allCampaigns = useMemo(() => campaigns, [campaigns]);
  const breakdown = useMemo(() => getPlatformBreakdown(), [campaigns]);
  const totalSpend = useMemo(() => getTotalSpend(), [campaigns]);
  const totalImpressions = useMemo(() => getTotalImpressions(), [campaigns]);
  const totalClicks = useMemo(() => getTotalClicks(), [campaigns]);
  const totalConversions = useMemo(() => getTotalConversions(), [campaigns]);
  const avgCtr = useMemo(() => totalImpressions > 0 ? totalClicks / totalImpressions : 0, [totalClicks, totalImpressions]);
  const avgCpc = useMemo(() => totalClicks > 0 ? totalSpend / totalClicks : 0, [totalSpend, totalClicks]);

  /* ── sort / filter state ───────────────────────────────────────── */
  const [sortKey, setSortKey] = useState<SortKey>("createdAt" as SortKey);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterPlatform, setFilterPlatform] = useState<AdPlatform | "all">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timelineMetric, setTimelineMetric] = useState<TimelineMetric>("impressions");

  /* ── actions ───────────────────────────────────────────────────── */
  const handleDelete = useCallback((id: string) => {
    if (confirm("Delete this campaign permanently?")) {
      const updated = campaigns.filter(c => c.id !== id);
      setCampaigns(updated);
      try { localStorage.setItem("sw_ad_campaigns", JSON.stringify(updated)); } catch { /* silent */ }
      setRefresh(v => v + 1);
    }
  }, [campaigns]);

  const handleToggleStatus = useCallback((id: string) => {
    const updated = campaigns.map(c => {
      if (c.id !== id) return c;
      const next = c.status === "active" ? "paused" : c.status === "paused" ? "active" : c.status;
      return { ...c, status: next as AdCampaign["status"], updatedAt: new Date().toISOString() };
    });
    setCampaigns(updated);
    try { localStorage.setItem("sw_ad_campaigns", JSON.stringify(updated)); } catch { /* silent */ }
    setRefresh(v => v + 1);
  }, [campaigns]);

  const handleSort = useCallback((key: SortKey) => {
    setSortDir(d => (sortKey === key ? (d === "asc" ? "desc" : "asc") : "desc"));
    setSortKey(key);
  }, [sortKey]);

  /* ── filtered & sorted campaigns ──────────────────────────────── */
  const filteredCampaigns = useMemo(() => {
    let list = [...allCampaigns];
    if (filterPlatform !== "all") list = list.filter(c => c.platform === filterPlatform);
    if (filterStatus !== "all") list = list.filter(c => c.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.objective.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "name": av = a.name; bv = b.name; break;
        case "platform": av = a.platform; bv = b.platform; break;
        case "objective": av = a.objective; bv = b.objective; break;
        case "status": av = a.status; bv = b.status; break;
        case "budget": av = a.budget.amount; bv = b.budget.amount; break;
        case "spend": av = a.metrics.spend; bv = b.metrics.spend; break;
        case "impressions": av = a.metrics.impressions; bv = b.metrics.impressions; break;
        case "clicks": av = a.metrics.clicks; bv = b.metrics.clicks; break;
        case "ctr": av = a.metrics.ctr; bv = b.metrics.ctr; break;
        case "conversions": av = a.metrics.conversions; bv = b.metrics.conversions; break;
        case "roas": av = a.metrics.roas; bv = b.metrics.roas; break;
        default: av = a.createdAt; bv = b.createdAt;
      }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [allCampaigns, filterPlatform, filterStatus, searchQuery, sortKey, sortDir]);

  /* ── timeline data (no simulated data) ─────────────────────────── */
  const timelineData = useMemo(() => [] as { date: string; impressions: number; clicks: number; spend: number; conversions: number }[], [allCampaigns]);
  const timelineMax = 1;

  /* ── top campaigns ─────────────────────────────────────────────── */
  const topCampaigns = useMemo(() => {
    return [...allCampaigns]
      .filter(c => c.metrics.roas > 0 || c.metrics.conversions > 0)
      .sort((a, b) => (b.metrics.roas * b.metrics.conversions) - (a.metrics.roas * a.metrics.conversions))
      .slice(0, 5);
  }, [allCampaigns]);

  /* ── budget allocation ─────────────────────────────────────────── */
  const budgetAlloc = useMemo(() => {
    const total = allCampaigns.reduce((s, c) => s + c.budget.amount, 0);
    return PLATFORMS.map(p => {
      const amt = allCampaigns.filter(c => c.platform === p).reduce((s, c) => s + c.budget.amount, 0);
      return { platform: p, amount: amt, pct: total > 0 ? (amt / total) * 100 : 0 };
    }).filter(x => x.amount > 0);
  }, [allCampaigns]);

  /* ── stat card data ────────────────────────────────────────────── */
  const statCards = useMemo(() => [
    { label: "Total Spend",       value: totalSpend > 0 ? fmtCurrency(totalSpend) : "—",       raw: "spend",       icon: DollarSign, color: "text-emerald-400",  bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Total Impressions", value: totalImpressions > 0 ? fmt(totalImpressions) : "—",    raw: "impressions", icon: Users,      color: "text-blue-400",     bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    { label: "Total Clicks",      value: totalClicks > 0 ? fmt(totalClicks) : "—",               raw: "clicks",      icon: MousePointer,color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
    { label: "Total Conversions", value: totalConversions > 0 ? fmt(totalConversions) : "—",     raw: "conversions", icon: Target,     color: "text-amber-400",    bg: "bg-amber-500/10",   border: "border-amber-500/20" },
    { label: "Avg CTR",           value: avgCtr > 0 ? fmtPct(avgCtr) : "—",                      raw: "ctr",         icon: BarChart3,  color: "text-cyan-400",     bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
    { label: "Avg CPC",           value: avgCpc > 0 ? fmtCurrency(avgCpc) : "—",                 raw: "cpc",         icon: TrendingUp, color: "text-rose-400",     bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  ], [totalSpend, totalImpressions, totalClicks, totalConversions, avgCtr, avgCpc]);

  /* ── sort indicator ────────────────────────────────────────────── */
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-slate-600 ml-1" />;
    return sortDir === "asc"
      ? <ArrowUpRight className="w-3 h-3 text-indigo-400 ml-1" />
      : <ArrowDownRight className="w-3 h-3 text-indigo-400 ml-1" />;
  };

  const trendIndicator = () => (
    <span className="text-[11px] text-slate-500">—</span>
  );

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-slate-100 p-6 space-y-6">

      {/* ── header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
            <LayoutDashboard className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Ad Campaign Manager</h1>
            <p className="text-xs text-slate-400">Central hub for all advertising campaigns across every platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCampaignsCSV}
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-indigo-500 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-400 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          1. EXECUTIVE SUMMARY — stat cards
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl border ${card.border} ${card.bg} p-4 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="text-xl font-bold text-slate-100">{card.value}</div>
              <div className="flex items-center gap-1">
                {trendIndicator()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2. PLATFORM BREAKDOWN — grid cards
          ═══════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-400" />
          Platform Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {PLATFORMS.map(p => {
            const meta = PLATFORM_META[p];
            const data = breakdown[p];
            const Icon = meta.icon;
            const hasCampaigns = data.campaigns > 0;
            return (
              <button
                key={p}
                onClick={() => setFilterPlatform(fp => fp === p ? "all" : p)}
                className={`relative rounded-xl border ${filterPlatform === p ? meta.border : "border-white/[0.06]"} ${filterPlatform === p ? meta.bg : "bg-white/[0.02]"}
                  p-3 text-left hover:bg-white/[0.04] transition-all group cursor-pointer`}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  <span className="text-xs font-semibold text-slate-200">{meta.label}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="text-lg font-bold text-slate-100">{data.campaigns > 0 ? data.campaigns : "—"}</div>
                  <div className="text-[10px] text-slate-400">{data.campaigns === 1 ? "campaign" : "campaigns"}</div>
                  {hasCampaigns ? (
                    <>
                      <div className="text-[11px] font-medium text-slate-300">{fmtCurrency(data.spend)} spent</div>
                      <div className="text-[10px] text-slate-500">{fmt(data.impressions)} imp &middot; {fmt(data.clicks)} clk</div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Plus className="w-3 h-3" style={{ color: meta.color }} />
                      <span className="text-[10px] font-medium" style={{ color: meta.color }}>Create</span>
                    </div>
                  )}
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity`} style={{ backgroundColor: meta.color }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          3. CAMPAIGN LIST — filter bar + table
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            All Campaigns
            <span className="text-[10px] font-normal text-slate-500 ml-1">({filteredCampaigns.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            {/* platform filter */}
            <div className="relative">
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value as AdPlatform | "all")}
                className="appearance-none rounded-lg border border-white/[0.06] bg-white/[0.03] pl-7 pr-7 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 cursor-pointer"
              >
                <option value="all">All Platforms</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_META[p].label}</option>)}
              </select>
              <Filter className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {/* status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none rounded-lg border border-white/[0.06] bg-white/[0.03] pl-7 pr-7 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
              </select>
              <Filter className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {/* search */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] pl-7 pr-3 py-1.5 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 w-48"
              />
            </div>
          </div>
        </div>

        {/* table */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  {([
                    ["platform", "Platform"],
                    ["name", "Name"],
                    ["objective", "Objective"],
                    ["status", "Status"],
                    ["budget", "Budget"],
                    ["spend", "Spend"],
                    ["impressions", "Impressions"],
                    ["clicks", "Clicks"],
                    ["ctr", "CTR"],
                    ["conversions", "Conv."],
                    ["roas", "ROAS"],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-3 py-2.5 text-left font-semibold text-slate-400 cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                    >
                      <div className="flex items-center">
                        {label}
                        <SortIcon col={key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-400 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Target className="w-8 h-8 text-slate-700" />
                        <span className="text-sm font-medium text-slate-400">No campaigns yet</span>
                        <span className="text-[11px] text-slate-600">Create your first campaign in any platform above.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map(campaign => {
                    const pMeta = PLATFORM_META[campaign.platform];
                    const Icon = pMeta.icon;
                    return (
                      <tr
                        key={campaign.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color: pMeta.color }} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-slate-200">{campaign.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{campaign.objective}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[campaign.status] || STATUS_STYLES.draft}`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">
                          {fmtCurrency(campaign.budget.amount)}<span className="text-slate-600">/{campaign.budget.type === "daily" ? "d" : "lt"}</span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-200">{fmtCurrency(campaign.metrics.spend)}</td>
                        <td className="px-3 py-2.5 text-slate-400">{fmt(campaign.metrics.impressions)}</td>
                        <td className="px-3 py-2.5 text-slate-400">{fmt(campaign.metrics.clicks)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-medium ${campaign.metrics.ctr > 0.03 ? "text-emerald-400" : campaign.metrics.ctr > 0.01 ? "text-amber-400" : "text-slate-500"}`}>
                            {fmtPct(campaign.metrics.ctr)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">{fmt(campaign.metrics.conversions)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold ${campaign.metrics.roas >= 3 ? "text-emerald-400" : campaign.metrics.roas >= 1 ? "text-amber-400" : "text-slate-500"}`}>
                            {campaign.metrics.roas.toFixed(1)}x
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              title="Edit"
                              className="p-1 rounded-md hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title={campaign.status === "active" ? "Pause" : "Activate"}
                              onClick={() => handleToggleStatus(campaign.id)}
                              className="p-1 rounded-md hover:bg-white/[0.06] text-slate-500 hover:text-indigo-400 transition-colors"
                            >
                              {campaign.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              title="Delete"
                              onClick={() => handleDelete(campaign.id)}
                              className="p-1 rounded-md hover:bg-white/[0.06] text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          4. BUDGET ALLOCATION + 5. TIMELINE + 6. TOP CAMPAIGNS
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Budget Allocation */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Budget Allocation
          </h3>
          {budgetAlloc.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs">No budget data yet</div>
          ) : (
            <>
              <div className="w-full h-6 rounded-lg overflow-hidden flex">
                {budgetAlloc.map(ba => (
                  <div
                    key={ba.platform}
                    className="h-full transition-all"
                    style={{ width: `${ba.pct}%`, backgroundColor: PLATFORM_META[ba.platform].color + "CC" }}
                    title={`${PLATFORM_META[ba.platform].label}: ${fmtCurrency(ba.amount)} (${ba.pct.toFixed(1)}%)`}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {budgetAlloc.map(ba => (
                  <div key={ba.platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PLATFORM_META[ba.platform].color }} />
                      <span className="text-[11px] text-slate-300">{PLATFORM_META[ba.platform].label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">{fmtCurrency(ba.amount)}</span>
                      <span className="text-[10px] text-slate-500 w-10 text-right">{ba.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Performance Timeline */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              7-Day Trend
            </h3>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
              {(["impressions", "clicks", "spend", "conversions"] as TimelineMetric[]).map(m => (
                <button
                  key={m}
                  onClick={() => setTimelineMetric(m)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors capitalize ${
                    timelineMetric === m ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {allCampaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs">No campaign data yet</div>
          ) : (
            <div className="flex items-end gap-2 h-36 pt-4">
              {timelineData.map((day, i) => {
                const val = day[timelineMetric];
                const h = timelineMax > 0 ? (val / timelineMax) * 100 : 0;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="relative w-full flex justify-center">
                      <div
                        className="w-full max-w-[32px] rounded-t-md transition-all duration-500 bg-indigo-500/60 hover:bg-indigo-400/80"
                        style={{ height: `${h}px` }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-white/[0.08] rounded px-1.5 py-0.5 text-[9px] text-slate-200 whitespace-nowrap z-10">
                        {timelineMetric === "spend" ? fmtCurrency(val) : fmt(val)}
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500">{day.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Performing Campaigns */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Top Performing
          </h3>
          {topCampaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs">No performance data yet</div>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c, i) => {
                const pMeta = PLATFORM_META[c.platform];
                const Icon = pMeta.icon;
                return (
                  <div key={c.id} className="flex items-center gap-3 group">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/15 text-slate-300" : i === 2 ? "bg-orange-500/15 text-orange-400" : "bg-white/[0.03] text-slate-500"}`}>
                      {i + 1}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                      <Icon className="w-4 h-4" style={{ color: pMeta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-slate-200 truncate">{c.name}</div>
                      <div className="text-[9px] text-slate-500">{pMeta.label} &middot; {fmt(c.metrics.conversions)} conv</div>
                    </div>
                    <div className={`text-[11px] font-bold ${c.metrics.roas >= 3 ? "text-emerald-400" : c.metrics.roas >= 1 ? "text-amber-400" : "text-slate-500"}`}>
                      {c.metrics.roas.toFixed(1)}x
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
