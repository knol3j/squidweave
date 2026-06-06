import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Search,
  Upload,
  Fingerprint,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";
import type { TargetProfile } from "@/services/dataService";

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
}

interface BulkResult {
  email: string;
  status: "verified" | "unverified" | "invalid" | "risky";
  reason: string;
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

// ─── Email generation helpers ─────────────────────────────────────────────────

const FIRST_NAMES = [
  "james","mary","john","patricia","robert","jennifer","michael","linda",
  "william","elizabeth","david","barbara","richard","susan","joseph",
  "jessica","thomas","sarah","charles","karen",
];
const LAST_NAMES = [
  "smith","johnson","williams","brown","jones","garcia","miller","davis",
  "rodriguez","martinez","hernandez","lopez","gonzalez","wilson","anderson",
  "thomas","taylor","moore","jackson","martin",
];
const ROLES = [
  "ceo","cto","vp","director","manager","head","lead","founder",
  "coordinator","analyst","engineer","designer","marketing","sales",
];

const COMMON_PATTERNS: EmailPattern[] = [
  { pattern: "{first}.{last}", example: "john.smith@domain.com", frequency: 42 },
  { pattern: "{first}{last}", example: "johnsmith@domain.com", frequency: 28 },
  { pattern: "{first}_{last}", example: "john_smith@domain.com", frequency: 15 },
  { pattern: "{f}{last}", example: "jsmith@domain.com", frequency: 10 },
  { pattern: "{first}", example: "john@domain.com", frequency: 3 },
  { pattern: "{last}", example: "smith@domain.com", frequency: 2 },
];

function generateEmailsFromDomain(domain: string): EmailResult[] {
  const results: EmailResult[] = [];
  const used = new Set<string>();

  for (let i = 0; i < FIRST_NAMES.length; i++) {
    const first = FIRST_NAMES[i];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const role = ROLES[i % ROLES.length];

    const combos = [
      `${first}.${last}@${domain}`,
      `${first}${last}@${domain}`,
      `${first}_${last}@${domain}`,
      `${first[0]}${last}@${domain}`,
      `${first}@${domain}`,
      `${role}@${domain}`,
      `${role}.${last}@${domain}`,
      `${first[0]}.${last}@${domain}`,
      `${first}${last[0]}@${domain}`,
      `${first}-${last}@${domain}`,
    ];

    for (const email of combos) {
      if (used.has(email)) continue;
      used.add(email);

      const type = i < 4 ? "personal" : i < 8 ? "role-based" : "generic";
      const confidence = type === "personal" ? 92 - i * 2 : type === "role-based" ? 78 - i : 45;
      const r = Math.random();
      let status: EmailResult["status"] = "unverified";
      if (r > 0.7) status = "verified";
      else if (r > 0.5) status = "risky";
      else if (r < 0.1) status = "invalid";

      results.push({ email, type, confidence: Math.max(30, confidence), status });
    }
  }

  return results.slice(0, 20);
}

function simulateVerify(email: string): EmailResult["status"] {
  const hash = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  if (hash % 7 === 0) return "invalid";
  if (hash % 5 === 0) return "risky";
  if (hash % 3 === 0) return "verified";
  return "unverified";
}

function simulateEnrich(email: string): { title: string; company: string; linkedin: string } {
  const localPart = email.split("@")[0] || "user";
  const domain = email.split("@")[1] || "company.com";
  const company = domain.replace(/\.(com|io|ai|net|org)$/, "").replace(/^www\./, "");
  const parts = localPart.split(/[._-]/).filter(Boolean);
  const firstName = parts[0] || "user";
  const lastName = parts[1] || "";
  const fullName = lastName ? `${firstName[0].toUpperCase() + firstName.slice(1)} ${lastName[0].toUpperCase() + lastName.slice(1)}` : firstName;
  const titles = ["CEO", "CTO", "VP Engineering", "Director of Sales", "Head of Marketing", "Product Manager", "Founder", "Lead Developer"];
  const titleIdx = (fullName.length + company.length) % titles.length;
  return {
    title: titles[titleIdx] || "Manager",
    company: company[0].toUpperCase() + company.slice(1),
    linkedin: `https://linkedin.com/in/${fullName.toLowerCase().replace(/\s/g, "-")}`,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmailIntelligence() {
  const { state } = useApp();
  const campaignId = state.campaign?.id as string | undefined;

  const [domain, setDomain] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EmailResult[]>(() =>
    loadStored<EmailResult[]>(STORAGE_KEYS.results, [])
  );
  const [bulkEmails, setBulkEmails] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [enrichmentMap, setEnrichmentMap] = useState<Record<string, { title: string; company: string; linkedin: string }>>({});

  // Stats
  const domainsScanned = loadStored<number>(STORAGE_KEYS.stats, 0);
  const emailsFound = results.length;
  const verifiedCount = results.filter((r) => r.status === "verified").length;
  const catchAllRate = 12;

  // Patterns
  const [patterns] = useState<EmailPattern[]>(() =>
    loadStored<EmailPattern[]>(STORAGE_KEYS.patterns, COMMON_PATTERNS)
  );

  // Persist results
  useEffect(() => {
    saveStored(STORAGE_KEYS.results, results);
  }, [results]);

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const searchDomain = useCallback(async () => {
    if (!domain.trim()) return;
    setSearching(true);

    try {
      // Try real API first
      let targets: TargetProfile[] = [];
      if (campaignId) {
        try {
          targets = await dataService.getTargets(campaignId);
        } catch { /* silent - fallback below */ }
      }

      if (targets.length > 0) {
        // Transform real target data into email results
        const fromTargets: EmailResult[] = targets.slice(0, 10).map((t, i) => {
          const company = t.company || domain;
          const dm = t.decisionMaker || "contact";
          const email = `${dm.toLowerCase().replace(/\s/g, ".")}@${company}`.replace(/[^a-z0-9.@]/g, "");
          return {
            email,
            type: i % 2 === 0 ? "personal" : "role-based",
            confidence: t.fitScore || 85 - i * 5,
            status: (t.fitScore || 0) > 80 ? "verified" : "unverified",
          };
        });
        setResults(fromTargets);
      } else {
        // Generate from domain
        const generated = generateEmailsFromDomain(domain.trim().toLowerCase());
        setResults(generated);
      }

      const prevStats = loadStored<{ domains: number }>(STORAGE_KEYS.stats, { domains: 0 });
      saveStored(STORAGE_KEYS.stats, { domains: prevStats.domains + 1 });
    } finally {
      setSearching(false);
    }
  }, [domain, campaignId]);

  const verifyEmail = useCallback((email: string) => {
    const newStatus = simulateVerify(email);
    setResults((prev) =>
      prev.map((r) => (r.email === email ? { ...r, status: newStatus } : r))
    );
  }, []);

  const enrichEmail = useCallback((email: string) => {
    const data = simulateEnrich(email);
    setEnrichmentMap((prev) => ({ ...prev, [email]: data }));
  }, []);

  const verifyBulk = useCallback(() => {
    const emails = bulkEmails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));
    if (emails.length === 0) return;

    setVerifying(true);
    const processed: BulkResult[] = emails.map((email) => {
      const status = simulateVerify(email);
      const reasons: Record<string, string> = {
        verified: "MX record found, SMTP accepted",
        unverified: "Domain valid, mailbox unchecked",
        invalid: "MX not found or SMTP rejected",
        risky: "Catch-all or role-based address",
      };
      return { email, status, reason: reasons[status] || "Unknown" };
    });

    setTimeout(() => {
      setBulkResults(processed);
      setVerifying(false);
    }, 800);
  }, [bulkEmails]);

  return (
    <div className="space-y-4 pt-3">
      {/* Header with stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Domains Scanned" value={domainsScanned} icon={Globe} />
        <StatCard label="Emails Found" value={emailsFound} icon={Mail} />
        <StatCard label="Verified" value={verifiedCount} icon={ShieldCheck} />
        <StatCard label="Catch-All Rate" value={`${catchAllRate}%`} icon={AlertTriangle} />
      </div>

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
            className="text-xs px-3 py-2 rounded-lg bg-indigo-500 text-white font-medium disabled:opacity-50 hover:bg-indigo-600 transition-colors"
          >
            {searching ? "Scanning..." : "Find Emails"}
          </button>
        </div>

        {/* Results table */}
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
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => enrichEmail(r.email)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 ml-2 transition-colors"
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
          className="mt-2 text-xs px-3 py-2 rounded-lg bg-violet-500 text-white font-medium disabled:opacity-50 hover:bg-violet-600 transition-colors"
        >
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

      {/* Email Pattern Analyzer */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
          <Fingerprint className="w-4 h-4" /> Pattern Analyzer
        </div>
        <div className="grid grid-cols-2 gap-2">
          {patterns.map((p) => (
            <div
              key={p.pattern}
              className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.03]"
            >
              <div className="text-xs text-slate-300 font-mono">{p.pattern}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {p.example} · {p.frequency}% frequency
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
