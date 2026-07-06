import { useState, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Save,
  Trash2,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings,
  Zap,
  Mail,
  Clock,
  Filter,
  Users,
  Tag,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Download,
  Upload,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type NodeType =
  | "trigger"
  | "delay"
  | "email"
  | "filter"
  | "tag"
  | "webhook"
  | "split"
  | "end";

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, string>;
  x: number;
  y: number;
  enabled: boolean;
}

interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  lastRun?: string;
  runCount: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const NODE_TYPES: { type: NodeType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  { type: "delay", label: "Delay", icon: Clock, color: "text-sky-400", bg: "bg-sky-500/10" },
  { type: "email", label: "Email", icon: Mail, color: "text-violet-400", bg: "bg-violet-500/10" },
  { type: "filter", label: "Filter", icon: Filter, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { type: "tag", label: "Tag", icon: Tag, color: "text-rose-400", bg: "bg-rose-500/10" },
  { type: "webhook", label: "Webhook", icon: Upload, color: "text-orange-400", bg: "bg-orange-500/10" },
  { type: "split", label: "Split", icon: Users, color: "text-teal-400", bg: "bg-teal-500/10" },
  { type: "end", label: "End", icon: CheckCircle2, color: "text-slate-400", bg: "bg-slate-500/10" },
];

const STORAGE_KEY = "sw_workflows_v2";

function loadWorkflows(): Workflow[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch { /* silent */ }
  return [];
}

function saveWorkflows(wf: Workflow[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(wf)); } catch { /* silent */ }
}

