import { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  Zap,
  MailOpen,
  Reply,
  CalendarCheck,
  ArrowRightLeft,
  Send,
  ListPlus,
  Database,
  Slack,
  CheckSquare,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Play,
  Clock,
  ChevronRight,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType = "new_lead" | "email_opened" | "reply_received" | "meeting_booked" | "deal_moved";
type ActionType = "send_email" | "add_sequence" | "update_crm" | "slack_alert" | "create_task";

interface WorkflowAction {
  id: string;
  type: ActionType;
  config: Record<string, string>;
}

interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TriggerType;
  actions: WorkflowAction[];
  createdAt: string;
}

interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "success" | "error" | "skipped";
  message: string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  workflows: "sw_workflows",
  logs: "sw_workflow_logs",
} as const;

interface TriggerDef {
  type: TriggerType;
  label: string;
  icon: LucideIcon;
  color: string;
}

const TRIGGERS: TriggerDef[] = [
  { type: "new_lead", label: "New Lead", icon: UserPlus, color: "#6366f1" },
  { type: "email_opened", label: "Email Opened", icon: MailOpen, color: "#06b6d4" },
  { type: "reply_received", label: "Reply Received", icon: Reply, color: "#f59e0b" },
  { type: "meeting_booked", label: "Meeting Booked", icon: CalendarCheck, color: "#10b981" },
  { type: "deal_moved", label: "Deal Moved", icon: ArrowRightLeft, color: "#f43f5e" },
];

interface ActionDef {
  type: ActionType;
  label: string;
  icon: LucideIcon;
  color: string;
  defaultConfig: Record<string, string>;
}

const ACTIONS: ActionDef[] = [
  { type: "send_email", label: "Send Email", icon: Send, color: "#6366f1", defaultConfig: { template: "Follow-up", delay: "0" } },
  { type: "add_sequence", label: "Add to Sequence", icon: ListPlus, color: "#06b6d4", defaultConfig: { sequence: "Default", delay: "0" } },
  { type: "update_crm", label: "Update CRM", icon: Database, color: "#f59e0b", defaultConfig: { field: "Status", value: "Nurture" } },
  { type: "slack_alert", label: "Send Slack Alert", icon: Slack, color: "#10b981", defaultConfig: { channel: "#deals", message: "New activity" } },
  { type: "create_task", label: "Create Task", icon: CheckSquare, color: "#f43f5e", defaultConfig: { title: "Follow up", priority: "Medium" } },
];

const TRIGGER_MAP = Object.fromEntries(TRIGGERS.map(t => [t.type, t])) as Record<TriggerType, TriggerDef>;
const ACTION_MAP = Object.fromEntries(ACTIONS.map(a => [a.type, a])) as Record<ActionType, ActionDef>;

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadWorkflows(): WorkflowRule[] {
  try { const s = localStorage.getItem(STORAGE_KEYS.workflows); if (s) return JSON.parse(s) as WorkflowRule[]; } catch { /* silent */ }
  return makeDemoWorkflows();
}

function saveWorkflows(w: WorkflowRule[]) { localStorage.setItem(STORAGE_KEYS.workflows, JSON.stringify(w)); }

function loadLogs(): ExecutionLog[] {
  try { const s = localStorage.getItem(STORAGE_KEYS.logs); if (s) return JSON.parse(s) as ExecutionLog[]; } catch { /* silent */ }
  return makeDemoLogs();
}

function saveLogs(l: ExecutionLog[]) { localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(l)); }

// ─── Demo data ────────────────────────────────────────────────────────────────

function makeDemoWorkflows(): WorkflowRule[] {
  const now = new Date().toISOString();
  return [
    {
      id: `wf-${Date.now()}-1`,
      name: "Auto-Reply to Hot Leads",
      enabled: true,
      trigger: "reply_received",
      actions: [
        { id: "a1", type: "slack_alert", config: { channel: "#hot-leads", message: "Positive reply received!" } },
        { id: "a2", type: "create_task", config: { title: "Respond to hot lead within 2h", priority: "High" } },
      ],
      createdAt: now,
    },
    {
      id: `wf-${Date.now()}-2`,
      name: "New Lead Nurture Sequence",
      enabled: true,
      trigger: "new_lead",
      actions: [
        { id: "a1", type: "add_sequence", config: { sequence: "Welcome Nurture", delay: "5" } },
        { id: "a2", type: "update_crm", config: { field: "Lead Source", value: "Inbound" } },
      ],
      createdAt: now,
    },
    {
      id: `wf-${Date.now()}-3`,
      name: "Meeting Follow-Up",
      enabled: false,
      trigger: "meeting_booked",
      actions: [
        { id: "a1", type: "send_email", config: { template: "Meeting Confirmation", delay: "0" } },
        { id: "a2", type: "create_task", config: { title: "Prepare meeting agenda", priority: "Medium" } },
        { id: "a3", type: "slack_alert", config: { channel: "#meetings", message: "Meeting booked" } },
      ],
      createdAt: now,
    },
  ];
}

