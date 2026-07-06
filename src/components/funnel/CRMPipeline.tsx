import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, Search, Filter, RefreshCw, ArrowRight, Building2, Users, DollarSign, BarChart3, TrendingUp, TrendingDown, Minus, Star, Phone, Mail, MessageSquare, Calendar, Clock, Tag, AlertTriangle, Check, Sparkles, Zap, ChevronRight, GripVertical, FileText, Target, Award, Activity, ArrowUpRight
} from "lucide-react";
import { useApp } from "../../context/AppContext";

/* ================================================================== */
/*  EMPTY STAGES — no fake deals                                        */
/* ================================================================== */

const EMPTY_STAGES: PipelineStage[] = [
  { id: "lead", name: "Lead", order: 0, deals: [] },
  { id: "qualified", name: "Qualified", order: 1, deals: [] },
  { id: "meeting", name: "Meeting Scheduled", order: 2, deals: [] },
  { id: "proposal", name: "Proposal Sent", order: 3, deals: [] },
  { id: "negotiation", name: "Negotiation", order: 4, deals: [] },
  { id: "closed", name: "Closed Won", order: 5, deals: [] },
];

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

interface Deal {
  id: string;
  company: string;
  contact: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  priority: "hot" | "warm" | "cold";
  lastActivity: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  tags: string[];
  emails: number;
  calls: number;
  meetings: number;
  daysInStage: number;
  source: string;
  industry: string;
  size: string;
  location: string;
  competitors: string[];
  createdAt: string;
  updatedAt: string;
  score: number;
  engagement: number;
  intent: number;
  activities: Activity[];
  contacts: DealContact[];
}

interface DealContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  isPrimary: boolean;
  engagement: number;
}

interface Activity {
  id: string;
  type: "email" | "call" | "meeting" | "note" | "stage_change" | "task";
  description: string;
  createdAt: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  deals: Deal[];
}

interface PipelineState {
  stages: PipelineStage[];
  archived: Deal[];
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

/* ================================================================== */
/*  LOCALSTORAGE                                                       */
/* ================================================================== */

const STORAGE_KEY = "squidweave_pipeline_v2";

function loadState(): PipelineState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { stages: parsed.stages || EMPTY_STAGES, archived: parsed.archived || [], lastUpdated: parsed.lastUpdated || null, isLoading: false, error: null };
    }
  } catch { /* ignore */ }
  return { stages: EMPTY_STAGES, archived: [], lastUpdated: null, isLoading: false, error: null };
}
function saveState(s: PipelineState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ stages: s.stages, archived: s.archived, lastUpdated: s.lastUpdated })); } catch { /* ignore */ }
}

/* ================================================================== */
/*  MINI COMPONENTS                                                    */
/* ================================================================== */

