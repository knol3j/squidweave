import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Globe,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Search,
  Upload,
  Fingerprint,
  FileText,
  Send,
  Copy,
  Check,
  Clock,
  User,
  Tag,
  TrendingUp,
  DollarSign,
  Target,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Eye,
  X,
  Zap,
  MessageSquare,
  Layers,
  History,
  PenTool,
  Sparkles,
  ArrowRight,
  Loader2,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";
import type { TargetProfile } from "@/services/dataService";
import {
  loadDeck,
  fillTemplate,
  type InvestorDeck,
} from "@/lib/investorDeckStore";
import {
  BUILT_IN_TEMPLATES,
  getAllTemplates,
  composeEmail,
  previewTemplate,
  getEmailStats,
  recordSentEmail,
  loadSentEmails,
  loadSequences,
  saveSequence,
  type EmailTemplate,
  type ComposedEmail,
  type EmailSequence,
} from "@/lib/emailTemplateEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailResult {
  email: string;
  type: string;
  confidence: number;
  status: "verified" | "unverified" | "invalid" | "risky";
}

interface EmailPattern {
  pattern: string;
  example: string;
  frequency: number;
  confidence: number;
}

interface BulkResult {
  email: string;
  status: "verified" | "unverified" | "invalid" | "risky";
  reason: string;
}

interface RecipientInfo {
  firstName: string;
  lastName: string;
  email: string;
  firmName: string;
  investorFocus: string;
  notableInvestment: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEYS = {
  results: "sw_email_results",
  stats: "sw_email_stats",
  patterns: "sw_email_patterns",
} as const;

function loadStored<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s) as T;
  } catch { /* silent */ }
  return fallback;
}

function saveStored<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* silent */ }
}

// ─── Helper components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-indigo-400" />
      </div>
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-slate-100">{value}</div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  let colorClass = "text-red-400 bg-red-500/10 border-red-500/20";
  if (score >= 90) colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  else if (score >= 70) colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${colorClass} font-medium`}>
      {score}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    unverified: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    invalid: "text-red-400 bg-red-500/10 border-red-500/20",
    risky: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  const cls = map[status] || map.unverified;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cls} font-medium capitalize`}>
      {status}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ─── Email generation helpers ─────────────────────────────────────────────────



// ─── Category styling for templates ───────────────────────────────────────────

const CATEGORY_STYLES: Record<EmailTemplate["category"], { color: string; bg: string; border: string; label: string }> = {
  cold: { color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", label: "Cold" },
  warm: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Warm" },
  followup: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "Follow-up" },
  deck: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Deck" },
  meeting: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "Meeting" },
  close: { color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", label: "Close" },
};

// ─── Deck Summary Card ────────────────────────────────────────────────────────