function makeDemoLogs(): ExecutionLog[] {
  const now = Date.now();
  return [
    { id: `log-${now}-1`, workflowId: "", workflowName: "Auto-Reply to Hot Leads", status: "success", message: "Slack alert sent to #hot-leads", timestamp: new Date(now - 120000).toISOString() },
    { id: `log-${now}-2`, workflowId: "", workflowName: "Auto-Reply to Hot Leads", status: "success", message: "Task created: Respond to hot lead within 2h", timestamp: new Date(now - 300000).toISOString() },
    { id: `log-${now}-3`, workflowId: "", workflowName: "New Lead Nurture Sequence", status: "success", message: "Added alex@example.com to Welcome Nurture", timestamp: new Date(now - 600000).toISOString() },
    { id: `log-${now}-4`, workflowId: "", workflowName: "Meeting Follow-Up", status: "skipped", message: "Workflow is disabled", timestamp: new Date(now - 900000).toISOString() },
    { id: `log-${now}-5`, workflowId: "", workflowName: "Auto-Reply to Hot Leads", status: "error", message: "Slack API: connection timeout", timestamp: new Date(now - 1800000).toISOString() },
  ];
}

// ─── Components ───────────────────────────────────────────────────────────────

function TriggerBadge({ type }: { type: TriggerType }) {
  const t = TRIGGER_MAP[type];
  const Icon = t.icon;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <Icon className="w-3 h-3" style={{ color: t.color }} />
      <span className="text-[10px] font-medium text-slate-300">{t.label}</span>
    </div>
  );
}

function ActionBadge({ type, index: _index }: { type: ActionType; index: number }) {
  const a = ACTION_MAP[type];
  const Icon = a.icon;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <Icon className="w-3 h-3" style={{ color: a.color }} />
      <span className="text-[10px] font-medium text-slate-300">{a.label}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-1">
      <ChevronRight className="w-3 h-3 text-slate-600 rotate-90" />
    </div>
  );
}

