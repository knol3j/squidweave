import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Zap,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Filter,
  Search,
  BarChart3,
  Lightbulb,
} from "lucide-react";

interface PainPointTemplate {
  problem: string;
  evidence: string;
  solution: string;
  impact: string;
  confidence: number;
  messageAngle: string;
}

export default function PainPointAnalyzer() {
  const [_selectedIndustry, _setSelectedIndustry] = useState("B2B SaaS");
  const [filterImpact, setFilterImpact] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const painPoints: PainPointTemplate[] = [];

  const filtered = useMemo(() => {
    return painPoints.filter((pp) => {
      const matchImpact = filterImpact === "All" || pp.impact === filterImpact;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        pp.problem.toLowerCase().includes(q) ||
        pp.evidence.toLowerCase().includes(q) ||
        pp.solution.toLowerCase().includes(q);
      return matchImpact && matchSearch;
    });
  }, [painPoints, filterImpact, searchQuery]);

  const impactCounts = useMemo(() => {
    const counts: Record<string, number> = { All: painPoints.length, High: 0, Medium: 0, Low: 0 };
    painPoints.forEach((pp) => { counts[pp.impact] = (counts[pp.impact] || 0) + 1; });
    return counts;
  }, [painPoints]);

  function impactBadgeClasses(impact: string): string {
    switch (impact) {
      case "High": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "Medium": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "Low": return "text-slate-400 bg-slate-500/10 border-slate-500/20";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100">Pain Point Analyzer</h2>
          <p className="text-[11px] text-slate-500">Industry-specific pain points mapped to SquidWeave solutions</p>
        </div>
      </div>

      {painPoints.length === 0 && (
        <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
          <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-xs text-slate-500 mb-2 font-medium">No pain point analysis available.</p>
          <p className="text-[11px] text-slate-600 max-w-md mx-auto mb-4">
            Run the research engine to analyze industry pain points. Pain points will be populated from real research data including competitor analysis, industry reports, and customer reviews.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Competitor Reviews</span>
            <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Industry Reports</span>
            <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">G2 / Capterra</span>
            <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Social Listening</span>
          </div>
        </div>
      )}

      {painPoints.length > 0 && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </div>
            {(["All", "High", "Medium", "Low"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilterImpact(level)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                  filterImpact === level
                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
                    : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
                }`}
              >
                {level} ({impactCounts[level]})
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <Search className="w-3 h-3 text-slate-600" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pain points..."
                className="text-[11px] px-2 py-1 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-indigo-500 w-40"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((pp, i) => {
              const expanded = expandedIndex === i;
              return (
                <div
                  key={pp.problem}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-colors"
                >
                  <button
                    onClick={() => setExpandedIndex(expanded ? null : i)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${impactBadgeClasses(pp.impact)}`}>
                      {pp.impact}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{pp.problem}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <BarChart3 className="w-3 h-3" />
                        {pp.confidence}%
                      </div>
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 space-y-2.5">
                      <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Industry Evidence</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{pp.evidence}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/15">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap className="w-3 h-3 text-indigo-400" />
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">SquidWeave Solution</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{pp.solution}</p>
                      </div>

                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
                        <Lightbulb className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Suggested Messaging</div>
                          <p className="text-[11px] text-slate-400 italic">&ldquo;{pp.messageAngle}&rdquo;</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pp.confidence >= 90 ? "bg-emerald-500" : pp.confidence >= 80 ? "bg-amber-500" : "bg-slate-500"
                            }`}
                            style={{ width: `${pp.confidence}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <CheckCircle2 className="w-3 h-3" />
                          {pp.confidence}% match confidence
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <div className="text-xs text-slate-500">No pain points match your filters</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-lg font-bold text-rose-400">{painPoints.filter((p) => p.impact === "High").length}</div>
              <div className="text-[10px] text-slate-500">High Impact</div>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-lg font-bold text-amber-400">{painPoints.filter((p) => p.impact === "Medium").length}</div>
              <div className="text-[10px] text-slate-500">Medium Impact</div>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-lg font-bold text-slate-400">{Math.round(painPoints.reduce((acc, p) => acc + p.confidence, 0) / (painPoints.length || 1))}%</div>
              <div className="text-[10px] text-slate-500">Avg Confidence</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
