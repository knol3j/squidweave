import { useState, useEffect, useCallback } from "react";
import {
  Search, Sparkles, Download, Filter, User, Building2,
  MapPin, Mail, Linkedin, TrendingUp, Target, Zap,
  Loader2, ChevronDown, ChevronUp, Star, Users, Globe
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";

/* ─── Types ─── */
interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  department: string;
  seniority: string;
  company: string;
  companyId: string;
  companyDomain: string;
  companySize: string;
  companyIndustry: string;
  companyLocation: string;
  companyLinkedIn: string;
  linkedInUrl: string;
  location: string;
  email: string;
  emailVariations: string[];
  emailConfidence: number;
  fitScore: number;
  intentScore: number;
  totalScore: number;
  signals: string[];
  recommendedAction: string;
  source: string;
  discoveredAt: string;
  enrichedAt: string;
}

interface ProspectForgeResult {
  campaignId: string;
  generatedAt: string;
  query: {
    industry: string;
    locations: string[];
    companySize: string;
    titles: string[];
    keywords: string[];
  };
  sources: string[];
  totalFound: number;
  prospects: Prospect[];
  companies: number;
}

/* ─── Score Badge ─── */
function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#64748b";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${score}, 100`} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

/* ─── Signal Tag ─── */
function SignalTag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-slate-300 border border-white/[0.06]">
      <Zap className="w-2.5 h-2.5 text-amber-400" />
      {text}
    </span>
  );
}

/* ─── Action Badge ─── */
function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    priority_outreach: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    standard_outreach: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    nurture: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  const labels: Record<string, string> = {
    priority_outreach: "Priority",
    standard_outreach: "Standard",
    nurture: "Nurture",
  };
  const cls = colors[action] || colors.nurture;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {labels[action] || action}
    </span>
  );
}

/* ─── Seniority Badge ─── */
function SeniorityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    executive: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    vp: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    director: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    manager: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    individual: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  const labels: Record<string, string> = {
    executive: "C-Level",
    vp: "VP",
    director: "Director",
    manager: "Manager",
    individual: "IC",
  };
  const cls = colors[level] || colors.individual;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {labels[level] || level}
    </span>
  );
}

