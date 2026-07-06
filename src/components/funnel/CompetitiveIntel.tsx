import { useState, useEffect } from "react";
import {
  Shield, ShieldAlert, ShieldCheck, Building2, DollarSign,
  Check, X, Minus, Newspaper, Briefcase, Target, TrendingUp,
  TrendingDown, Minus as MinusIcon, ChevronLeft, Plus,
  Search, Filter, MapPin, Award, AlertTriangle, Clock,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ThreatLevel = "high" | "medium" | "low";

interface Competitor {
  id: string;
  name: string;
  initials: string;
  industry: string;
  threatLevel: ThreatLevel;
  pricing: number;
  features: number;
  founded: string;
  employees: string;
  website: string;
  description: string;
  logoColor: string;
}

interface FeatureComparison {
  name: string;
  ours: boolean | null;
  theirs: boolean | null;
}

interface NewsItem {
  id: string;
  competitorId: string;
  title: string;
  date: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface HiringActivity {
  id: string;
  competitorId: string;
  role: string;
  department: string;
  location: string;
  postedDate: string;
}

interface WinLossRecord {
  id: string;
  competitorId: string;
  dealName: string;
  result: "won" | "lost";
  value: number;
  date: string;
  reason: string;
}

interface FeatureGapItem {
  id: string;
  feature: string;
  status: "have" | "gap" | "planned";
  priority: "high" | "medium" | "low";
  competitor: string;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* localStorage helpers                                                */
/* ------------------------------------------------------------------ */

const LS_KEY = "sw_competitive_intel";

function loadData<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch { /* silent */ }
  return fallback;
}
function saveData(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* silent */ }
}

/* ------------------------------------------------------------------ */
/* Default data — ALL EMPTY (no fake data)                             */
/* ------------------------------------------------------------------ */

const defaultCompetitors: Competitor[] = [];
const defaultFeatures: Record<string, FeatureComparison[]> = {};
const defaultNews: NewsItem[] = [];
const defaultHiring: HiringActivity[] = [];
const defaultWinLoss: WinLossRecord[] = [];
const defaultFeatureGaps: FeatureGapItem[] = [];

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function ThreatBadge({ level }: { level: ThreatLevel }) {
  const map = {
    high: { icon: ShieldAlert, text: "High", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    medium: { icon: Shield, text: "Medium", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    low: { icon: ShieldCheck, text: "Low", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  };
  const { icon: Icon, text, color } = map[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${color}`}>
      <Icon size={10} /> {text}
    </span>
  );
}

function FeatureCell({ value }: { value: boolean | null }) {
  if (value === true) return <Check size={14} className="text-emerald-400" />;
  if (value === false) return <X size={14} className="text-rose-400" />;
  return <Minus size={14} className="text-slate-600" />;
}

function SentimentBadge({ sentiment }: { sentiment: NewsItem["sentiment"] }) {
  const map = {
    positive: { icon: TrendingUp, color: "text-emerald-400" },
    negative: { icon: TrendingDown, color: "text-rose-400" },
    neutral: { icon: MinusIcon, color: "text-slate-400" },
  };
  const { icon: Icon, color } = map[sentiment];
  return <Icon size={12} className={color} />;
}

function StatusBadge({ status }: { status: FeatureGapItem["status"] }) {
  const map = {
    have: { text: "Have", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    gap: { text: "Gap", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    planned: { text: "Planned", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  };
  const { text, color } = map[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${color}`}>
      {text}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: FeatureGapItem["priority"] }) {
  const map = {
    high: "text-rose-400",
    medium: "text-amber-400",
    low: "text-slate-400",
  };
  return <span className={`text-[10px] font-medium ${map[priority]}`}>{priority}</span>;
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function CompetitiveIntel() {
  const [competitors, setCompetitors] = useState<Competitor[]>(() =>
    loadData<Competitor[]>(`${LS_KEY}_competitors`, defaultCompetitors)
  );
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [features, _setFeatures] = useState<Record<string, FeatureComparison[]>>(() =>
    loadData<Record<string, FeatureComparison[]>>(`${LS_KEY}_features`, defaultFeatures)
  );
  const [news, _setNews] = useState<NewsItem[]>(() =>
    loadData<NewsItem[]>(`${LS_KEY}_news`, defaultNews)
  );
  const [hiring, _setHiring] = useState<HiringActivity[]>(() =>
    loadData<HiringActivity[]>(`${LS_KEY}_hiring`, defaultHiring)
  );
  const [winLoss, _setWinLoss] = useState<WinLossRecord[]>(() =>
    loadData<WinLossRecord[]>(`${LS_KEY}_winloss`, defaultWinLoss)
  );
  const [featureGaps, setFeatureGaps] = useState<FeatureGapItem[]>(() =>
    loadData<FeatureGapItem[]>(`${LS_KEY}_gaps`, defaultFeatureGaps)
  );
  const [filterThreat, setFilterThreat] = useState<ThreatLevel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"directory" | "positioning" | "winloss" | "gaps">("directory");
  const [showAddGap, setShowAddGap] = useState(false);
  const [newGapFeature, setNewGapFeature] = useState("");
  const [newGapPriority, setNewGapPriority] = useState<FeatureGapItem["priority"]>("medium");

  useEffect(() => { saveData(`${LS_KEY}_competitors`, competitors); }, [competitors]);
  useEffect(() => { saveData(`${LS_KEY}_features`, features); }, [features]);
  useEffect(() => { saveData(`${LS_KEY}_news`, news); }, [news]);
  useEffect(() => { saveData(`${LS_KEY}_hiring`, hiring); }, [hiring]);
  useEffect(() => { saveData(`${LS_KEY}_winloss`, winLoss); }, [winLoss]);
  useEffect(() => { saveData(`${LS_KEY}_gaps`, featureGaps); }, [featureGaps]);

  const selectedComp = competitors.find(c => c.id === selectedCompId);

  const filteredCompetitors = competitors.filter(c => {
    const matchesThreat = filterThreat === "all" || c.threatLevel === filterThreat;
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.industry.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesThreat && matchesSearch;
  });

  const wins = winLoss.filter(w => w.result === "won").length;
  const losses = winLoss.filter(w => w.result === "lost").length;
  const winRate = winLoss.length > 0 ? Math.round((wins / winLoss.length) * 100) : 0;

  const gapsByStatus = {
    have: featureGaps.filter(g => g.status === "have").length,
    gap: featureGaps.filter(g => g.status === "gap").length,
    planned: featureGaps.filter(g => g.status === "planned").length,
  };

  const handleToggleGapStatus = (id: string) => {
    setFeatureGaps(prev => prev.map(g => {
      if (g.id !== id) return g;
      const cycle: FeatureGapItem["status"][] = ["gap", "planned", "have"];
      const next = cycle[(cycle.indexOf(g.status) + 1) % cycle.length];
      return { ...g, status: next };
    }));
  };

  const handleAddGap = () => {
    if (!newGapFeature.trim()) return;
    const gap: FeatureGapItem = {
      id: `fg-${Date.now()}`,
      feature: newGapFeature.trim(),
      status: "gap",
      priority: newGapPriority,
      competitor: "",
      notes: "",
    };
    setFeatureGaps(prev => [gap, ...prev]);
    setNewGapFeature("");
    setShowAddGap(false);
  };

  /* ---------- Detail View ---------- */
  if (selectedComp) {
    const compFeatures = features[selectedComp.id] || [];
    const compNews = news.filter(n => n.competitorId === selectedComp.id);
    const compHiring = hiring.filter(h => h.competitorId === selectedComp.id);
    const compWinLoss = winLoss.filter(w => w.competitorId === selectedComp.id);
    const compWins = compWinLoss.filter(w => w.result === "won").length;
    const compLosses = compWinLoss.filter(w => w.result === "lost").length;
    const compWinRate = compWinLoss.length > 0 ? Math.round((compWins / compWinLoss.length) * 100) : 0;

    return (
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCompId(null)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: selectedComp.logoColor }}
          >
            {selectedComp.initials}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">{selectedComp.name}</h2>
            <p className="text-[10px] text-slate-500">{selectedComp.industry}</p>
          </div>
          <div className="ml-auto">
            <ThreatBadge level={selectedComp.threatLevel} />
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={10} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">Price / Seat</span>
            </div>
            <div className="text-lg font-bold text-slate-100">${selectedComp.pricing}</div>
            <div className="text-[10px] text-slate-600">/ month</div>
          </div>
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-1.5 mb-1">
              <Target size={10} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">Feature Score</span>
            </div>
            <div className="text-lg font-bold text-slate-100">{selectedComp.features}</div>
            <div className="text-[10px] text-slate-600">/ 100</div>
          </div>
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 size={10} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">Founded</span>
            </div>
            <div className="text-lg font-bold text-slate-100">{selectedComp.founded}</div>
            <div className="text-[10px] text-slate-600">{selectedComp.employees} employees</div>
          </div>
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-1.5 mb-1">
              <Award size={10} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">Win Rate</span>
            </div>
            <div className="text-lg font-bold text-slate-100">{compWinRate}%</div>
            <div className="text-[10px] text-slate-600">{compWins}W / {compLosses}L</div>
          </div>
        </div>

        {/* Feature Comparison */}
        {compFeatures.length > 0 ? (
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Feature Comparison
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-600 border-b border-white/[0.06]">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-center py-2">SquidWeave</th>
                  <th className="text-center py-2">{selectedComp.name}</th>
                </tr>
              </thead>
              <tbody>
                {compFeatures.map((f) => (
                  <tr key={f.name} className="border-t border-white/[0.06]">
                    <td className="py-1.5 text-slate-300">{f.name}</td>
                    <td className="py-1.5 text-center"><FeatureCell value={f.ours} /></td>
                    <td className="py-1.5 text-center"><FeatureCell value={f.theirs} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
            <Target className="w-5 h-5 text-slate-700 mx-auto mb-2" />
            <p className="text-[11px] text-slate-600">No feature comparison data.</p>
            <p className="text-[10px] text-slate-700">Add features manually to compare against this competitor.</p>
          </div>
        )}

        {/* Recent News */}
        {compNews.length > 0 ? (
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper size={12} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent News</span>
            </div>
            <div className="space-y-2">
              {compNews.map(n => (
                <div key={n.id} className="flex items-start gap-2 py-1.5">
                  <SentimentBadge sentiment={n.sentiment} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-600">{n.source} &middot; {n.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
            <Newspaper className="w-5 h-5 text-slate-700 mx-auto mb-2" />
            <p className="text-[11px] text-slate-600">No news items.</p>
            <p className="text-[10px] text-slate-700">Connect news API for competitor updates.</p>
          </div>
        )}

        {/* Hiring Activity */}
        {compHiring.length > 0 ? (
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={12} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hiring Activity</span>
            </div>
            <div className="space-y-2">
              {compHiring.map(h => (
                <div key={h.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-xs text-slate-300">{h.role}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <span>{h.department}</span>
                      <span className="flex items-center gap-0.5"><MapPin size={8} />{h.location}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600">{h.postedDate}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
            <Briefcase className="w-5 h-5 text-slate-700 mx-auto mb-2" />
            <p className="text-[11px] text-slate-600">No hiring data.</p>
            <p className="text-[10px] text-slate-700">Connect LinkedIn Jobs or hiring API.</p>
          </div>
        )}
      </div>
    );
  }

  /* ---------- Main View ---------- */
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-rose-400" />
          <h2 className="text-sm font-bold text-slate-100">Competitive Intelligence</h2>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Tracked</div>
          <div className="text-xl font-bold text-slate-100">{competitors.length}</div>
          <div className="text-[10px] text-slate-600">competitors</div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-xl font-bold text-slate-100">{winRate}%</div>
          <div className="text-[10px] text-slate-600">{wins}W / {losses}L</div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Feature Gaps</div>
          <div className="text-xl font-bold text-rose-400">{gapsByStatus.gap}</div>
          <div className="text-[10px] text-slate-600">{gapsByStatus.planned} planned</div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Strengths</div>
          <div className="text-xl font-bold text-emerald-400">{gapsByStatus.have}</div>
          <div className="text-[10px] text-slate-600">features</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        {(["directory", "positioning", "winloss", "gaps"] as const).map(tab => {
          const labels = { directory: "Directory", positioning: "Positioning", winloss: "Win/Loss", gaps: "Feature Gaps" };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                activeTab === tab
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab: Directory */}
      {activeTab === "directory" && (
        <>
          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search competitors..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter size={10} className="text-slate-500" />
              {(["all", "high", "medium", "low"] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setFilterThreat(level)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    filterThreat === level
                      ? "bg-white/[0.06] text-slate-200"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state for no competitors */}
          {competitors.length === 0 && (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <Shield className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 mb-2 font-medium">No competitors tracked yet.</p>
              <p className="text-[11px] text-slate-600 max-w-md mx-auto mb-4">
                Add competitors manually or connect Crunchbase API to populate this section.
              </p>
              <button
                onClick={() => {
                  const id = `comp-${Date.now()}`;
                  setCompetitors(prev => [...prev, {
                    id,
                    name: "New Competitor",
                    initials: "NC",
                    industry: "",
                    threatLevel: "medium",
                    pricing: 0,
                    features: 0,
                    founded: "",
                    employees: "",
                    website: "",
                    description: "",
                    logoColor: "#6366f1",
                  }]);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[11px] font-medium border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
              >
                <Plus size={12} /> Add Competitor
              </button>
            </div>
          )}

          {/* Competitor Grid */}
          {competitors.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {filteredCompetitors.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id)}
                  className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-left hover:border-white/[0.10] hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: comp.logoColor }}
                    >
                      {comp.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">{comp.name}</span>
                        <ThreatBadge level={comp.threatLevel} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{comp.industry}</p>
                      <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{comp.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate-500">${comp.pricing}/mo</span>
                        <span className="text-[10px] text-slate-500">Score: {comp.features}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Positioning Map */}
      {activeTab === "positioning" && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Market Positioning
          </div>
          <div className="text-[10px] text-slate-600 mb-2">Price / seat (y) vs Feature Score (x)</div>
          {competitors.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-[11px] text-slate-600">Add competitors to see positioning map.</p>
            </div>
          ) : (
            <>
              {/* Scatter plot using CSS positioning */}
              <div className="relative h-64 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                {/* Axes labels */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-600">Feature Score &rarr;</div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-slate-600 origin-center">Price &rarr;</div>
                {/* Grid lines */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-white/[0.04]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-px bg-white/[0.04]" />
                </div>
                {/* Data points */}
                {competitors.map(comp => {
                  const x = (comp.features / 100) * 85 + 5;
                  const y = 95 - ((comp.pricing / 300) * 85 + 5);
                  return (
                    <div
                      key={comp.id}
                      className="absolute flex flex-col items-center cursor-pointer group"
                      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                      onClick={() => setSelectedCompId(comp.id)}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shadow-lg transition-transform group-hover:scale-125"
                        style={{ backgroundColor: comp.logoColor }}
                      >
                        {comp.initials.charAt(0)}
                      </div>
                      <span className="text-[8px] text-slate-500 mt-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {comp.name}
                      </span>
                    </div>
                  );
                })}
                {/* Our position */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: "72%", top: "35%", transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[7px] font-bold text-white shadow-lg ring-2 ring-indigo-400/30">
                    SW
                  </div>
                  <span className="text-[8px] text-indigo-400 mt-0.5 font-medium">Us</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {competitors.slice(0, 5).map(comp => (
                  <div key={comp.id} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.logoColor }} />
                    <span className="text-[9px] text-slate-500">{comp.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[9px] text-indigo-400">SquidWeave</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Win/Loss */}
      {activeTab === "winloss" && (
        <>
          {winLoss.length === 0 ? (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <TrendingUp className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 mb-2">No win/loss data yet.</p>
              <p className="text-[11px] text-slate-600">Record deal outcomes against competitors to track your win rate.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Deals Won</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{wins}</div>
                  <div className="text-[10px] text-slate-600">${winLoss.filter(w => w.result === "won").reduce((a, b) => a + b.value, 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Deals Lost</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">{losses}</div>
                  <div className="text-[10px] text-slate-600">${winLoss.filter(w => w.result === "lost").reduce((a, b) => a + b.value, 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Value</div>
                  <div className="text-lg font-bold text-slate-100 mt-1">${(winLoss.reduce((a, b) => a + b.value, 0) / 1000).toFixed(0)}k</div>
                  <div className="text-[10px] text-slate-600">pipeline value</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Deal History
                </div>
                <div className="space-y-2">
                  {winLoss.map(deal => {
                    const comp = competitors.find(c => c.id === deal.competitorId);
                    return (
                      <div key={deal.id} className="flex items-center gap-3 py-2 border-t border-white/[0.06]">
                        <div className={`w-2 h-2 rounded-full ${deal.result === "won" ? "bg-emerald-400" : "bg-rose-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300">{deal.dealName}</p>
                          <p className="text-[10px] text-slate-600">vs {comp?.name || "Unknown"} &middot; {deal.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-200">${deal.value.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-600">{deal.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Competitor */}
              {competitors.length > 0 && (
                <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    By Competitor
                  </div>
                  <div className="space-y-2">
                    {competitors.map(comp => {
                      const compDeals = winLoss.filter(w => w.competitorId === comp.id);
                      if (compDeals.length === 0) return null;
                      const cw = compDeals.filter(w => w.result === "won").length;
                      const cl = compDeals.filter(w => w.result === "lost").length;
                      const cwr = Math.round((cw / compDeals.length) * 100);
                      return (
                        <div key={comp.id} className="flex items-center gap-3">
                          <div className="w-20 text-[10px] text-slate-400 text-right">{comp.name}</div>
                          <div className="flex-1 h-4 rounded-md bg-white/[0.04] overflow-hidden relative flex">
                            {cw > 0 && (
                              <div className="h-full bg-emerald-500/40 flex items-center justify-center" style={{ width: `${cwr}%` }}>
                                {cwr >= 30 && <span className="text-[8px] text-emerald-300">{cw}W</span>}
                              </div>
                            )}
                            {cl > 0 && (
                              <div className="h-full bg-rose-500/40 flex items-center justify-center flex-1">
                                {cl >= 30 && <span className="text-[8px] text-rose-300">{cl}L</span>}
                              </div>
                            )}
                          </div>
                          <span className="w-10 text-[10px] text-slate-500">{cwr}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab: Feature Gaps */}
      {activeTab === "gaps" && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <StatusBadge status="have" />
              <span className="text-[10px] text-slate-600">{gapsByStatus.have}</span>
              <StatusBadge status="planned" />
              <span className="text-[10px] text-slate-600">{gapsByStatus.planned}</span>
              <StatusBadge status="gap" />
              <span className="text-[10px] text-slate-600">{gapsByStatus.gap}</span>
            </div>
            <button
              onClick={() => setShowAddGap(!showAddGap)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-medium border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
            >
              <Plus size={10} /> Add Feature
            </button>
          </div>

          {showAddGap && (
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
              <input
                type="text"
                value={newGapFeature}
                onChange={e => setNewGapFeature(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddGap()}
                placeholder="Feature name..."
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Priority:</span>
                {(["high", "medium", "low"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewGapPriority(p)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                      newGapPriority === p
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/20"
                        : "border-white/[0.06] text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={handleAddGap}
                  className="ml-auto px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {featureGaps.length === 0 && !showAddGap && (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 mb-2">No feature gaps tracked yet.</p>
              <p className="text-[11px] text-slate-600">Add features manually to track your competitive position.</p>
            </div>
          )}

          {featureGaps.length > 0 && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="space-y-1">
                {featureGaps.map(gap => (
                  <div
                    key={gap.id}
                    className="flex items-center gap-3 py-2 border-t border-white/[0.06] cursor-pointer hover:bg-white/[0.02] transition-colors rounded px-1"
                    onClick={() => handleToggleGapStatus(gap.id)}
                  >
                    <div className="w-4 flex justify-center">
                      {gap.status === "have" && <Check size={14} className="text-emerald-400" />}
                      {gap.status === "gap" && <AlertTriangle size={14} className="text-rose-400" />}
                      {gap.status === "planned" && <Clock size={14} className="text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300">{gap.feature}</p>
                      {gap.competitor && (
                        <p className="text-[10px] text-slate-600">vs {gap.competitor}</p>
                      )}
                    </div>
                    <PriorityBadge priority={gap.priority} />
                    <StatusBadge status={gap.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