function PriorityBadge({ priority }: { priority: Deal["priority"] }) {
  const map = { hot: { color: "text-rose-400 bg-rose-500/10 border-rose-500/20", label: "Hot" }, warm: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Warm" }, cold: { color: "text-sky-400 bg-sky-500/10 border-sky-500/20", label: "Cold" } };
  const m = map[priority];
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${m.color}`}>{m.label}</span>;
}

function ProbabilityBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden"><div className="h-full rounded-full bg-emerald-500/40 transition-all" style={{ width: `${value}%` }} /></div>
      <span className="text-[10px] text-slate-500 w-8 text-right">{value}%</span>
    </div>
  );
}

function ScoreRing({ value, size = 32 }: { value: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const dash = `${pct * 2.51} ${251 - pct * 2.51}`;
  return (
    <svg width={size} height={size} viewBox="0 0 90 90"><circle cx="45" cy="45" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/[0.04]" /><circle cx="45" cy="45" r="40" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray={dash} strokeLinecap="round" className="text-indigo-400" transform="rotate(-90 45 45)" /></svg>
  );
}

function StageIcon({ stageId }: { stageId: string }) {
  const map: Record<string, React.ElementType> = { lead: Users, qualified: Check, meeting: Calendar, proposal: FileText, negotiation: MessageSquare, closed: Award };
  const Icon = map[stageId] || Target;
  return <Icon className="w-3.5 h-3.5" />;
}

/* ================================================================== */
/*  ACTIVITY FEED                                                      */
/* ================================================================== */

function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return <div className="p-4 text-center text-[11px] text-slate-600">No activities yet. Activities will appear here as you interact with this deal.</div>;
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02]">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${a.type === "email" ? "bg-indigo-500/10" : a.type === "call" ? "bg-emerald-500/10" : a.type === "meeting" ? "bg-amber-500/10" : a.type === "stage_change" ? "bg-purple-500/10" : "bg-slate-500/10"}`}>
            {a.type === "email" ? <Mail className="w-3 h-3 text-indigo-400" /> : a.type === "call" ? <Phone className="w-3 h-3 text-emerald-400" /> : a.type === "meeting" ? <Calendar className="w-3 h-3 text-amber-400" /> : a.type === "stage_change" ? <ArrowRight className="w-3 h-3 text-purple-400" /> : <FileText className="w-3 h-3 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0"><div className="text-[11px] text-slate-300">{a.description}</div><div className="text-[10px] text-slate-600 mt-0.5">{new Date(a.createdAt).toLocaleString()}</div></div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  DEAL CARD                                                          */
/* ================================================================== */

function DealCard({ deal, onMove, onEdit, onDelete, stageName }: { deal: Deal; onMove: (dealId: string, direction: "forward" | "backward") => void; onEdit: (deal: Deal) => void; onDelete: (dealId: string) => void; stageName: string }) {
  const [expanded, setExpanded] = useState(false);
  const valueFormatted = deal.value >= 1000000 ? `$${(deal.value / 1000000).toFixed(1)}M` : deal.value >= 1000 ? `$${(deal.value / 1000).toFixed(0)}K` : `$${deal.value}`;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all">
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-200 truncate">{deal.company}</span><PriorityBadge priority={deal.priority} /></div>
            <div className="text-[10px] text-slate-500 mt-0.5">{deal.contact} · {deal.title}</div>
          </div>
          <div className="flex items-center gap-1"><span className="text-sm font-bold text-emerald-400">{valueFormatted}</span>{expanded ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}</div>
        </div>
        <div className="mt-2"><ProbabilityBar value={deal.probability} /></div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{deal.daysInStage}d</span>
          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{deal.emails}</span>
          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{deal.calls}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{deal.meetings}</span>
          <span className="flex items-center gap-1 ml-auto"><ScoreRing value={deal.score} size={24} /></span>
        </div>
        {deal.nextAction && <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400"><Zap className="w-3 h-3" />{deal.nextAction} · {new Date(deal.nextActionDate).toLocaleDateString()}</div>}
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/[0.06] pt-2 space-y-2">
          {deal.notes && <div className="text-[11px] text-slate-400 italic">{deal.notes}</div>}
          <div className="flex flex-wrap gap-1">{deal.tags.map((t) => <span key={t} className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.04] text-slate-500 border border-white/[0.06]">{t}</span>)}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">Industry</div><div className="text-slate-300">{deal.industry}</div></div>
            <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">Size</div><div className="text-slate-300">{deal.size}</div></div>
            <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">Location</div><div className="text-slate-300">{deal.location}</div></div>
            <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">Source</div><div className="text-slate-300">{deal.source}</div></div>
          </div>
          {deal.competitors.length > 0 && <div className="text-[10px] text-slate-500">Competitors: {deal.competitors.join(", ")}</div>}
          <div className="flex items-center gap-1 pt-1">
            <button onClick={(e) => { e.stopPropagation(); onMove(deal.id, "backward"); }} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-slate-400 hover:text-slate-300 border border-white/[0.06] transition-colors">← Move Back</button>
            <button onClick={(e) => { e.stopPropagation(); onMove(deal.id, "forward"); }} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-slate-400 hover:text-slate-300 border border-white/[0.06] transition-colors">Move Forward →</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(deal); }} className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors ml-auto"><Edit3 className="w-3 h-3 inline mr-1" />Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(deal.id); }} className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"><Trash2 className="w-3 h-3 inline mr-1" />Delete</button>
          </div>
          <div className="border-t border-white/[0.06] pt-2"><div className="text-[10px] text-slate-500 font-medium mb-1">Activity</div><ActivityFeed activities={deal.activities} /></div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function CRMPipeline() {
  const { state } = useApp();
  const [pipeline, setPipeline] = useState<PipelineState>(loadState);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"value" | "score" | "recent" | "probability">("score");

  /* Persist */
  useEffect(() => { saveState(pipeline); }, [pipeline]);

  /* Refresh from API */
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // In production: const deals = await fetch('/api/pipeline').then(r => r.json());
      // setPipeline(prev => ({ ...prev, stages: mergeDeals(prev.stages, deals), lastUpdated: new Date().toISOString() }));
      setPipeline((prev) => ({ ...prev, lastUpdated: new Date().toISOString() }));
    } catch {
      setPipeline((prev) => ({ ...prev, error: "Failed to refresh pipeline. Check API connection." }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /* CRUD */
  const addDeal = useCallback((deal: Omit<Deal, "id" | "createdAt" | "updatedAt" | "activities" | "daysInStage">) => {
    const newDeal: Deal = { ...deal, id: `deal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), activities: [{ id: `act_${Date.now()}`, type: "note", description: "Deal created", createdAt: new Date().toISOString(), createdBy: "system" }], daysInStage: 0 };
    setPipeline((prev) => {
      const stages = prev.stages.map((s) => s.id === deal.stage ? { ...s, deals: [...s.deals, newDeal] } : s);
      return { ...prev, stages, lastUpdated: new Date().toISOString() };
    });
  }, []);

  const updateDeal = useCallback((updated: Deal) => {
    setPipeline((prev) => {
      const stages = prev.stages.map((s) => ({ ...s, deals: s.deals.map((d) => d.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : d) }));
      return { ...prev, stages, lastUpdated: new Date().toISOString() };
    });
  }, []);

  const deleteDeal = useCallback((dealId: string) => {
    setPipeline((prev) => {
      const stages = prev.stages.map((s) => ({ ...s, deals: s.deals.filter((d) => d.id !== dealId) }));
      return { ...prev, stages, lastUpdated: new Date().toISOString() };
    });
  }, []);

  const moveDeal = useCallback((dealId: string, direction: "forward" | "backward") => {
    setPipeline((prev) => {
      const stages = [...prev.stages];
      let fromIdx = -1, deal: Deal | undefined;
      for (let i = 0; i < stages.length; i++) { const d = stages[i].deals.find((x) => x.id === dealId); if (d) { fromIdx = i; deal = d; break; } }
      if (!deal || fromIdx === -1) return prev;
      const toIdx = direction === "forward" ? Math.min(fromIdx + 1, stages.length - 1) : Math.max(fromIdx - 1, 0);
      if (toIdx === fromIdx) return prev;
      const newStages = stages.map((s, i) => {
        if (i === fromIdx) return { ...s, deals: s.deals.filter((d) => d.id !== dealId) };
        if (i === toIdx) return { ...s, deals: [...s.deals, { ...deal!, stage: stages[toIdx].id, probability: Math.min(100, Math.max(0, deal!.probability + (direction === "forward" ? 15 : -15))), updatedAt: new Date().toISOString(), activities: [...deal!.activities, { id: `act_${Date.now()}`, type: "stage_change", description: `Moved from ${stages[fromIdx].name} to ${stages[toIdx].name}`, createdAt: new Date().toISOString(), createdBy: "user" }] }] };
        return s;
      });
      return { ...prev, stages: newStages, lastUpdated: new Date().toISOString() };
    });
  }, []);

  /* Stats */
  const allDeals = useMemo(() => pipeline.stages.flatMap((s) => s.deals), [pipeline.stages]);
  const stats = useMemo(() => {
    const totalValue = allDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = allDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
    const avgScore = allDeals.length > 0 ? Math.round(allDeals.reduce((sum, d) => sum + d.score, 0) / allDeals.length) : 0;
    const hotCount = allDeals.filter((d) => d.priority === "hot").length;
    return { totalDeals: allDeals.length, totalValue, weightedValue, avgScore, hotCount, avgProbability: allDeals.length > 0 ? Math.round(allDeals.reduce((sum, d) => sum + d.probability, 0) / allDeals.length) : 0 };
  }, [allDeals]);

  /* Filtered stages */
  const filteredStages = useMemo(() => {
    return pipeline.stages.map((s) => ({
      ...s,
      deals: s.deals.filter((d) => {
        if (filterPriority !== "all" && d.priority !== filterPriority) return false;
        if (search) { const q = search.toLowerCase(); return d.company.toLowerCase().includes(q) || d.contact.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q)) || d.industry.toLowerCase().includes(q); }
        return true;
      }).sort((a, b) => { if (sortBy === "value") return b.value - a.value; if (sortBy === "score") return b.score - a.score; if (sortBy === "probability") return b.probability - a.probability; return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); }),
    }));
  }, [pipeline.stages, search, filterPriority, sortBy]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-indigo-400" /></div>
          <div><h2 className="text-sm font-bold text-slate-100">CRM Pipeline</h2><p className="text-[11px] text-slate-500">Track deals, manage stages, and close more revenue</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === "board" ? "list" : "board")} className="text-[10px] px-2 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-300 transition-colors">{viewMode === "board" ? "List" : "Board"}</button>
          <button onClick={() => setShowFilters(!showFilters)} className={`text-[10px] px-2 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${showFilters ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25" : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-300"}`}><Filter className="w-3 h-3" /> Filters</button>
          <button onClick={() => void refreshData()} disabled={isRefreshing} className="text-[10px] px-2 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50"><RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />{isRefreshing ? "Refreshing..." : "Refresh"}</button>
          <button onClick={() => setShowAddDeal(true)} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors flex items-center gap-1.5"><Plus className="w-3 h-3" /> Add Deal</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="text-[10px] text-slate-500 mb-1">Total Deals</div><div className="text-xl font-bold text-slate-200">{stats.totalDeals}</div></div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="text-[10px] text-slate-500 mb-1">Pipeline Value</div><div className="text-xl font-bold text-emerald-400">${(stats.totalValue / 1000).toFixed(0)}K</div></div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="text-[10px] text-slate-500 mb-1">Weighted Value</div><div className="text-xl font-bold text-indigo-400">${(stats.weightedValue / 1000).toFixed(0)}K</div></div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="flex items-center justify-between"><div className="text-[10px] text-slate-500 mb-1">Avg Score</div>{stats.hotCount > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20">{stats.hotCount} hot</span>}</div><div className="flex items-center gap-2"><div className="text-xl font-bold text-slate-200">{stats.avgScore}</div><ScoreRing value={stats.avgScore} size={28} /></div></div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals..." className="text-xs px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-indigo-500 w-48" />
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)} className="text-[10px] px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none cursor-pointer"><option value="all">All Priorities</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option></select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-[10px] px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none cursor-pointer"><option value="score">Sort by Score</option><option value="value">Sort by Value</option><option value="probability">Sort by Probability</option><option value="recent">Sort by Recent</option></select>
          </div>
        </div>
      )}

      {/* Empty state */}
      {allDeals.length === 0 && !search && (
        <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
          <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-xs text-slate-500 mb-1">Your pipeline is empty.</p>
          <p className="text-[11px] text-slate-600 max-w-md mx-auto mb-4">Add deals manually or connect your CRM (Salesforce, HubSpot, Pipedrive) to sync deals automatically.</p>
          <button onClick={() => setShowAddDeal(true)} className="text-xs px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors inline-flex items-center gap-1.5"><Plus className="w-3 h-3" /> Add First Deal</button>
        </div>
      )}

      {/* Board View */}
      {viewMode === "board" && allDeals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {filteredStages.map((stage) => (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <StageIcon stageId={stage.id} />
                <span className="text-[11px] font-semibold text-slate-300">{stage.name}</span>
                <span className="ml-auto text-[10px] text-slate-600">{stage.deals.length}</span>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-1">
                {stage.deals.map((deal) => <DealCard key={deal.id} deal={deal} onMove={moveDeal} onEdit={setEditingDeal} onDelete={deleteDeal} stageName={stage.name} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && allDeals.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="text-[10px] text-slate-500 uppercase text-left"><th className="pb-2 font-medium">Company</th><th className="pb-2 font-medium">Contact</th><th className="pb-2 font-medium">Value</th><th className="pb-2 font-medium">Stage</th><th className="pb-2 font-medium">Prob</th><th className="pb-2 font-medium">Priority</th><th className="pb-2 font-medium">Score</th><th className="pb-2 font-medium">Last Activity</th><th className="pb-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {filteredStages.flatMap((s) => s.deals).map((deal) => (
                <tr key={deal.id} className="text-xs border-t border-white/[0.06]">
                  <td className="py-2 text-slate-200 font-medium">{deal.company}</td>
                  <td className="py-2 text-slate-400">{deal.contact}</td>
                  <td className="py-2 text-emerald-400 font-medium">${(deal.value / 1000).toFixed(0)}K</td>
                  <td className="py-2"><span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.04] text-slate-400 border border-white/[0.06]">{pipeline.stages.find((s) => s.id === deal.stage)?.name || deal.stage}</span></td>
                  <td className="py-2"><ProbabilityBar value={deal.probability} /></td>
                  <td className="py-2"><PriorityBadge priority={deal.priority} /></td>
                  <td className="py-2"><div className="flex items-center gap-1"><ScoreRing value={deal.score} size={20} /><span className="text-slate-400">{deal.score}</span></div></td>
                  <td className="py-2 text-slate-500">{new Date(deal.updatedAt).toLocaleDateString()}</td>
                  <td className="py-2"><div className="flex items-center gap-1"><button onClick={() => setEditingDeal(deal)} className="p-1 rounded hover:bg-white/[0.04] text-slate-500 hover:text-indigo-400"><Edit3 className="w-3 h-3" /></button><button onClick={() => deleteDeal(deal.id)} className="p-1 rounded hover:bg-white/[0.04] text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
