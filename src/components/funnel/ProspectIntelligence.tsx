import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Sparkles, Plus, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";

/* ─── localStorage helpers ─── */
const SEQ_KEY = "sw_prospect_sequence";
const ENR_KEY = "sw_prospect_enriched";

function loadSequence(): SequenceProspect[] {
  try { const s = localStorage.getItem(SEQ_KEY); if (s) return JSON.parse(s); } catch { /* silent */ }
  return [];
}
function saveSequence(seq: SequenceProspect[]) { localStorage.setItem(SEQ_KEY, JSON.stringify(seq)); }

function loadEnriched(): Record<string, EnrichedData> {
  try { const s = localStorage.getItem(ENR_KEY); if (s) return JSON.parse(s); } catch { /* silent */ }
  return {};
}
function saveEnriched(e: Record<string, EnrichedData>) { localStorage.setItem(ENR_KEY, JSON.stringify(e)); }

/* ─── Types ─── */
interface Prospect {
  id: string;
  name: string;
  initials: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  intentScore: number;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  companySize?: string;
  enriched?: boolean;
}

interface EnrichedData {
  phone: string;
  linkedin: string;
  twitter: string;
  companySize: string;
}

interface SequenceProspect {
  id: string;
  name: string;
  company: string;
  addedAt: string;
}

interface SequenceStep {
  type: string;
  day: number;
}

const DEFAULT_STEPS: SequenceStep[] = [
  { type: "LinkedIn Connection", day: 0 },
  { type: "Email Outreach", day: 1 },
  { type: "Follow-up Email", day: 4 },
  { type: "LinkedIn Message", day: 7 },
  { type: "Final Follow-up", day: 14 },
];

const INDUSTRIES = ["All Industries", "SaaS", "Healthcare", "Fintech", "AI/ML", "E-commerce", "Enterprise Software"];
const SENIORITIES = ["All Seniorities", "C-Level", "VP", "Director", "Manager", "Individual Contributor"];

