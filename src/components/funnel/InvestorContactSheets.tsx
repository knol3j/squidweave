import { useState, useEffect, useCallback, useMemo, memo } from "react";
import type { ComposedEmail } from "@/lib/emailTemplateEngine";
import {
  Building2,
  Mail,
  Linkedin,
  MapPin,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Plus,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  FileText,
  DollarSign,
  Target,
  Award,
  BarChart3,
  Search,
  Star,
  Briefcase,
  Globe,
  Upload,
  Zap,
  Filter,
  Download,
  Copy,
  Check,
  X,
  Send,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  parseDeck,
  loadDeck,
  getTemplateVars,
  getDeckSummary,
  type InvestorDeck,
} from "@/lib/investorDeckStore";
import {
  getAllTemplates,
  composeEmail,
  previewTemplate,
  recordSentEmail,
  getEmailStats,
} from "@/lib/emailTemplateEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ContactStatus = "not-contacted" | "contacted" | "responded" | "meeting" | "passed" | "invested";

export interface DecisionMaker {
  id: string;
  name: string;
  title: string;
  email: string;
  linkedin: string;
  contactStatus: ContactStatus;
  bio: string;
  education: string;
  previousFirms: string[];
  notableInvestments: string[];
  personalityNotes: string;
}

export interface PortfolioCompany {
  name: string;
  stage: string;
  sector: string;
  valuation: string;
  yearInvested: number;
  isLead: boolean;
}

export interface ContactEvent {
  date: string;
  type: string;
  notes: string;
  participant: string;
  outcome: string;
}

export interface DealFlow {
  company: string;
  stage: string;
  amount: string;
  date: string;
  status: "evaluating" | "term-sheet" | "due-diligence" | "closed" | "passed";
  leadPartner: string;
}

