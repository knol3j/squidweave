import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  User,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Briefcase,
  DollarSign,
  Target,
  TrendingUp,
  GripVertical,
  Search,
  Filter,
  MoreHorizontal,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  type: string;
  date: string;
}

interface Deal {
  id: string;
  contactName: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  value: number;
  probability: number;
  stageId: string;
  activities: Activity[];
}

interface PipelineStageDef {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

// ─── localStorage Keys ────────────────────────────────────────────────────────

const STORAGE_KEY = "sw_crm_pipeline";

function loadPipeline(): PipelineStageDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return getDefaultStages();
}

function savePipeline(stages: PipelineStageDef[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stages));
  } catch { /* silent */ }
}

function getDefaultStages(): PipelineStageDef[] {
  // Empty pipeline — no seed data. User adds their own deals.
  return [
    { id: "new-lead", name: "New Lead", color: "#94a3b8", deals: [] },
    { id: "qualified", name: "Qualified", color: "#60a5fa", deals: [] },
    { id: "proposal", name: "Proposal", color: "#f59e0b", deals: [] },
    { id: "negotiation", name: "Negotiation", color: "#f97316", deals: [] },
    { id: "closed-won", name: "Closed Won", color: "#10b981", deals: [] },
    { id: "closed-lost", name: "Closed Lost", color: "#ef4444", deals: [] },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CRMPipeline() {
  const { state } = useApp();
  const { campaignId } = state;

  const [pipelineStages, setPipelineStages] = useState<PipelineStageDef[]>(loadPipeline);
  const [activeStage, setActiveStage] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Deal | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addStageId, setAddStageId] = useState<string>("new-lead");
  const [searchQuery, setSearchQuery] = useState("");

  // Add deal form state
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formProbability, setFormProbability] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formLocation, setFormLocation] = useState("");

  // Persist to localStorage whenever pipeline changes
  useEffect(() => {
    savePipeline(pipelineStages);
  }, [pipelineStages]);

  // Load from localStorage when campaign changes
  useEffect(() => {
    const loaded = loadPipeline();
    setPipelineStages(loaded);
  }, [campaignId]);

  const moveDeal = useCallback(
    (dealId: string, targetStageId: string) => {
      setPipelineStages((prev) => {
        // Find the deal
        let dealToMove: Deal | null = null;
        for (const stage of prev) {
          const found = stage.deals.find((d) => d.id === dealId);
          if (found) {
            dealToMove = found;
            break;
          }
        }
        if (!dealToMove) return prev;

        // Remove from current stage, add to target
        return prev.map((stage) => {
          if (stage.id === dealToMove!.stageId) {
            return { ...stage, deals: stage.deals.filter((d) => d.id !== dealId) };
          }
          if (stage.id === targetStageId) {
            const moved: Deal = {
              ...dealToMove!,
              stageId: targetStageId,
              activities: [
                ...dealToMove!.activities,
                { type: `Moved to ${stage.name}`, date: new Date().toISOString().slice(0, 10) },
              ],
            };
            return { ...stage, deals: [...stage.deals, moved] };
          }
          return stage;
        });
      });
      setDragOverStage(null);
    },
    []
  );

  const handleDrop = useCallback(
    (stageId: string) => {
      if (draggedDeal) {
        moveDeal(draggedDeal.id, stageId);
        setDraggedDeal(null);
      }
      setDragOverStage(null);
    },
    [draggedDeal, moveDeal]
  );

  const openAddForm = useCallback((stageId: string) => {
    setAddStageId(stageId);
    setShowAddForm(true);
    setFormName("");
    setFormCompany("");
    setFormTitle("");
    setFormEmail("");
    setFormPhone("");
    setFormValue("");
    setFormProbability("");
    setFormLinkedin("");
    setFormLocation("");
  }, []);

  const addDeal = useCallback(() => {
    if (!formName.trim()) return;

    const value = parseFloat(formValue) || 0;
    const probability = parseInt(formProbability, 10) || 20;

    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      contactName: formName.trim(),
      company: formCompany.trim() || "Unknown",
      title: formTitle.trim() || "Contact",
      email: formEmail.trim() || "",
      phone: formPhone.trim() || "",
      linkedin: formLinkedin.trim() || "",
      location: formLocation.trim() || "",
      value,
      probability,
      stageId: addStageId,
      activities: [{ type: "Deal created", date: new Date().toISOString().slice(0, 10) }],
    };

    setPipelineStages((prev) =>
      prev.map((stage) =>
        stage.id === addStageId ? { ...stage, deals: [...stage.deals, newDeal] } : stage
      )
    );
    setShowAddForm(false);
  }, [formName, formCompany, formTitle, formEmail, formPhone, formValue, formProbability, formLinkedin, formLocation, addStageId]);

  const deleteDeal = useCallback((dealId: string) => {
    setPipelineStages((prev) =>
      prev.map((stage) => ({
        ...stage,
        deals: stage.deals.filter((d) => d.id !== dealId),
      }))
    );
    setSelectedContact(null);
  }, []);

  // Filter deals for search
  const filteredStages =
    searchQuery.trim() === ""
      ? pipelineStages
      : pipelineStages.map((stage) => ({
          ...stage,
          deals: stage.deals.filter(
            (d) =>
              d.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.email.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }));

  const visibleStages = activeStage === "all" ? filteredStages : filteredStages.filter((s) => s.id === activeStage);

  // Totals
  const totalDealValue = pipelineStages.reduce(
    (sum, stage) => sum + stage.deals.reduce((s, d) => s + d.value, 0),
    0
  );
  const totalDeals = pipelineStages.reduce((sum, stage) => sum + stage.deals.length, 0);
  const wonValue =
    pipelineStages.find((s) => s.id === "closed-won")?.deals.reduce((s, d) => s + d.value, 0) || 0;

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case "new-lead":
        return <AlertCircle className="w-3 h-3" />;
      case "qualified":
        return <Target className="w-3 h-3" />;
      case "proposal":
        return <MessageSquare className="w-3 h-3" />;
      case "negotiation":
        return <TrendingUp className="w-3 h-3" />;
      case "closed-won":
        return <CheckCircle2 className="w-3 h-3" />;
      case "closed-lost":
        return <X className="w-3 h-3" />;
      default:
        return <Briefcase className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "#08111f" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">CRM Pipeline</h2>
          </div>
          <div className="flex items-center gap-1.5 ml-4">
            <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300">${totalDealValue.toLocaleString()}</span>
              <span className="text-slate-500">pipeline</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300">${wonValue.toLocaleString()}</span>
              <span className="text-slate-500">won</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
              <User className="w-3 h-3 text-sky-400" />
              <span className="text-slate-300">{totalDeals}</span>
              <span className="text-slate-500">deals</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals..."
              className="w-40 text-[10px] pl-7 pr-2 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-300 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
            />
          </div>
          <button className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
            <Filter className="w-3 h-3" />
            Filter
          </button>
        </div>
      </div>

      {/* Stage Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveStage("all")}
          className={`text-[10px] px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeStage === "all"
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-500 border border-transparent hover:bg-white/5"
          }`}
        >
          All ({totalDeals})
        </button>
        {pipelineStages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setActiveStage(stage.id)}
            className={`text-[10px] px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              activeStage === stage.id
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-500 border border-transparent hover:bg-white/5"
            }`}
          >
            {getStageIcon(stage.id)}
            {stage.name} ({stage.deals.length})
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4">
        <div
          className="grid gap-3 min-w-[900px] h-full"
          style={{ gridTemplateColumns: `repeat(${visibleStages.length}, minmax(220px, 1fr))` }}
        >
          {visibleStages.map((stage) => (
            <div
              key={stage.id}
              className={`rounded-xl border p-2 flex flex-col h-full transition-colors ${
                dragOverStage === stage.id
                  ? "border-indigo-500/40 bg-indigo-500/[0.04]"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage.id);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage.id);
              }}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  {getStageIcon(stage.id)}
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: stage.color }}>
                    {stage.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">{stage.deals.length}</span>
                  <button className="text-slate-600 hover:text-slate-400 transition-colors">
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Deals List */}
              <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-0.5">
                {stage.deals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDraggedDeal(deal)}
                    onClick={() => setSelectedContact(deal)}
                    className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] cursor-grab hover:bg-white/[0.08] transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <GripVertical className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center text-[9px] text-indigo-200 font-bold shrink-0">
                        {deal.contactName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="text-xs text-slate-200 truncate">{deal.contactName}</div>
                    </div>
                    <div className="flex items-center gap-1 mb-1.5 ml-5">
                      <Briefcase className="w-2.5 h-2.5 text-slate-600" />
                      <span className="text-[10px] text-slate-500 truncate">{deal.company}</span>
                    </div>
                    <div className="flex items-center justify-between ml-5">
                      <span className="text-[10px] font-medium text-emerald-400">
                        ${deal.value.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500">{deal.probability}%</span>
                    </div>
                    {/* Probability Bar */}
                    <div className="w-full h-1 rounded-full bg-white/[0.06] mt-1.5 ml-5" style={{ width: "calc(100% - 20px)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${deal.probability}%`,
                          backgroundColor:
                            deal.probability >= 80
                              ? "#10b981"
                              : deal.probability >= 50
                                ? "#f59e0b"
                                : deal.probability >= 20
                                  ? "#60a5fa"
                                  : "#94a3b8",
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Deal Button */}
              <button
                onClick={() => openAddForm(stage.id)}
                className="w-full mt-2 text-[10px] py-1.5 rounded-lg border border-dashed border-white/[0.1] text-slate-500 hover:text-slate-300 hover:border-white/[0.2] transition-all flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" />
                Add Deal
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Contact Detail Modal ─────────────────────────────────────────── */}
      {selectedContact && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedContact(null)}
        >
          <div
            className="w-[480px] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0f172a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center text-sm text-indigo-200 font-bold">
                  {selectedContact.contactName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{selectedContact.contactName}</div>
                  <div className="text-xs text-slate-500">
                    {selectedContact.title} at {selectedContact.company}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteDeal(selectedContact.id)}
                  className="text-[10px] px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-1 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Deal Value & Probability */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Deal Value</span>
                </div>
                <div className="text-lg font-semibold text-emerald-400">
                  ${selectedContact.value.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-sky-400" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Probability</span>
                </div>
                <div className="text-lg font-semibold text-sky-400">{selectedContact.probability}%</div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-1.5">
                  <div
                    className="h-full rounded-full bg-sky-500/50 transition-all"
                    style={{ width: `${selectedContact.probability}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                Contact Info
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {selectedContact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-300">{selectedContact.email}</span>
                  </div>
                )}
                {selectedContact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-300">{selectedContact.phone}</span>
                  </div>
                )}
                {selectedContact.linkedin && (
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-slate-500">LinkedIn:</span>
                    <a
                      href={`https://${selectedContact.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      {selectedContact.linkedin}
                    </a>
                  </div>
                )}
                {selectedContact.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-300">{selectedContact.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Stage */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                Pipeline Stage
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      pipelineStages.find((s) => s.id === selectedContact.stageId)?.color || "#94a3b8",
                  }}
                />
                <span className="text-xs text-slate-300">
                  {pipelineStages.find((s) => s.id === selectedContact.stageId)?.name || selectedContact.stageId}
                </span>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                Activity Timeline
              </div>
              <div className="space-y-2">
                {selectedContact.activities.map((act, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-slate-300">{act.type}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {act.date}
                    </div>
                  </div>
                ))}
                {selectedContact.activities.length === 0 && (
                  <div className="text-[10px] text-slate-500 italic">No activity recorded yet.</div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setSelectedContact(null)}
                className="flex-1 text-[10px] py-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              >
                Close
              </button>
              {selectedContact.email && (
                <a
                  href={`mailto:${selectedContact.email}`}
                  className="flex-1 text-[10px] py-2 rounded-lg border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 transition-all text-center"
                >
                  Send Email
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Deal Modal ───────────────────────────────────────────────── */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0f172a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-100">Add New Deal</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stage Selector */}
            <div className="mb-3">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                Pipeline Stage
              </label>
              <select
                value={addStageId}
                onChange={(e) => setAddStageId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 transition-colors"
              >
                {pipelineStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                Contact Name *
              </label>
              <div className="relative">
                <User className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Full name"
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Company & Title */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Company
                </label>
                <div className="relative">
                  <Briefcase className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Company"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Job title"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) ..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Value & Probability */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Deal Value ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Probability (%)
                </label>
                <div className="relative">
                  <Target className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={formProbability}
                    onChange={(e) => setFormProbability(e.target.value)}
                    placeholder="20"
                    min="0"
                    max="100"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* LinkedIn & Location */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  LinkedIn
                </label>
                <input
                  type="text"
                  value={formLinkedin}
                  onChange={(e) => setFormLinkedin(e.target.value)}
                  placeholder="linkedin.com/in/..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="City, State"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 text-[10px] py-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addDeal}
                disabled={!formName.trim()}
                className="flex-1 text-[10px] py-2 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                }}
              >
                Save Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