function DeckSummaryCard({ deck, onClear }: { deck: InvestorDeck | null; onClear: () => void }) {
  if (!deck) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-300">No Investor Deck Found</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Upload your deck to auto-fill email templates with your company data.
          </div>
        </div>
      </div>
    );
  }

  const e = deck.extracted;
  return (
    <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">{e.companyName || "Your Company"}</div>
            <div className="text-[11px] text-slate-400">{e.tagline || "No tagline set"}</div>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-[10px] text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-red-500/20"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {e.marketSize && (
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500"><Target className="w-3 h-3" /> Market</div>
            <div className="text-xs font-medium text-slate-200 mt-0.5">{e.marketSize}</div>
          </div>
        )}
        {(e.revenue || e.ARR) && (
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500"><TrendingUp className="w-3 h-3" /> Revenue</div>
            <div className="text-xs font-medium text-slate-200 mt-0.5">{e.revenue || e.ARR}</div>
          </div>
        )}
        {e.growthRate && (
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500"><Zap className="w-3 h-3" /> Growth</div>
            <div className="text-xs font-medium text-slate-200 mt-0.5">{e.growthRate}</div>
          </div>
        )}
        {e.fundingAsk && (
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500"><DollarSign className="w-3 h-3" /> Raising</div>
            <div className="text-xs font-medium text-slate-200 mt-0.5">{e.fundingAsk}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function EmailIntelligence() {
  const { state } = useApp();
  const campaignId = state.campaign?.id as string | undefined;

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const TABS = ["templates", "composer", "sequences", "history", "patterns"] as const;
  type Tab = (typeof TABS)[number];
  const [activeTab, setActiveTab] = useState<Tab>("templates");

  // ─── Deck State ───────────────────────────────────────────────────────────
  const [deck, setDeck] = useState<InvestorDeck | null>(() => loadDeck());

  // ─── Template State ───────────────────────────────────────────────────────
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("cold-intro");
  const templates = useMemo(() => getAllTemplates(), []);
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId]
  );

  // ─── Composer State ───────────────────────────────────────────────────────
  const [recipient, setRecipient] = useState<RecipientInfo>({
    firstName: "",
    lastName: "",
    email: "",
    firmName: "",
    investorFocus: "",
    notableInvestment: "",
  });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [senderName, setSenderName] = useState(() =>
    loadStored<string>("sw_email_sender_name", "")
  );

  // ─── History State ────────────────────────────────────────────────────────
  const [sentEmails, setSentEmails] = useState<ComposedEmail[]>(() => loadSentEmails());
  const [viewingEmail, setViewingEmail] = useState<ComposedEmail | null>(null);

  // ─── Sequence State ───────────────────────────────────────────────────────
  const [sequences, setSequences] = useState<EmailSequence[]>(() => loadSequences());
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState("");
  const [sequenceSteps, setSequenceSteps] = useState<{ templateId: string; delayDays: number; note: string }[]>([]);

  // ─── Pattern / Search State ───────────────────────────────────────────────
  const [domain, setDomain] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EmailResult[]>(() =>
    loadStored<EmailResult[]>(STORAGE_KEYS.results, [])
  );
  const [bulkEmails, setBulkEmails] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [bulkResults, _setBulkResults] = useState<BulkResult[]>([]);
  const [enrichmentMap, _setEnrichmentMap] = useState<Record<string, { title: string; company: string; linkedin: string }>>({});
  const [patterns] = useState<EmailPattern[]>(() =>
    loadStored<EmailPattern[]>(STORAGE_KEYS.patterns, [])
  );

  // ─── Stats ────────────────────────────────────────────────────────────────
  const domainsScanned = loadStored<number>(STORAGE_KEYS.stats, 0);
  const emailsFound = results.length;
  const verifiedCount = results.filter((r) => r.status === "verified").length;
  const catchAllRate = 0;

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Persist results
  useEffect(() => {
    saveStored(STORAGE_KEYS.results, results);
  }, [results]);

  // Update composer when template or recipient changes
  useEffect(() => {
    if (!selectedTemplate) return;
    const preview = composeEmail(
      selectedTemplate.id,
      {
        firstName: recipient.firstName || "",
        lastName: recipient.lastName,
        email: recipient.email || "",
        firmName: recipient.firmName,
        investorFocus: recipient.investorFocus,
        notableInvestment: recipient.notableInvestment,
      },
      deck,
      { senderName: senderName || "" }
    );
    if (preview) {
      setSubject(preview.subject);
      setBody(preview.body);
    }
  }, [selectedTemplate, deck, recipient.firstName, recipient.lastName, recipient.email, recipient.firmName, recipient.investorFocus, recipient.notableInvestment, senderName]);

  // ─── Callbacks ────────────────────────────────────────────────────────────

  const handleClearDeck = useCallback(() => {
    setDeck(null);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }, [subject, body]);

  const handleMarkAsSent = useCallback(() => {
    if (!selectedTemplate || !recipient.email) return;
    const composed: ComposedEmail = {
      subject,
      body,
      templateId: selectedTemplate.id,
      filledAt: new Date().toISOString(),
      recipientName: `${recipient.firstName} ${recipient.lastName}`.trim() || recipient.email,
      recipientFirm: recipient.firmName,
      recipientEmail: recipient.email,
    };
    recordSentEmail(composed);
    setSentEmails((prev) => [composed, ...prev]);
  }, [subject, body, selectedTemplate, recipient]);

  const handleSaveSequence = useCallback(() => {
    if (!sequenceName.trim() || sequenceSteps.length === 0) return;
    const seq: EmailSequence = {
      id: activeSequenceId || `seq-${Date.now()}`,
      name: sequenceName.trim(),
      steps: [...sequenceSteps],
    };
    saveSequence(seq);
    setSequences((prev) => {
      const filtered = prev.filter((s) => s.id !== seq.id);
      return [seq, ...filtered];
    });
    setActiveSequenceId(seq.id);
  }, [sequenceName, sequenceSteps, activeSequenceId]);

  const handleLoadSequence = useCallback((seq: EmailSequence) => {
    setActiveSequenceId(seq.id);
    setSequenceName(seq.name);
    setSequenceSteps([...seq.steps]);
  }, []);

  const handleNewSequence = useCallback(() => {
    setActiveSequenceId(null);
    setSequenceName("");
    setSequenceSteps([]);
  }, []);

  const handleDeleteSequence = useCallback((id: string) => {
    const updated = sequences.filter((s) => s.id !== id);
    setSequences(updated);
    try { localStorage.setItem("sw_email_sequences", JSON.stringify(updated)); } catch { /* silent */ }
    if (activeSequenceId === id) handleNewSequence();
  }, [sequences, activeSequenceId, handleNewSequence]);

  const handleAddStep = useCallback(() => {
    setSequenceSteps((prev) => [
      ...prev,
      { templateId: BUILT_IN_TEMPLATES[0].id, delayDays: prev.length === 0 ? 0 : 3, note: "" },
    ]);
  }, []);

  const handleRemoveStep = useCallback((index: number) => {
    setSequenceSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateStep = useCallback((index: number, field: "templateId" | "delayDays" | "note", value: string | number) => {
    setSequenceSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    );
  }, []);

  const searchDomain = useCallback(async () => {
    if (!domain.trim()) return;
    setSearching(true);

    try {
      let targets: TargetProfile[] = [];
      if (campaignId) {
        try {
          targets = await dataService.getTargets(campaignId);
        } catch { /* silent */ }
      }

      if (targets.length > 0) {
        const fromTargets: EmailResult[] = targets.slice(0, 10).map((t, i) => {
          const company = t.company || domain;
          const dm = t.decisionMaker || "contact";
          const email = `${dm.toLowerCase().replace(/\s/g, ".")}@${company}`.replace(/[^a-z0-9.@]/g, "");
          return {
            email,
            type: i % 2 === 0 ? "personal" : "role-based",
            confidence: t.fitScore || 0,
            status: (t.fitScore || 0) > 80 ? "verified" : "unverified",
          };
        });
        setResults(fromTargets);
      } else {
        setResults([]);
      }

      const prevStats = loadStored<{ domains: number }>(STORAGE_KEYS.stats, { domains: 0 });
      saveStored(STORAGE_KEYS.stats, { domains: prevStats.domains + 1 });
    } finally {
      setSearching(false);
    }
  }, [domain, campaignId]);

  const verifyEmail = useCallback((_email: string) => {
    alert("Verification requires an email verification service (e.g., ZeroBounce, NeverBounce). Please connect an API.");
  }, []);

  const enrichEmail = useCallback((_email: string) => {
    alert("Enrichment requires Clearbit, Apollo, or similar service. Please connect an API.");
  }, []);

  const verifyBulk = useCallback(() => {
    const emails = bulkEmails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));
    if (emails.length === 0) return;

    setVerifying(true);
    alert("Bulk verification requires an email verification service (e.g., ZeroBounce, NeverBounce). Please connect an API.");
    setVerifying(false);
  }, [bulkEmails]);

  // ─── Derived state ────────────────────────────────────────────────────────
  const emailStats = useMemo(() => getEmailStats(body), [body]);

  // ─── Render helpers ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pt-3">
      {/* ─── Deck Summary Card ──────────────────────────────────────────── */}
      <DeckSummaryCard deck={deck} onClear={handleClearDeck} />

      {/* ─── Stats Bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Domains Scanned" value={domainsScanned} icon={Globe} />
        <StatCard label="Emails Found" value={emailsFound} icon={Mail} />
        <StatCard label="Verified" value={verifiedCount} icon={ShieldCheck} />
        <StatCard label="Catch-All Rate" value={`${catchAllRate}%`} icon={AlertTriangle} />
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <TabButton active={activeTab === "templates"} onClick={() => setActiveTab("templates")} icon={Layers} label="Templates" />
        <TabButton active={activeTab === "composer"} onClick={() => setActiveTab("composer")} icon={PenTool} label="Composer" />
        <TabButton active={activeTab === "sequences"} onClick={() => setActiveTab("sequences")} icon={MessageSquare} label="Sequences" />
        <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={History} label="History" />
        <TabButton active={activeTab === "patterns"} onClick={() => setActiveTab("patterns")} icon={Fingerprint} label="Patterns" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TEMPLATES TAB                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "templates" && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Email Templates ({templates.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map((tmpl) => {
              const style = CATEGORY_STYLES[tmpl.category];
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setActiveTab("composer");
                  }}
                  className={`text-left p-3 rounded-xl border transition-all group ${
                    isSelected
                      ? "border-indigo-500/30 bg-indigo-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${style.bg} ${style.color} ${style.border} font-medium`}>
                        {style.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{tmpl.name}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400"}`} />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{tmpl.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tmpl.variables.slice(0, 4).map((v) => (
                      <span key={v} className="text-[9px] px-1 py-0.5 rounded bg-white/[0.04] text-slate-500 font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {tmpl.variables.length > 4 && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.04] text-slate-600">
                        +{tmpl.variables.length - 4}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* COMPOSER TAB                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "composer" && (
        <div className="space-y-3">
          {/* Template selector */}
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2 block">Template</label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tmpl) => {
                const style = CATEGORY_STYLES[tmpl.category];
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                      tmpl.id === selectedTemplateId
                        ? `${style.bg} ${style.color} ${style.border}`
                        : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    {tmpl.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Left: Editor */}
            <div className="space-y-3">
              {/* Recipient fields */}
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Recipient
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={recipient.firstName}
                    onChange={(e) => setRecipient((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                  <input
                    value={recipient.lastName}
                    onChange={(e) => setRecipient((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                  <input
                    value={recipient.email}
                    onChange={(e) => setRecipient((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email address"
                    className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                  <input
                    value={recipient.firmName}
                    onChange={(e) => setRecipient((p) => ({ ...p, firmName: e.target.value }))}
                    placeholder="Firm / VC name"
                    className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                  <input
                    value={recipient.investorFocus}
                    onChange={(e) => setRecipient((p) => ({ ...p, investorFocus: e.target.value }))}
                    placeholder="Focus area (e.g. enterprise AI)"
                    className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                  <input
                    value={senderName}
                    onChange={(e) => {
                      setSenderName(e.target.value);
                      saveStored("sw_email_sender_name", e.target.value);
                    }}
                    placeholder="Your name (sender)"
                    className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Subject Line
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Body */}
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Message Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 min-h-[240px] resize-y leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{emailStats.chars.toLocaleString()} chars</span>
                    <span>{emailStats.words.toLocaleString()} words</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {emailStats.readTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.05] hover:border-white/[0.15] transition-all"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={handleMarkAsSent}
                      disabled={!recipient.email}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-medium disabled:opacity-40 hover:bg-indigo-600 transition-all"
                    >
                      <Send className="w-3 h-3" />
                      Mark as Sent
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0f172a] overflow-hidden">
                {/* Email header mock */}
                <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-200">
                        {recipient.firstName || "(first name)"} {recipient.lastName} &lt;{recipient.email || "(email)"}&gt;
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {recipient.firmName || "(firm name)"} · {recipient.investorFocus || "(focus area)"}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium pl-9">{subject || "(no subject)"}</div>
                </div>
                {/* Email body */}
                <div className="p-4 text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[300px]">
                  {body || "Select a template and fill in the recipient details to see the preview."}
                </div>
              </div>

              {/* Deck variables reference */}
              {deck && (
                <div className="mt-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">
                    Deck Variables Available
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "companyName", "tagline", "problem", "solution", "marketSize",
                      "traction", "revenue", "growthRate", "teamHighlights", "fundingAsk",
                      "useOfFunds", "moat", "vision", "customerCount", "ARR", "runway",
                    ].map((v) => (
                      <span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SEQUENCES TAB                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "sequences" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Email Sequences
            </div>
            <button
              onClick={handleNewSequence}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-all"
            >
              <Plus className="w-3 h-3" /> New Sequence
            </button>
          </div>

          {/* Saved sequences list */}
          {sequences.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  onClick={() => handleLoadSequence(seq)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    activeSequenceId === seq.id
                      ? "border-indigo-500/30 bg-indigo-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                  }`}
                >
                  <span className="text-xs font-medium text-slate-200">{seq.name}</span>
                  <span className="text-[10px] text-slate-500">{seq.steps.length} steps</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSequence(seq.id); }}
                    className="ml-1 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Sequence builder */}
          <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <input
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              placeholder="Sequence name (e.g. 'Seed Round Outreach')"
              className="w-full text-sm px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600 mb-4"
            />

            {sequenceSteps.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <div className="text-xs">No steps yet. Add your first email step.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Timeline visual */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {sequenceSteps.map((step, i) => {
                    const tmpl = templates.find((t) => t.id === step.templateId);
                    const style = tmpl ? CATEGORY_STYLES[tmpl.category] : CATEGORY_STYLES.cold;
                    return (
                      <div key={i} className="flex items-center gap-1 shrink-0">
                        {i > 0 && <ArrowRight className="w-3 h-3 text-slate-600 mx-0.5" />}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${style.bg} ${style.border}`}>
                          <span className={`text-[10px] font-medium ${style.color}`}>
                            Day {step.delayDays}
                          </span>
                          <span className="text-[10px] text-slate-400">{tmpl?.name || "Unknown"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step editors */}
                {sequenceSteps.map((step, i) => {
                  const tmpl = templates.find((t) => t.id === step.templateId);
                  return (
                    <div key={i} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono text-slate-500 w-14">Step {i + 1}</span>
                        <select
                          value={step.templateId}
                          onChange={(e) => handleUpdateStep(i, "templateId", e.target.value)}
                          className="flex-1 text-xs px-2 py-1.5 rounded border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500"
                        >
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">Delay</span>
                          <input
                            type="number"
                            min={0}
                            max={90}
                            value={step.delayDays}
                            onChange={(e) => handleUpdateStep(i, "delayDays", parseInt(e.target.value) || 0)}
                            className="w-14 text-xs px-2 py-1.5 rounded border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 text-center"
                          />
                          <span className="text-[10px] text-slate-500">days</span>
                        </div>
                        <button
                          onClick={() => handleRemoveStep(i)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {tmpl && (
                        <div className="text-[10px] text-slate-500 pl-14">
                          <span className="text-slate-400">Subject preview:</span>{" "}
                          {fillTemplate(tmpl.subject, deck).slice(0, 80)}
                          {fillTemplate(tmpl.subject, deck).length > 80 ? "..." : ""}
                        </div>
                      )}
                      <input
                        value={step.note}
                        onChange={(e) => handleUpdateStep(i, "note", e.target.value)}
                        placeholder="Note (e.g. 'Wait for reply before next step')"
                        className="w-full mt-2 text-[11px] px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleAddStep}
                className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.05] transition-all"
              >
                <Plus className="w-3 h-3" /> Add Step
              </button>
              <button
                onClick={handleSaveSequence}
                disabled={!sequenceName.trim() || sequenceSteps.length === 0}
                className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-40 hover:bg-emerald-600 transition-all"
              >
                <Save className="w-3 h-3" /> Save Sequence
              </button>
            </div>
          </div>

          {/* Sequence preview */}
          {sequenceSteps.length > 0 && (
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">
                Full Sequence Preview
              </div>
              <div className="space-y-4">
                {sequenceSteps.map((step, i) => {
                  const tmpl = templates.find((t) => t.id === step.templateId);
                  if (!tmpl) return null;
                  const preview = previewTemplate(tmpl.id, deck);
                  return (
                    <div key={i} className="relative pl-6 border-l-2 border-indigo-500/20">
                      <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-indigo-500" />
                      <div className="text-[10px] text-indigo-400 font-medium mb-1">
                        Day {step.delayDays} · {tmpl.name}
                        {step.note && <span className="text-slate-500 ml-2">— {step.note}</span>}
                      </div>
                      {preview && (
                        <div className="p-3 rounded-lg border border-white/[0.06] bg-[#0f172a]">
                          <div className="text-[11px] font-medium text-slate-300 mb-1">{preview.subject}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-4 whitespace-pre-wrap">{preview.body}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HISTORY TAB                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
            <History className="w-4 h-4" /> Sent Emails ({sentEmails.length})
          </div>

          {sentEmails.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] text-center">
              <Send className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <div className="text-sm text-slate-400 font-medium">No emails sent yet</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Compose and mark emails as sent to build your history.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sentEmails.map((email, i) => {
                const tmpl = templates.find((t) => t.id === email.templateId);
                const date = new Date(email.filledAt);
                return (
                  <button
                    key={i}
                    onClick={() => setViewingEmail(email)}
                    className="w-full text-left p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">{email.subject}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{email.recipientName}</span>
                        <span>·</span>
                        <span>{email.recipientFirm || "No firm"}</span>
                        <span>·</span>
                        <span>{tmpl?.name || email.templateId}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-600 shrink-0">
                      {date.toLocaleDateString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* View email modal */}
          {viewingEmail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0f172a] shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/[0.06] bg-[#0f172a]">
                  <div className="text-sm font-semibold text-slate-200">Email Details</div>
                  <button
                    onClick={() => setViewingEmail(null)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">To</div>
                      <div className="text-slate-200">{viewingEmail.recipientName} &lt;{viewingEmail.recipientEmail}&gt;</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Firm</div>
                      <div className="text-slate-200">{viewingEmail.recipientFirm || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Template</div>
                      <div className="text-slate-200">{templates.find((t) => t.id === viewingEmail.templateId)?.name || viewingEmail.templateId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sent</div>
                      <div className="text-slate-200">{new Date(viewingEmail.filledAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Subject</div>
                    <div className="text-xs text-slate-200 font-medium">{viewingEmail.subject}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Body</div>
                    <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{viewingEmail.body}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PATTERNS TAB                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "patterns" && (
        <div className="space-y-4">
          {/* Domain Search */}
          <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" /> Domain Email Search
            </div>
            <div className="flex gap-2">
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500"
                onKeyDown={(e) => { if (e.key === "Enter") void searchDomain(); }}
              />
              <button
                onClick={() => void searchDomain()}
                disabled={searching || !domain.trim()}
                className="text-xs px-3 py-2 rounded-lg bg-indigo-500 text-white font-medium disabled:opacity-50 hover:bg-indigo-600 transition-colors flex items-center gap-1.5"
              >
                {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                {searching ? "Scanning..." : "Find Emails"}
              </button>
            </div>

            {results.length === 0 && domain && !searching && (
              <div className="mt-4 p-4 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] text-center">
                <Search className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <div className="text-xs text-slate-400 font-medium">No emails found</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Connect an email discovery API (Hunter.io, Apollo) to find emails by domain.
                </div>
              </div>
            )}
            {results.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase text-left">
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Confidence</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.email} className="text-xs border-t border-white/[0.06]">
                        <td className="py-2 text-slate-200 pr-3">
                          <div className="flex flex-col">
                            <span>{r.email}</span>
                            {enrichmentMap[r.email] && (
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                {enrichmentMap[r.email].title} @ {enrichmentMap[r.email].company}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-slate-400 pr-3 capitalize">{r.type}</td>
                        <td className="py-2 pr-3">
                          <ConfidenceBadge score={r.confidence} />
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => verifyEmail(r.email)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors mr-2"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => enrichEmail(r.email)}
                            className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            Enrich
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bulk Verification */}
          <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Bulk Verify
            </div>
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              placeholder="Paste emails, one per line..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 min-h-[80px] resize-y"
            />
            <button
              onClick={verifyBulk}
              disabled={verifying || !bulkEmails.trim()}
              className="mt-2 text-xs px-3 py-2 rounded-lg bg-violet-500 text-white font-medium disabled:opacity-50 hover:bg-violet-600 transition-colors flex items-center gap-1.5"
            >
              {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              {verifying ? "Verifying..." : "Verify All"}
            </button>

            {bulkResults.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase text-left">
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((br) => (
                      <tr key={br.email} className="text-xs border-t border-white/[0.06]">
                        <td className="py-2 text-slate-200 pr-3">{br.email}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={br.status} />
                        </td>
                        <td className="py-2 text-slate-500">{br.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Enhanced Pattern Analyzer */}
          <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
              <Fingerprint className="w-4 h-4" /> Pattern Analyzer
            </div>

            {/* Per-domain pattern detection results */}
            {results.length > 0 && (
              <div className="mb-4 p-3 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03]">
                <div className="text-[11px] font-medium text-indigo-300 mb-2 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" /> Detected Patterns for {domain || "scanned domain"}
                </div>
                <div className="space-y-2">
                  {(() => {
                    // Analyze discovered patterns from results
                    const discoveredPatterns: Record<string, { count: number; examples: string[] }> = {};
                    results.forEach((r) => {
                      const local = r.email.split("@")[0] || "";
                      let pattern = "other";
                      if (/^[a-z]+\.[a-z]+$/.test(local)) pattern = "{first}.{last}";
                      else if (/^[a-z]+[a-z]+$/.test(local) && local.length > 6) pattern = "{first}{last}";
                      else if (/^[a-z]_[a-z]+$/.test(local)) pattern = "{first}_{last}";
                      else if (/^[a-z][a-z]+$/.test(local) && local.length <= 6) pattern = "{f}{last}";
                      else if (/^[a-z]+$/.test(local) && local.length <= 6) pattern = "{first}";
                      else if (/^[a-z]+$/.test(local) && local.length > 3) pattern = "{last}";
                      else if (/^(ceo|cto|vp|director|manager|head|lead|founder|info|contact|support|sales)$/.test(local)) pattern = "{role}";

                      if (!discoveredPatterns[pattern]) discoveredPatterns[pattern] = { count: 0, examples: [] };
                      discoveredPatterns[pattern].count++;
                      if (discoveredPatterns[pattern].examples.length < 3) {
                        discoveredPatterns[pattern].examples.push(r.email);
                      }
                    });

                    return Object.entries(discoveredPatterns)
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([pattern, data]) => {
                        const confidence = Math.min(98, 50 + data.count * 8);
                        return (
                          <div key={pattern} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-slate-300">{pattern}</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500">
                                  {data.count} occurrences · {data.examples.slice(0, 2).join(", ")}
                                </span>
                              </div>
                            </div>
                            <ConfidenceBadge score={confidence} />
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            )}

            {/* Known patterns reference */}
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">
              Common Email Patterns
            </div>
            {patterns.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] text-center">
                <Fingerprint className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <div className="text-xs text-slate-400 font-medium">No patterns available</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Connect an email discovery API (Hunter.io, Apollo) to populate pattern data.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {patterns.map((p) => (
                  <div
                    key={p.pattern}
                    className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-slate-300 font-mono">{p.pattern}</div>
                      <ConfidenceBadge score={p.confidence} />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {p.example} · {p.frequency}% frequency
                    </div>
                    {/* Progress bar for frequency */}
                    <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500/40"
                        style={{ width: `${p.frequency}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