function FlowChain({ rule }: { rule: WorkflowRule }) {
  return (
    <div className="flex flex-col">
      <TriggerBadge type={rule.trigger} />
      <FlowArrow />
      <div className="space-y-1">
        {rule.actions.map((a, i) => (
          <div key={a.id}>
            <ActionBadge type={a.type} index={i + 1} />
            {i < rule.actions.length - 1 && (
              <div className="flex items-center justify-center py-0.5">
                <ChevronRight className="w-2.5 h-2.5 text-slate-700 rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkflowBuilder() {
  const { state } = useApp();
  const { prospectPipeline } = state;
  const totalProspects = prospectPipeline?.totalProspects || 0;

  const [workflows, setWorkflows] = useState<WorkflowRule[]>(loadWorkflows);
  const [logs, setLogs] = useState<ExecutionLog[]>(loadLogs);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState<TriggerType>("new_lead");
  const [selectedActions, setSelectedActions] = useState<ActionType[]>([]);
  const [activeTab, setActiveTab] = useState<"workflows" | "logs">("workflows");

  useEffect(() => { saveWorkflows(workflows); }, [workflows]);
  useEffect(() => { saveLogs(logs); }, [logs]);

  const toggleWorkflow = useCallback((id: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }, []);

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id));
  }, []);

  const addAction = useCallback((type: ActionType) => {
    setSelectedActions(prev => prev.includes(type) ? prev : [...prev, type]);
  }, []);

  const removeAction = useCallback((type: ActionType) => {
    setSelectedActions(prev => prev.filter(a => a !== type));
  }, []);

  const createWorkflow = useCallback(() => {
    if (!newName.trim() || selectedActions.length === 0) return;
    const actions: WorkflowAction[] = selectedActions.map((type, i) => ({
      id: `a-${Date.now()}-${i}`,
      type,
      config: { ...ACTION_MAP[type].defaultConfig },
    }));
    const newWorkflow: WorkflowRule = {
      id: `wf-${Date.now()}`,
      name: newName.trim(),
      enabled: true,
      trigger: newTrigger,
      actions,
      createdAt: new Date().toISOString(),
    };
    setWorkflows(prev => [newWorkflow, ...prev]);
    // Add a log entry
    const log: ExecutionLog = {
      id: `log-${Date.now()}`,
      workflowId: newWorkflow.id,
      workflowName: newWorkflow.name,
      status: "success",
      message: `Workflow created with ${actions.length} action(s)`,
      timestamp: new Date().toISOString(),
    };
    setLogs(prev => [log, ...prev].slice(0, 50));
    setNewName("");
    setSelectedActions([]);
    setShowCreate(false);
  }, [newName, newTrigger, selectedActions]);

  const runWorkflow = useCallback((rule: WorkflowRule) => {
    const results: ExecutionLog[] = rule.actions.map((a, i) => ({
      id: `log-${Date.now()}-${i}`,
      workflowId: rule.id,
      workflowName: rule.name,
      status: Math.random() > 0.15 ? "success" : "error" as "success" | "error",
      message: `${ACTION_MAP[a.type].label}: ${Object.entries(a.config).map(([k, v]) => `${k}=${v}`).join(", ")}`,
      timestamp: new Date().toISOString(),
    }));
    setLogs(prev => [...results, ...prev].slice(0, 50));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-indigo-400" />
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">Workflow Builder</div>
        </div>
        <button
          onClick={() => setShowCreate(p => !p)}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Workflow
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Active</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {workflows.filter(w => w.enabled).length}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total</div>
          <div className="text-lg font-bold text-slate-100 mt-1">{workflows.length}</div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Prospects</div>
          <div className="text-lg font-bold text-sky-400 mt-1">{totalProspects.toLocaleString()}</div>
        </div>
      </div>

      {/* ── Create Workflow Form ── */}
      {showCreate && (
        <div className="p-4 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03] space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">New Workflow</div>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Workflow name"
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
          />
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">When this happens (Trigger)</div>
            <div className="flex flex-wrap gap-1.5">
              {TRIGGERS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.type}
                    onClick={() => setNewTrigger(t.type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      newTrigger === t.type
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" style={{ color: newTrigger === t.type ? t.color : "#64748b" }} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Then do this (Actions)</div>
            <div className="flex flex-wrap gap-1.5">
              {ACTIONS.map(a => {
                const Icon = a.icon;
                const isSelected = selectedActions.includes(a.type);
                return (
                  <button
                    key={a.type}
                    onClick={() => isSelected ? removeAction(a.type) : addAction(a.type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" style={{ color: isSelected ? a.color : "#64748b" }} />
                    {a.label}
                    {isSelected && <CheckSquare className="w-2.5 h-2.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createWorkflow}
              disabled={!newName.trim() || selectedActions.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Workflow
            </button>
            <button
              onClick={() => { setShowCreate(false); setSelectedActions([]); setNewName(""); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab("workflows")}
          className={`text-[10px] px-3 py-1.5 font-medium transition-colors ${activeTab === "workflows" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
        >
          Workflows ({workflows.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`text-[10px] px-3 py-1.5 font-medium transition-colors ${activeTab === "logs" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
        >
          Execution Log ({logs.length})
        </button>
      </div>

      {/* ── Workflows Tab ── */}
      {activeTab === "workflows" && (
        <div className="space-y-3">
          {workflows.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-600">
              No workflows yet. Create your first automation.
            </div>
          )}
          {workflows.map(rule => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-colors ${rule.enabled ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.03] bg-white/[0.01] opacity-60"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-200">{rule.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500">
                    {rule.actions.length} action{rule.actions.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => runWorkflow(rule)}
                    className="p-1.5 rounded-md text-slate-600 hover:text-emerald-400 transition-colors"
                    title="Run now"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => toggleWorkflow(rule.id)}
                    className="p-1.5 rounded-md transition-colors"
                    title={rule.enabled ? "Disable" : "Enable"}
                  >
                    {rule.enabled
                      ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                      : <ToggleLeft className="w-4 h-4 text-slate-600" />
                    }
                  </button>
                  <button
                    onClick={() => deleteWorkflow(rule.id)}
                    className="p-1.5 rounded-md text-slate-600 hover:text-rose-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Visual Flow */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <FlowChain rule={rule} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Execution Log Tab ── */}
      {activeTab === "logs" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-slate-500">
              {logs.filter(l => l.status === "success").length} succeeded,{" "}
              {logs.filter(l => l.status === "error").length} errors,{" "}
              {logs.filter(l => l.status === "skipped").length} skipped
            </div>
            <button
              onClick={clearLogs}
              className="text-[10px] px-2 py-1 rounded-md border border-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {logs.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-600">
                No execution history yet.
              </div>
            )}
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.015]"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  log.status === "success" ? "bg-emerald-400" : log.status === "error" ? "bg-rose-400" : "bg-amber-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-300 font-medium truncate">{log.workflowName}</div>
                  <div className="text-[9px] text-slate-500 truncate">{log.message}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-2.5 h-2.5 text-slate-600" />
                  <span className="text-[9px] text-slate-600">{formatTime(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