export interface InvestorContact {
  id: string;
  name: string;
  type: "VC" | "Angel" | "PE" | "Strategic" | "Family Office" | "Growth Equity";
  location: string;
  checkSize: string;
  aum: string;
  thesis: string;
  focusAreas: string[];
  portfolioCompanies: number;
  decisionMakers: DecisionMaker[];
  portfolio: PortfolioCompany[];
  contactHistory: ContactEvent[];
  lastContact: string;
  founded: number;
  fundStage: string;
  website: string;
  crunchbaseUrl: string;
  signalRank: number;
  fundSize: string;
  avgInitialCheck: string;
  dealFlow: DealFlow[];
  coInvestors: string[];
  boardSeats: string[];
  reputationScore: number;
  speedToTermSheet: string;
  followOnRate: string;
  notableExits: { company: string; return: string; year: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "sw_investor_contacts_v2";
const SENT_EMAILS_KEY = "sw_sent_email_log";
const EXPANDED_KEY = "sw_inv_expanded";

const STATUS_CONFIG: Record<ContactStatus, { label: string; color: string; bg: string; border: string; index: number }> = {
  "not-contacted": { label: "Not Contacted", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", index: 0 },
  "contacted":     { label: "Contacted",     color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/20",    index: 1 },
  "responded":     { label: "Responded",     color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", index: 2 },
  "meeting":       { label: "Meeting",       color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  index: 3 },
  "passed":        { label: "Passed",        color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/20",   index: 4 },
  "invested":      { label: "Invested",      color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20",index: 5 },
};

const STATUS_ORDER: ContactStatus[] = ["not-contacted", "contacted", "responded", "meeting", "passed", "invested"];

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function loadInvestors(): InvestorContact[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const data = JSON.parse(s);
      return Array.isArray(data) ? data : [];
    }
  } catch { /* silent */ }
  return [];
}

function saveInvestors(data: InvestorContact[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* silent */ }
}

function loadExpanded(): Record<string, boolean> {
  try {
    const s = localStorage.getItem(EXPANDED_KEY);
    if (s) return JSON.parse(s);
  } catch { /* silent */ }
  return { thesis: true, decisionMakers: true, portfolio: true, contactHistory: false, dealFlow: true, notableExits: false };
}

function saveExpanded(data: Record<string, boolean>) {
  try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(data)); } catch { /* silent */ }
}

function recordSentEmailLog(entry: { templateId: string; contactName: string; firmName: string; sentAt: string }) {
  try {
    const existing = JSON.parse(localStorage.getItem(SENT_EMAILS_KEY) || "[]");
    existing.unshift(entry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch { /* silent */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIT SCORING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function computeFitScore(investor: InvestorContact, deck: InvestorDeck | null): number {
  if (!deck) return 0;
  const e = deck.extracted;
  let score = 0;
  let maxScore = 0;

  const deckText = `${e.problem} ${e.solution} ${e.vision} ${e.tagline}`.toLowerCase();
  const focusMatches = investor.focusAreas.filter(fa => {
    const faLower = fa.toLowerCase();
    return deckText.includes(faLower) ||
           investor.thesis.toLowerCase().includes(faLower);
  }).length;
  score += Math.min(40, focusMatches * 10);
  maxScore += 40;

  const thesisLower = investor.thesis.toLowerCase();
  const keywords = [
    e.companyName.toLowerCase(),
    ...(e.solution ? e.solution.split(" ").slice(0, 5) : []),
    ...(e.problem ? e.problem.split(" ").slice(0, 5) : []),
  ].filter(Boolean);
  const keywordHits = keywords.filter(kw => kw.length > 3 && thesisLower.includes(kw)).length;
  score += Math.min(30, keywordHits * 6);
  maxScore += 30;

  if (e.revenue && investor.focusAreas.some(fa => fa.includes("Enterprise") || fa.includes("SaaS"))) score += 10;
  if (e.customerCount && investor.focusAreas.some(fa => fa.includes("Consumer"))) score += 10;
  if (e.growthRate && investor.focusAreas.some(fa => fa.includes("Growth"))) score += 10;
  maxScore += 30;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function exportToCSV(investors: InvestorContact[]): string {
  const headers = [
    "Firm", "Type", "Location", "Check Size", "AUM", "Signal Rank",
    "Reputation", "Contact Name", "Contact Title", "Contact Email",
    "Contact Status", "Focus Areas", "Thesis (truncated)",
  ];
  const rows: string[] = [headers.join(",")];
  for (const inv of investors) {
    for (const dm of inv.decisionMakers) {
      const cells = [
        inv.name,
        inv.type,
        inv.location,
        inv.checkSize,
        inv.aum,
        inv.signalRank,
        inv.reputationScore,
        dm.name,
        dm.title,
        dm.email,
        STATUS_CONFIG[dm.contactStatus].label,
        inv.focusAreas.join("; "),
        inv.thesis.slice(0, 120),
      ];
      rows.push(cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","));
    }
  }
  return rows.join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const FitScoreBadge = memo(function FitScoreBadge({ score }: { score: number }) {
  let colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
  if (score >= 80) colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  else if (score >= 50) colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${colorClass} font-semibold`}>
      <Zap className="w-3 h-3" />
      {score}% fit
    </span>
  );
});

const DealStatusBadge = memo(function DealStatusBadge({ status }: { status: DealFlow["status"] }) {
  const config: Record<DealFlow["status"], { label: string; classes: string }> = {
    "evaluating": { label: "Evaluating", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    "term-sheet": { label: "Term Sheet", classes: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    "due-diligence": { label: "Due Diligence", classes: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    "closed": { label: "Closed", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    "passed": { label: "Passed", classes: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${c.classes} font-medium`}>
      {c.label}
    </span>
  );
});

const SignalRankBar = memo(function SignalRankBar({ rank }: { rank: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all" style={{ width: `${rank}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-amber-400 w-6 text-right">{rank}</span>
    </div>
  );
});

const MiniPipeline = memo(function MiniPipeline({ stages }: { stages: Record<ContactStatus, number> }) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {STATUS_ORDER.map((s) => {
        const count = stages[s] || 0;
        const c = STATUS_CONFIG[s];
        return (
          <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={`w-full h-1.5 rounded-full ${count > 0 ? c.bg.replace("/10", "/40") : "bg-white/[0.04]"} transition-colors`}
              title={`${c.label}: ${count}`}
            />
          </div>
        );
      })}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL COMPOSER PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface EmailComposerProps {
  dm: DecisionMaker;
  firm: InvestorContact;
  deck: InvestorDeck | null;
  onClose: () => void;
  onMarkSent: (dmId: string) => void;
}

function EmailComposerPanel({ dm, firm, deck, onClose, onMarkSent }: EmailComposerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});

  const templates = useMemo(() => getAllTemplates(), []);
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return Array.from(cats);
  }, [templates]);

  const handleSelectTemplate = useCallback((tid: string) => {
    setSelectedTemplateId(tid);
    const p = previewTemplate(tid, deck);
    setPreview(p);
  }, [deck]);

  const handleCompose = useCallback((): ComposedEmail | null => {
    if (!selectedTemplateId) return null;
    const firstName = dm.name.split(" ")[0];
    const lastName = dm.name.split(" ").slice(1).join(" ");
    return composeEmail(
      selectedTemplateId,
      {
        firstName,
        lastName,
        email: dm.email,
        title: dm.title,
        firmName: firm.name,
        investorFocus: firm.focusAreas[0] || "this space",
        notableInvestment: firm.notableExits[0]?.company || "similar companies",
      },
      deck,
      { senderName, ...extraVars },
    ) ?? null;
  }, [selectedTemplateId, dm, firm, deck, senderName, extraVars]);

  const composed = useMemo(() => handleCompose(), [handleCompose]);
  const stats = useMemo(() => preview ? getEmailStats(preview.body) : null, [preview]);

  const copyToClipboard = useCallback(async () => {
    if (!composed) return;
    const text = `Subject: ${composed.subject}\n\n${composed.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [composed]);

  const handleMarkSent = useCallback(() => {
    if (!composed) return;
    recordSentEmail(composed);
    recordSentEmailLog({
      templateId: composed.templateId,
      contactName: dm.name,
      firmName: firm.name,
      sentAt: new Date().toISOString(),
    });
    onMarkSent(dm.id);
    onClose();
  }, [composed, dm.id, dm.name, firm.name, onClose, onMarkSent]);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-[#0f172a] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Email Composer</h3>
            <p className="text-[10px] text-slate-500">{dm.name} &middot; {dm.title} &middot; {firm.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Your Name</label>
          <input
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            placeholder="Your name for signature"
            className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-sky-500/30"
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Select Template</label>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat}>
                <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1">{cat}</div>
                <div className="space-y-1">
                  {templates.filter(t => t.category === cat).map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-[11px] ${
                        selectedTemplateId === t.id
                          ? "border-sky-500/30 bg-sky-500/[0.06] text-sky-300"
                          : "border-white/[0.04] hover:border-white/[0.08] bg-white/[0.02] text-slate-300"
                      }`}
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedTemplateId && (
          <div>
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Custom Variables</label>
            <div className="grid grid-cols-2 gap-2">
              {["mutualConnection", "recentWin", "coInvestors", "notableInvestment", "availability"].map(key => (
                <div key={key}>
                  <label className="text-[9px] text-slate-600 capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                  <input
                    value={extraVars[key] || ""}
                    onChange={e => setExtraVars(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full text-[10px] px-2 py-1.5 rounded border border-white/[0.06] bg-white/[0.02] text-slate-300 outline-none focus:border-sky-500/30"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {preview && (
          <div>
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Preview</label>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                <span className="text-[9px] font-medium text-slate-500 uppercase">Subject:</span>
                <span className="text-[11px] text-slate-200">{composed?.subject || preview.subject}</span>
              </div>
              <div className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                {composed?.body || preview.body}
              </div>
              {stats && (
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06] text-[9px] text-slate-500">
                  <span>{stats.words} words</span>
                  <span>{stats.chars} chars</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{stats.readTime}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/[0.08] flex items-center gap-2">
        <button
          onClick={copyToClipboard}
          disabled={!composed}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] text-xs text-slate-300 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
        <button
          onClick={handleMarkSent}
          disabled={!composed}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500 text-white text-xs font-medium hover:bg-sky-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Mark as Sent
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVESTOR DECK PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function DeckUploadPanel({ deck, onParse }: { deck: InvestorDeck | null; onParse: (text: string) => void }) {
  const [rawText, setRawText] = useState("");
  const [expanded, setExpanded] = useState(true);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || "");
      onParse(text);
      setRawText("");
    };
    reader.readAsText(file);
  }, [onParse]);

  const summary = useMemo(() => deck ? getDeckSummary(deck) : "No investor deck uploaded yet.", [deck]);
  const templateVars = useMemo(() => deck ? getTemplateVars(deck) : [], [deck]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xs font-semibold text-slate-200">Investor Deck</h3>
            <p className="text-[10px] text-slate-500">
              {deck ? `Parsed ${deck.sections.length} sections &middot; ${templateVars.length} variables` : "Paste deck text or upload a file"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste your investor deck content here (Markdown, text extract, or structured outline)..."
                className="w-full h-20 text-[11px] px-3 py-2 rounded-lg border border-white/[0.08] bg-[#0f172a] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30 resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { if (rawText.trim()) { onParse(rawText); setRawText(""); } }}
                disabled={!rawText.trim()}
                className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-[11px] font-medium hover:bg-violet-400 disabled:opacity-30 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                Parse
              </button>
              <label className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 justify-center">
                <Upload className="w-3 h-3" />
                Upload
                <input type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {deck && (
            <div className="p-2.5 rounded-lg border border-violet-500/10 bg-violet-500/[0.03]">
              <div className="text-[9px] font-semibold text-violet-400 uppercase tracking-wider mb-1">Deck Summary</div>
              <div className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed">{summary}</div>
            </div>
          )}

          {deck && deck.sections.length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Extracted Sections</div>
              <div className="flex flex-wrap gap-1">
                {deck.sections.slice(0, 8).map(sec => (
                  <span key={sec.id} className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.04]">
                    {sec.title}
                  </span>
                ))}
                {deck.sections.length > 8 && (
                  <span className="text-[9px] px-2 py-0.5 text-slate-500">+{deck.sections.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          {templateVars.length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Available Variables</div>
              <div className="flex flex-wrap gap-1">
                {templateVars.slice(0, 12).map(v => (
                  <span key={v.key} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/5 text-emerald-400/70 border border-emerald-500/10" title={v.value}>
                    {v.key}
                  </span>
                ))}
                {templateVars.length > 12 && (
                  <span className="text-[9px] text-slate-500">+{templateVars.length - 12}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function PipelineSummary({ investors }: { investors: InvestorContact[] }) {
  const counts = useMemo(() => {
    const c: Record<ContactStatus, number> = { "not-contacted": 0, "contacted": 0, "responded": 0, "meeting": 0, "passed": 0, "invested": 0 };
    for (const inv of investors) {
      for (const dm of inv.decisionMakers) {
        c[dm.contactStatus] = (c[dm.contactStatus] || 0) + 1;
      }
    }
    return c;
  }, [investors]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline ({total} contacts)</span>
      </div>
      <div className="flex gap-1">
        {STATUS_ORDER.map(s => {
          const c = STATUS_CONFIG[s];
          const count = counts[s];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={s} className="flex-1" title={`${c.label}: ${count}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] text-slate-600">{c.label.split(" ")[0]}</span>
                <span className={`text-[8px] font-semibold ${c.color}`}>{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div className={`h-full rounded-full ${c.bg.replace("/10", "/50")}`} style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function InvestorContactSheets() {
  const [investors, setInvestors] = useState<InvestorContact[]>(loadInvestors);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorContact | null>(null);
  const [selectedDM, setSelectedDM] = useState<DecisionMaker | null>(null);
  const [deck, setDeck] = useState<InvestorDeck | null>(loadDeck);
  const [newNote, setNewNote] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(loadExpanded);

  useEffect(() => { saveInvestors(investors); }, [investors]);
  useEffect(() => { saveExpanded(expandedSections); }, [expandedSections]);

  const handleParseDeck = useCallback((text: string) => {
    const parsed = parseDeck(text);
    setDeck(parsed);
  }, []);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  }, []);

  const fitScores = useMemo(() => {
    const map: Record<string, number> = {};
    if (!deck) return map;
    for (const inv of investors) {
      map[inv.id] = computeFitScore(inv, deck);
    }
    return map;
  }, [investors, deck]);

  const filteredInvestors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return investors.filter(inv => {
      if (q) {
        const inName = inv.name.toLowerCase().includes(q);
        const inThesis = inv.thesis.toLowerCase().includes(q);
        const inFocus = inv.focusAreas.some(fa => fa.toLowerCase().includes(q));
        const inLocation = inv.location.toLowerCase().includes(q);
        const inDMs = inv.decisionMakers.some(dm =>
          dm.name.toLowerCase().includes(q) ||
          dm.title.toLowerCase().includes(q) ||
          dm.email.toLowerCase().includes(q)
        );
        const inPortfolio = inv.portfolio.some(p => p.name.toLowerCase().includes(q));
        if (!inName && !inThesis && !inFocus && !inLocation && !inDMs && !inPortfolio) return false;
      }
      if (typeFilter !== "all" && inv.type !== typeFilter) return false;
      if (locationFilter !== "all" && !inv.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (statusFilter !== "all") {
        const hasStatus = inv.decisionMakers.some(dm => dm.contactStatus === statusFilter);
        if (!hasStatus) return false;
      }
      return true;
    });
  }, [investors, searchQuery, typeFilter, statusFilter, locationFilter]);

  const locations = useMemo(() => {
    const locs = new Set(investors.map(inv => inv.location.split(",")[0]?.trim()).filter(Boolean));
    return Array.from(locs).sort();
  }, [investors]);

  const addNote = useCallback(() => {
    if (!newNote.trim() || !selectedInvestor) return;
    const updated: InvestorContact = {
      ...selectedInvestor,
      contactHistory: [
        { date: new Date().toISOString().split("T")[0], type: "Note", notes: newNote, participant: "You", outcome: "Added" },
        ...selectedInvestor.contactHistory,
      ],
      lastContact: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    setSelectedInvestor(updated);
    setInvestors(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
    setNewNote("");
  }, [newNote, selectedInvestor]);

  const updateDMStatus = useCallback((dmId: string, newStatus: ContactStatus) => {
    if (!selectedInvestor) return;
    const updated: InvestorContact = {
      ...selectedInvestor,
      decisionMakers: selectedInvestor.decisionMakers.map(dm =>
        dm.id === dmId ? { ...dm, contactStatus: newStatus } : dm
      ),
    };
    setSelectedInvestor(updated);
    setInvestors(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
  }, [selectedInvestor]);

  const handleMarkSent = useCallback((dmId: string) => {
    if (!selectedInvestor) return;
    const updated: InvestorContact = {
      ...selectedInvestor,
      decisionMakers: selectedInvestor.decisionMakers.map(dm =>
        dm.id === dmId ? { ...dm, contactStatus: "contacted" as ContactStatus } : dm
      ),
    };
    setSelectedInvestor(updated);
    setInvestors(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
    setSelectedDM(null);
  }, [selectedInvestor]);

  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(filteredInvestors);
    downloadBlob(csv, `investor-contacts-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
  }, [filteredInvestors]);

  const handleExportJSON = useCallback(() => {
    const json = JSON.stringify(filteredInvestors, null, 2);
    downloadBlob(json, `investor-contacts-${new Date().toISOString().split("T")[0]}.json`, "application/json");
  }, [filteredInvestors]);

  const totalDMs = useMemo(() => investors.reduce((acc, i) => acc + i.decisionMakers.length, 0), [investors]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Investor Firm Directory
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {filteredInvestors.length} of {investors.length} firms shown &middot; {totalDMs} decision makers &middot; {investors.reduce((acc, i) => acc + i.portfolioCompanies, 0)} portfolio companies
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search names, firms, focus areas, thesis..."
              className="text-[11px] pl-6 pr-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500/30 w-56"
            />
          </div>
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
              showFilters ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-300" : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200"
            }`}
          >
            <Filter className="w-3 h-3" />
            Filters
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
            >
              <Download className="w-3 h-3" />
              JSON
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-white/[0.06] bg-[#0f172a] text-slate-200 outline-none focus:border-amber-500/30"
          >
            <option value="all">All Types</option>
            <option value="VC">VC</option>
            <option value="Angel">Angel</option>
            <option value="PE">PE</option>
            <option value="Strategic">Strategic</option>
            <option value="Family Office">Family Office</option>
            <option value="Growth Equity">Growth Equity</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-white/[0.06] bg-[#0f172a] text-slate-200 outline-none focus:border-amber-500/30"
          >
            <option value="all">All Statuses</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-white/[0.06] bg-[#0f172a] text-slate-200 outline-none focus:border-amber-500/30"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <button
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setLocationFilter("all"); setSearchQuery(""); }}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      )}

      <DeckUploadPanel deck={deck} onParse={handleParseDeck} />
      <PipelineSummary investors={investors} />

      {investors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Investor Database</h2>
          <p className="text-sm text-slate-400 max-w-lg mb-6">
            Add investors manually or connect Crunchbase API to import verified firm data,
            partners, and contact information.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
            {[
              { label: "Firm Profiles", desc: "AUM, thesis, focus areas, fund size, and check size" },
              { label: "Decision Makers", desc: "Partner bios, emails, LinkedIn, and contact status" },
              { label: "Portfolio & Exits", desc: "Track investments, notable exits, and co-investors" },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-xs font-medium text-slate-300 mb-1">{item.label}</div>
                <div className="text-[10px] text-slate-500">{item.desc}</div>
                <div className="text-[10px] text-slate-600 mt-2 italic">No data</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {investors.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredInvestors.map(inv => {
          const dmStages = inv.decisionMakers.reduce((acc, dm) => {
            acc[dm.contactStatus] = (acc[dm.contactStatus] || 0) + 1;
            return acc;
          }, {} as Record<ContactStatus, number>);

          return (
            <div
              key={inv.id}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedInvestor?.id === inv.id
                  ? "border-amber-500/30 bg-amber-500/[0.04]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
              onClick={() => { setSelectedInvestor(inv); setSelectedDM(null); }}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-sm font-bold text-amber-300 shrink-0">
                  {inv.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{inv.name}</div>
                  <div className="text-[10px] text-slate-500">{inv.type} &middot; {inv.location} &middot; Est. {inv.founded}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {deck && <FitScoreBadge score={fitScores[inv.id] || 0} />}
                  <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                    {inv.checkSize}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-2.5">
                {inv.focusAreas.slice(0, 4).map(fa => (
                  <span key={fa} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{fa}</span>
                ))}
                {inv.focusAreas.length > 4 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-500">+{inv.focusAreas.length - 4}</span>
                )}
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{inv.portfolioCompanies} portfolio</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inv.decisionMakers.length} contacts</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inv.lastContact}</span>
              </div>

              <SignalRankBar rank={inv.signalRank} />
              <MiniPipeline stages={dmStages} />
            </div>
          );
        })}
      </div>
      )}

      {selectedInvestor && (
        <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center text-lg font-bold text-amber-200">
                {selectedInvestor.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">{selectedInvestor.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span>{selectedInvestor.type}</span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{selectedInvestor.location}</span>
                  <span>&middot;</span>
                  <span>AUM {selectedInvestor.aum}</span>
                  <span>&middot;</span>
                  <span>Fund: {selectedInvestor.fundSize}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deck && <FitScoreBadge score={fitScores[selectedInvestor.id] || 0} />}
              <div className="text-right mr-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">{selectedInvestor.reputationScore}</span>
                </div>
                <div className="text-[9px] text-slate-500">Reputation</div>
              </div>
              <button
                onClick={() => { setSelectedInvestor(null); setSelectedDM(null); }}
                className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Signal Rank", value: `${selectedInvestor.signalRank}/100`, icon: BarChart3 },
              { label: "Avg Initial", value: selectedInvestor.avgInitialCheck, icon: DollarSign },
              { label: "Term Sheet", value: selectedInvestor.speedToTermSheet, icon: Clock },
              { label: "Follow-On", value: selectedInvestor.followOnRate, icon: TrendingUp },
            ].map(stat => (
              <div key={stat.label} className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[9px] text-slate-500 mb-0.5 flex items-center gap-1"><stat.icon className="w-3 h-3" />{stat.label}</div>
                <div className="text-xs font-semibold text-slate-200">{stat.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Co-Investors</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedInvestor.coInvestors.map(ci => (
                <span key={ci} className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-300">{ci}</span>
              ))}
            </div>
          </div>

          <div>
            <button onClick={() => toggleSection("thesis")} className="flex items-center gap-1.5 mb-1.5 w-full">
              {expandedSections.thesis ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
              <FileText className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Investment Thesis</span>
            </button>
            {expandedSections.thesis && (
              <div className="text-xs text-slate-300 leading-relaxed pl-4">{selectedInvestor.thesis}</div>
            )}
          </div>

          <div>
            <button onClick={() => toggleSection("decisionMakers")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.decisionMakers ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
              <Users className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Decision Makers ({selectedInvestor.decisionMakers.length})</span>
            </button>
            {expandedSections.decisionMakers && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-600">
                      <th className="pb-1.5 font-medium">Name</th>
                      <th className="pb-1.5 font-medium">Title</th>
                      <th className="pb-1.5 font-medium">Contact</th>
                      <th className="pb-1.5 font-medium">Status</th>
                      <th className="pb-1.5 font-medium">Actions</th>
                      <th className="pb-1.5 font-medium">Notable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvestor.decisionMakers.map(dm => (
                      <tr key={dm.id} className="border-t border-white/[0.06]">
                        <td className="py-2">
                          <div className="text-xs font-medium text-slate-200">{dm.name}</div>
                          <div className="text-[9px] text-slate-500">{dm.education}</div>
                        </td>
                        <td className="py-2 text-xs text-slate-400">{dm.title}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-sky-400/70" />
                            <span className="text-[10px] text-sky-400">{dm.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Linkedin className="w-3 h-3 text-sky-400/70" />
                            <a href={`https://${dm.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5">
                              LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </td>
                        <td className="py-2">
                          <select
                            value={dm.contactStatus}
                            onChange={e => updateDMStatus(dm.id, e.target.value as ContactStatus)}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] bg-[#0f172a] text-slate-300 outline-none"
                          >
                            {STATUS_ORDER.map(s => (
                              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => setSelectedDM(dm)}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Email
                          </button>
                        </td>
                        <td className="py-2">
                          <div className="text-[9px] text-slate-400 max-w-[140px] truncate" title={dm.notableInvestments.join(", ")}>
                            {dm.notableInvestments.slice(0, 2).join(", ")}{dm.notableInvestments.length > 2 && "+"}
                          </div>
                          <div className="text-[9px] text-slate-600 mt-0.5 italic line-clamp-2 max-w-[140px]" title={dm.personalityNotes}>
                            &ldquo;{dm.personalityNotes}&rdquo;
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <button onClick={() => toggleSection("portfolio")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.portfolio ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
              <Briefcase className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Portfolio ({selectedInvestor.portfolio.length})</span>
            </button>
            {expandedSections.portfolio && (
              <div className="flex flex-wrap gap-1.5">
                {selectedInvestor.portfolio.map(co => (
                  <span
                    key={co.name}
                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300"
                    title={`${co.sector} &middot; ${co.valuation} &middot; ${co.yearInvested}`}
                  >
                    {co.name}
                    <span className="text-slate-500">&middot;</span>
                    <span className="text-slate-400">{co.stage}</span>
                    {co.isLead && <Award className="w-3 h-3 text-amber-400" />}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <button onClick={() => toggleSection("dealFlow")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.dealFlow ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
              <Target className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Deal Flow ({selectedInvestor.dealFlow.length})</span>
            </button>
            {expandedSections.dealFlow && (
              <div className="space-y-1.5">
                {selectedInvestor.dealFlow.map((df, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-200">{df.company}</span>
                      <span className="text-[10px] text-slate-500">{df.stage}</span>
                      <span className="text-[10px] text-emerald-400">{df.amount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500">{df.leadPartner}</span>
                      <DealStatusBadge status={df.status} />
                      <span className="text-[9px] text-slate-600">{df.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <button onClick={() => toggleSection("notableExits")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.notableExits ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
              <TrendingUp className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notable Exits</span>
            </button>
            {expandedSections.notableExits && (
              <div className="flex flex-wrap gap-2">
                {selectedInvestor.notableExits.map(exit => (
                  <span key={exit.company} className="text-[10px] px-2 py-1 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-300">
                    {exit.company} <span className="text-emerald-500">&middot; {exit.return}x</span> <span className="text-slate-500">({exit.year})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <button onClick={() => toggleSection("contactHistory")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.contactHistory ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
              <Calendar className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact History</span>
            </button>
            {expandedSections.contactHistory && (
              <div className="space-y-1.5">
                {selectedInvestor.contactHistory.map((ch, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400">{ch.date}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">{ch.type}</span>
                        <span className="text-[10px] text-amber-400/70">{ch.participant}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{ch.notes}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Outcome: {ch.outcome}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <MessageSquare className="w-4 h-4 text-slate-500 shrink-0 mt-1.5" />
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addNote()}
              placeholder="Add contact note..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-500/30"
            />
            <button
              onClick={addNote}
              className="text-xs px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
            <a href={`https://${selectedInvestor.website}`} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors">
              <Globe className="w-3 h-3" />{selectedInvestor.website}<ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a href={`https://${selectedInvestor.crunchbaseUrl}`} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors">
              <ExternalLink className="w-3 h-3" />Crunchbase<ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}

      {selectedDM && selectedInvestor && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSelectedDM(null)} />
          <EmailComposerPanel
            dm={selectedDM}
            firm={selectedInvestor}
            deck={deck}
            onClose={() => setSelectedDM(null)}
            onMarkSent={handleMarkSent}
          />
        </>
      )}
    </div>
  );
}
