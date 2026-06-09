import { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  TrendingUp,
  TrendingDown,
  Mail,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  BarChart3,
  Send,
  Ban,
  Server,
  Lock,
  FileCheck,
  Radio,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

export interface WarmupDay {
  day: number;
  date: string;
  emailsSent: number;
  emailsReceived: number;
  replyRate: number;
  inboxRate: number;
  spamRate: number;
  domain: string;
}

export interface InboxProvider {
  name: string;
  icon: string;
  inboxPct: number;
  spamPct: number;
  missingPct: number;
  status: "excellent" | "good" | "warning" | "critical";
  lastTested: string;
}

export interface SpamRule {
  name: string;
  passed: boolean;
  score: number;
  description: string;
  detail?: string;
}

export interface BlacklistEntry {
  name: string;
  listed: boolean;
  checkedAt: string;
  severity: "critical" | "warning" | "info";
}

export interface DomainReputation {
  domain: string;
  score: number;
  previousScore: number;
  status: "excellent" | "good" | "fair" | "poor" | "critical" | "unknown";
  senderscore: number;
  ciscoTalos: string;
  googlePostmaster: string;
  microsoftSNDS: string;
  trend: "up" | "down" | "stable" | "flat";
  trendValue: number;
  authRecords: {
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    dmarcPolicy: string;
    bimi: boolean;
  };
  dnsRecords: {
    mx: boolean;
    a: boolean;
    ptr: boolean;
  };
  volumeHistory: { date: string; sent: number; delivered: number }[];
}

export interface EmailWarmingState {
  reputation: DomainReputation;
  warmupProgress: WarmupDay[];
  inboxProviders: InboxProvider[];
  spamRules: SpamRule[];
  blacklists: BlacklistEntry[];
  isWarming: boolean;
  warmupStartDate: string;
  targetDailyVolume: number;
  currentDailyVolume: number;
  warmupPhase: "ramp-up" | "steady" | "maintenance";
}

// ─── Empty State ─────────────────────────────────────────────────────

const EMPTY_STATE: EmailWarmingState = {
  reputation: {
    domain: "",
    score: 0,
    previousScore: 0,
    status: "unknown",
    senderscore: 0,
    ciscoTalos: "Unknown",
    googlePostmaster: "Unknown",
    microsoftSNDS: "Unknown",
    trend: "flat",
    trendValue: 0,
    authRecords: { spf: false, dkim: false, dmarc: false, dmarcPolicy: "", bimi: false },
    dnsRecords: { mx: false, a: false, ptr: false },
    volumeHistory: [],
  },
  warmupProgress: [],
  inboxProviders: [],
  spamRules: [],
  blacklists: [],
  isWarming: false,
  warmupStartDate: "",
  targetDailyVolume: 0,
  currentDailyVolume: 0,
  warmupPhase: "ramp-up",
};

// ─── localStorage helpers ────────────────────────────────────────────

const STORAGE_KEY = "sw_email_warming";

function loadState(): EmailWarmingState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch { /* silent */ }
  return EMPTY_STATE;
}

