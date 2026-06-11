import { useState, useEffect } from "react";
import { Plug, Database, Wifi, WifiOff, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";

export default function IngestionRow() {
  const { state } = useApp();
  const { campaign, businessProfile } = state;
  const campaignId = campaign?.id || "";
  const [tab, setTab] = useState<"connectors" | "research" | "findings">("connectors");
  const [connectors, setConnectors] = useState<any[]>([]);
  const [research, setResearch] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    Promise.allSettled([
      dataService.getConnectorStatuses(),
      dataService.getResearchRecords(campaignId),
      dataService.getAnalyticsEvents(campaignId),
      dataService.getOutreachEvents(campaignId),
    ]).then(([c, r, a, o]) => {
      if (c.status === "fulfilled") setConnectors(c.value);
      if (r.status === "fulfilled") setResearch(r.value);
      if (a.status === "fulfilled") setAnalytics(a.value);
      if (o.status === "fulfilled") setOutreach(o.value);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [campaignId]); // ← only re-fetch when campaign changes, NOT on every poll

  if (!campaignId) return <Empty message="Select a campaign first" />;
  // Show inline loading — don't unmount children
  if (error) return <ErrorMessage message={error} />;

  const tabs = [
    { key: "connectors" as const, label: `Connectors (${connectors.length})`, icon: Plug },
    { key: "research" as const, label: `Data (${research.length + analytics.length + outreach.length})`, icon: Database },
    { key: "findings" as const, label: "Agent Findings", icon: CheckCircle },
  ];

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={tab === t.key ? { background: "rgba(6,182,212,0.12)", color: "#22d3ee" } : { color: "#475569" }}>
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {tab === "connectors" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {connectors.length === 0 && <Empty message="No connectors configured" />}
          {connectors.map((c: any) => (
            <div key={c.connector} className="p-3 rounded-xl border border-white/[0.06] bg-[#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold capitalize text-slate-100">{c.connector}</span>
                <span className={`flex items-center gap-1 text-[10px] ${c.reachable ? "text-emerald-400" : "text-red-400"}`}>
                  {c.reachable ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {c.reachable ? "Reachable" : "Unreachable"}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-slate-600">
                <div>Mode: <span className="text-slate-400">{c.mode || (c.dryRun ? "dry-run" : "live")}</span></div>
                <div>URL: <span className="text-slate-400">{c.baseUrl || "\u2014"}</span></div>
                <div>Token: <span className={c.tokenConfigured ? "text-emerald-400" : "text-red-400"}>{c.tokenConfigured ? "Configured" : "Missing"}</span></div>
                {c.error && <div className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{c.error}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "research" && (
        <div className="space-y-3">
          <DataTable data={research} columns={[
            { key: "company", label: "Company" }, { key: "segment", label: "Segment" }, { key: "region", label: "Region" },
            { key: "fitScore", label: "Fit", render: (v: number) => <ScoreDot value={v} color="#6366f1" /> },
            { key: "intentScore", label: "Intent", render: (v: number) => <ScoreDot value={v} color="#06b6d4" /> },
          ]} />
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded bg-[#0f172a] text-center"><div className="text-lg font-semibold text-cyan-400">{analytics.length}</div><div className="text-slate-600">Analytics Events</div></div>
            <div className="p-2 rounded bg-[#0f172a] text-center"><div className="text-lg font-semibold text-cyan-400">{outreach.length}</div><div className="text-slate-600">Outreach Events</div></div>
          </div>
        </div>
      )}

      {tab === "findings" && (
        <div>
          {businessProfile.researchStatus === "idle" && (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-600">No research run yet.</p>
              <p className="text-[10px] text-slate-700 mt-1">Go to Stage 1 (Setup) and click "Run Agent Research"</p>
            </div>
          )}
          {businessProfile.researchStatus === "researching" && (
            <div className="py-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
              <p className="text-xs text-cyan-400 mt-2">Agents are researching your business...</p>
            </div>
          )}
          {businessProfile.researchStatus === "completed" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04]">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Research Complete</span>
                </div>
                <div className="space-y-2">
                  {businessProfile.researchFindings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <span className="text-emerald-500/50 mt-0.5">\u2713</span>
                      <span className="text-slate-400">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              {businessProfile.productDescription && (
                <div className="p-3 rounded-xl border border-white/[0.06] bg-[#0f172a]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Product/Service</div>
                  <div className="text-xs text-slate-300">{businessProfile.productDescription}</div>
                </div>
              )}
              {businessProfile.targetCustomer && (
                <div className="p-3 rounded-xl border border-white/[0.06] bg-[#0f172a]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Target Customer</div>
                  <div className="text-xs text-slate-300">{businessProfile.targetCustomer}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreDot({ value, color }: { value: number; color: string }) {
  if (value == null) return <span className="text-slate-600">\u2014</span>;
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: value / 100 + 0.2 }} />
      <span className="text-slate-400">{value}</span>
    </span>
  );
}

function DataTable({ data, columns }: { data: any[]; columns: { key: string; label: string; render?: (v: any) => React.ReactNode }[] }) {
  if (data.length === 0) return <Empty message="No records found" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead><tr className="border-b border-white/[0.06]">
          {columns.map(c => <th key={c.key} className="text-left py-1.5 px-2 font-medium text-slate-600">{c.label}</th>)}
        </tr></thead>
        <tbody>
          {data.slice(0, 50).map((row, i) => (
            <tr key={row.id || i} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.03]">
              {columns.map(c => (
                <td key={c.key} className="py-1.5 px-2 text-slate-400">{c.render ? c.render(row[c.key]) : (row[c.key] ?? "\u2014")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 50 && <div className="text-[10px] py-1 text-center text-slate-600">+ {data.length - 50} more</div>}
    </div>
  );
}

function Loading() { return <div className="py-6 text-center text-xs text-slate-600">Loading ingestion data...</div>; }
function Empty({ message }: { message: string }) { return <div className="py-6 text-center text-xs text-slate-600">{message}</div>; }
function ErrorMessage({ message }: { message: string }) { return <div className="py-4 text-center text-xs text-red-400">{message}</div>; }
