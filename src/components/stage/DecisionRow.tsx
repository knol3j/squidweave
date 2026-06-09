import { useState, useEffect, memo } from "react";
import { Target, BookOpen, DollarSign, Users, Check, X, Sparkles, Loader2, GitBranch, Zap, Send, UserSearch, Swords } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";
import ProspectIntelligence from "@/components/funnel/ProspectIntelligence";
import CompetitiveIntel from "@/components/funnel/CompetitiveIntel";


const DecisionRow = memo(function DecisionRow() {
  const { state, approveTargetMarket, rejectTargetMarket, discoverMarkets, generateProspects, enrichProspects, sequenceProspects } = useApp();
  const { campaign, businessProfile, targetMarkets } = state;
  const campaignId = campaign?.id || "";
  const [tab, setTabRaw] = useState<"markets" | "targets" | "playbooks" | "funding" | "pipeline" | "prospects" | "competitive">(() => {
    try { const s = localStorage.getItem("sw_tab_decision"); return (s as any) || "markets"; } catch { return "markets"; }
  });
  const setTab = (t: "markets" | "targets" | "playbooks" | "funding" | "pipeline" | "prospects" | "competitive") => {
    setTabRaw(t);
    try { localStorage.setItem("sw_tab_decision", t); } catch { /* silent */ }
  };
  const [targets, setTargets] = useState<any[]>([]);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [generatingMarkets, setGeneratingMarkets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data only when campaignId changes — NOT on every poll refresh
  // This prevents the "blinking" caused by lastRefresh changing every 5s
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    Promise.allSettled([
      dataService.getTargets(campaignId),
      dataService.getPlaybooks(campaignId),
      dataService.getFundingInvestors(campaignId),
      dataService.getFundingPipeline(campaignId),
    ]).then(([t, p, i, pipe]) => {
      if (t.status === "fulfilled") setTargets(t.value);
      if (p.status === "fulfilled") setPlaybooks(p.value);
      if (i.status === "fulfilled") setInvestors(i.value);
      if (pipe.status === "fulfilled") setPipeline(pipe.value);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleDiscover = async () => {
    setGeneratingMarkets(true);
    await discoverMarkets();
    setGeneratingMarkets(false);
  };

  if (!campaignId) return <Empty message="Select a campaign first" />;
  if (error) return <ErrorMessage message={error} />;

  const tabs = [
    { key: "markets" as const, label: `Target Markets (${targetMarkets.filter(m => m.status === "approved").length}/${targetMarkets.length})`, icon: Users },
    { key: "targets" as const, label: `Ranked (${targets.length})`, icon: Target },
    { key: "playbooks" as const, label: `Playbooks (${playbooks.length})`, icon: BookOpen },
    { key: "funding" as const, label: `Funding (${investors.length})`, icon: DollarSign },
    { key: "pipeline" as const, label: `Pipeline`, icon: GitBranch },
    { key: "prospects" as const, label: `Prospects`, icon: UserSearch },
    { key: "competitive" as const, label: `Competitive`, icon: Swords },
  ];

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={tab === t.key ? { background: "rgba(245,158,11,0.12)", color: "#fbbf24" } : { color: "#475569" }}>
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {/* Target Markets Tab */}
      {!loading && tab === "markets" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-600">
              {targetMarkets.filter(m => m.status === "approved").length} approved of {targetMarkets.length} markets
            </div>
            <button onClick={handleDiscover} disabled={generatingMarkets || !businessProfile.businessName}
              className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all disabled:opacity-40"
              style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
              {generatingMarkets ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {generatingMarkets ? "Analyzing..." : "Discover Markets"}
            </button>
          </div>

          {targetMarkets.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-600">No target markets discovered yet.</p>
              <p className="text-[10px] text-slate-700 mt-1">
                {businessProfile.businessName
                  ? "Click 'Discover Markets' to have agents research your ideal segments."
                  : "Fill in your Business Profile in Stage 1 first."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto custom-scrollbar">
            {targetMarkets.map((market) => (
              <div key={market.id}
                className={`p-3 rounded-xl border transition-all ${
                  market.status === "approved" ? "border-emerald-500/20 bg-emerald-500/[0.04]" :
                  market.status === "rejected" ? "border-red-500/10 opacity-50" :
                  "border-white/[0.06] bg-[#0f172a]"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100">{market.segment}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        market.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                        market.status === "rejected" ? "bg-red-500/10 text-red-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>{market.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{market.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {market.channels.map(ch => (
                        <span key={ch} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500">{ch}</span>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px]">
                      <span className="text-slate-600">Reach: <span className="text-slate-300">{market.estimatedReach?.toLocaleString()}</span></span>
                      <span className="text-slate-600">Fit: <span style={{ color: market.fitScore > 85 ? "#34d399" : "#fbbf24" }}>{market.fitScore}%</span></span>
                    </div>
                    {market.painPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {market.painPoints.map((p, i) => (
                          <span key={i} className="text-[9px] text-slate-600">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {market.status === "discovered" && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => approveTargetMarket(market.id)}
                        className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => rejectTargetMarket(market.id)}
                        className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranked Targets Tab */}
      {!loading && tab === "targets" && targets.length === 0 && <Empty message="No targets ranked yet" />}
      {!loading && tab === "targets" && targets.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
          {targets.slice(0, 20).map((t: any) => (
            <div key={t.targetId || t.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.06] bg-[#0f172a]">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate text-slate-100">{t.company || t.targetId}</div>
                <div className="text-[10px] mt-0.5 text-slate-600">{t.segment} \u00b7 {t.region || "\u2014"}</div>
              </div>
              <div className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{t.recommendedChannel || "\u2014"}</div>
              {t.score != null && <ScoreBar value={t.score} accent="#f59e0b" />}
            </div>
          ))}
          {state.brainState?.decisions?.length > 0 && (
            <div className="mt-4 p-3 rounded-xl border border-violet-500/15 bg-violet-500/[0.04]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Target Decisioning</div>
              <div className="text-xs text-slate-400">
                Latest: {state.brainState.decisions[state.brainState.decisions.length - 1]?.plan?.recommendedAction?.type || 'Analysis'}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "playbooks" && playbooks.length === 0 && <Empty message="No playbooks in memory" />}
      {!loading && tab === "playbooks" && playbooks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar">
          {playbooks.map((pb: any) => (
            <div key={pb.id} className="p-3 rounded-xl border border-white/[0.06] bg-[#0f172a]">
              <div className="text-xs font-medium text-slate-100">{pb.segment} \u00b7 {pb.region}</div>
              <div className="text-[10px] mt-1 text-slate-600">{pb.recommendedChannel} \u00b7 {pb.cadenceDays}d</div>
              <div className="flex gap-3 mt-2">
                <Metric label="Win" value={`${(pb.winRate * 100).toFixed(0)}%`} color="#34d399" />
                <Metric label="Risk" value={`${(pb.riskRate * 100).toFixed(0)}%`} color="#fb7185" />
                <Metric label="Conf" value={`${(pb.confidence * 100).toFixed(0)}%`} color="#a5b4fc" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "funding" && (
        <div className="space-y-3">
          {pipeline && (
            <div className="flex gap-4 p-3 rounded-xl border border-white/[0.06] bg-[#0f172a]">
              <Metric label="Total Investors" value={pipeline.counts?.total || 0} color="#6366f1" />
              <Metric label="Prioritized" value={pipeline.prioritized?.length || 0} color="#fbbf24" />
            </div>
          )}
          {investors.length === 0 && <Empty message="No investors imported" />}
          {investors.length > 0 && (
            <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-white/[0.06]">
                  <th className="text-left py-1.5 px-2 font-medium text-slate-600">Fund</th>
                  <th className="text-left py-1.5 px-2 font-medium text-slate-600">Partner</th>
                  <th className="text-left py-1.5 px-2 font-medium text-slate-600">Score</th>
                  <th className="text-left py-1.5 px-2 font-medium text-slate-600">Status</th>
                </tr></thead>
                <tbody>
                  {investors.slice(0, 30).map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02] border-b border-white/[0.03]">
                      <td className="py-1.5 px-2 text-slate-100">{inv.fundName}</td>
                      <td className="py-1.5 px-2 text-slate-400">{inv.partnerName || "\u2014"}</td>
                      <td className="py-1.5 px-2"><ScoreBar value={Math.round((inv.thesisMatch + inv.stageMatch + inv.checkSizeMatch + inv.warmPath) / 4 * 100)} accent="#f59e0b" /></td>
                      <td className="py-1.5 px-2"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: inv.status === "enriched" ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)", color: inv.status === "enriched" ? "#34d399" : "#a5b4fc" }}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Prospecting Pipeline Tab */}
      {!loading && tab === "pipeline" && (
        <div className="space-y-3">
          {state.prospectPipeline ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <MetricBox label="Total" value={state.prospectPipeline.counts?.total || 0} />
                <MetricBox label="Ready for Enrichment" value={state.prospectPipeline.counts?.readyForEnrichment || 0} />
                <MetricBox label="Ready for Sequence" value={state.prospectPipeline.counts?.readyForSequencing || 0} />
                <MetricBox label="Sequenced" value={state.prospectPipeline.counts?.sequenced || 0} />
                <MetricBox label="Suppressed" value={state.prospectPipeline.counts?.suppressed || 0} />
              </div>
              {state.prospectPipeline.recentRuns?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Recent Runs</div>
                  {state.prospectPipeline.recentRuns.map((run: any) => (
                    <div key={run.id} className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.03] mb-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">{run.action}</span>
                        <span className={run.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}>{run.status}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{run.processedContacts} contacts \u00b7 {new Date(run.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState icon={<GitBranch className="w-8 h-8 text-slate-600" />} text="No prospecting pipeline data yet. Run automation to generate prospects." />
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={generateProspects} disabled={state.isLoading} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium bg-amber-500 text-white disabled:opacity-50">
              <Sparkles className="w-3 h-3" /> Generate Prospects
            </button>
            <button onClick={enrichProspects} disabled={state.isLoading} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium border border-white/[0.1] text-slate-300 hover:bg-white/5 disabled:opacity-50">
              <Zap className="w-3 h-3" /> Enrich
            </button>
            <button onClick={sequenceProspects} disabled={state.isLoading} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium border border-white/[0.1] text-slate-300 hover:bg-white/5 disabled:opacity-50">
              <Send className="w-3 h-3" /> Sequence
            </button>
          </div>
        </div>
      )}

      {/* Prospect Intelligence Tab */}
      {!loading && tab === "prospects" && <ProspectIntelligence />}

      {/* Competitive Intelligence Tab */}
      {!loading && tab === "competitive" && <CompetitiveIntel />}
    </div>
  );
});
export default DecisionRow;

function ScoreBar({ value, accent }: { value: number; accent: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return <div className="w-16 h-1.5 rounded-full overflow-hidden bg-white/[0.06]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} /></div>;
}

function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div><div className="text-[10px] text-slate-600">{label}</div><div className="text-sm font-semibold" style={{ color }}>{value}</div></div>;
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.03] text-center">
      <div className="text-lg font-semibold text-slate-200">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function Loading() { return <div className="py-6 text-center text-xs text-slate-600">Loading decision data...</div>; }
function Empty({ message }: { message: string }) { return <div className="py-6 text-center text-xs text-slate-600">{message}</div>; }
function ErrorMessage({ message }: { message: string }) { return <div className="py-4 text-center text-xs text-red-400">{message}</div>; }
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-6 text-center space-y-2">
      <div className="flex justify-center">{icon}</div>
      <p className="text-xs text-slate-600">{text}</p>
    </div>
  );
}
