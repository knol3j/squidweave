import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Search, Shield, CheckCircle, XCircle, Mail, Lock, Cable, Unplug, Users, BarChart3, Workflow, CalendarClock, TrendingUp, FileText, LayoutDashboard, Facebook, Search as SearchIcon, Twitter, MessageSquare, Linkedin, Phone, Mail as MailIcon, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";
import {
  testLMStudioConnection, chatWithLMStudio,
  setLMStudioConfig, loadLMStudioConfig, getLMStudioConfig,
  type LMStudioConfig,
} from "@/services/dataService";
import { Cpu, Send } from "lucide-react";
import CRMPipeline from "@/components/funnel/CRMPipeline";
import AnalyticsCommand from "@/components/funnel/AnalyticsCommand";
import WorkflowBuilder from "@/components/funnel/WorkflowBuilder";
import MeetingScheduler from "@/components/funnel/MeetingScheduler";
import RevenueAttribution from "@/components/funnel/RevenueAttribution";
import CustomReports from "@/components/funnel/CustomReports";
import AdCampaignManager from "@/components/funnel/AdCampaignManager";
import MetaAdsManager from "@/components/funnel/MetaAdsManager";
import GoogleAdsManager from "@/components/funnel/GoogleAdsManager";
import TwitterAdsManager from "@/components/funnel/TwitterAdsManager";
import RedditAdsManager from "@/components/funnel/RedditAdsManager";
import LinkedInAdsManager from "@/components/funnel/LinkedInAdsManager";
import ColdOutreachManager from "@/components/funnel/ColdOutreachManager";
import NewsletterManager from "@/components/funnel/NewsletterManager";
import AutonomousOutreach from "@/components/funnel/AutonomousOutreach";

export default function OutreachRow() {
  const { state, toggleApproval, updateConnector } = useApp();
  const { campaign, approvals } = state;
  const campaignId = campaign?.id || "";
  type OutreachTab = "autonomous" | "campaigns" | "meta" | "google" | "twitter" | "reddit" | "linkedin" | "cold" | "newsletter" | "timeline" | "dlq" | "safety" | "gates" | "connectors" | "crm" | "analytics" | "workflows" | "meetings" | "revenue" | "reports";
  const [tab, setTabRaw] = useState<OutreachTab>(() => {
    try { const s = localStorage.getItem("sw_tab_outreach"); return (s as any) || "campaigns"; } catch { return "campaigns"; }
  });
  const setTab = (t: OutreachTab) => {
    setTabRaw(t);
    try { localStorage.setItem("sw_tab_outreach", t); } catch { /* silent */ }
  };
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

  // Only re-fetch when campaignId actually changes — NOT on every poll refresh
  // This prevents the UI from resetting while the user is working
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
  }, [campaignId]); // ← intentionally NOT state.lastRefresh

  const checkDedupe = async () => {
    if (!dedupeKey.trim()) return;
    try { const r = await dataService.dedupeCheck(dedupeKey); setDedupeResult(r); }
    catch (e: any) { setDedupeResult({ error: e.message }); }
  };

  if (!campaignId) return <Empty message="Select a campaign first" />;
  // Don't unmount children for loading — show inline spinner instead

  const tabs = [
    { key: "autonomous" as const, label: "Investor Outreach", icon: Sparkles },
    { key: "campaigns" as const, label: "All Campaigns", icon: LayoutDashboard },
    { key: "meta" as const, label: "Meta", icon: Facebook },
    { key: "google" as const, label: "Google", icon: SearchIcon },
    { key: "twitter" as const, label: "Twitter", icon: Twitter },
    { key: "reddit" as const, label: "Reddit", icon: MessageSquare },
    { key: "linkedin" as const, label: "LinkedIn", icon: Linkedin },
    { key: "cold" as const, label: "Cold Outreach", icon: Phone },
    { key: "newsletter" as const, label: "Newsletter", icon: MailIcon },
    { key: "timeline" as const, label: `Timeline (${outreach.length})` },
    { key: "dlq" as const, label: `DLQ (${dlq?.entries?.length || 0})` },
    { key: "safety" as const, label: `Safety (${safety.filter((r: any) => r.status === "pending").length})` },
    { key: "connectors" as const, label: `Connectors (${state.connectorStatuses.length})` },
    { key: "gates" as const, label: "Send Gates" },
    { key: "crm" as const, label: "CRM", icon: Users },
    { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { key: "workflows" as const, label: "Workflows", icon: Workflow },
    { key: "meetings" as const, label: "Meetings", icon: CalendarClock },
    { key: "revenue" as const, label: "Revenue", icon: TrendingUp },
    { key: "reports" as const, label: "Reports", icon: FileText },
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
        {tabs.map(t => {
          const Icon = (t as any).icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
              style={tab === t.key ? { background: "rgba(16,185,129,0.12)", color: "#34d399" } : { color: "#475569" }}>
              {Icon && <Icon className="w-3 h-3" />}{t.label}
            </button>
          );
        })}
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
          {/* LM Studio Connector */}
          <LMStudioConnector />
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

      {/* CRM Pipeline Tab */}
      {tab === "crm" && <CRMPipeline />}

      {/* Analytics Command Tab */}
      {tab === "analytics" && <AnalyticsCommand />}

      {/* Workflow Builder Tab */}
      {tab === "workflows" && <WorkflowBuilder />}

      {/* Meeting Scheduler Tab */}
      {tab === "meetings" && <MeetingScheduler />}

      {/* Revenue Attribution Tab */}
      {tab === "revenue" && <RevenueAttribution />}

      {/* Custom Reports Tab */}
      {tab === "reports" && <CustomReports />}

      {/* ─── AUTONOMOUS INVESTOR OUTREACH ─── */}
      {tab === "autonomous" && <AutonomousOutreach />}

      {/* ─── ADVERTISING PLATFORMS ─── */}
      {tab === "campaigns" && <AdCampaignManager />}
      {tab === "meta" && <MetaAdsManager />}
      {tab === "google" && <GoogleAdsManager />}
      {tab === "twitter" && <TwitterAdsManager />}
      {tab === "reddit" && <RedditAdsManager />}
      {tab === "linkedin" && <LinkedInAdsManager />}
      {tab === "cold" && <ColdOutreachManager />}
      {tab === "newsletter" && <NewsletterManager />}
    </div>
  );
}