function saveState(data: EmailWarmingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Helper Components ───────────────────────────────────────────────

function ScoreRing({ score, size = 64, stroke = 6 }: { score: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#10b981" : score >= 75 ? "#f59e0b" : score >= 60 ? "#f97316" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function StatusBadge({ status, text }: { status: string; text: string }) {
  const classes: Record<string, string> = {
    excellent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    good: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    fair: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    warning: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    poor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    trusted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    unknown: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${classes[status] || classes.good}`}>
      {text}
    </span>
  );
}

// ─── Empty State View ────────────────────────────────────────────────

function EmptyStateView({ onSetDomain }: { onSetDomain: (domain: string) => void }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) onSetDomain(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-sky-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200 mb-1.5">
        No email warming data
      </h3>
      <p className="text-xs text-slate-500 max-w-sm mb-6">
        Enter your domain to start tracking reputation and warmup progress.
      </p>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-sm">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] focus-within:border-sky-500/30 focus-within:bg-white/[0.04] transition-colors">
          <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="example.com"
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-medium hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Track
        </button>
      </form>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function EmailWarming() {
  const [data, setData] = useState<EmailWarmingState>(loadState);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    reputation: true,
    warmup: true,
    inbox: true,
    spam: true,
    blacklist: true,
  });

  useEffect(() => { saveState(data); }, [data]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetDomain = (domain: string) => {
    setData(prev => ({
      ...prev,
      reputation: { ...prev.reputation, domain },
    }));
  };

  // ── Guarded derived values ──
  const hasDomain = !!data.reputation.domain;
  const currentDay = data.warmupProgress.length > 0
    ? data.warmupProgress[data.warmupProgress.length - 1]
    : null;
  const avgInboxRate = data.inboxProviders.length > 0
    ? Math.round(data.inboxProviders.reduce((acc, p) => acc + p.inboxPct, 0) / data.inboxProviders.length)
    : 0;
  const totalSpamScore = data.spamRules.filter(r => !r.passed).reduce((acc, r) => acc + r.score, 0);
  const failedRules = data.spamRules.filter(r => !r.passed).length;

  const toggleWarming = () => {
    setData(prev => ({ ...prev, isWarming: !prev.isWarming }));
  };

  // ── Empty state ──
  if (!hasDomain) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              Email Deliverability & Warmup
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Monitor domain reputation, warmup progress, and inbox placement
            </p>
          </div>
        </div>
        <EmptyStateView onSetDomain={handleSetDomain} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            Email Deliverability & Warmup
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {data.reputation.domain} {currentDay && (
              <>
                · Phase: <span className="text-sky-400 capitalize">{data.warmupPhase}</span> · Day {currentDay.day} of warmup
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWarming}
            className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              data.isWarming
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            {data.isWarming ? <><Radio className="w-3 h-3" />Warming Active</> : <><Ban className="w-3 h-3" />Warming Paused</>}
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
          <ScoreRing score={data.reputation.score} size={52} stroke={5} />
          <div>
            <div className="text-[10px] text-slate-500">Domain Reputation</div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-slate-100">{data.reputation.score}/100</span>
              {data.reputation.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
              {data.reputation.trend === "down" && <TrendingDown className="w-3 h-3 text-rose-400" />}
            </div>
            {data.reputation.trendValue !== 0 && (
              <div className="text-[9px] text-slate-500">
                {data.reputation.trendValue > 0 ? "+" : ""}{data.reputation.trendValue} this week
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-1.5 mb-1">
            <Inbox className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-500">Avg Inbox Placement</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">{avgInboxRate}%</div>
          <div className="text-[9px] text-slate-500">
            {data.inboxProviders.length > 0 ? `across ${data.inboxProviders.length} providers` : "No providers tested"}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-1.5 mb-1">
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] text-slate-500">Today Sent</span>
          </div>
          <div className="text-xl font-bold text-sky-400">{currentDay?.emailsSent ?? 0}</div>
          <div className="text-[9px] text-slate-500">
            {data.targetDailyVolume > 0 ? `target: ${data.targetDailyVolume}/day` : "No target set"}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-500">Spam Score</span>
          </div>
          <div className="text-xl font-bold text-amber-400">{totalSpamScore.toFixed(1)}</div>
          <div className="text-[9px] text-slate-500">
            {data.spamRules.length > 0 ? `${failedRules} of ${data.spamRules.length} rules flagged` : "No rules checked"}
          </div>
        </div>
      </div>

      {/* Section 1: Domain Reputation Detail */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <button onClick={() => toggleSection("reputation")} className="flex items-center gap-1.5 mb-3 w-full">
          {expandedSections.reputation ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">Domain Reputation Details</span>
          <StatusBadge status={data.reputation.status} text={data.reputation.status.charAt(0).toUpperCase() + data.reputation.status.slice(1)} />
        </button>

        {expandedSections.reputation && (
          <div className="space-y-3">
            {/* Third-party reputation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "SenderScore", value: `${data.reputation.senderscore}`, status: data.reputation.senderscore >= 90 ? "excellent" : "good", sub: "out of 100" },
                { label: "Cisco Talos", value: data.reputation.ciscoTalos, status: "trusted", sub: "reputation" },
                { label: "Google Postmaster", value: data.reputation.googlePostmaster, status: "high", sub: "reputation" },
                { label: "Microsoft SNDS", value: data.reputation.microsoftSNDS, status: "green", sub: "status" },
              ].map(item => (
                <div key={item.label} className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[9px] text-slate-500 mb-0.5">{item.label}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">{item.value}</span>
                    <StatusBadge status={item.status} text={item.status.charAt(0).toUpperCase() + item.status.slice(1)} />
                  </div>
                  <div className="text-[9px] text-slate-600">{item.sub}</div>
                </div>
              ))}
            </div>

            {/* Auth Records */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Authentication Records</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { name: "SPF", pass: data.reputation.authRecords.spf, icon: FileCheck, detail: "Valid" },
                  { name: "DKIM", pass: data.reputation.authRecords.dkim, icon: Lock, detail: "Signed" },
                  { name: "DMARC", pass: data.reputation.authRecords.dmarc, icon: Shield, detail: data.reputation.authRecords.dmarcPolicy },
                  { name: "BIMI", pass: data.reputation.authRecords.bimi, icon: Globe, detail: data.reputation.authRecords.bimi ? "Configured" : "Not Set" },
                  { name: "Reverse DNS", pass: data.reputation.dnsRecords.ptr, icon: Server, detail: "Valid PTR" },
                ].map(record => (
                  <div key={record.name} className={`p-2 rounded-lg border ${record.pass ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-rose-500/20 bg-rose-500/[0.04]"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <record.icon className={`w-3.5 h-3.5 ${record.pass ? "text-emerald-400" : "text-rose-400"}`} />
                      <span className={`text-[10px] font-semibold ${record.pass ? "text-emerald-400" : "text-rose-400"}`}>{record.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {record.pass
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        : <XCircle className="w-3 h-3 text-rose-400" />
                      }
                      <span className="text-[9px] text-slate-400">{record.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Warmup Progress */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <button onClick={() => toggleSection("warmup")} className="flex items-center gap-1.5 mb-3 w-full">
          {expandedSections.warmup ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">Warmup Progress</span>
          {currentDay && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-1">Day {currentDay.day}</span>
          )}
        </button>

        {expandedSections.warmup && (
          <div className="space-y-3">
            {data.warmupProgress.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No warmup data yet. Start warming to see progress.</p>
            ) : (
              <>
                {/* Progress bar to target */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all"
                      style={{ width: `${data.targetDailyVolume > 0 ? (data.currentDailyVolume / data.targetDailyVolume) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{data.currentDailyVolume} / {data.targetDailyVolume}</span>
                </div>

                {/* Daily bar chart */}
                <div className="flex items-end gap-[3px] h-28">
                  {data.warmupProgress.map((day, i) => {
                    const maxSent = Math.max(...data.warmupProgress.map(d => d.emailsSent), 1);
                    const barHeight = (day.emailsSent / maxSent) * 100;
                    const isToday = i === data.warmupProgress.length - 1;
                    return (
                      <div key={day.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[9px] text-slate-200 px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                          {day.emailsSent} sent · {day.inboxRate}% inbox
                        </div>
                        <div
                          className={`w-full rounded-sm transition-all ${isToday ? "bg-gradient-to-t from-sky-500 to-sky-400" : "bg-white/[0.08] group-hover:bg-white/[0.14]"}`}
                          style={{ height: `${barHeight}%` }}
                        />
                        <span className="text-[8px] text-slate-600">{day.date.split(" ")[1]}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Warmup stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-center">
                    <div className="text-[10px] text-slate-500 mb-0.5">Reply Rate</div>
                    <div className="text-sm font-bold text-emerald-400">{currentDay?.replyRate ?? 0}%</div>
                  </div>
                  <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-center">
                    <div className="text-[10px] text-slate-500 mb-0.5">Inbox Rate</div>
                    <div className="text-sm font-bold text-sky-400">{currentDay?.inboxRate ?? 0}%</div>
                  </div>
                  <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-center">
                    <div className="text-[10px] text-slate-500 mb-0.5">Spam Rate</div>
                    <div className="text-sm font-bold text-rose-400">{currentDay?.spamRate ?? 0}%</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Inbox Placement Test */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <button onClick={() => toggleSection("inbox")} className="flex items-center gap-1.5 mb-3 w-full">
          {expandedSections.inbox ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
          <Mail className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-slate-200">Inbox Placement Test</span>
          {data.inboxProviders.length > 0 && (
            <span className="text-[10px] text-slate-500 ml-1">Last tested: {data.inboxProviders[0].lastTested}</span>
          )}
        </button>

        {expandedSections.inbox && (
          <div className="space-y-2">
            {data.inboxProviders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No inbox placement tests yet. Run a test to see results.</p>
            ) : (
              data.inboxProviders.map(provider => (
                <div key={provider.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    provider.status === "excellent" ? "bg-emerald-500/10" :
                    provider.status === "good" ? "bg-sky-500/10" :
                    provider.status === "warning" ? "bg-amber-500/10" : "bg-rose-500/10"
                  }`}>
                    <Mail className={`w-4 h-4 ${
                      provider.status === "excellent" ? "text-emerald-400" :
                      provider.status === "good" ? "text-sky-400" :
                      provider.status === "warning" ? "text-amber-400" : "text-rose-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-200">{provider.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-[120px]">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400" style={{ width: `${provider.inboxPct}%` }} />
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium">{provider.inboxPct}% inbox</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">
                      <span className="text-rose-400">{provider.spamPct}% spam</span>
                      {provider.missingPct > 0 && <span className="text-amber-400 ml-1.5">{provider.missingPct}% missing</span>}
                    </div>
                    <StatusBadge status={provider.status} text={provider.status.charAt(0).toUpperCase() + provider.status.slice(1)} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Section 4: Spam Score Checker */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <button onClick={() => toggleSection("spam")} className="flex items-center gap-1.5 mb-3 w-full">
          {expandedSections.spam ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-200">Spam Score Checker</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ml-1 ${
            totalSpamScore < 2 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            totalSpamScore < 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
            "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}>
            Score: {totalSpamScore.toFixed(1)}/10
          </span>
        </button>

        {expandedSections.spam && (
          <div className="space-y-1.5">
            {data.spamRules.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No spam rules checked yet.</p>
            ) : (
              data.spamRules.map(rule => (
                <div
                  key={rule.name}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                    rule.passed ? "border-white/[0.04] bg-white/[0.02]" : "border-amber-500/10 bg-amber-500/[0.02]"
                  }`}
                >
                  {rule.passed
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  }
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${rule.passed ? "text-slate-200" : "text-amber-300"}`}>{rule.name}</span>
                      {!rule.passed && rule.score > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">+{rule.score} pts</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{rule.description}</div>
                    {rule.detail && (
                      <div className={`text-[9px] mt-1 px-2 py-1 rounded ${rule.passed ? "bg-white/[0.03] text-slate-400" : "bg-amber-500/[0.05] text-amber-400/70"}`}>
                        {rule.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Section 5: Blacklist Monitor */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <button onClick={() => toggleSection("blacklist")} className="flex items-center gap-1.5 mb-3 w-full">
          {expandedSections.blacklist ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
          <Ban className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-semibold text-slate-200">Blacklist Monitor</span>
          {data.blacklists.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-1">
              {data.blacklists.filter(b => !b.listed).length}/{data.blacklists.length} Clean
            </span>
          )}
        </button>

        {expandedSections.blacklist && (
          <div className="space-y-1.5">
            {data.blacklists.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No blacklist checks performed yet.</p>
            ) : (
              data.blacklists.map(bl => (
                <div
                  key={bl.name}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    bl.listed ? "border-rose-500/20 bg-rose-500/[0.04]" : "border-white/[0.04] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {bl.listed
                      ? <ShieldX className="w-4 h-4 text-rose-400" />
                      : <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    }
                    <div>
                      <span className={`text-xs font-medium ${bl.listed ? "text-rose-400" : "text-slate-200"}`}>{bl.name}</span>
                      <div className="text-[9px] text-slate-500">Checked: {bl.checkedAt}</div>
                    </div>
                  </div>
                  <StatusBadge
                    status={bl.listed ? "critical" : bl.severity}
                    text={bl.listed ? "LISTED" : "Clean"}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Volume History Chart */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-200">Send Volume History</span>
          <span className="text-[10px] text-slate-500">({data.reputation.volumeHistory.length} days)</span>
        </div>
        {data.reputation.volumeHistory.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No volume history yet.</p>
        ) : (
          <>
            <div className="flex items-end gap-[3px] h-24">
              {data.reputation.volumeHistory.map((v, i) => {
                const maxVol = Math.max(...data.reputation.volumeHistory.map(d => d.sent), 1);
                const sentHeight = (v.sent / maxVol) * 100;
                const delHeight = (v.delivered / maxVol) * 100;
                const isLast = i === data.reputation.volumeHistory.length - 1;
                return (
                  <div key={v.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[9px] text-slate-200 px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                      {v.sent} sent · {v.delivered} del
                    </div>
                    <div className="w-full flex justify-center gap-[1px] items-end" style={{ height: `${sentHeight}%` }}>
                      <div className={`w-full rounded-sm ${isLast ? "bg-sky-500/40" : "bg-sky-500/20"}`} style={{ height: "100%" }} />
                    </div>
                    <div className="w-full flex justify-center" style={{ height: `${Math.max(delHeight, 2)}%`, marginTop: "-1px" }}>
                      <div className={`w-3/4 rounded-sm ${isLast ? "bg-emerald-500/60" : "bg-emerald-500/30"}`} style={{ height: "100%" }} />
                    </div>
                    <span className="text-[7px] text-slate-600">{v.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-sky-500/30" />
                <span className="text-[9px] text-slate-500">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" />
                <span className="text-[9px] text-slate-500">Delivered</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
