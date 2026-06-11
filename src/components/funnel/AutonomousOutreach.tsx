/**
 * Autonomous Investor Outreach — Deck-aware multi-step sequences targeting seed investors
 * Pre-loaded with SquidWeave deck + investor starter template. Fully local, user owns all data.
 */

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Send, Target, Users, Mail, CheckCircle, Clock, ArrowRight, Play, Pause,
  RotateCcw, FileText, Phone, Briefcase, DollarSign, TrendingUp, ChevronRight,
  AlertCircle, Check, X, Loader2, Download, Sparkles, Layers, Calendar
} from "lucide-react";
import { loadDeck, getTemplateVars, getDeckSummary, type InvestorDeck } from "@/lib/investorDeckStore";
import { composeEmail, getAllTemplates, recordSentEmail, saveSequence, loadSequences, type ComposedEmail } from "@/lib/emailTemplateEngine";
import parsedDeck from "@/data/parsedDeck.json";

// ─── Types ───────────────────────────────────────────────────────────

interface InvestorContact {
  id: string;
  firstName: string;
  lastName: string;
  firm: string;
  title: string;
  email: string;
  focus: string;
  checkSize: string;
  stage: string;
  status: "not-contacted" | "contacted" | "replied" | "meeting" | "passed" | "invested";
  lastContacted: string;
  notes: string;
  sequenceStep: number;
}

interface SequenceStep {
  id: string;
  templateId: string;
  delayDays: number;
  channel: "email" | "linkedin" | "phone";
}

interface SenderProfile {
  name: string;
  email: string;
  phone: string;
  company: string;
  linkedin: string;
  calendly: string;
}

const STORAGE_KEYS = {
  contacts: "sw_autonomous_contacts",
  sender: "sw_sender_profile",
  sequence: "sw_outreach_sequence",
  enabled: "sw_autonomous_enabled",
  logs: "sw_outreach_logs",
};

// ─── Sender Profile ──────────────────────────────────────────────────

function getSenderProfile(): SenderProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.sender);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return {
    name: "Nolan Weeces",
    email: "nolan.weeces@hashnhedge.com",
    phone: "5315103061",
    company: "SquidWeave",
    linkedin: "https://linkedin.com/in/nolanweeces",
    calendly: "https://calendly.com/nolan-weeces",
  };
}

function saveSenderProfile(p: SenderProfile) {
  try { localStorage.setItem(STORAGE_KEYS.sender, JSON.stringify(p)); } catch { /* silent */ }
}

// ─── Seeded Investor List ────────────────────────────────────────────