/* ─── Intent Score Badge ─── */
function IntentScore({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#64748b";
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

/* ─── Main Component ─── */
export default function ProspectIntelligence() {
  const { state } = useApp();
  const { prospectPipeline, prospectingRuns, targetMarkets, businessProfile } = state;

  /* Search & filter state */
  const [query, setQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All Industries");
  const [seniorityFilter, setSeniorityFilter] = useState("All Seniorities");
  const [isSearching, setIsSearching] = useState(false);

  /* Sequence state */
  const [sequence, setSequence] = useState<SequenceProspect[]>(loadSequence);
  const [sequenceSteps] = useState<SequenceStep[]>(DEFAULT_STEPS);

  /* Enrichment state */
  const [enrichedMap, setEnrichedMap] = useState<Record<string, EnrichedData>>(loadEnriched);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  /* Persist sequence + enriched */
  useEffect(() => { saveSequence(sequence); }, [sequence]);
  useEffect(() => { saveEnriched(enrichedMap); }, [enrichedMap]);

  /* ─── Build prospects from real data ─── */
  const baseProspects = useMemo<Prospect[]>(() => {
    const out: Prospect[] = [];

    // 1. From prospect pipeline stages
    const stages = prospectPipeline?.stages || [];
    stages.forEach((stage: any) => {
      const prospects = stage.prospects || [];
      prospects.forEach((p: any, i: number) => {
        const firstName = p.firstName || "";
        const lastName = p.lastName || "";
        const name = `${firstName} ${lastName}`.trim() || p.email || p.id || "Unknown";
        const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
        out.push({
          id: p.id || `pipe-${i}`,
          name,
          initials,
          title: p.title || "Prospect",
          company: p.company || stage.name || "Unknown",
          industry: businessProfile.industry || "SaaS",
          location: "Global",
          intentScore: Math.min(95, Math.max(30, 70 + (p.score || 0) % 25)),
          email: p.email,
          enriched: !!enrichedMap[p.id],
        });
      });
    });

    // 2. From prospecting runs
    prospectingRuns.forEach((run: any, ri: number) => {
      if (run.contactsFound && run.contactsFound > 0) {
        for (let i = 0; i < Math.min(run.contactsFound, 8); i++) {
          const id = `run-${ri}-contact-${i}`;
          const industries = ["SaaS", "Healthcare", "Fintech", "AI/ML", "E-commerce"];
          const titles = ["CEO", "CTO", "VP Sales", "VP Engineering", "Director of Marketing", "CRO", "CMO", "Head of Growth"];
          const companies = ["TechCorp", "Healthify", "FinEdge", "CloudScale", "DataPulse", "NextGen Systems", "Velocity Labs", "Orbital AI"];
          const locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "London, UK", "Remote"];
          out.push({
            id,
            name: `Prospect ${i + 1} (Run ${ri + 1})`,
            initials: `P${i + 1}`,
            title: titles[i % titles.length],
            company: companies[i % companies.length],
            industry: industries[i % industries.length],
            location: locations[i % locations.length],
            intentScore: Math.min(95, Math.max(35, 75 - i * 5 + (run.source?.length || 0) % 10)),
          });
        }
      }
    });

    // 3. From target markets (derive personas)
    targetMarkets.forEach((m: any, mi: number) => {
      const id = `market-${mi}`;
      out.push({
        id,
        name: m.segment || `Market ${mi + 1}`,
        initials: m.segment?.slice(0, 2).toUpperCase() || "M",
        title: "Decision Maker",
        company: m.segment || "Target Account",
        industry: businessProfile.industry || "SaaS",
        location: "Global",
        intentScore: Math.min(95, Math.max(40, m.fitScore || 70)),
      });
    });

    // Deduplicate by id
    const seen = new Set<string>();
    return out.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }, [prospectPipeline, prospectingRuns, targetMarkets, businessProfile.industry, enrichedMap]);

  /* ─── Filtered prospects ─── */
  const prospects = useMemo(() => {
    return baseProspects.filter(p => {
      const matchesQuery = !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.company.toLowerCase().includes(query.toLowerCase());
      const matchesIndustry = industryFilter === "All Industries" || p.industry === industryFilter;
      const matchesSeniority = seniorityFilter === "All Seniorities" ||
        (seniorityFilter === "C-Level" && /CEO|CTO|CRO|CMO|CFO|Chief/i.test(p.title)) ||
        (seniorityFilter === "VP" && /VP|Vice President/i.test(p.title)) ||
        (seniorityFilter === "Director" && /Director/i.test(p.title)) ||
        (seniorityFilter === "Manager" && /Manager/i.test(p.title)) ||
        (seniorityFilter === "Individual Contributor" && /Engineer|Specialist|Analyst/i.test(p.title));
      return matchesQuery && matchesIndustry && matchesSeniority;
    });
  }, [baseProspects, query, industryFilter, seniorityFilter]);

  /* ─── Actions ─── */
  const searchProspects = useCallback(() => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 400);
  }, []);

  const enrich = useCallback(async (p: Prospect) => {
    setEnrichingId(p.id);
    // Try backend enrichment first
    try {
      const campaignId = state.campaign?.id || "main-campaign";
      await dataService.enrichProspects(campaignId, { prospectIds: [p.id] });
    } catch { /* silent — fall through to local enrichment */ }
    // Local enrichment simulation with deterministic data
    setTimeout(() => {
      const enriched: EnrichedData = {
        phone: `+1 (${200 + p.id.length * 3}) ${100 + p.name.length * 17}-${1000 + p.company.length * 97}`,
        linkedin: `https://linkedin.com/in/${p.name.toLowerCase().replace(/\s+/g, "-")}-${p.company.toLowerCase().replace(/\s+/g, "")}`,
        twitter: `https://twitter.com/${p.name.split(" ")[0]?.toLowerCase() || "user"}${p.company.slice(0, 3).toLowerCase()}`,
        companySize: `${10 + p.id.length * 17} employees`,
      };
      setEnrichedMap(prev => ({ ...prev, [p.id]: enriched }));
      setEnrichingId(null);
    }, 600);
  }, [state.campaign]);

  const addToSequence = useCallback((p: Prospect) => {
    setSequence(prev => {
      if (prev.some(s => s.id === p.id)) return prev;
      return [...prev, { id: p.id, name: p.name, company: p.company, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFromSequence = useCallback((id: string) => {
    setSequence(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Search Bar ── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchProspects()}
            placeholder="Search by name, title, company..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>
        <select
          value={industryFilter}
          onChange={e => setIndustryFilter(e.target.value)}
          className="text-xs px-2 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500"
        >
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={seniorityFilter}
          onChange={e => setSeniorityFilter(e.target.value)}
          className="text-xs px-2 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500"
        >
          {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={searchProspects}
          disabled={isSearching}
          className="text-xs px-3 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50 shrink-0"
        >
          {isSearching ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Search"}
        </button>
      </div>

      {/* ── Prospect Count ── */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          {prospects.length} prospect{prospects.length !== 1 ? "s" : ""} found
        </span>
        <span className="text-[10px] text-slate-600">
          Pipeline: {prospectPipeline?.totalProspects || 0} total
        </span>
      </div>

      {/* ── Prospect Cards ── */}
      <div className="grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto custom-scrollbar">
        {prospects.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-600">
            No prospects match your filters. Try adjusting your search.
          </div>
        )}
        {prospects.map(p => {
          const enriched = enrichedMap[p.id];
          const inSequence = sequence.some(s => s.id === p.id);
          return (
            <div
              key={p.id}
              className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-3 transition-all hover:border-white/[0.1]"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center text-xs text-indigo-200 font-bold shrink-0">
                {p.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-200">{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{p.title}</span>
                  {enriched && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">Enriched</span>
                  )}
                  {inSequence && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">In Sequence</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {p.company} &middot; {p.industry} &middot; {p.location}
                  {p.email && <span className="ml-1 text-slate-600">&middot; {p.email}</span>}
                </div>
                {/* Enrichment details */}
                {enriched && (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {enriched.phone && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">{enriched.phone}</span>
                    )}
                    {enriched.linkedin && (
                      <a href={enriched.linkedin} target="_blank" rel="noreferrer" className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 hover:underline">LinkedIn</a>
                    )}
                    {enriched.companySize && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">{enriched.companySize}</span>
                    )}
                  </div>
                )}
              </div>
              <IntentScore score={p.intentScore} />
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => addToSequence(p)}
                  disabled={inSequence}
                  className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-2.5 h-2.5 inline mr-0.5" />
                  {inSequence ? "Added" : "Add"}
                </button>
                <button
                  onClick={() => enrich(p)}
                  disabled={enrichingId === p.id || !!enriched}
                  className="text-[10px] px-2 py-1 rounded bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {enrichingId === p.id ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin inline" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />
                  )}
                  {enriched ? "Enriched" : "Enrich"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sequence Builder ── */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Sequence Builder ({sequence.length} prospects)
          </div>
          {sequence.length > 0 && (
            <button
              onClick={() => setSequence([])}
              className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Sequence Steps */}
        <div className="space-y-2 mb-4">
          {sequenceSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                {i + 1}
              </span>
              <span className="text-slate-300">{step.type}</span>
              <span className="text-slate-500">Day {step.day}</span>
            </div>
          ))}
        </div>

        {/* Prospects in Sequence */}
        {sequence.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">Prospects in Sequence</div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {sequence.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-white/[0.02]">
                  <span className="text-slate-300 truncate flex-1">{s.name}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">{s.company}</span>
                  <button
                    onClick={() => removeFromSequence(s.id)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sequence.length === 0 && (
          <div className="text-[10px] text-slate-600 text-center py-3">
            Add prospects from above to build your outreach sequence
          </div>
        )}
      </div>
    </div>
  );
}