/** LM Studio connector panel — configure, test, and chat with local LLM */
function LMStudioConnector() {
  const [cfg, setCfg] = useState<LMStudioConfig>(loadLMStudioConfig);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleTest = async () => {
    setTestStatus("testing");
    setTestError("");
    const result = await testLMStudioConnection(cfg);
    if (result.ok) {
      setTestStatus("ok");
      setModels(result.models || []);
    } else {
      setTestStatus("error");
      setTestError(result.error || "Connection failed");
    }
  };

  const handleSave = () => {
    setLMStudioConfig(cfg);
  };

  const handleChat = async () => {
    if (!chatMsg.trim()) return;
    const msgs = [...chatHistory, { role: "user", content: chatMsg }];
    setChatHistory(msgs);
    setChatMsg("");
    setChatLoading(true);
    const result = await chatWithLMStudio(msgs);
    if (result.ok && result.content) {
      setChatHistory(prev => [...prev, { role: "assistant", content: result.content || "" }]);
    } else {
      setChatHistory(prev => [...prev, { role: "assistant", content: `Error: ${result.error || "Unknown error"}` }]);
    }
    setChatLoading(false);
  };

  return (
    <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.03]">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold text-slate-200">LM Studio (Local LLM)</span>
        {testStatus === "ok" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Connected</span>}
        {testStatus === "testing" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 animate-pulse">Testing...</span>}
        {testStatus === "error" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">Failed</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <input value={cfg.baseUrl} onChange={e => setCfg(c => ({ ...c, baseUrl: e.target.value }))}
          placeholder="http://192.168.4.116:1234"
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-violet-500" />
        <input value={cfg.apiKey} onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))}
          type="password" placeholder="API Key"
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-violet-500" />
        <input value={cfg.model} onChange={e => setCfg(c => ({ ...c, model: e.target.value }))}
          placeholder="Model name"
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-violet-500 sm:col-span-2" />
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={handleTest} disabled={testStatus === "testing"}
          className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15 disabled:opacity-50 transition-colors">
          {testStatus === "testing" ? "Testing..." : "Test Connection"}
        </button>
        <button onClick={handleSave}
          className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 transition-colors">
          Save Config
        </button>
      </div>

      {testError && <div className="text-[10px] text-rose-400 mb-2 p-2 rounded bg-rose-500/5 border border-rose-500/10">{testError}</div>}

      {models.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-slate-500 mb-1">Available Models:</div>
          <div className="flex flex-wrap gap-1">
            {models.map(m => (
              <span key={m} onClick={() => setCfg(c => ({ ...c, model: m }))}
                className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${cfg.model === m ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]"}`}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mini Chat */}
      <div className="border border-white/[0.06] rounded-lg bg-[#0f172a]">
        <div className="h-32 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {chatHistory.length === 0 && (
            <div className="text-[10px] text-slate-600 text-center py-4">Send a message to chat with your local model</div>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} className={`text-[11px] p-1.5 rounded ${m.role === "user" ? "bg-violet-500/10 text-violet-200 ml-4" : "bg-white/[0.04] text-slate-300 mr-4"}`}>
              <span className="font-medium text-[9px] uppercase tracking-wider opacity-60">{m.role}</span>
              <div className="whitespace-pre-wrap mt-0.5">{m.content}</div>
            </div>
          ))}
          {chatLoading && <div className="text-[10px] text-slate-500 animate-pulse">Thinking...</div>}
        </div>
        <div className="flex gap-1 p-1.5 border-t border-white/[0.06]">
          <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
            placeholder="Ask your local model..."
            disabled={chatLoading}
            className="flex-1 text-[11px] px-2 py-1 rounded bg-white/[0.04] text-slate-100 outline-none focus:bg-white/[0.08] placeholder:text-slate-600 disabled:opacity-50" />
          <button onClick={handleChat} disabled={chatLoading || !chatMsg.trim()}
            className="p-1 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-30 transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
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