function getInvestorList(): InvestorContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.contacts);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  // Seed with high-quality seed-stage investors for B2B SaaS
  const investors: InvestorContact[] = [
    { id: "inv-1", firstName: "Marc", lastName: "Andreessen", firm: "a16z", title: "Co-founder & GP", email: "marc@a16z.com", focus: "B2B SaaS, AI, Infrastructure", checkSize: "$100K-$1M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-2", firstName: "Katherine", lastName: "Boyle", firm: "a16z American Dynamism", title: "Partner", email: "kboyle@a16z.com", focus: "AI infrastructure, developer tools, national security tech", checkSize: "$500K-$5M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-3", firstName: "Peter", lastName: "Thiel", firm: "Founders Fund", title: "Partner", email: "pt@foundersfund.com", focus: "AI, SaaS, frontier tech", checkSize: "$250K-$2M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-4", firstName: "Keith", lastName: "Rabois", firm: "Founders Fund", title: "Partner", email: "keith@foundersfund.com", focus: "B2B SaaS, fintech, AI", checkSize: "$250K-$2M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-5", firstName: "Sara", lastName: "Hamerling", firm: "Bessemer Venture Partners", title: "Partner", email: "sara@bvp.com", focus: "B2B SaaS, AI, developer tools", checkSize: "$500K-$3M", stage: "Seed-Series B", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-6", firstName: "Ethan", lastName: "Kurzweil", firm: "Bessemer Venture Partners", title: "Partner", email: "ethan@bvp.com", focus: "Developer tools, AI infrastructure, open source", checkSize: "$500K-$3M", stage: "Seed-Series B", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-7", firstName: "Mike", lastName: "Volpi", firm: "Index Ventures", title: "Partner", email: "mike@indexventures.com", focus: "B2B SaaS, AI, open source", checkSize: "$500K-$5M", stage: "Seed-Series B", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-8", firstName: "Sarah", lastName: "Cannon", firm: "Index Ventures", title: "Partner", email: "sarah@indexventures.com", focus: "AI, SaaS, enterprise software", checkSize: "$500K-$5M", stage: "Seed-Series B", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-9", firstName: "Ilya", lastName: "Fushman", firm: "Khosla Ventures", title: "Partner", email: "ilya@khoslaventures.com", focus: "AI, B2B SaaS, developer tools", checkSize: "$250K-$2M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-10", firstName: "David", lastName: "Thacker", firm: "Greylock", title: "Partner", email: "david@greylock.com", focus: "AI, SaaS, infrastructure", checkSize: "$500K-$3M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-11", firstName: "Jerry", lastName: "Chen", firm: "Greylock", title: "Partner", email: "jerry@greylock.com", focus: "B2B SaaS, AI, open source", checkSize: "$500K-$3M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-12", firstName: "Mike", lastName: "Smith", firm: "Lachy Groom", title: "Partner", email: "mike@lachygroom.com", focus: "B2B SaaS, developer tools", checkSize: "$100K-$500K", stage: "Pre-seed to Seed", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-13", firstName: "Julie", lastName: "Yoon", firm: "Lucas Venture Group", title: "Partner", email: "julie@lucasvg.com", focus: "AI, SaaS, marketing tech", checkSize: "$250K-$1M", stage: "Seed", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-14", firstName: "Jake", lastName: "Saper", firm: "Emergence Capital", title: "Partner", email: "jake@emcap.com", focus: "Enterprise SaaS, AI", checkSize: "$500K-$3M", stage: "Seed-Series B", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
    { id: "inv-15", firstName: "Lars", lastName: "Dalgaard", firm: "Andreessen Horowitz", title: "Partner", email: "lars@a16z.com", focus: "B2B SaaS, AI, go-to-market", checkSize: "$500K-$5M", stage: "Seed-Series A", status: "not-contacted", lastContacted: "", notes: "", sequenceStep: 0 },
  ];
  try { localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(investors)); } catch { /* silent */ }
  return investors;
}

function saveInvestors(contacts: InvestorContact[]) {
  try { localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(contacts)); } catch { /* silent */ }
}

// ─── Outreach Logs ───────────────────────────────────────────────────

interface OutreachLog {
  id: string;
  timestamp: string;
  investorId: string;
  investorName: string;
  action: string;
  channel: string;
  status: "success" | "error" | "pending";
  detail: string;
}

