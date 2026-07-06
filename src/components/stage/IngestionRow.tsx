import { useState, useEffect, useCallback } from "react";
import {
  Cable,
  Database,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Unplug,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";

function Empty({ message }: { message: string }) {
  return (
    <div className="p-6 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <p className="text-xs text-slate-600">{message}</p>
    </div>
  );
}

export function IngestionRow() {
  const state = useApp();
  const campaignId = state.getCampaignId();

  const [tab, setTabRaw] = useState<"connectors" | "research" | "findings">(() => {
    try { const s = localStorage.getItem("sw_tab_ingestion"); return (s as any) || "connectors"; } catch { return "connectors"; }
  });
  const setTab = (t: "connectors" | "research" | "findings") => {
    setTabRaw(t);
    try { localStorage.setItem("sw_tab_ingestion", t); } catch { /* silent */ }
  };

  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [connectorList, setConnectorList] = useState<any[]>([]);
  const [researchFindings, setResearchFindings] = useState<any[]>([]);
  const [error, setError] = useState("");

  const loadConnectors = useCallback(async () => {
    setConnectorsLoading(true);
    setError("");
    try {
      const res = await dataService.getConnectorStatuses(false);
      setConnectorList(res || []);
    } catch (e: any) {
      setError(e.message || "Failed to load connectors");
    } finally {
      setConnectorsLoading(false);
    }
  }, []);

  const loadResearch = useCallback(async () => {
    setResearchLoading(true);
    try {
      const data = await dataService.getState();
      setResearchFindings((data as any)?.researchRecords || []);
    } catch { /* silent */ }
    setResearchLoading(false);
  }, []);

  useEffect(() => {
    loadConnectors();
    loadResearch();
    // NOTE: intentionally NOT depending on state.lastRefresh — prevents blinking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-1" role="tablist">
        {[
          { key: "connectors" as const, label: "Connectors", icon: Cable },
          { key: "research" as const, label: "Research", icon: Sparkles },
          { key: "findings" as const, label: "Findings", icon: Database },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            role="tab"
            aria-selected={tab === t.key}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={
              tab === t.key
                ? { background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }
                : { color: "#475569" }
            }
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] text-red-400">
          {error}
        </div>
      )}

      {tab === "connectors" && (
        <div>
          {connectorsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading connectors...
            </div>
          ) : connectorList.length === 0 ? (
            <Empty message="No connectors configured" />
          ) : (
            <div className="space-y-2">
              {connectorList.map((c: any) => (
                <div
                  key={c.connector}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.06] bg-[#0f172a]"
                >
                  <div className="flex items-center gap-2">
                    <Cable className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-200">
                      {c.connector}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          c.mode === "live" || c.mode === "ready"
                            ? "rgba(16,185,129,0.1)"
                            : c.mode === "dry-run"
                              ? "rgba(245,158,11,0.1)"
                              : "rgba(244,63,94,0.1)",
                        color:
                          c.mode === "live" || c.mode === "ready"
                            ? "#34d399"
                            : c.mode === "dry-run"
                              ? "#fbbf24"
                              : "#fb7185",
                      }}
                    >
                      {c.mode}
                    </span>
                    {c.configured ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "research" && (
        <div>
          {researchLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading research...
            </div>
          ) : (
            <Empty message="Research data appears here when agents complete research tasks" />
          )}
        </div>
      )}

      {tab === "findings" && (
        <div>
          {researchFindings?.length === 0 ? (
            <Empty message="No research findings yet" />
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {researchFindings?.map((f: any, i: number) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg border border-white/[0.06] bg-[#0f172a]"
                >
                  <div className="text-xs font-medium text-slate-200">
                    {f.title || f.topic || `Finding #${i + 1}`}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {f.summary || f.content || "No summary"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
