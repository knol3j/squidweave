/**
 * ColdOutreachManager.tsx — Multi-channel cold outreach campaign manager
 * Channels: Email, LinkedIn, Phone, SMS
 * Features: Campaigns, Prospects, Sequences, Templates, Analytics, Reply Tracking
 */
import { useState, useMemo, useEffect } from "react";
import {
  Mail, Linkedin, Phone, MessageSquare, Send, Target, Users, Plus, Trash2, Copy,
  BarChart3, Calendar, Save, Edit3, X, Check, TrendingUp, UserPlus,
  FileText, Play, Pause, Filter, Download, Upload, Reply, Eye
} from "lucide-react";
import { createCampaign, loadCampaigns } from "@/lib/adCampaignStore";

// ══════════════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════════════

export type OutreachChannel = "email" | "linkedin" | "phone" | "sms";
export type ProspectStatus = "new" | "contacted" | "replied" | "meeting_booked" | "not_interested" | "bounced";
export type ReplyCategory = "interested" | "not_interested" | "meeting_request" | "out_of_office" | "wrong_person" | "bounce";

export interface Prospect {
  id: string; firstName: string; lastName: string; email: string; company: string; title: string;
  linkedInUrl?: string; phone?: string; source: string; notes: string; tags: string[];
  status: ProspectStatus; campaignIds: string[]; engagementScore: number;
  opens: number; clicks: number; replies: number; lastContactedAt: string | null; createdAt: string;
}

export interface SequenceStep {
  id: string; channel: OutreachChannel; subject: string; body: string;
  delayDays: number; templateId?: string; abTestEnabled?: boolean; abSubjectB?: string;
}

export interface Sequence {
  id: string; campaignId: string; name: string; steps: SequenceStep[];
  status: "draft" | "active" | "paused"; createdAt: string;
}

export interface Template {
  id: string; name: string; channel: OutreachChannel; subject: string; body: string;
  category: string; usageCount: number; variables: string[];
}

export interface Reply {
  id: string; prospectId: string; campaignId: string; subject: string; body: string;
  category: ReplyCategory; receivedAt: string; isRead: boolean; isArchived: boolean;
}

// ══════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════════════

const PROSPECTS_KEY = "sw_cold_prospects";
const SEQUENCES_KEY = "sw_cold_sequences";
const TEMPLATES_KEY = "sw_cold_templates";
const REPLIES_KEY = "sw_cold_replies";

const ALL_CHANNELS: OutreachChannel[] = ["email", "linkedin", "phone", "sms"];

const CHANNEL_ICONS: Record<OutreachChannel, typeof Mail> = {
  email: Mail, linkedin: Linkedin, phone: Phone, sms: MessageSquare,
};

const CHANNEL_COLORS: Record<OutreachChannel, string> = {
  email: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  linkedin: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  phone: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  sms: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-500/20 text-slate-300",
  contacted: "bg-blue-500/20 text-blue-300",
  replied: "bg-amber-500/20 text-amber-300",
  meeting_booked: "bg-emerald-500/20 text-emerald-300",
  not_interested: "bg-red-500/20 text-red-300",
  bounced: "bg-rose-500/20 text-rose-300",
};

const REPLY_CATEGORY_COLORS: Record<ReplyCategory, string> = {
  interested: "text-emerald-400", not_interested: "text-red-400",
  meeting_request: "text-blue-400", out_of_office: "text-slate-400",
  wrong_person: "text-orange-400", bounce: "text-rose-400",
};

const TAB_LABELS = [
  { key: "campaigns", icon: Target, label: "Campaigns" },
  { key: "prospects", icon: Users, label: "Prospects" },
  { key: "sequences", icon: Send, label: "Sequences" },
  { key: "templates", icon: FileText, label: "Templates" },
  { key: "analytics", icon: BarChart3, label: "Analytics" },
  { key: "replies", icon: Reply, label: "Reply Inbox" },
];

// ══════════════════════════════════════════════════════════════════════
//  ID HELPER
// ══════════════════════════════════════════════════════════════════════