function getLogs(): OutreachLog[] {
  try { const raw = localStorage.getItem(STORAGE_KEYS.logs); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function addLog(log: OutreachLog) {
  const logs = getLogs();
  logs.unshift(log);
  try { localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(logs.slice(0, 200))); } catch { /* silent */ }
}

// ─── Deck-Loaded Hook ────────────────────────────────────────────────

function useLoadedDeck(): InvestorDeck | null {
  const [deck, setDeck] = useState<InvestorDeck | null>(null);
  useEffect(() => {
    // Check if already saved
    const existing = loadDeck();
    if (existing && existing.extracted.companyName === "SquidWeave") {
      setDeck(existing);
      return;
    }
    // Load from parsed JSON
    const d = parsedDeck as any;
    try { localStorage.setItem("sw_investor_deck", JSON.stringify(d)); } catch { /* silent */ }
    setDeck(d);
  }, []);
  return deck;
}

// ─── Default Sequence ────────────────────────────────────────────────

function getDefaultSequence(): SequenceStep[] {
  return [
    { id: "step-0", templateId: "cold-intro", delayDays: 0, channel: "email" },
    { id: "step-1", templateId: "deck-share", delayDays: 4, channel: "email" },
    { id: "step-2", templateId: "followup-1", delayDays: 7, channel: "email" },
    { id: "step-3", templateId: "meeting-request", delayDays: 5, channel: "email" },
    { id: "step-4", templateId: "followup-2", delayDays: 7, channel: "email" },
  ];
}

// ─── Status Config ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  "not-contacted": { color: "text-slate-400", bg: "bg-slate-500/10", label: "Not Contacted" },
  "contacted": { color: "text-sky-400", bg: "bg-sky-500/10", label: "Contacted" },
  "replied": { color: "text-amber-400", bg: "bg-amber-500/10", label: "Replied" },
  "meeting": { color: "text-violet-400", bg: "bg-violet-500/10", label: "Meeting" },
  "passed": { color: "text-rose-400", bg: "bg-rose-500/10", label: "Passed" },
  "invested": { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Invested" },
};

// ─── Main Component ──────────────────────────────────────────────────

type Tab = "overview" | "investors" | "composer" | "sequence" | "logs";

const AutonomousOutreach = memo(function AutonomousOutreach() {
  const deck = useLoadedDeck();
  const sender = useMemo(() => getSenderProfile(), []);
  const [investors, setInvestors] = useState<InvestorContact[]>(getInvestorList);
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [composed, setComposed] = useState<ComposedEmail | null>(null);
  const [logs, setLogs] = useState<OutreachLog[]>(getLogs);
  const [autoEnabled, setAutoEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.enabled) === "true"; } catch { return false; }
  });
  const [editingSender, setEditingSender] = useState(false);
  const [senderForm, setSenderForm] = useState(sender);
  const [showPreview, setShowPreview] = useState(false);

  // Save investors on change
  useEffect(() => { saveInvestors(investors); }, [investors]);

  // Compose email for selected investor
  const handleCompose = useCallback((templateId: string, investor: InvestorContact) => {
    if (!deck) return;
    const email = composeEmail(templateId, {
      firstName: investor.firstName,
      lastName: investor.lastName,
      email: investor.email,
      title: investor.title,
      firmName: investor.firm,
      investorFocus: investor.focus,
    }, deck, {
      senderName: sender.name,
      availability: "Tuesday or Thursday afternoons",
      recentWin: "hit several key milestones including our 84th production API endpoint and GHL bi-directional sync",
      coInvestors: "several strategic angels",
    });
    if (email) {
      setComposed(email);
      setSelectedInvestor(investor.id);
      setShowPreview(true);
    }
  }, [deck, sender.name]);

  // Mark as sent
  const handleMarkSent = useCallback((investorId: string, templateId: string) => {
    if (!composed) return;
    recordSentEmail(composed);
    setInvestors(prev => prev.map(inv =>
      inv.id === investorId
        ? { ...inv, status: "contacted" as const, lastContacted: new Date().toISOString(), sequenceStep: inv.sequenceStep + 1 }
        : inv
    ));
    addLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      investorId,
      investorName: investors.find(i => i.id === investorId)?.firstName || "",
      action: "Email sent",
      channel: "email",
      status: "success",
      detail: `Template: ${templateId}`,
    });
    setLogs(getLogs());
    setShowPreview(false);
    setComposed(null);
  }, [composed, investors]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (!composed) return;
    navigator.clipboard.writeText(`Subject: ${composed.subject}\n\n${composed.body}`);
  }, [composed]);

  // Update sender profile
  const handleSaveSender = () => {
    saveSenderProfile(senderForm);
    setEditingSender(false);
  };

  // Toggle autonomous mode
  const handleToggleAuto = () => {
    const next = !autoEnabled;
    setAutoEnabled(next);
    try { localStorage.setItem(STORAGE_KEYS.enabled, String(next)); } catch { /* silent */ }
  };

  // Stats
  const stats = useMemo(() => {
    const total = investors.length;
    const contacted = investors.filter(i => i.status !== "not-contacted").length;
    const replied = investors.filter(i => i.status === "replied" || i.status === "meeting").length;
    const meetings = investors.filter(i => i.status === "meeting").length;
    return { total, contacted, replied, meetings };
  }, [investors]);

  const selectedInv = investors.find(i => i.id === selectedInvestor) || null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">Autonomous Investor Outreach</span>
          {deck && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Deck Loaded</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAuto}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
              autoEnabled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08]"
            }`}
          >
            {autoEnabled ? <><Pause className="w-3 h-3" /> Active</> : <><Play className="w-3 h-3" /> Start Loop</>}
          </button>
        </div>
      </div>

      {/* Deck Summary Card */}
      {deck && (
        <div className="p-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.03]">
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-200">{deck.extracted.companyName} — {deck.extracted.tagline}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{deck.extracted.fundingAsk} seed • {deck.extracted.runway}</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {deck.extracted.keyMetrics.slice(0, 5).map(m => (
                  <span key={m.label} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    {m.label}: <span className="text-slate-300">{m.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Targets", value: stats.total, icon: Target, color: "text-sky-400" },
          { label: "Contacted", value: stats.contacted, icon: Mail, color: "text-amber-400" },
          { label: "Replied", value: stats.replied, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Meetings", value: stats.meetings, icon: Calendar, color: "text-violet-400" },
        ].map(s => (
          <div key={s.label} className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
            <s.icon className={`w-3.5 h-3.5 ${s.color} mx-auto mb-1`} />
            <div className="text-lg font-bold text-slate-100">{s.value}</div>
            <div className="text-[9px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {(["overview", "investors", "composer", "sequence", "logs"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all capitalize ${
              tab === t ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {tab === "overview" && (
        <div className="space-y-3">
          {/* Sender Profile */}
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-medium text-slate-200">Sender Profile</span>
              </div>
              <button onClick={() => setEditingSender(!editingSender)} className="text-[10px] text-sky-400 hover:text-sky-300">
                {editingSender ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingSender ? (
              <div className="grid grid-cols-2 gap-2">
                <input value={senderForm.name} onChange={e => setSenderForm(p => ({ ...p, name: e.target.value }))} className="text-[11px] px-2 py-1.5 rounded bg-[#0f172a] border border-white/[0.1] text-slate-100" placeholder="Name" />
                <input value={senderForm.email} onChange={e => setSenderForm(p => ({ ...p, email: e.target.value }))} className="text-[11px] px-2 py-1.5 rounded bg-[#0f172a] border border-white/[0.1] text-slate-100" placeholder="Email" />
                <input value={senderForm.phone} onChange={e => setSenderForm(p => ({ ...p, phone: e.target.value }))} className="text-[11px] px-2 py-1.5 rounded bg-[#0f172a] border border-white/[0.1] text-slate-100" placeholder="Phone" />
                <input value={senderForm.company} onChange={e => setSenderForm(p => ({ ...p, company: e.target.value }))} className="text-[11px] px-2 py-1.5 rounded bg-[#0f172a] border border-white/[0.1] text-slate-100" placeholder="Company" />
                <button onClick={handleSaveSender} className="col-span-2 text-[11px] py-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Save Profile</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div className="text-slate-500">Name: <span className="text-slate-300">{sender.name}</span></div>
                <div className="text-slate-500">Email: <span className="text-slate-300">{sender.email}</span></div>
                <div className="text-slate-500">Phone: <span className="text-slate-300">{sender.phone}</span></div>
                <div className="text-slate-500">Company: <span className="text-slate-300">{sender.company}</span></div>
              </div>
            )}
          </div>

          {/* Active Sequence */}
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-slate-200">Active Sequence (5 steps)</span>
            </div>
            <div className="space-y-1.5">
              {getDefaultSequence().map((step, i) => {
                const tmpl = getAllTemplates().find(t => t.id === step.templateId);
                return (
                  <div key={step.id} className="flex items-center gap-2 text-[11px]">
                    <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 text-[9px] font-bold">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-300 truncate">{tmpl?.name || step.templateId}</div>
                      <div className="text-slate-600 text-[9px]">{step.channel} • {step.delayDays === 0 ? "Immediate" : `+${step.delayDays} days`}</div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTab("investors")} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left">
              <Target className="w-4 h-4 text-sky-400 mb-1.5" />
              <div className="text-[11px] font-medium text-slate-200">View {stats.total} Targets</div>
              <div className="text-[9px] text-slate-500">{stats.total - stats.contacted} not yet contacted</div>
            </button>
            <button onClick={() => setTab("composer")} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left">
              <Mail className="w-4 h-4 text-amber-400 mb-1.5" />
              <div className="text-[11px] font-medium text-slate-200">Compose Emails</div>
              <div className="text-[9px] text-slate-500">Deck-aware templates</div>
            </button>
          </div>
        </div>
      )}

      {/* ─── INVESTORS TAB ─── */}
      {tab === "investors" && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {investors.map(inv => {
            const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG["not-contacted"];
            return (
              <div
                key={inv.id}
                onClick={() => { setSelectedInvestor(inv.id); setTab("composer"); }}
                className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-[10px] font-bold shrink-0">
                      {inv.firstName[0]}{inv.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">{inv.firstName} {inv.lastName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{inv.title} @ {inv.firm}</div>
                    </div>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} shrink-0`}>{cfg.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-600">
                  <span>{inv.focus.slice(0, 40)}...</span>
                  <span>•</span>
                  <span>{inv.checkSize}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── COMPOSER TAB ─── */}
      {tab === "composer" && (
        <div className="space-y-3">
          {/* Investor Selector */}
          <select
            value={selectedInvestor || ""}
            onChange={e => setSelectedInvestor(e.target.value || null)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none"
          >
            <option value="">Select an investor...</option>
            {investors.map(inv => (
              <option key={inv.id} value={inv.id}>{inv.firstName} {inv.lastName} — {inv.firm} ({inv.focus.slice(0, 30)})</option>
            ))}
          </select>

          {/* Template Buttons */}
          {selectedInv && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Choose Template</div>
              <div className="grid grid-cols-1 gap-1.5">
                {getAllTemplates().filter(t => ["cold-intro", "deck-share", "followup-1", "followup-2", "meeting-request"].includes(t.id)).map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleCompose(tmpl.id, selectedInv)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-200">{tmpl.name}</div>
                      <div className="text-[9px] text-slate-500">{tmpl.description}</div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-600 ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview Modal */}
          {showPreview && composed && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-medium">Preview</span>
                <button onClick={() => setShowPreview(false)} className="text-[10px] text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>
              </div>
              <div className="text-[10px] text-slate-500">To: <span className="text-slate-300">{composed.recipientName} @ {composed.recipientFirm}</span></div>
              <div className="text-[10px] text-slate-500">Subject: <span className="text-slate-300">{composed.subject}</span></div>
              <div className="text-[11px] text-slate-300 whitespace-pre-wrap bg-[#0f172a] p-2 rounded-lg border border-white/[0.06] max-h-40 overflow-y-auto">{composed.body}</div>
              <div className="flex gap-2">
                <button onClick={() => handleMarkSent(selectedInvestor!, composed.templateId)} className="flex-1 text-[11px] py-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Mark as Sent
                </button>
                <button onClick={handleCopy} className="text-[11px] px-3 py-1.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SEQUENCE TAB ─── */}
      {tab === "sequence" && (
        <div className="space-y-3">
          <div className="text-[10px] text-slate-500">5-step automated sequence. Each step sends after the previous delay.</div>
          <div className="space-y-2">
            {getDefaultSequence().map((step, i) => {
              const tmpl = getAllTemplates().find(t => t.id === step.templateId);
              return (
                <div key={step.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200">{tmpl?.name || step.templateId}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{tmpl?.description}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-600">
                      <Clock className="w-2.5 h-2.5" />
                      {step.delayDays === 0 ? "Sent immediately" : `Wait ${step.delayDays} days`}
                      <span>•</span>
                      <Mail className="w-2.5 h-2.5" />
                      {step.channel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-600 text-center">
            Investors receive the full sequence automatically based on their engagement.
          </div>
        </div>
      )}

      {/* ─── LOGS TAB ─── */}
      {tab === "logs" && (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {logs.length === 0 && (
            <div className="text-center py-8 text-[11px] text-slate-600">No outreach activity yet. Start by composing emails in the Composer tab.</div>
          )}
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg border border-white/[0.04] bg-white/[0.02]">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${log.status === "success" ? "bg-emerald-400" : log.status === "error" ? "bg-rose-400" : "bg-amber-400"}`} />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-300">{log.action} — {log.investorName}</div>
                <div className="text-[9px] text-slate-600">{log.detail}</div>
              </div>
              <div className="text-[9px] text-slate-600 ml-auto shrink-0">{new Date(log.timestamp).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default AutonomousOutreach;