/* ─── Main Component ─── */
export default function ProspectForge() {
  const { state } = useApp();
  const { campaign, businessProfile } = state;

  /* Discovery state */
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [lastResult, setLastResult] = useState<ProspectForgeResult | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);

  /* Filter state */
  const [query, setQuery] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState(0);
  const [sortBy, setSortBy] = useState<"score" | "fit" | "intent">("score");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* Config state */
  const [industry, setIndustry] = useState(businessProfile?.industry || "cryptocurrency");
  const [locations, setLocations] = useState("US, Global");
  const [count, setCount] = useState(20);
  const [keywords, setKeywords] = useState("mining, gpu, crypto, passive income");

  /* Load saved results */
  useEffect(() => {
    if (campaign?.id) {
      dataService.getProspectForgeResults(campaign.id)
        .then((res) => {
          if (res.results && res.results.length > 0) {
            const latest = res.results[0];
            setLastResult(latest);
            setProspects(latest.prospects || []);
          }
        })
        .catch(() => { /* silent */ });
    }
  }, [campaign?.id]);

  /* ─── Discover Prospects ─── */
  const handleDiscover = useCallback(async () => {
    if (!campaign?.id) return;
    setIsDiscovering(true);
    try {
      const locs = locations.split(",").map((s) => s.trim()).filter(Boolean);
      const kw = keywords.split(",").map((s) => s.trim()).filter(Boolean);
      const result = await dataService.discoverProspects(campaign.id, {
        count,
        industry,
        locations: locs,
        keywords: kw,
      });
      setLastResult(result);
      setProspects(result.prospects || []);
    } catch (e) {
      console.error("ProspectForge discovery failed:", e);
    } finally {
      setIsDiscovering(false);
    }
  }, [campaign?.id, industry, locations, count, keywords]);

  /* ─── Export CSV ─── */
  const handleExport = useCallback(() => {
    const filtered = getFilteredProspects();
    if (filtered.length === 0) return;
    const headers = ["Name", "Title", "Company", "Email", "Email Confidence", "LinkedIn", "Location", "Industry", "Company Size", "Fit Score", "Intent Score", "Total Score", "Signals", "Action"];
    const rows = filtered.map((p) => [
      p.fullName, p.title, p.company, p.email, `${p.emailConfidence}%`,
      p.linkedInUrl, p.location, p.companyIndustry, p.companySize,
      p.fitScore, p.intentScore, p.totalScore,
      p.signals.join("; "), p.recommendedAction,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospectforge-${campaign?.id || "export"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [prospects, query, seniorityFilter, scoreFilter, sortBy]);

  /* ─── Filtered prospects ─── */
  const getFilteredProspects = () => {
    let filtered = [...prospects];

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.companyIndustry.toLowerCase().includes(q)
      );
    }

    if (seniorityFilter !== "all") {
      filtered = filtered.filter((p) => p.seniority === seniorityFilter);
    }

    if (scoreFilter > 0) {
      filtered = filtered.filter((p) => p.totalScore >= scoreFilter);
    }

    filtered.sort((a, b) => {
      if (sortBy === "score") return b.totalScore - a.totalScore;
      if (sortBy === "fit") return b.fitScore - a.fitScore;
      return b.intentScore - a.intentScore;
    });

    return filtered;
  };

  const filtered = getFilteredProspects();
  const priorityCount = prospects.filter((p) => p.recommendedAction === "priority_outreach").length;
  const avgScore = prospects.length > 0 ? Math.round(prospects.reduce((s, p) => s + p.totalScore, 0) / prospects.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            ProspectForge
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Free Apollo/ZoomInfo alternative — discover, score, and enrich prospects without paid APIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prospects.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.06] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
          <button
            onClick={handleDiscover}
            disabled={isDiscovering || !campaign?.id}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDiscovering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isDiscovering ? "Discovering..." : "Discover Prospects"}
          </button>
        </div>
      </div>

      {/* Discovery Config */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Industry</label>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Locations</label>
          <input
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Count</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min={5}
            max={100}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Keywords</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Stats Bar */}
      {prospects.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-lg font-bold text-white">{prospects.length}</div>
              <div className="text-[10px] text-slate-400">Prospects Found</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Star className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-lg font-bold text-white">{priorityCount}</div>
              <div className="text-[10px] text-slate-400">Priority Targets</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-lg font-bold text-white">{avgScore}</div>
              <div className="text-[10px] text-slate-400">Avg Score</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Globe className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-lg font-bold text-white">{lastResult?.companies || 0}</div>
              <div className="text-[10px] text-slate-400">Companies</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {prospects.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prospects..."
              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-600 focus:outline-none"
            />
          </div>
          <select
            value={seniorityFilter}
            onChange={(e) => setSeniorityFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
          >
            <option value="all">All Seniorities</option>
            <option value="executive">C-Level</option>
            <option value="vp">VP</option>
            <option value="director">Director</option>
            <option value="manager">Manager</option>
          </select>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
          >
            <option value={0}>All Scores</option>
            <option value={60}>60+</option>
            <option value={70}>70+</option>
            <option value={80}>80+</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "fit" | "intent")}
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
          >
            <option value="score">Sort by Total</option>
            <option value="fit">Sort by Fit</option>
            <option value="intent">Sort by Intent</option>
          </select>
          <span className="text-xs text-slate-500">{filtered.length} shown</span>
        </div>
      )}

      {/* Empty State */}
      {prospects.length === 0 && !isDiscovering && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-sm font-semibold text-slate-300 mb-2">No Prospects Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            ProspectForge uses web intelligence, pattern matching, and AI scoring to discover leads
            for free — no Apollo or ZoomInfo subscription required.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Web Search", "LinkedIn Public", "Company Directories", "Pattern Matching"].map((s) => (
              <span key={s} className="px-2 py-1 rounded-full text-[10px] bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prospect List */}
      <div className="space-y-2">
        {filtered.map((prospect) => {
          const isExpanded = expandedId === prospect.id;
          return (
            <div
              key={prospect.id}
              className="rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
            >
              {/* Row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : prospect.id)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                  {prospect.firstName[0]}{prospect.lastName[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{prospect.fullName}</span>
                    <SeniorityBadge level={prospect.seniority} />
                    <ActionBadge action={prospect.recommendedAction} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {prospect.title}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {prospect.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {prospect.location}
                    </span>
                  </div>
                </div>

                {/* Scores */}
                <div className="flex items-center gap-3 shrink-0">
                  <ScoreBadge score={prospect.fitScore} label="Fit" />
                  <ScoreBadge score={prospect.intentScore} label="Intent" />
                  <ScoreBadge score={prospect.totalScore} label="Total" />
                </div>

                {/* Expand */}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/[0.04]">
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    {/* Contact */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Contact</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300">{prospect.email}</span>
                          <span className="text-[10px] text-slate-500">({prospect.emailConfidence}% confidence)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Linkedin className="w-3.5 h-3.5 text-slate-500" />
                          <a href={prospect.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
                            {prospect.linkedInUrl.replace("https://", "")}
                          </a>
                        </div>
                      </div>
                      {/* Email Variations */}
                      <div className="mt-2">
                        <span className="text-[10px] text-slate-500">Email patterns:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {prospect.emailVariations.slice(0, 4).map((v, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.04] text-slate-400">
                              {v.split("@")[0]}@...
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Company */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Company Intelligence</h4>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Industry</span>
                          <span>{prospect.companyIndustry}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Size</span>
                          <span>{prospect.companySize} employees</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Domain</span>
                          <span className="text-blue-400">{prospect.companyDomain}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Location</span>
                          <span>{prospect.companyLocation}</span>
                        </div>
                      </div>
                      <a
                        href={prospect.companyLinkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline mt-1"
                      >
                        <Linkedin className="w-3 h-3" />
                        Company LinkedIn
                      </a>
                    </div>

                    {/* Signals */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Signals</h4>
                      <div className="flex flex-wrap gap-1">
                        {prospect.signals.map((s, i) => (
                          <SignalTag key={i} text={s} />
                        ))}
                      </div>
                      <div className="mt-2">
                        <span className="text-[10px] text-slate-500">Recommended:</span>
                        <div className="mt-1">
                          <ActionBadge action={prospect.recommendedAction} />
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500">
                        Discovered: {new Date(prospect.discoveredAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