function genId(): string { return `co-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

// ══════════════════════════════════════════════════════════════════════
//  LOCALSTORAGE HELPERS
// ══════════════════════════════════════════════════════════════════════

function loadProspects(): Prospect[] {
  try { const raw = localStorage.getItem(PROSPECTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveProspects(prospects: Prospect[]): void {
  try { localStorage.setItem(PROSPECTS_KEY, JSON.stringify(prospects)); } catch { /* silent */ }
}
function loadSequencesLocal(): Sequence[] {
  try { const raw = localStorage.getItem(SEQUENCES_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveSequencesLocal(sequences: Sequence[]): void {
  try { localStorage.setItem(SEQUENCES_KEY, JSON.stringify(sequences)); } catch { /* silent */ }
}
function loadTemplates(): Template[] {
  try { const raw = localStorage.getItem(TEMPLATES_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveTemplates(templates: Template[]): void {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)); } catch { /* silent */ }
}
function loadReplies(): Reply[] {
  try { const raw = localStorage.getItem(REPLIES_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveReplies(replies: Reply[]): void {
  try { localStorage.setItem(REPLIES_KEY, JSON.stringify(replies)); } catch { /* silent */ }
}

// ══════════════════════════════════════════════════════════════════════
//  TEMPLATE ENGINE
// ══════════════════════════════════════════════════════════════════════

function renderTemplate(template: string, prospect: Partial<Prospect>, myCompany = "OutboundPro", valueProp = "pipeline growth"): string {
  return template
    .replace(/{{firstName}}/g, prospect.firstName || "[firstName]")
    .replace(/{{lastName}}/g, prospect.lastName || "[lastName]")
    .replace(/{{company}}/g, prospect.company || "[company]")
    .replace(/{{title}}/g, prospect.title || "[title]")
    .replace(/{{myCompany}}/g, myCompany)
    .replace(/{{valueProp}}/g, valueProp);
}

// ══════════════════════════════════════════════════════════════════════
//  SHARED UTILITY
// ══════════════════════════════════════════════════════════════════════

function updateProspectLocal(id: string, updates: Partial<Prospect>): void {
  const prospects = loadProspects();
  const idx = prospects.findIndex((p: Prospect) => p.id === id);
  if (idx === -1) return;
  prospects[idx] = { ...prospects[idx], ...updates };
  saveProspects(prospects);
}

// ══════════════════════════════════════════════════════════════════════
//  CAMPAIGNS TAB
// ══════════════════════════════════════════════════════════════════════

function CampaignsTab({ onSelectCampaign }: { onSelectCampaign: () => void }) {
  const campaigns = useMemo(() => loadCampaigns().filter((c: { platform: string }) => c.platform === "cold"), []);
  const prospects = useMemo(() => loadProspects(), []);
  const replies = useMemo(() => loadReplies(), []);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState<OutreachChannel | "all">("all");

  const summaries = useMemo(() => campaigns.map((c: { id: string; name: string; status: string; createdAt: string }) => {
    const cProspects = prospects.filter((p: Prospect) => p.campaignIds.includes(c.id));
    const sent = cProspects.filter((p: Prospect) => p.status !== "new").length;
    const replied = cProspects.filter((p: Prospect) => p.status === "replied" || p.status === "meeting_booked").length;
    const meetings = cProspects.filter((p: Prospect) => p.status === "meeting_booked").length;
    return {
      id: c.id, name: c.name,
      channels: ["email", "linkedin"] as OutreachChannel[],
      status: c.status as "draft" | "active" | "paused" | "completed" | "archived",
      prospectCount: cProspects.length, sentCount: sent,
      replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      meetingsBooked: meetings, pipelineValue: meetings * 25000, createdAt: c.createdAt,
    };
  }), [campaigns, prospects, replies]);

  const filtered = useMemo(() => summaries.filter((s) => {
    const statusMatch = filterStatus === "all" || s.status === filterStatus;
    const channelMatch = filterChannel === "all" || s.channels.includes(filterChannel);
    return statusMatch && channelMatch;
  }), [summaries, filterStatus, filterChannel]);

  const createNewCampaign = () => {
    const name = prompt("Campaign name?");
    if (!name) return;
    const campaign = createCampaign({
      platform: "cold", name, objective: "lead_generation", status: "draft",
      budget: { amount: 1000, type: "daily", currency: "USD" },
      schedule: { startDate: new Date().toISOString().split("T")[0], endDate: null },
      targeting: { locations: [], ageRange: { min: 25, max: 65 }, genders: ["all"], languages: [], interests: [], behaviors: [], keywords: [], customAudiences: [], excludedAudiences: [], placements: [], devices: [] },
      creatives: [], notes: "",
    });
    const newSeq: Sequence = {
      id: genId(), campaignId: campaign.id, name: `${name} Sequence`, status: "draft",
      steps: [{ id: genId(), channel: "email", subject: "", body: "", delayDays: 0 }],
      createdAt: new Date().toISOString(),
    };
    saveSequencesLocal([...loadSequencesLocal(), newSeq]);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value as OutreachChannel | "all")} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200">
            <option value="all">All Channels</option>
            {ALL_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={createNewCampaign} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(camp => (
          <div key={camp.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{camp.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[camp.status]}`}>{camp.status}</span>
                  <div className="flex gap-1">
                    {camp.channels.map(ch => {
                      const Icon = CHANNEL_ICONS[ch];
                      return <span key={ch} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${CHANNEL_COLORS[ch]}`}><Icon className="w-3 h-3" /> {ch}</span>;
                    })}
                  </div>
                </div>
              </div>
              <button onClick={onSelectCampaign} className="text-slate-400 hover:text-emerald-400 transition-colors"><Eye className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="text-center"><div className="text-xl font-bold text-slate-100">{camp.prospectCount}</div><div className="text-xs text-slate-400">Prospects</div></div>
              <div className="text-center"><div className="text-xl font-bold text-blue-400">{camp.sentCount}</div><div className="text-xs text-slate-400">Contacted</div></div>
              <div className="text-center"><div className="text-xl font-bold text-emerald-400">{camp.replyRate}%</div><div className="text-xs text-slate-400">Reply Rate</div></div>
              <div className="text-center"><div className="text-xl font-bold text-purple-400">{camp.meetingsBooked}</div><div className="text-xs text-slate-400">Meetings</div></div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Pipeline: <span className="text-emerald-400 font-semibold">${camp.pipelineValue.toLocaleString()}</span></span>
              <span>{new Date(camp.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  PROSPECTS TAB
// ══════════════════════════════════════════════════════════════════════

function ProspectsTab() {
  const [prospects, setProspects] = useState<Prospect[]>(() => loadProspects());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [newTag, setNewTag] = useState("");
  const [sortKey, setSortKey] = useState<keyof Prospect>("engagementScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    prospects.forEach(p => p.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [prospects]);

  const filtered = useMemo(() => {
    let result = prospects.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchTag = !tagFilter || p.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()));
      return matchSearch && matchStatus && matchTag;
    });
    result.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av == null || bv == null) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return result;
  }, [prospects, search, statusFilter, tagFilter, sortKey, sortDir]);

  const updateProspect = (id: string, updates: Partial<Prospect>) => {
    const updated = prospects.map(p => p.id === id ? { ...p, ...updates } : p);
    setProspects(updated); saveProspects(updated);
  };

  const deleteProspect = (id: string) => {
    if (!confirm("Delete this prospect?")) return;
    const updated = prospects.filter(p => p.id !== id);
    setProspects(updated); saveProspects(updated);
  };

  const addTag = (prospectId: string) => {
    if (!newTag.trim()) return;
    const p = prospects.find(p => p.id === prospectId);
    if (!p || p.tags.includes(newTag.trim())) return;
    updateProspect(prospectId, { tags: [...p.tags, newTag.trim()] });
    setNewTag("");
  };

  const removeTag = (prospectId: string, tag: string) => {
    const p = prospects.find(p => p.id === prospectId);
    if (!p) return;
    updateProspect(prospectId, { tags: p.tags.filter(t => t !== tag) });
  };

  const importCSV = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const newProspects: Prospect[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      if (values.length < 3) continue;
      const get = (name: string) => values[headers.indexOf(name)] || "";
      newProspects.push({
        id: genId(),
        firstName: get("firstname") || get("first_name") || get("first name") || "",
        lastName: get("lastname") || get("last_name") || get("last name") || "",
        email: get("email") || "", company: get("company") || "",
        title: get("title") || get("jobtitle") || get("job title") || "",
        linkedInUrl: get("linkedin") || get("linkedinurl") || "",
        phone: get("phone") || "", source: get("source") || "CSV Import",
        notes: get("notes") || "",
        tags: get("tags") ? get("tags").split(";").map(t => t.trim()) : [],
        status: "new", campaignIds: [], engagementScore: 0,
        opens: 0, clicks: 0, replies: 0, lastContactedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    const updated = [...prospects, ...newProspects];
    setProspects(updated); saveProspects(updated);
    setImportText(""); setShowImport(false);
  };

  const exportCSV = () => {
    const headers = ["firstName", "lastName", "email", "company", "title", "phone", "linkedinUrl", "source", "status", "tags", "engagementScore", "notes"];
    const rows = filtered.map(p => [p.firstName, p.lastName, p.email, p.company, p.title, p.phone || "", p.linkedInUrl || "", p.source, p.status, p.tags.join(";"), String(p.engagementScore), p.notes]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `prospects-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const createProspect = () => {
    const newProspect: Prospect = {
      id: genId(), firstName: "New", lastName: "Prospect", email: "", company: "", title: "",
      source: "manual", notes: "", tags: [], status: "new", campaignIds: [],
      engagementScore: 0, opens: 0, clicks: 0, replies: 0, lastContactedAt: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [newProspect, ...prospects];
    setProspects(updated); saveProspects(updated);
    setEditingProspect(newProspect);
  };

  const engagementColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-slate-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prospects..." className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 w-56" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
            <option value="all">All Status</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm transition-colors"><Upload className="w-4 h-4" /> Import</button>
          <button onClick={exportCSV} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm transition-colors"><Download className="w-4 h-4" /> Export</button>
          <button onClick={createProspect} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"><UserPlus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      {showImport && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-2">Paste CSV (firstName,lastName,email,company,title,phone,linkedinUrl,source,tags,notes):</p>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="firstName,lastName,email,company,title..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 h-32 resize-none" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowImport(false)} className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5">Cancel</button>
            <button onClick={importCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm"><Check className="w-4 h-4" /> Import</button>
          </div>
        </div>
      )}

      {prospects.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-400 mb-1">No prospects yet</h3>
          <p className="text-sm text-slate-500 mb-4">Import prospects from CSV or add them manually to get started.</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Upload className="w-4 h-4" /> Import Prospects</button>
            <button onClick={createProspect} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors"><UserPlus className="w-4 h-4" /> Add Manually</button>
          </div>
        </div>
      ) : (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Prospect</th>
                <th className="px-4 py-3 text-left">Company / Title</th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => { setSortKey("status"); setSortDir(d => d === "asc" ? "desc" : "asc"); }}>Status</th>
                <th className="px-4 py-3 text-center cursor-pointer" onClick={() => { setSortKey("engagementScore"); setSortDir(d => d === "asc" ? "desc" : "asc"); }}>Score</th>
                <th className="px-4 py-3 text-left">Tags</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center text-xs font-semibold text-slate-200">{p.firstName[0]}{p.lastName[0]}</div>
                      <div><div className="font-medium text-slate-200">{p.firstName} {p.lastName}</div><div className="text-xs text-slate-500">{p.email}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="text-slate-300">{p.company}</div><div className="text-xs text-slate-500">{p.title}</div></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status.replace("_", " ")}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className={`text-lg font-bold ${engagementColor(p.engagementScore)}`}>{p.engagementScore}</div>
                    <div className="text-xs text-slate-600">{p.opens}o / {p.clicks}c / {p.replies}r</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">{t} <button onClick={() => removeTag(p.id, t)} className="hover:text-red-400"><X className="w-3 h-3" /></button></span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditingProspect(p)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => deleteProspect(p.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-700/50">{filtered.length} prospects</div>
      </div>
      )}

      {editingProspect && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Edit Prospect</h3>
              <button onClick={() => setEditingProspect(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ key: "firstName", label: "First Name" }, { key: "lastName", label: "Last Name" }, { key: "email", label: "Email" }, { key: "company", label: "Company" }, { key: "title", label: "Title" }, { key: "phone", label: "Phone" }, { key: "linkedInUrl", label: "LinkedIn URL" }, { key: "source", label: "Source" }].map(({ key, label }) => (
                <div key={key} className={key === "linkedInUrl" || key === "email" ? "col-span-2" : ""}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input value={(editingProspect as unknown as Record<string, string>)[key] || ""} onChange={e => setEditingProspect({ ...editingProspect, [key]: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={editingProspect.status} onChange={e => setEditingProspect({ ...editingProspect, status: e.target.value as ProspectStatus })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                  {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea value={editingProspect.notes} onChange={e => setEditingProspect({ ...editingProspect, notes: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 h-20 resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Add Tag</label>
                <div className="flex gap-2">
                  <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag(editingProspect.id)} placeholder="Enter tag..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
                  <button onClick={() => addTag(editingProspect.id)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingProspect(null)} className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2">Cancel</button>
              <button onClick={() => { updateProspect(editingProspect.id, editingProspect); setEditingProspect(null); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm"><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  SEQUENCES TAB
// ══════════════════════════════════════════════════════════════════════

function SequencesTab() {
  const [sequences, setSequences] = useState<Sequence[]>(() => loadSequencesLocal());
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [editingSeqName, setEditingSeqName] = useState(false);
  const [newSeqName, setNewSeqName] = useState("");
  const [previewProspect, setPreviewProspect] = useState<Prospect | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const prospects = useMemo(() => loadProspects(), []);
  const templates = useMemo(() => loadTemplates(), []);

  const selectedSeq = useMemo(() => sequences.find(s => s.id === selectedSeqId), [sequences, selectedSeqId]);

  useEffect(() => {
    if (!selectedSeqId && sequences.length > 0) setSelectedSeqId(sequences[0].id);
  }, [sequences, selectedSeqId]);

  const saveSequence = (seq: Sequence) => {
    const updated = sequences.map(s => s.id === seq.id ? seq : s);
    setSequences(updated);
    saveSequencesLocal(updated);
  };

  const toggleStatus = (seq: Sequence) => {
    const next = seq.status === "active" ? "paused" : seq.status === "paused" ? "active" : "active";
    saveSequence({ ...seq, status: next });
  };

  const addStep = (seq: Sequence) => {
    const newStep: SequenceStep = { id: genId(), channel: "email", subject: "", body: "", delayDays: 3 };
    saveSequence({ ...seq, steps: [...seq.steps, newStep] });
  };

  const removeStep = (seq: Sequence, stepId: string) => {
    saveSequence({ ...seq, steps: seq.steps.filter(s => s.id !== stepId) });
  };

  const duplicateStep = (seq: Sequence, step: SequenceStep) => {
    const copy: SequenceStep = { ...step, id: genId(), subject: step.subject + " (copy)" };
    saveSequence({ ...seq, steps: [...seq.steps, copy] });
  };

  const updateStep = (seq: Sequence, stepId: string, updates: Partial<SequenceStep>) => {
    saveSequence({ ...seq, steps: seq.steps.map(s => s.id === stepId ? { ...s, ...updates } : s) });
  };

  const getTemplateOptions = (channel: OutreachChannel) => templates.filter(t => t.channel === channel);

  const getCumulativeDelay = (seq: Sequence, stepIndex: number): number =>
    seq.steps.slice(0, stepIndex).reduce((sum, s) => sum + s.delayDays, 0);

  return (
    <div className="space-y-4">
      {!selectedSeq ? (
        <div className="text-center py-12 text-slate-500">No sequences yet. Create a campaign to auto-generate a sequence.</div>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={selectedSeqId || ""} onChange={e => setSelectedSeqId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {editingSeqName ? (
                <div className="flex items-center gap-2">
                  <input value={newSeqName} onChange={e => setNewSeqName(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200" />
                  <button onClick={() => { if (newSeqName.trim()) saveSequence({ ...selectedSeq, name: newSeqName.trim() }); setEditingSeqName(false); }} className="text-emerald-400"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingSeqName(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => { setNewSeqName(selectedSeq.name); setEditingSeqName(true); }} className="text-slate-400 hover:text-slate-200 transition-colors"><Edit3 className="w-4 h-4" /></button>
              )}
              <button onClick={() => toggleStatus(selectedSeq)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                selectedSeq.status === "active" ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              }`}>
                {selectedSeq.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {selectedSeq.status === "active" ? "Pause" : "Activate"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select value={previewProspect?.id || ""} onChange={e => setPreviewProspect(prospects.find(p => p.id === e.target.value) || null)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                <option value="">Pick preview prospect</option>
                {prospects.slice(0, 5).map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.company})</option>)}
              </select>
              <button onClick={() => setShowPreview(!showPreview)} className={`text-sm px-3 py-2 rounded-lg transition-colors ${showPreview ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}><Eye className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="space-y-3">
            {selectedSeq.steps.map((step, idx) => {
              const Icon = CHANNEL_ICONS[step.channel];
              const delayFromStart = getCumulativeDelay(selectedSeq, idx);
              const isEditing = editingStep?.id === step.id;
              return (
                <div key={step.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-900/30">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`p-1.5 rounded-lg ${CHANNEL_COLORS[step.channel]}`}><Icon className="w-4 h-4" /></div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">Step {idx + 1}</span>
                        {idx > 0 && <span className="text-xs text-slate-500">+{step.delayDays}d ({delayFromStart}d from start)</span>}
                      </div>
                      <select value={step.channel} onChange={e => updateStep(selectedSeq, step.id, { channel: e.target.value as OutreachChannel })} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200">
                        {ALL_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {step.templateId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">{templates.find(t => t.id === step.templateId)?.name || "Template"}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingStep(isEditing ? null : step)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => duplicateStep(selectedSeq, step)} className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => removeStep(selectedSeq, step.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="p-4 space-y-3 border-t border-slate-700/50">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-400 mb-1">Template</label>
                          <select value={step.templateId || ""} onChange={e => {
                            const tmpl = templates.find(t => t.id === e.target.value);
                            if (tmpl) updateStep(selectedSeq, step.id, { templateId: tmpl.id, subject: tmpl.subject, body: tmpl.body });
                          }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                            <option value="">Custom</option>
                            {getTemplateOptions(step.channel).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-slate-400 mb-1">Delay (days)</label>
                          <input type="number" min={0} max={30} value={step.delayDays} onChange={e => updateStep(selectedSeq, step.id, { delayDays: parseInt(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Subject</label>
                        <input value={step.subject} onChange={e => updateStep(selectedSeq, step.id, { subject: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
                        <div className="flex items-center gap-2 mt-2">
                          <input type="checkbox" checked={step.abTestEnabled || false} onChange={e => updateStep(selectedSeq, step.id, { abTestEnabled: e.target.checked })} className="rounded" />
                          <span className="text-xs text-slate-400">A/B test subject line</span>
                        </div>
                        {step.abTestEnabled && (
                          <input value={step.abSubjectB || ""} onChange={e => updateStep(selectedSeq, step.id, { abSubjectB: e.target.value })} placeholder="Subject B variant" className="w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Body</label>
                        <textarea value={step.body} onChange={e => updateStep(selectedSeq, step.id, { body: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 h-40 resize-none" />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => setEditingStep(null)} className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">Done</button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-t border-slate-700/50">
                      {step.subject && <div className="text-sm text-slate-300 mb-1 font-medium">{step.subject}</div>}
                      <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">{step.body.slice(0, 200)}{step.body.length > 200 ? "..." : ""}</pre>
                    </div>
                  )}

                  {showPreview && previewProspect && (
                    <div className="px-4 py-3 border-t border-slate-700/50 bg-emerald-900/10">
                      <div className="text-xs text-emerald-400 font-medium mb-1">Preview for {previewProspect.firstName} {previewProspect.lastName}</div>
                      {step.subject && <div className="text-sm text-slate-200 mb-1">{renderTemplate(step.subject, previewProspect)}</div>}
                      <pre className="text-xs text-slate-400 whitespace-pre-wrap">{renderTemplate(step.body, previewProspect)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => addStep(selectedSeq)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 text-slate-300 px-4 py-3 rounded-xl w-full justify-center transition-colors">
            <Plus className="w-4 h-4" /> Add Step
          </button>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  TEMPLATES TAB
// ══════════════════════════════════════════════════════════════════════

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>(() => loadTemplates());
  const [filterChannel, setFilterChannel] = useState<OutreachChannel | "all">("all");
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<Template>>({ channel: "email", subject: "", body: "", category: "Custom", variables: [] });

  const filtered = useMemo(() => {
    if (filterChannel === "all") return templates;
    return templates.filter(t => t.channel === filterChannel);
  }, [templates, filterChannel]);

  const saveAllTemplates = (tmpls: Template[]) => { setTemplates(tmpls); saveTemplates(tmpls); };

  const createTemplate = () => {
    if (!newTemplate.name || !newTemplate.body) return;
    const t: Template = {
      id: genId(), name: newTemplate.name, channel: newTemplate.channel as OutreachChannel,
      subject: newTemplate.subject || "", body: newTemplate.body,
      category: newTemplate.category || "Custom", usageCount: 0,
      variables: newTemplate.body.match(/{{\w+}}/g)?.map(v => v.slice(2, -2)) || [],
    };
    saveAllTemplates([t, ...templates]);
    setCreating(false);
    setNewTemplate({ channel: "email", subject: "", body: "", category: "Custom", variables: [] });
  };

  const deleteTemplate = (id: string) => {
    if (!confirm("Delete this template?")) return;
    saveAllTemplates(templates.filter(t => t.id !== id));
  };

  const duplicateTemplate = (t: Template) => {
    const copy: Template = { ...t, id: genId(), name: t.name + " (copy)", usageCount: 0 };
    saveAllTemplates([copy, ...templates]);
  };

  const getVars = (t: Template) => t.body.match(/{{\w+}}/g)?.map(v => v.slice(2, -2)) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value as OutreachChannel | "all")} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
            <option value="all">All Channels</option>
            {ALL_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={() => setCreating(!creating)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          {creating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {creating ? "Cancel" : "New Template"}
        </button>
      </div>

      {creating && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={newTemplate.name || ""} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Template name" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
            <select value={newTemplate.channel} onChange={e => setNewTemplate({ ...newTemplate, channel: e.target.value as OutreachChannel })} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
              {ALL_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={newTemplate.subject || ""} onChange={e => setNewTemplate({ ...newTemplate, subject: e.target.value })} placeholder="Subject (optional for non-email)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
          <textarea value={newTemplate.body || ""} onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })} placeholder="Template body... Use {{firstName}}, {{company}}, {{title}}, {{myCompany}}, {{valueProp}}" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 h-40 resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5">Cancel</button>
            <button onClick={createTemplate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm"><Save className="w-4 h-4" /> Save Template</button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-400 mb-1">No templates yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create your first template to use in outreach sequences.</p>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mx-auto"><Plus className="w-4 h-4" /> New Template</button>
        </div>
      ) : (
      <div className="space-y-3">
        {filtered.map(t => {
          const Icon = CHANNEL_ICONS[t.channel];
          return (
            <div key={t.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${CHANNEL_COLORS[t.channel]}`}><Icon className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-semibold text-slate-200">{t.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{t.category}</span>
                      <span className="text-xs text-slate-600">|</span>
                      <span className="text-xs text-slate-500">{t.usageCount} uses</span>
                      {getVars(t).length > 0 && <><span className="text-xs text-slate-600">|</span><div className="flex gap-1">{getVars(t).map(v => <span key={v} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">{`{{${v}}}`}</span>)}</div></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => duplicateTemplate(t)} className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => deleteTemplate(t.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {t.subject && <div className="text-sm text-slate-300 mb-1 font-medium">{t.subject}</div>}
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">{t.body}</pre>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════

function AnalyticsTab() {
  const prospects = useMemo(() => loadProspects(), []);
  const templates = useMemo(() => loadTemplates(), []);

  const totalProspects = prospects.length;
  const contacted = prospects.filter(p => p.status !== "new").length;
  const replied = prospects.filter(p => p.status === "replied" || p.status === "meeting_booked").length;
  const meetings = prospects.filter(p => p.status === "meeting_booked").length;
  const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;
  const pipelineValue = meetings * 25000;

  const channelStats = useMemo(() => {
    const stats = { email: { sent: 0, opened: 0, replied: 0 }, linkedin: { sent: 0, accepted: 0, replied: 0 }, phone: { dialed: 0, connected: 0 }, sms: { sent: 0, replied: 0 } };
    prospects.forEach(p => {
      if (p.status !== "new") {
        stats.email.sent++;
        if (p.opens > 0) stats.email.opened++;
        if (p.replies > 0) stats.email.replied++;
        if (p.engagementScore > 30) {
          stats.linkedin.sent++;
          if (p.clicks > 0) stats.linkedin.accepted++;
          if (p.replies > 0) stats.linkedin.replied++;
        }
        if (p.engagementScore > 50) { stats.phone.dialed++; if (p.replies > 0) stats.phone.connected++; }
        if (p.engagementScore > 20 && p.engagementScore < 80) { stats.sms.sent++; if (p.replies > 0) stats.sms.replied++; }
      }
    });
    return stats;
  }, [prospects]);

  const dailyData = useMemo(() => {
    const days: { day: string; sent: number; opened: number; replied: number }[] = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }), sent: 0, opened: 0, replied: 0 }); }
    prospects.forEach(p => {
      if (p.lastContactedAt) {
        const d = new Date(p.lastContactedAt); const now = new Date();
        const dayDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < 14) {
          const idx = 13 - dayDiff;
          if (p.status !== "new") days[idx].sent++;
          if (p.opens > 0) days[idx].opened++;
          if (p.replies > 0) days[idx].replied++;
        }
      }
    });
    return days;
  }, [prospects]);

  const maxDaily = Math.max(...dailyData.map(d => Math.max(d.sent, d.opened, d.replied)), 1);

  const templatePerformance = useMemo(() => templates.filter(t => t.usageCount > 0).map(t => ({
    ...t, sent: t.usageCount,
    opened: 0, replied: 0,
  })).sort((a, b) => b.usageCount - a.usageCount), [templates]);

  const funnelData = [
    { label: "Prospects", value: totalProspects, color: "bg-slate-500" },
    { label: "Contacted", value: contacted, color: "bg-blue-500" },
    { label: "Opened", value: prospects.filter(p => p.opens > 0).length, color: "bg-sky-500" },
    { label: "Replied", value: replied, color: "bg-amber-500" },
    { label: "Meeting Booked", value: meetings, color: "bg-emerald-500" },
  ];
  const funnelMax = Math.max(...funnelData.map(f => f.value), 1);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[{ label: "Total Prospects", value: totalProspects, icon: Users, color: "text-slate-300" }, { label: "Contacted", value: contacted, icon: Send, color: "text-blue-400" }, { label: "Replied", value: replied, icon: Reply, color: "text-amber-400" }, { label: "Reply Rate", value: `${replyRate}%`, icon: TrendingUp, color: "text-emerald-400" }, { label: "Meetings", value: meetings, icon: Calendar, color: "text-purple-400" }, { label: "Pipeline", value: `$${(pipelineValue / 1000).toFixed(0)}k`, icon: BarChart3, color: "text-emerald-400" }].map(card => (
          <div key={card.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><card.icon className={`w-4 h-4 ${card.color}`} /><span className="text-xs text-slate-400">{card.label}</span></div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Channel Breakdown</h3>
          <div className="space-y-4">
            {([{ channel: "email" as OutreachChannel, label: "Email", stats: channelStats.email, metrics: ["sent", "opened", "replied"] }, { channel: "linkedin" as OutreachChannel, label: "LinkedIn", stats: channelStats.linkedin, metrics: ["sent", "accepted", "replied"] }, { channel: "phone" as OutreachChannel, label: "Phone", stats: channelStats.phone, metrics: ["dialed", "connected"] }, { channel: "sms" as OutreachChannel, label: "SMS", stats: channelStats.sms, metrics: ["sent", "replied"] }]).map(({ channel, label, stats, metrics }) => {
              const Icon = CHANNEL_ICONS[channel];
              return (
                <div key={channel} className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${CHANNEL_COLORS[channel]}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-300 mb-1">{label}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {metrics.map(m => <div key={m} className="bg-slate-900/50 rounded-lg px-2 py-1"><div className="text-sm font-semibold text-slate-200">{(stats as Record<string, number>)[m]}</div><div className="text-[10px] text-slate-500 capitalize">{m}</div></div>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sequence Funnel */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Sequence Completion Funnel</h3>
          <div className="space-y-3">
            {funnelData.map((f, idx) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-28 text-xs text-slate-400 text-right shrink-0">{f.label}</div>
                <div className="flex-1 h-8 bg-slate-900/50 rounded-lg overflow-hidden">
                  <div className={`h-full ${f.color} rounded-lg flex items-center justify-end pr-2 transition-all`} style={{ width: `${Math.max((f.value / funnelMax) * 100, 5)}%` }}><span className="text-xs font-semibold text-white">{f.value}</span></div>
                </div>
                {idx > 0 && <div className="w-12 text-xs text-slate-500 shrink-0">{funnelData[idx - 1].value > 0 ? `${Math.round((f.value / funnelData[idx - 1].value) * 100)}%` : "0%"}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Daily Activity (14 Days)</h3>
        <div className="flex items-end gap-1 h-32">
          {dailyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center gap-[2px]">
                <div className="w-full bg-emerald-500/60 rounded-sm" style={{ height: `${(d.replied / maxDaily) * 80}px` }} />
                <div className="w-full bg-sky-500/60 rounded-sm" style={{ height: `${(d.opened / maxDaily) * 80}px` }} />
                <div className="w-full bg-blue-500/60 rounded-sm" style={{ height: `${(d.sent / maxDaily) * 80}px` }} />
              </div>
              <span className="text-[10px] text-slate-500">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/60" /> Sent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500/60" /> Opened</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/60" /> Replied</span>
        </div>
      </div>

      {/* Top Templates */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50"><h3 className="text-sm font-semibold text-slate-200">Top Performing Templates</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
            <tr><th className="px-4 py-2 text-left">Template</th><th className="px-4 py-2 text-center">Channel</th><th className="px-4 py-2 text-center">Sent</th><th className="px-4 py-2 text-center">Opened</th><th className="px-4 py-2 text-center">Replied</th><th className="px-4 py-2 text-center">Reply Rate</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {templatePerformance.slice(0, 6).map(t => (
              <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-2"><div className="font-medium text-slate-200">{t.name}</div><div className="text-xs text-slate-500">{t.category}</div></td>
                <td className="px-4 py-2 text-center">{(() => { const Icon = CHANNEL_ICONS[t.channel]; return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${CHANNEL_COLORS[t.channel]}`}><Icon className="w-3 h-3" /></span>; })()}</td>
                <td className="px-4 py-2 text-center text-slate-300">{t.sent}</td><td className="px-4 py-2 text-center text-sky-400">{t.opened}</td><td className="px-4 py-2 text-center text-emerald-400">{t.replied}</td>
                <td className="px-4 py-2 text-center"><span className="text-emerald-400 font-semibold">{t.sent > 0 ? ((t.replied / t.sent) * 100).toFixed(1) : "0"}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Response Time Analysis */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Response Time Analysis</h3>
        {replied === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No reply data yet. Response metrics will appear once prospects start replying.</div>
        ) : (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: "Avg. First Reply", value: "—", sub: `Based on ${replied} repl${replied === 1 ? 'y' : 'ies'}`, color: "text-blue-400" }, { label: "Fastest Reply", value: "—", sub: "No data yet", color: "text-emerald-400" }, { label: "Avg. to Meeting", value: "—", sub: "From reply to booking", color: "text-purple-400" }].map(stat => (
            <div key={stat.label} className="bg-slate-900/50 rounded-lg p-4 text-center">
              <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-600 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  REPLY INBOX TAB
// ══════════════════════════════════════════════════════════════════════

function ReplyInboxTab() {
  const [replies, setReplies] = useState<Reply[]>(() => loadReplies());
  const [prospects] = useState<Prospect[]>(() => loadProspects());
  const [campaigns] = useState(() => loadCampaigns().filter((c: { platform: string }) => c.platform === "cold"));
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);

  const filteredReplies = useMemo(() => replies.filter(r => {
    const catMatch = filterCategory === "all" || r.category === filterCategory;
    const readMatch = filterRead === "all" || (filterRead === "read" ? r.isRead : !r.isRead);
    return catMatch && readMatch && !r.isArchived;
  }).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()), [replies, filterCategory, filterRead]);

  const getProspect = (id: string) => prospects.find(p => p.id === id);
  const getCampaign = (id: string) => campaigns.find((c: { id: string }) => c.id === id);

  const markRead = (replyId: string) => {
    const updated = replies.map(r => r.id === replyId ? { ...r, isRead: true } : r);
    setReplies(updated); saveReplies(updated);
  };

  const archiveReply = (replyId: string) => {
    const updated = replies.map(r => r.id === replyId ? { ...r, isArchived: true } : r);
    setReplies(updated); saveReplies(updated);
    if (selectedReply?.id === replyId) setSelectedReply(null);
  };

  const quickAction = (reply: Reply, action: string) => {
    const p = getProspect(reply.prospectId);
    if (!p) return;
    if (action === "convert") { updateProspectLocal(p.id, { status: "meeting_booked" }); archiveReply(reply.id); }
    else if (action === "not_interested") { updateProspectLocal(p.id, { status: "not_interested" }); archiveReply(reply.id); }
    else if (action === "archive") archiveReply(reply.id);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    replies.forEach(r => { if (!r.isArchived) counts[r.category] = (counts[r.category] || 0) + 1; });
    return counts;
  }, [replies]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[{ key: "all", label: "All", color: "bg-slate-700 text-slate-300" }, { key: "interested", label: "Interested", color: "bg-emerald-500/20 text-emerald-400" }, { key: "meeting_request", label: "Meeting Request", color: "bg-blue-500/20 text-blue-400" }, { key: "not_interested", label: "Not Interested", color: "bg-red-500/20 text-red-400" }, { key: "out_of_office", label: "OOO", color: "bg-slate-500/20 text-slate-400" }, { key: "wrong_person", label: "Wrong Person", color: "bg-orange-500/20 text-orange-400" }].map(cat => (
          <button key={cat.key} onClick={() => setFilterCategory(cat.key)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filterCategory === cat.key ? cat.color : "bg-slate-800 text-slate-500 hover:text-slate-300"}`}>
            {cat.label} {cat.key !== "all" && <span className="ml-0.5 opacity-60">{categoryCounts[cat.key] || 0}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <select value={filterRead} onChange={e => setFilterRead(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          <option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option>
        </select>
      </div>

      {replies.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <Reply className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-400 mb-1">No replies yet</h3>
          <p className="text-sm text-slate-500">Replies from prospects will appear here once your outreach campaigns start generating responses.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: "500px" }}>
        <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 text-sm font-semibold text-slate-200 flex items-center justify-between"><span>Inbox</span><span className="text-xs text-slate-500">{filteredReplies.length} replies</span></div>
          <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
            {filteredReplies.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No replies in this category.</div> : filteredReplies.map(r => {
              const p = getProspect(r.prospectId);
              return (
                <button key={r.id} onClick={() => { setSelectedReply(r); markRead(r.id); }} className={`w-full text-left px-4 py-3 border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors ${selectedReply?.id === r.id ? "bg-slate-800/80 border-l-2 border-l-emerald-500" : !r.isRead ? "bg-slate-800/20 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"}`}>
                  <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-slate-200">{p ? `${p.firstName} ${p.lastName}` : "Unknown"}</span><span className="text-xs text-slate-500">{new Date(r.receivedAt).toLocaleDateString()}</span></div>
                  <div className="text-xs text-slate-400 mb-1 truncate">{r.subject}</div>
                  <div className="flex items-center gap-2"><span className={`text-[10px] font-medium ${REPLY_CATEGORY_COLORS[r.category]}`}>{r.category.replace("_", " ")}</span>{!r.isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedReply ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const p = getProspect(selectedReply.prospectId);
                    return (<><div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center font-semibold text-slate-200">{p ? `${p.firstName[0]}${p.lastName[0]}` : "?"}</div>
                      <div><div className="font-semibold text-slate-100">{p ? `${p.firstName} ${p.lastName}` : "Unknown"}</div><div className="text-xs text-slate-500">{p?.company} — {p?.title}</div></div></>);
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => quickAction(selectedReply, "convert")} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"><Check className="w-3 h-3" /> Book Meeting</button>
                  <button onClick={() => quickAction(selectedReply, "not_interested")} className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"><X className="w-3 h-3" /> Mark Not Interested</button>
                  <button onClick={() => quickAction(selectedReply, "archive")} className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="border-t border-slate-700/50 pt-3">
                <div className="text-sm text-slate-300 font-medium mb-1">{selectedReply.subject}</div>
                <div className="text-xs text-slate-500 mb-3">Received {new Date(selectedReply.receivedAt).toLocaleString()}</div>
                <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedReply.body}</div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-slate-500">Campaign:</span><span className="text-xs text-slate-300">{getCampaign(selectedReply.campaignId)?.name || "Unknown"}</span>
                <span className="text-xs text-slate-600 mx-1">|</span>
                <span className="text-xs text-slate-500">Category:</span><span className={`text-xs font-medium ${REPLY_CATEGORY_COLORS[selectedReply.category]}`}>{selectedReply.category.replace("_", " ")}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center text-slate-500"><Reply className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Select a reply to view details</p></div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════

export default function ColdOutreachManager() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [tick, setTick] = useState(0);

  /* no seed data — all data comes from user-created content in localStorage */

  const prospectCount = useMemo(() => { tick; return loadProspects().length; }, [tick]);
  const replyRateStr = useMemo(() => { tick; const p = loadProspects(); const c = p.filter((x: Prospect) => x.status !== "new").length; return c > 0 ? `${Math.round((p.filter((x: Prospect) => x.status === "replied" || x.status === "meeting_booked").length / c) * 100)}% reply rate` : "0% reply rate"; }, [tick]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Target className="w-7 h-7 text-emerald-400" />
            Cold Outreach Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">Multi-channel outreach campaigns — Email, LinkedIn, Phone, SMS</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-lg">
            <Users className="w-3.5 h-3.5" />
            <span>{prospectCount} prospects</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{replyRateStr}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-800/50 border border-slate-700 rounded-xl p-1 overflow-x-auto">
        {TAB_LABELS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${activeTab === tab.key ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "campaigns" && <CampaignsTab onSelectCampaign={() => setActiveTab("sequences")} />}
      {activeTab === "prospects" && <ProspectsTab />}
      {activeTab === "sequences" && <SequencesTab />}
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "replies" && <ReplyInboxTab />}
    </div>
  );
}
