import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Search, Shield, CheckCircle, XCircle, Mail, Lock, Cable, Unplug } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";

export default function OutreachRow() {
  const { state, toggleApproval, updateConnector } = useApp();
  const { campaign, approvals } = state;
  const campaignId = campaign?.id || "";
  const [tab, setTab] = useState<"timeline" | "dlq" | "safety" | "gates" | "connectors">("timeline");
  const [outreach, setOutreach] = useState<any[]>([]);
  const [dlq, setDlq] = useState<any>(null);
  const [safety, setSafety] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dedupeKey, setDedupeKey] = useState("");
  const [dedupeResult, setDedupeResult] = useState<any>(null);
  const [savingConnector, setSavingConnector] = useState<string | null>(null);
  const [connectorDrafts, setConnectorDrafts] = useState<Record<string, { baseUrl: string; token: string }>>({});

  const handleUpdateConnector = async (connector: string) => {
    const draft = connectorDrafts[connector];
    if (!draft?.baseUrl || !draft?.token) return;
    setSavingConnector(connector);
    try { await updateConnector(connector, draft.baseUrl, draft.token); }
    catch (e) { console.error(e); }
    setSavingConnector(null);
  };

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    Promise.allSettled([
      dataService.getOutreachEvents(campaignId),
      dataService.getDlq(campaignId),
      dataService.getSafetyExecutions(campaignId),
    ]).then(([o, d, s]) => {
      if (o.status === "fulfilled") setOutreach(o.value);
      if (d.status === "fulfilled") setDlq(d.value);
      if (s.status === "fulfilled") setSafety(s.value);
      setLoading(false);
    });
  }, [campaignId, state.lastRefresh]);

  const checkDedupe = async () => {
    if (!dedupeKey.trim()) return;
    try { const r = await dataService.dedupeCheck(dedupeKey); setDedupeResult(r); }
    catch (e: any) { setDedupeResult({ error: e.message }); }
  };

  if (!campaignId) return <Empty message="Select a campaign first" />;
  if (loading) return <Loading />;

  const tabs = [
    { key: "timeline" as const, label: `Timeline (${outreach.length})` },
    { key: "dlq" as const, label: `DLQ (${dlq?.entries?.length || 0})` },
    { key: "safety" as const, label: `Safety (${safety.filter((r: any) => r.status === "pending").length})` },
    { key: "connectors" as const, label: `Connectors (${state.connectorStatuses.length})` },
    { key: "gates" as const, label: "Send Gates" },
  ];

  const typeColor: Record<string, string> = {
    sent: "#3b82f6", open: "#10b981", click: "#f59e0b", reply: "#8b5cf6",
    positive_reply: "#10b981", meeting_booked: "#10b981", unsubscribe: "#f43f5e", bounce: "#ef4444",
  };

  const canSend = approvals.contentApproved && approvals.emailSendingEnabled && approvals.safetyAcknowledged;

  return (
    <div className="space-y-3 pt-3">
      {/* Master Send Status Banner */}
      <div className={`p-3 rounded-xl border transition-all ${canSend ? "border-emerald-500/20" : "border-amber-500/20"}`}
        style={{ background: canSend ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)" }}>
        <div className="flex items-center gap-2">
          {canSend ? <Shield className="w-4 h-4 text-emerald-400 shrink-0" /> : <Lock className="w-4 h-4 text-amber-400 shrink-0" />}
          <div className="flex-1">
            <div className={`text-xs font-medium ${canSend ? "text-emerald-400" : "text-amber-400"}`}>
              {canSend ? "Outreach is ENABLED" : "Outreach is BLOCKED"}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {canSend
                ? "All safety gates are open. Emails will be sent."
                : "Open all send gates below before outreach can begin."}
            </div>
          </div>
        </div>
        {/* Gate indicators */}
        <div className="flex gap-2 mt-2">
          {[
            { label: "Content", ok: approvals.contentApproved, color: "#f43f5e" },
            { label: "Email", ok: approvals.emailSendingEnabled, color: "#10b981" },
            { label: "Safety", ok: approvals.safetyAcknowledged, color: "#8b5cf6" },
          ].map(g => (
            <div key={g.label} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded"
              style={{ background: g.ok ? `${g.color}18` : "rgba(255,255,255,0.04)", color: g.ok ? g.color : "#475569" }}>
              {g.ok ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
              {g.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={tab === t.key ? { background: "rgba(16,185,129,0.12)", color: "#34d399" } : { color: "#475569" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "timeline" && outreach.length === 0 && <Empty message="No outreach events yet" />}
      {tab === "timeline" && outreach.length > 0 && (
        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
          {outreach.slice(0, 50).map((e: any, i: number) => (
            <div key={e.id || i} className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-white/[0.02]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor[e.type] || "#475569" }} />
              <span className="text-[10px] font-medium min-w-[60px] capitalize" style={{ color: typeColor[e.type] || "#94a3b8" }}>{e.type}</span>
              <span className="text-[10px] flex-1 truncate text-slate-400">{e.targetId}</span>
              <span className="text-[10px] shrink-0 text-slate-600">{e.channel}</span>
              <span className="text-[10px] shrink-0 text-slate-700">{new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "dlq" && (
        <div>
          {(!dlq?.entries || dlq.entries.length === 0) ? <Empty message="Dead letter queue is empty" /> : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
              {dlq.entries.map((e: any) => (
                <div key={e.id} className="p-2.5 rounded-lg border border-red-500/15 bg-[#0f172a]">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-400"><AlertTriangle className="w-3 h-3" />{e.error || "Failed"}</div>
                  <div className="text-[10px] mt-1 text-slate-600">Target: <span className="text-slate-400">{e.target}</span> &middot; {new Date(e.failedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "safety" && (
        <div>
          {safety.length === 0 ? <Empty message="No execution receipts" /> : (
            <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-white/[0.06]">
                  <th className="text-left py-1.5 px-2 font-medium text-slate-600">Action</th>
                  <th className="text-left py-1.5 px-2 font-medium text-slate-600">Status</th>
                  <th className="text-left py-1.5 px-2 font-medium text-slate-600">Time</th>
                </tr></thead>
                <tbody>
                  {safety.slice(0, 30).map((r: any) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] border-b border-white/[0.03]">
                      <td className="py-1.5 px-2 text-slate-100">{r.action || r.executionType || "\u2014"}</td>
                      <td className="py-1.5 px-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: r.status === "completed" ? "rgba(16,185,129,0.1)" : r.status === "pending" ? "rgba(245,158,11,0.1)" : "rgba(244,63,94,0.1)",
                                   color: r.status === "completed" ? "#34d399" : r.status === "pending" ? "#fbbf24" : "#fb7185" }}>{r.status}</span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-600">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Connectors Tab */}
      {tab === "connectors" && (
        <div className="space-y-4">
          {state.connectorStatuses.length === 0 ? (
            <EmptyState icon={<Unplug className="w-8 h-8 text-slate-600" />} text="No connector rails discovered." />
          ) : (
            state.connectorStatuses.map((status: any) => (
              <div key={status.connector} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cable className="w-3 h-3 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-200">{status.connector}</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    status.mode === 'live' || status.mode === 'ready' ? 'text-emerald-400' :
                    status.mode === 'dry-run' ? 'text-amber-400' :
                    status.mode === 'auth-error' ? 'text-rose-400' : 'text-slate-400'
                  }`}>{status.mode}</span>
                </div>
                <div className="text-[10px] text-slate-500 mb-2">{status.configured ? status.baseUrl || 'Configured' : 'Missing base URL or token'}</div>
                {status.tokenLikelyRotated && <div className="text-[10px] text-rose-500 mb-2">Token rejected. Replace it below.</div>}
                {status.error && <div className="text-[10px] text-rose-500 mb-2">{status.error}</div>}
                <div className="space-y-2">
                  <input value={connectorDrafts[status.connector]?.baseUrl || ''}
                    onChange={e => setConnectorDrafts(prev => ({...prev, [status.connector]: {...(prev[status.connector]||{}), baseUrl: e.target.value}}))}
                    placeholder={`${status.connector} base URL`}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-violet-500" />
                  <input type="password" value={connectorDrafts[status.connector]?.token || ''}
                    onChange={e => setConnectorDrafts(prev => ({...prev, [status.connector]: {...(prev[status.connector]||{}), token: e.target.value}}))}
                    placeholder={`New ${status.connector} token`}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-violet-500" />
                  <button onClick={() => handleUpdateConnector(status.connector)}
                    disabled={savingConnector === status.connector}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15 disabled:opacity-50">
                    {savingConnector === status.connector ? 'Saving...' : `Update ${status.connector}`}
                  </button>
                </div>
              </div>
            ))
          )}
          {state.openClawDiagnostics.some((item: any) => !item.ready) && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
              {state.openClawDiagnostics.filter((item: any) => !item.ready).map((item: any) => (
                <div key={item.connector} className="text-xs text-amber-300">
                  <div className="font-semibold">{item.connector}: {item.summary}</div>
                  {item.recommendations?.[0] && <div className="mt-1 text-[10px]">{item.recommendations[0]}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send Gates Tab */}
      {tab === "gates" && (
        <div className="space-y-3">
          {/* Email Sending Master Toggle */}
          <GateToggle
            icon={<Mail className="w-4 h-4" />}
            label="Enable Email Sending"
            description="Allow the system to send outreach emails to targets. You must explicitly enable this."
            checked={approvals.emailSendingEnabled}
            onToggle={() => toggleApproval("emailSendingEnabled")}
            accent="#10b981"
          />

          {/* Safety Acknowledgment Toggle */}
          <GateToggle
            icon={<Shield className="w-4 h-4" />}
            label="Acknowledge Safety Checks"
            description="I understand and accept the safety controls (DRY_RUN, dedupe, rate limiting, approval gates)."
            checked={approvals.safetyAcknowledged}
            onToggle={() => toggleApproval("safetyAcknowledged")}
            accent="#8b5cf6"
          />

          {/* Content Approval Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#0a121f]">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${approvals.contentApproved ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
              {approvals.contentApproved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-200">Content Approval</div>
              <div className="text-[10px] text-slate-600">
                {approvals.contentApproved
                  ? `${approvals.approvedVariantIds.length} variants approved in Stage 3`
                  : "Approve content variants in Content Studio (Stage 3) first"}
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${approvals.contentApproved ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"}`}>
              {approvals.contentApproved ? "OPEN" : "CLOSED"}
            </span>
          </div>

          {/* Dedupe Checker */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Dedupe Check</div>
            <div className="flex gap-2">
              <input value={dedupeKey} onChange={e => setDedupeKey(e.target.value)} placeholder="Enter idempotency key..."
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500" />
              <button onClick={checkDedupe} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-500 text-white">
                <Search className="w-3 h-3 inline" /> Check
              </button>
            </div>
            {dedupeResult && (
              <div className="mt-2 p-2.5 rounded-lg border border-white/[0.06] bg-[#0f172a] text-xs">
                {dedupeResult.exists ? (
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300">Exists</span>
                    <span className="text-slate-400">{dedupeResult.receiptId}</span>
                  </div>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">Not found \u2014 safe to execute</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GateToggle({ icon, label, description, checked, onToggle, accent }: {
  icon: React.ReactNode; label: string; description: string; checked: boolean; onToggle: () => void; accent: string;
}) {
  return (
    <motion.div layout className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${checked ? "" : ""}`}
      style={{ background: checked ? `${accent}08` : "#0a121f", borderColor: checked ? `${accent}30` : "rgba(255,255,255,0.06)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: checked ? `${accent}20` : "rgba(255,255,255,0.04)", color: checked ? accent : "#475569" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-200">{label}</div>
        <div className="text-[10px] text-slate-600 mt-0.5">{description}</div>
      </div>
      <button onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${checked ? "" : ""}`}
        style={{ background: checked ? accent : "rgba(255,255,255,0.1)" }}>
        <motion.div layout className="w-5 h-5 rounded-full absolute top-0.5"
          animate={{ left: checked ? "22px" : "2px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ background: checked ? "#fff" : "#475569" }} />
      </button>
    </motion.div>
  );
}

function Loading() { return <div className="py-6 text-center text-xs text-slate-600">Loading outreach data...</div>; }
function Empty({ message }: { message: string }) { return <div className="py-6 text-center text-xs text-slate-600">{message}</div>; }
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-6 flex flex-col items-center gap-2 text-center">
      {icon}
      <span className="text-xs text-slate-600">{text}</span>
    </div>
  );
}