let nextId = 1;
function genId(prefix: string) { return `${prefix}-${Date.now()}-${nextId++}`; }

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export default function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<Workflow[]>(loadWorkflows);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) || null;
  const selectedNode = activeWorkflow?.nodes.find((n) => n.id === selectedNodeId) || null;

  /* CRUD */
  const createWorkflow = useCallback(() => {
    if (!newName.trim()) return;
    const wf: Workflow = {
      id: genId("wf"),
      name: newName.trim(),
      description: newDesc.trim(),
      nodes: [],
      edges: [],
      isActive: false,
      runCount: 0,
    };
    setWorkflows((prev) => { const next = [...prev, wf]; saveWorkflows(next); return next; });
    setActiveWorkflowId(wf.id);
    setNewName("");
    setNewDesc("");
    setShowNewForm(false);
  }, [newName, newDesc]);

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows((prev) => { const next = prev.filter((w) => w.id !== id); saveWorkflows(next); return next; });
    if (activeWorkflowId === id) setActiveWorkflowId(null);
  }, [activeWorkflowId]);

  const toggleWorkflow = useCallback((id: string) => {
    setWorkflows((prev) => {
      const next = prev.map((w) => w.id === id ? { ...w, isActive: !w.isActive, lastRun: w.isActive ? w.lastRun : new Date().toISOString() } : w);
      saveWorkflows(next);
      return next;
    });
  }, []);

  const duplicateWorkflow = useCallback((wf: Workflow) => {
    const copy: Workflow = {
      ...wf,
      id: genId("wf"),
      name: `${wf.name} (Copy)`,
      isActive: false,
      runCount: 0,
      nodes: wf.nodes.map((n) => ({ ...n, id: genId("node") })),
      edges: [],
    };
    setWorkflows((prev) => { const next = [...prev, copy]; saveWorkflows(next); return next; });
    setActiveWorkflowId(copy.id);
  }, []);

  /* Node operations */
  const addNode = useCallback((type: NodeType, x: number, y: number) => {
    if (!activeWorkflowId) return;
    const def = NODE_TYPES.find((n) => n.type === type)!;
    const node: WorkflowNode = {
      id: genId("node"),
      type,
      label: def.label,
      config: {},
      x,
      y,
      enabled: true,
    };
    setWorkflows((prev) => {
      const next = prev.map((w) => w.id === activeWorkflowId ? { ...w, nodes: [...w.nodes, node] } : w);
      saveWorkflows(next);
      return next;
    });
    setShowPalette(false);
  }, [activeWorkflowId]);

  const removeNode = useCallback((nodeId: string) => {
    if (!activeWorkflowId) return;
    setWorkflows((prev) => {
      const next = prev.map((w) =>
        w.id === activeWorkflowId
          ? { ...w, nodes: w.nodes.filter((n) => n.id !== nodeId), edges: w.edges.filter((e) => e.from !== nodeId && e.to !== nodeId) }
          : w
      );
      saveWorkflows(next);
      return next;
    });
    setSelectedNodeId(null);
  }, [activeWorkflowId]);

  const updateNodeConfig = useCallback((nodeId: string, key: string, value: string) => {
    if (!activeWorkflowId) return;
    setWorkflows((prev) => {
      const next = prev.map((w) =>
        w.id === activeWorkflowId
          ? { ...w, nodes: w.nodes.map((n) => n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n) }
          : w
      );
      saveWorkflows(next);
      return next;
    });
  }, [activeWorkflowId]);

  const toggleNode = useCallback((nodeId: string) => {
    if (!activeWorkflowId) return;
    setWorkflows((prev) => {
      const next = prev.map((w) =>
        w.id === activeWorkflowId
          ? { ...w, nodes: w.nodes.map((n) => n.id === nodeId ? { ...n, enabled: !n.enabled } : n) }
          : w
      );
      saveWorkflows(next);
      return next;
    });
  }, [activeWorkflowId]);

  /* Canvas click */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current || !activeWorkflowId) return;
      if (showPalette) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setShowPalette(true);
        setShowPalette(false);
        return;
      }
      if (e.target === canvasRef.current) {
        setSelectedNodeId(null);
      }
    },
    [activeWorkflowId, showPalette]
  );

  const handleCanvasDblClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current || !activeWorkflowId) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setShowPalette(true);
    },
    [activeWorkflowId]
  );

  const exportWorkflow = useCallback(() => {
    if (!activeWorkflow) return;
    const blob = new Blob([JSON.stringify(activeWorkflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeWorkflow.name.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeWorkflow]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Workflow Builder</h2>
            <p className="text-[11px] text-slate-500">
              {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
              {activeWorkflow && ` &middot; ${activeWorkflow.nodes.length} nodes`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeWorkflow && (
            <>
              <button
                onClick={() => toggleWorkflow(activeWorkflow.id)}
                className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeWorkflow.isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25"
                    : "bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-slate-200"
                }`}
              >
                {activeWorkflow.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {activeWorkflow.isActive ? "Running" : "Start"}
              </button>
              <button
                onClick={exportWorkflow}
                className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </>
          )}
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-400 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Workflow
          </button>
        </div>
      </div>

      {/* New Workflow Form */}
      {showNewForm && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">Create New Workflow</h3>
            <button onClick={() => setShowNewForm(false)} className="p-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workflow name..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-[#0f172a] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-[#0f172a] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewForm(false)} className="text-[10px] px-3 py-1.5 rounded-lg border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={createWorkflow}
              disabled={!newName.trim()}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-400 disabled:opacity-30 transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Workflow List */}
      {workflows.length > 0 && !activeWorkflowId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors"
              onClick={() => setActiveWorkflowId(wf.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${wf.isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
                  <span className="text-xs font-semibold text-slate-200">{wf.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateWorkflow(wf); }}
                    className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}
                    className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {wf.description && <p className="text-[10px] text-slate-500 mb-2">{wf.description}</p>}
              <div className="flex items-center gap-3 text-[10px] text-slate-600">
                <span>{wf.nodes.length} nodes</span>
                <span>{wf.runCount} runs</span>
                {wf.lastRun && <span>Last: {new Date(wf.lastRun).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {workflows.length === 0 && !showNewForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Workflow Builder</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Create automation workflows for your outreach. Combine triggers, delays,
            emails, filters, and webhooks into custom sequences.
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Your First Workflow
          </button>
        </div>
      )}

      {/* Active Workflow Canvas */}
      {activeWorkflow && (
        <div className="flex gap-3">
          {/* Canvas */}
          <div className="flex-1 min-h-[500px] rounded-xl border border-white/[0.06] bg-[#050a14] relative overflow-hidden">
            <div
              ref={canvasRef}
              className="w-full h-full relative"
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDblClick}
            >
              {activeWorkflow.nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-2">Double-click anywhere to add a node</p>
                    <p className="text-[10px] text-slate-700">or drag nodes from the sidebar</p>
                  </div>
                </div>
              )}

              {/* Nodes */}
              {activeWorkflow.nodes.map((node) => {
                const def = NODE_TYPES.find((n) => n.type === node.type)!;
                const Icon = def.icon;
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    className={`absolute cursor-pointer select-none ${isSelected ? "z-10" : "z-0"}`}
                    style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                  >
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? "border-violet-500/40 bg-violet-500/[0.08] shadow-lg shadow-violet-500/10"
                          : node.enabled
                          ? "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
                          : "border-white/[0.04] bg-white/[0.02] opacity-50"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${def.color}`} />
                      <span className="text-[11px] text-slate-200 font-medium whitespace-nowrap">{node.label}</span>
                      {!node.enabled && <Pause className="w-3 h-3 text-slate-600" />}
                    </div>
                  </div>
                );
              })}

              {/* Node Palette (on double-click) */}
              {showPalette && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 p-3 rounded-xl border border-white/[0.08] bg-[#0a1220] shadow-2xl z-20 flex gap-2 flex-wrap max-w-lg">
                  {NODE_TYPES.map((def) => {
                    const Icon = def.icon;
                    return (
                      <button
                        key={def.type}
                        onClick={(e) => {
                          const rect = canvasRef.current?.getBoundingClientRect();
                          if (rect) {
                            addNode(def.type, rect.width / 2, rect.height / 2);
                          }
                        }}
                        className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors"
                      >
                        <Icon className={`w-3 h-3 ${def.color}`} />
                        {def.label}
                      </button>
                    );
                  })}
                  <button onClick={() => setShowPalette(false)} className="p-1.5 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {selectedNode && (
            <div className="w-64 shrink-0 space-y-3">
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const def = NODE_TYPES.find((n) => n.type === selectedNode.type)!;
                      const Icon = def.icon;
                      return <Icon className={`w-4 h-4 ${def.color}`} />;
                    })()}
                    <span className="text-xs font-semibold text-slate-200">{selectedNode.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleNode(selectedNode.id)}
                      className={`p-1 rounded transition-colors ${selectedNode.enabled ? "text-emerald-400 hover:bg-emerald-500/10" : "text-slate-600 hover:bg-white/[0.06]"}`}
                      title={selectedNode.enabled ? "Disable" : "Enable"}
                    >
                      {selectedNode.enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => removeNode(selectedNode.id)}
                      className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Node-specific config */}
                <div className="space-y-2">
                  {selectedNode.type === "delay" && (
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">Delay (hours)</label>
                      <input
                        value={selectedNode.config.hours || "24"}
                        onChange={(e) => updateNodeConfig(selectedNode.id, "hours", e.target.value)}
                        type="number"
                        className="w-full text-xs px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-200 outline-none focus:border-violet-500/30"
                      />
                    </div>
                  )}
                  {selectedNode.type === "email" && (
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">Template</label>
                      <select
                        value={selectedNode.config.template || ""}
                        onChange={(e) => updateNodeConfig(selectedNode.id, "template", e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-200 outline-none focus:border-violet-500/30"
                      >
                        <option value="">Select template...</option>
                        <option value="cold-outreach">Cold Outreach</option>
                        <option value="follow-up">Follow-up</option>
                        <option value="meeting-request">Meeting Request</option>
                        <option value="introduction">Introduction</option>
                      </select>
                    </div>
                  )}
                  {selectedNode.type === "filter" && (
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">Condition</label>
                      <select
                        value={selectedNode.config.condition || ""}
                        onChange={(e) => updateNodeConfig(selectedNode.id, "condition", e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-200 outline-none focus:border-violet-500/30"
                      >
                        <option value="">Select condition...</option>
                        <option value="opened-email">Opened Email</option>
                        <option value="clicked-link">Clicked Link</option>
                        <option value="replied">Replied</option>
                        <option value="no-reply">No Reply (24h)</option>
                        <option value="bounced">Bounced</option>
                      </select>
                    </div>
                  )}
                  {selectedNode.type === "webhook" && (
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">URL</label>
                      <input
                        value={selectedNode.config.url || ""}
                        onChange={(e) => updateNodeConfig(selectedNode.id, "url", e.target.value)}
                        placeholder="https://api.example.com/webhook"
                        className="w-full text-xs px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-600 text-center">
                Double-click canvas to add more nodes
              </div>
            </div>
          )}
        </div>
      )}

      {/* Back button */}
      {activeWorkflowId && (
        <button
          onClick={() => { setActiveWorkflowId(null); setSelectedNodeId(null); }}
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
        >
          <ChevronRight className="w-3 h-3 rotate-180" />
          Back to workflow list
        </button>
      )}
    </div>
  );
}
