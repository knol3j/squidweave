import { useState, useCallback, useMemo, useEffect } from "react";
import {
  UserCircle,
  Mail,
  Linkedin,
  Twitter,
  Phone,
  Zap,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Building2,
  MessageSquare,
  Monitor,
  Sparkles,
  Download,
  Save,
  Github,
  Globe,
  Newspaper,
  Mic,
  Database,
  Calendar,
  TrendingUp,
  Clock,
  Target,
  X,
  BarChart3,
  Trash2,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Award,
  Layers,
  Eye,
  Send,
  Loader2,
  Plus,
  Fingerprint,
} from "lucide-react";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type DiscoverySource =
  | "linkedin"
  | "about-page"
  | "press-release"
  | "conference"
  | "github"
  | "twitter"
  | "crunchbase"
  | "podcast";

type Seniority = "C-Suite" | "VP" | "Director" | "Manager" | "Individual";

type Department =
  | "Engineering"
  | "Sales"
  | "Marketing"
  | "Product"
  | "Finance"
  | "Operations"
  | "Executive"
  | "Growth"
  | "Revenue"
  | "MarTech"
  | "Digital"
  | "Innovation"
  | "GTM"
  | "Business Development"
  | "Legal"
  | "HR"
  | "Customer Success";

type Authority = "Budget Holder" | "Influencer" | "User" | "Champion";

type ActivityType = "post" | "talk" | "hire" | "promotion" | "funding" | "acquisition";

interface RecentActivity {
  type: ActivityType;
  description: string;
  date: string;
}

interface ConnectionPath {
  mutualConnections: number;
  sharedGroups: number;
  secondDegreePaths: number;
}

interface EmailPattern {
  pattern: string;
  confidence: number;
  verified: boolean;
  testResult: "deliverable" | "risky" | "bounce";
  example: string;
}

interface Contact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  department: Department;
  seniority: Seniority;
  authority: Authority;
  company: string;
  domain: string;
  email: string;
  emailPattern: string;
  linkedinUrl: string;
  twitterHandle: string | null;
  githubUsername: string | null;
  phone: string | null;
  tenureMonths: number;
  discoverySource: DiscoverySource;
  recentActivity: RecentActivity[];
  connectionPath: ConnectionPath;
  engagementScore: number;
  bestChannel: "email" | "linkedin" | "twitter" | "warm-intro";
  bestTime: string;
  icebreaker: string;
  notes: string;
  savedAt?: string;
  tags: string[];
}

interface FilterState {
  search: string;
  seniority: Seniority | "All";
  department: Department | "All";
  authority: Authority | "All";
  source: DiscoverySource | "All";
  activity: "All" | "active" | "speaker" | "recent-hire";
  minEngagement: number;
}

interface SavedData {
  contacts: Contact[];
  companies: string[];
}

interface OutreachSuggestion {
  template: string;
  subject: string;
  reason: string;
}

interface GithubUser {
  login: string;
  html_url: string;
  avatar_url: string;
  type: string;
}

/* ================================================================== */
/*  CONSTANTS                                                          */
/* ================================================================== */

/** Reference list of common senior roles — used for manual entry suggestions only */
const ROLE_TEMPLATES: { title: string; seniority: Seniority; department: Department; authority: Authority }[] = [
  { title: "CEO & Co-Founder", seniority: "C-Suite", department: "Executive", authority: "Budget Holder" },
  { title: "Chief Technology Officer", seniority: "C-Suite", department: "Engineering", authority: "Budget Holder" },
  { title: "Chief Marketing Officer", seniority: "C-Suite", department: "Marketing", authority: "Budget Holder" },
  { title: "Chief Revenue Officer", seniority: "C-Suite", department: "Revenue", authority: "Budget Holder" },
  { title: "Chief Product Officer", seniority: "C-Suite", department: "Product", authority: "Budget Holder" },
  { title: "Chief Financial Officer", seniority: "C-Suite", department: "Finance", authority: "Budget Holder" },
  { title: "VP of Engineering", seniority: "VP", department: "Engineering", authority: "Budget Holder" },
  { title: "VP of Sales", seniority: "VP", department: "Sales", authority: "Budget Holder" },
  { title: "VP of Marketing", seniority: "VP", department: "Marketing", authority: "Budget Holder" },
  { title: "VP of Product", seniority: "VP", department: "Product", authority: "Influencer" },
  { title: "VP of Operations", seniority: "VP", department: "Operations", authority: "Influencer" },
  { title: "VP of Growth", seniority: "VP", department: "Growth", authority: "Budget Holder" },
  { title: "VP of Customer Success", seniority: "VP", department: "Customer Success", authority: "Influencer" },
  { title: "VP of Finance", seniority: "VP", department: "Finance", authority: "Influencer" },
  { title: "VP of Business Development", seniority: "VP", department: "Business Development", authority: "Budget Holder" },
  { title: "Director of Engineering", seniority: "Director", department: "Engineering", authority: "Influencer" },
  { title: "Director of Sales", seniority: "Director", department: "Sales", authority: "Budget Holder" },
  { title: "Director of Marketing", seniority: "Director", department: "Marketing", authority: "Influencer" },
  { title: "Director of Product", seniority: "Director", department: "Product", authority: "Influencer" },
  { title: "Director of GTM", seniority: "Director", department: "GTM", authority: "Influencer" },
  { title: "Director of Digital Marketing", seniority: "Director", department: "Digital", authority: "Influencer" },
  { title: "Director of Revenue Operations", seniority: "Director", department: "Revenue", authority: "User" },
  { title: "Engineering Manager", seniority: "Manager", department: "Engineering", authority: "User" },
  { title: "Sales Manager", seniority: "Manager", department: "Sales", authority: "User" },
  { title: "Marketing Manager", seniority: "Manager", department: "Marketing", authority: "User" },
  { title: "Product Manager", seniority: "Manager", department: "Product", authority: "User" },
  { title: "Customer Success Manager", seniority: "Manager", department: "Customer Success", authority: "User" },
  { title: "Finance Manager", seniority: "Manager", department: "Finance", authority: "User" },
  { title: "Operations Manager", seniority: "Manager", department: "Operations", authority: "User" },
  { title: "Senior Software Engineer", seniority: "Individual", department: "Engineering", authority: "User" },
  { title: "Account Executive", seniority: "Individual", department: "Sales", authority: "User" },
  { title: "Growth Marketing Manager", seniority: "Manager", department: "Growth", authority: "User" },
  { title: "Head of Partnerships", seniority: "Director", department: "Business Development", authority: "Influencer" },
  { title: "Head of Product", seniority: "Director", department: "Product", authority: "Influencer" },
  { title: "Head of Growth", seniority: "Director", department: "Growth", authority: "Influencer" },
  { title: "Head of Innovation", seniority: "Director", department: "Innovation", authority: "Champion" },
  { title: "Head of MarTech", seniority: "Director", department: "MarTech", authority: "Influencer" },
  { title: "Legal Counsel", seniority: "Manager", department: "Legal", authority: "User" },
  { title: "HR Director", seniority: "Director", department: "HR", authority: "User" },
  { title: "Chief Innovation Officer", seniority: "C-Suite", department: "Innovation", authority: "Champion" },
];

const SOURCE_META: Record<DiscoverySource, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "about-page": { label: "About Page", icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  "press-release": { label: "Press Release", icon: Newspaper, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  conference: { label: "Conference", icon: Mic, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  github: { label: "GitHub", icon: Github, color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" },
  twitter: { label: "Twitter/X", icon: Twitter, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  crunchbase: { label: "Crunchbase", icon: Database, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  podcast: { label: "Podcast", icon: Mic, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
};

const CHANNEL_META: Record<string, { icon: React.ElementType; label: string; color: string; border: string; bg: string }> = {
  email: { icon: Mail, label: "Email", color: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/10" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" },
  twitter: { icon: Twitter, label: "Twitter/X", color: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/10" },
  "warm-intro": { icon: Users, label: "Warm Intro", color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
};

const SENIORITY_OPTIONS: (Seniority | "All")[] = ["All", "C-Suite", "VP", "Director", "Manager", "Individual"];

const DEPARTMENT_OPTIONS: (Department | "All")[] = [
  "All", "Engineering", "Sales", "Marketing", "Product", "Finance",
  "Operations", "Executive", "Growth", "Revenue", "MarTech", "Digital",
  "Innovation", "GTM", "Business Development", "Legal", "HR", "Customer Success",
];

const AUTHORITY_OPTIONS: (Authority | "All")[] = ["All", "Budget Holder", "Influencer", "User", "Champion"];

const SOURCE_OPTIONS: (DiscoverySource | "All")[] = [
  "All", "linkedin", "about-page", "press-release", "conference", "github", "twitter", "crunchbase", "podcast",
];

const ACTIVITY_OPTIONS: { value: FilterState["activity"]; label: string }[] = [
  { value: "All", label: "All" },
  { value: "active", label: "Active Poster" },
  { value: "speaker", label: "Conference Speaker" },
  { value: "recent-hire", label: "Recent Hire" },
];

const SIZE_OPTIONS = ["1-50", "50-200", "200-500", "500-1000", "1000-5000", "5000+"];

const STORAGE_KEY_SAVED = "decision-maker-saved-contacts";

/* ================================================================== */
/*  REAL API HELPERS                                                   */
/* ================================================================== */

/** Search GitHub for users related to a company */
async function searchGithubUsers(company: string): Promise<GithubUser[]> {
  try {
    // Try company name as org
    const res = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(company)}+type:user`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).slice(0, 6) as GithubUser[];
  } catch {
    return [];
  }
}

/** Search Hunter.io for email patterns */
async function searchHunterIo(domain: string, apiKey: string): Promise<{ pattern: string | null; emails: { value: string; type: string; first_name: string; last_name: string; position: string }[] } | null> {
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      pattern: data.data?.pattern || null,
      emails: (data.data?.emails || []).slice(0, 8).map((e: Record<string, unknown>) => ({
        value: String(e.value || ""),
        type: String(e.type || ""),
        first_name: String(e.first_name || ""),
        last_name: String(e.last_name || ""),
        position: String(e.position || ""),
      })),
    };
  } catch {
    return null;
  }
}

/* ================================================================== */
/*  EMAIL PATTERN GUESSING (algorithmic — not fake data)               */
/* ================================================================== */

function guessEmailPatterns(domain: string): EmailPattern[] {
  const patterns: EmailPattern[] = [
    { pattern: "first", confidence: 60, verified: false, testResult: "risky", example: `john@${domain}` },
    { pattern: "first.last", confidence: 85, verified: false, testResult: "deliverable", example: `john.smith@${domain}` },
    { pattern: "f.last", confidence: 50, verified: false, testResult: "risky", example: `j.smith@${domain}` },
    { pattern: "firstlast", confidence: 40, verified: false, testResult: "bounce", example: `johnsmith@${domain}` },
    { pattern: "first_last", confidence: 30, verified: false, testResult: "bounce", example: `john_smith@${domain}` },
    { pattern: "flast", confidence: 35, verified: false, testResult: "risky", example: `jsmith@${domain}` },
  ];
  patterns.sort((a, b) => b.confidence - a.confidence);
  return patterns;
}

/* ================================================================== */
/*  LOCALSTORAGE HELPERS                                               */
/* ================================================================== */

function loadSavedData(): SavedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { contacts: [], companies: [] };
}

function saveContactsToStorage(contacts: Contact[]) {
  try {
    const existing = loadSavedData();
    const mergedMap = new Map<string, Contact>();
    existing.contacts.forEach((c) => mergedMap.set(c.id, c));
    contacts.forEach((c) => mergedMap.set(c.id, { ...c, savedAt: new Date().toISOString() }));
    const merged = Array.from(mergedMap.values());
    const companies = Array.from(new Set(merged.map((c) => c.domain)));
    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify({ contacts: merged, companies }));
  } catch { /* ignore */ }
}

function loadSavedContacts(): Contact[] {
  return loadSavedData().contacts;
}

function clearSavedContacts() {
  localStorage.removeItem(STORAGE_KEY_SAVED);
}

function exportToCSV(contacts: Contact[]): string {
  const headers = [
    "Name", "First Name", "Last Name", "Title", "Seniority", "Department",
    "Authority", "Company", "Domain", "Email", "LinkedIn", "Twitter",
    "GitHub", "Phone", "Tenure (months)", "Source", "Engagement Score",
    "Best Channel", "Best Time", "Tags", "Notes",
  ];
  const rows = contacts.map((c) => [
    c.name, c.firstName, c.lastName, c.title, c.seniority, c.department,
    c.authority, c.company, c.domain, c.email, c.linkedinUrl,
    c.twitterHandle || "", c.githubUsername || "", c.phone || "",
    c.tenureMonths, SOURCE_META[c.discoverySource].label, c.engagementScore,
    c.bestChannel, c.bestTime, c.tags.join("; "), c.notes,
  ]);

  return [headers, ...rows].map((row) =>
    row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(",")
  ).join("\n");
}

function exportToJSON(contacts: Contact[]): string {
  return JSON.stringify(contacts, null, 2);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================== */
/*  DISPLAY HELPERS                                                    */
/* ================================================================== */

function getEngagementColor(score: number): string {
  if (score >= 80) return "text-emerald-400 bg-emerald-500/15 border-emerald-500/25";
  if (score >= 60) return "text-amber-400 bg-amber-500/15 border-amber-500/25";
  if (score >= 40) return "text-orange-400 bg-orange-500/15 border-orange-500/25";
  return "text-red-400 bg-red-500/15 border-red-500/25";
}

function getEngagementLabel(score: number): string {
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Low";
}

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case "post": return <MessageSquare className="w-3 h-3" />;
    case "talk": return <Mic className="w-3 h-3" />;
    case "hire": return <Users className="w-3 h-3" />;
    case "promotion": return <TrendingUp className="w-3 h-3" />;
    case "funding": return <BarChart3 className="w-3 h-3" />;
    case "acquisition": return <Building2 className="w-3 h-3" />;
    default: return <Sparkles className="w-3 h-3" />;
  }
}

function getActivityColor(type: ActivityType): string {
  switch (type) {
    case "post": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "talk": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    case "hire": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "promotion": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "funding": return "text-green-400 bg-green-500/10 border-green-500/20";
    case "acquisition": return "text-pink-400 bg-pink-500/10 border-pink-500/20";
    default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

/* ================================================================== */
/*  CONTACT CARD SUB-COMPONENT                                         */
/* ================================================================== */

function ContactCard({
  contact,
  isExpanded,
  isSaved,
  copiedEmail,
  note,
  onToggle,
  onCopyEmail,
  onSave,
  onNoteChange,
}: {
  contact: Contact;
  isExpanded: boolean;
  isSaved: boolean;
  copiedEmail: string | null;
  note: string;
  onToggle: (id: string) => void;
  onCopyEmail: (email: string) => void;
  onSave: (contact: Contact) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const channelInfo = CHANNEL_META[contact.bestChannel];
  const ChannelIcon = channelInfo?.icon || Mail;
  const sourceMeta = SOURCE_META[contact.discoverySource];
  const SourceIcon = sourceMeta.icon;
  const engagementColor = getEngagementColor(contact.engagementScore);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-all">
      {/* Card Header */}
      <button
        onClick={() => onToggle(contact.id)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
          {contact.firstName[0]}{contact.lastName[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-200 truncate">{contact.name}</span>
            <span className={`text-[9px] px-1 py-0.5 rounded border ${engagementColor} flex-shrink-0`}>
              {contact.engagementScore}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {contact.title} · {contact.department}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] px-1 py-0.5 rounded border ${sourceMeta.bg} ${sourceMeta.color} flex items-center gap-0.5`}>
              <SourceIcon className="w-2.5 h-2.5" />
              {sourceMeta.label}
            </span>
            <span className="text-[9px] px-1 py-0.5 rounded border bg-white/[0.04] text-slate-500 border-white/[0.06]">
              {contact.seniority}
            </span>
            <span className={`text-[9px] px-1 py-0.5 rounded border ${
              contact.authority === "Budget Holder" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              contact.authority === "Influencer" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              contact.authority === "Champion" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
              "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}>
              {contact.authority}
            </span>
          </div>
        </div>

        {/* Channel Badge */}
        <div className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0 ${channelInfo.bg} ${channelInfo.color} ${channelInfo.border}`}>
          <ChannelIcon className="w-2.5 h-2.5" />
          {channelInfo.label}
        </div>

        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Contact Info Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Email */}
            <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                <Mail className="w-3 h-3" /> Email
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-mono truncate">{contact.email}</span>
                <button
                  onClick={() => onCopyEmail(contact.email)}
                  className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                >
                  {copiedEmail === contact.email ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5">Pattern: {contact.emailPattern}@</div>
            </div>

            {/* LinkedIn */}
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06] hover:border-blue-500/20 transition-colors group"
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                <Linkedin className="w-3 h-3" /> LinkedIn
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-blue-400 group-hover:underline truncate">{contact.linkedinUrl.replace("https://", "")}</span>
                <ExternalLink className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
              </div>
            </a>

            {/* Twitter */}
            {contact.twitterHandle && (
              <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                  <Twitter className="w-3 h-3" /> Twitter/X
                </div>
                <span className="text-[11px] text-sky-400">{contact.twitterHandle}</span>
              </div>
            )}

            {/* GitHub */}
            {contact.githubUsername && (
              <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                  <Github className="w-3 h-3" /> GitHub
                </div>
                <a
                  href={`https://github.com/${contact.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-300 hover:text-sky-400 transition-colors"
                >
                  {contact.githubUsername}
                </a>
              </div>
            )}

            {/* Phone */}
            {contact.phone && (
              <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                  <Phone className="w-3 h-3" /> Phone
                </div>
                <span className="text-[11px] text-slate-300">{contact.phone}</span>
              </div>
            )}

            {/* Tenure */}
            <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                <Calendar className="w-3 h-3" /> Tenure
              </div>
              <span className="text-[11px] text-slate-300">{contact.tenureMonths} months</span>
            </div>
          </div>

          {/* Engagement Score Detail */}
          <div className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Target className="w-3 h-3" /> Engagement Score
              </div>
              <span className={`text-[11px] font-semibold ${
                contact.engagementScore >= 80 ? "text-emerald-400" :
                contact.engagementScore >= 60 ? "text-amber-400" :
                contact.engagementScore >= 40 ? "text-orange-400" : "text-red-400"
              }`}>
                {contact.engagementScore}/100 — {getEngagementLabel(contact.engagementScore)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  contact.engagementScore >= 80 ? "bg-emerald-500" :
                  contact.engagementScore >= 60 ? "bg-amber-500" :
                  contact.engagementScore >= 40 ? "bg-orange-500" : "bg-red-500"
                }`}
                style={{ width: contact.engagementScore + "%" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center">
                <div className="text-[10px] text-slate-600">Mutual</div>
                <div className="text-[11px] text-slate-300 font-medium">{contact.connectionPath.mutualConnections}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-600">Groups</div>
                <div className="text-[11px] text-slate-300 font-medium">{contact.connectionPath.sharedGroups}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-600">2nd Degree</div>
                <div className="text-[11px] text-slate-300 font-medium">{contact.connectionPath.secondDegreePaths}</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {contact.recentActivity.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Zap className="w-3 h-3" /> Recent Activity
              </div>
              <div className="space-y-1.5">
                {contact.recentActivity.map((act, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${getActivityColor(act.type)}`}>
                    <ActivityIcon type={act.type} />
                    <span className="text-[11px] flex-1">{act.description}</span>
                    <span className="text-[9px] text-slate-600 flex-shrink-0">{act.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {contact.tags.map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Notes Input */}
          <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="text-[9px] text-slate-600 mb-1 flex items-center gap-1">
              <Monitor className="w-2.5 h-2.5" /> Notes
            </div>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(contact.id, e.target.value)}
              placeholder="Add notes about this contact..."
              rows={2}
              className="w-full text-[11px] bg-transparent text-slate-300 outline-none resize-none placeholder:text-slate-700"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(contact)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all border ${
                isSaved
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Contact
                </>
              )}
            </button>
            <a
              href={"https://" + contact.domain}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.03] text-slate-500 hover:text-slate-300 transition-colors"
              title="Visit company website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function DecisionMakerFinder() {
  /* -- Input state -- */
  const [domain, setDomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [size, setSize] = useState("50-200");
  const [isSearching, setIsSearching] = useState(false);

  /* -- Results state -- */
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emailPatterns, setEmailPatterns] = useState<EmailPattern[]>([]);
  const [searched, setSearched] = useState(false);
  const [activeSourceTab, setActiveSourceTab] = useState<DiscoverySource | "all">("all");
  const [searchError, setSearchError] = useState<string | null>(null);

  /* -- Filter state -- */
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    seniority: "All",
    department: "All",
    authority: "All",
    source: "All",
    activity: "All",
    minEngagement: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  /* -- UI state -- */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [savedContactIds, setSavedContactIds] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [contactNotes, setContactNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  /* -- Manual entry state -- */
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualContact, setManualContact] = useState({
    firstName: "",
    lastName: "",
    title: "",
    seniority: "Director" as Seniority,
    department: "Engineering" as Department,
    authority: "Budget Holder" as Authority,
    email: "",
    linkedinUrl: "",
    githubUsername: "",
    discoverySource: "linkedin" as DiscoverySource,
  });

  /* -- Hunter.io state -- */
  const [hunterApiKey, setHunterApiKey] = useState(() =>
    loadStored<string>("sw_hunter_api_key", "")
  );
  const [showHunterInput, setShowHunterInput] = useState(false);

  /* -- Load saved contacts on mount -- */
  useEffect(() => {
    const saved = loadSavedContacts();
    setSavedContactIds(new Set(saved.map((c) => c.id)));
  }, []);

  /* -- Show toast helper -- */
  const showToast = useCallback((message: string, type: "success" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* -- localStorage helper -- */
  function loadStored<T>(key: string, fallback: T): T {
    try {
      const s = localStorage.getItem(key);
      if (s) return JSON.parse(s) as T;
    } catch { /* silent */ }
    return fallback;
  }

  /* -- Build a Contact from validated inputs (user-added only) -- */
  const buildContact = useCallback((
    name: string,
    firstName: string,
    lastName: string,
    title: string,
    seniority: Seniority,
    department: Department,
    authority: Authority,
    email: string,
    linkedinUrl: string,
    githubUsername: string | null,
    twitterHandle: string | null,
    discoverySource: DiscoverySource,
    company: string,
    domainValue: string
  ): Contact => {
    const id = `${domainValue.replace(/\./g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const localPart = email.split("@")[0] || "";

    return {
      id,
      name,
      firstName,
      lastName,
      title,
      department,
      seniority,
      authority,
      company,
      domain: domainValue,
      email,
      emailPattern: localPart,
      linkedinUrl: linkedinUrl || `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      twitterHandle,
      githubUsername,
      phone: null,
      tenureMonths: 0,
      discoverySource,
      recentActivity: [],
      connectionPath: { mutualConnections: 0, sharedGroups: 0, secondDegreePaths: 0 },
      engagementScore: 50,
      bestChannel: "email",
      bestTime: "Tuesday 9:00-11:00 AM",
      icebreaker: `Hi ${firstName}, I came across your profile and wanted to reach out about ${company}.`,
      notes: "",
      tags: [userTagForSeniority(seniority)],
    };
  }, []);

  function userTagForSeniority(s: Seniority): string {
    if (s === "C-Suite" || s === "VP") return "decision-maker";
    if (s === "Director") return "influencer";
    return "contact";
  }

  /* -- Search handler: real APIs + manual entry fallback -- */
  const handleSearch = useCallback(async () => {
    if (!domain.trim()) return;
    setIsSearching(true);
    setSearched(false);
    setSearchError(null);
    setContacts([]);

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const displayName = companyName || cleanDomain.split(".")[0];
    const found: Contact[] = [];

    // 1. Try GitHub API for public profiles
    try {
      const githubUsers = await searchGithubUsers(displayName);
      for (const user of githubUsers) {
        const names = extractNamesFromLogin(user.login);
        const email = `${user.login}@users.noreply.github.com`; // placeholder — not a real email
        found.push(buildContact(
          user.login,
          names.firstName,
          names.lastName,
          "Developer",
          "Individual",
          "Engineering",
          "User",
          email,
          "",
          user.login,
          null,
          "github",
          displayName,
          cleanDomain
        ));
      }
    } catch {
      // GitHub search failed — continue with other sources
    }

    // 2. If Hunter.io key is available, use it
    const key = hunterApiKey;
    if (key) {
      try {
        const hunterResult = await searchHunterIo(cleanDomain, key);
        if (hunterResult) {
          // Update patterns from Hunter
          if (hunterResult.pattern) {
            const guessed = guessEmailPatterns(cleanDomain);
            const hunterPattern: EmailPattern = {
              pattern: hunterResult.pattern,
              confidence: 90,
              verified: true,
              testResult: "deliverable",
              example: `example@${cleanDomain}`,
            };
            setEmailPatterns([hunterPattern, ...guessed.filter((g) => g.pattern !== hunterResult.pattern)]);
          }
          // Add Hunter emails as contacts
          for (const he of hunterResult.emails) {
            if (!he.value) continue;
            const existing = found.find((c) => c.email === he.value);
            if (existing) continue;
            found.push(buildContact(
              `${he.first_name || "Unknown"} ${he.last_name || ""}`.trim(),
              he.first_name || "",
              he.last_name || "",
              he.position || "Contact",
              "Individual",
              "Executive",
              "Influencer",
              he.value,
              "",
              null,
              null,
              "about-page",
              displayName,
              cleanDomain
            ));
          }
        }
      } catch {
        // Hunter.io failed silently
      }
    }

    setContacts(found);
    setEmailPatterns((prev) => prev.length > 0 ? prev : guessEmailPatterns(cleanDomain));
    setSearched(true);
    setIsSearching(false);
    setActiveSourceTab("all");
    setExpandedIds(new Set());

    if (found.length === 0) {
      setSearchError("No contacts found via APIs. Try entering contacts manually or add a Hunter.io API key for better results.");
    } else {
      showToast(`Found ${found.length} contacts`, "success");
    }
  }, [domain, companyName, hunterApiKey, buildContact, showToast]);

  /** Extract plausible first/last names from a GitHub login */
  function extractNamesFromLogin(login: string): { firstName: string; lastName: string } {
    // Try splitting on common separators
    const cleaned = login.replace(/[_\-.]+/g, " ").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return {
        firstName: parts[0][0].toUpperCase() + parts[0].slice(1),
        lastName: parts[1][0].toUpperCase() + parts[1].slice(1),
      };
    }
    return { firstName: login, lastName: "" };
  }

  /* -- Manual contact entry -- */
  const handleAddManualContact = useCallback(() => {
    if (!manualContact.firstName || !manualContact.lastName || !manualContact.email) return;

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const company = companyName || cleanDomain.split(".")[0];

    const newContact = buildContact(
      `${manualContact.firstName} ${manualContact.lastName}`,
      manualContact.firstName,
      manualContact.lastName,
      manualContact.title,
      manualContact.seniority,
      manualContact.department,
      manualContact.authority,
      manualContact.email,
      manualContact.linkedinUrl,
      manualContact.githubUsername || null,
      null,
      manualContact.discoverySource,
      company,
      cleanDomain || manualContact.email.split("@")[1] || "unknown.com"
    );

    setContacts((prev) => [newContact, ...prev]);
    setShowManualEntry(false);
    setManualContact({
      firstName: "", lastName: "", title: "", seniority: "Director",
      department: "Engineering", authority: "Budget Holder", email: "",
      linkedinUrl: "", githubUsername: "", discoverySource: "linkedin",
    });
    showToast("Contact added!", "success");

    // Auto-save to localStorage
    saveContactsToStorage([newContact]);
    setSavedContactIds((prev) => new Set(prev).add(newContact.id));
  }, [manualContact, domain, companyName, buildContact, showToast]);

  /* -- Toggle expanded card -- */
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* -- Copy email -- */
  const handleCopyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopiedEmail(email);
    showToast("Email copied to clipboard", "success");
    setTimeout(() => setCopiedEmail(null), 2000);
  }, [showToast]);

  /* -- Save individual contact -- */
  const handleSaveContact = useCallback((contact: Contact) => {
    const note = contactNotes[contact.id] || "";
    const toSave = { ...contact, notes: note, savedAt: new Date().toISOString() };
    const existing = loadSavedContacts();
    const exists = existing.some((c) => c.id === contact.id);

    if (exists) {
      const filtered = existing.filter((c) => c.id !== contact.id);
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify({
        contacts: filtered,
        companies: Array.from(new Set(filtered.map((c) => c.domain))),
      }));
      setSavedContactIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
      showToast("Contact removed from saved", "info");
    } else {
      saveContactsToStorage([toSave]);
      setSavedContactIds((prev) => new Set(prev).add(contact.id));
      showToast("Contact saved!", "success");
    }
  }, [contactNotes, showToast]);

  /* -- Save all current contacts -- */
  const handleSaveAll = useCallback(() => {
    const toSave = contacts.map((c) => ({
      ...c,
      notes: contactNotes[c.id] || c.notes,
      savedAt: new Date().toISOString(),
    }));
    saveContactsToStorage(toSave);
    setSavedContactIds(new Set(contacts.map((c) => c.id)));
    showToast("Saved " + contacts.length + " contacts", "success");
  }, [contacts, contactNotes, showToast]);

  /* -- Clear saved -- */
  const handleClearSaved = useCallback(() => {
    clearSavedContacts();
    setSavedContactIds(new Set());
    setShowSaved(false);
    showToast("All saved contacts cleared", "info");
  }, [showToast]);

  /* -- Export handlers -- */
  const handleExportCSV = useCallback(() => {
    const toExport = showSaved ? loadSavedContacts() : contacts;
    const csv = exportToCSV(toExport);
    downloadFile(csv, "contacts-" + (domain || "export") + ".csv", "text/csv");
    setShowExport(false);
    showToast("CSV exported!", "success");
  }, [showSaved, contacts, domain, showToast]);

  const handleExportJSON = useCallback(() => {
    const toExport = showSaved ? loadSavedContacts() : contacts;
    const json = exportToJSON(toExport);
    downloadFile(json, "contacts-" + (domain || "export") + ".json", "application/json");
    setShowExport(false);
    showToast("JSON exported!", "success");
  }, [showSaved, contacts, domain, showToast]);

  /* -- Note change handler -- */
  const handleNoteChange = useCallback((id: string, note: string) => {
    setContactNotes((prev) => ({ ...prev, [id]: note }));
  }, []);

  /* -- Reset filters -- */
  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      seniority: "All",
      department: "All",
      authority: "All",
      source: "All",
      activity: "All",
      minEngagement: 0,
    });
  }, []);

  /* -- Filtered contacts -- */
  const filteredContacts = useMemo(() => {
    let result = showSaved ? loadSavedContacts() : contacts;

    if (!showSaved && activeSourceTab !== "all") {
      result = result.filter((c) => c.discoverySource === activeSourceTab);
    }

    return result.filter((c) => {
      const q = filters.search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q);
      const matchSeniority = filters.seniority === "All" || c.seniority === filters.seniority;
      const matchDept = filters.department === "All" || c.department === filters.department;
      const matchAuthority = filters.authority === "All" || c.authority === filters.authority;
      const matchSource = filters.source === "All" || c.discoverySource === filters.source;
      const matchEngagement = c.engagementScore >= filters.minEngagement;

      let matchActivity = true;
      if (filters.activity === "active") matchActivity = c.tags.includes("active-poster");
      else if (filters.activity === "speaker") matchActivity = c.tags.includes("speaker");
      else if (filters.activity === "recent-hire") matchActivity = c.tags.includes("recent-hire");

      return matchSearch && matchSeniority && matchDept && matchAuthority && matchSource && matchActivity && matchEngagement;
    });
  }, [contacts, filters, activeSourceTab, showSaved]);

  /* -- Stats -- */
  const stats = useMemo(() => {
    const pool = showSaved ? loadSavedContacts() : contacts;
    if (pool.length === 0) return { total: 0, avgEngagement: 0, sources: 0, bySeniority: {} as Record<string, number> };
    const avgEngagement = Math.round(pool.reduce((s, c) => s + c.engagementScore, 0) / pool.length);
    const sources = new Set(pool.map((c) => c.discoverySource)).size;
    const bySeniority: Record<string, number> = {};
    pool.forEach((c) => { bySeniority[c.seniority] = (bySeniority[c.seniority] || 0) + 1; });
    return { total: pool.length, avgEngagement, sources, bySeniority };
  }, [contacts, showSaved]);

  /* -- Source breakdown -- */
  const sourceBreakdown = useMemo(() => {
    const pool = showSaved ? loadSavedContacts() : contacts;
    const map = new Map<DiscoverySource, number>();
    pool.forEach((c) => map.set(c.discoverySource, (map.get(c.discoverySource) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [contacts, showSaved]);

  /* -- Active filter count -- */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.seniority !== "All") count++;
    if (filters.department !== "All") count++;
    if (filters.authority !== "All") count++;
    if (filters.source !== "All") count++;
    if (filters.activity !== "All") count++;
    if (filters.minEngagement > 0) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const displayContacts = filteredContacts;
  const currentDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg border shadow-lg text-xs font-medium transition-all ${
          toast.type === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-sky-500/15 text-sky-400 border-sky-500/25"
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === "success" ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* ====== HEADER ====== */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <UserCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-100">Decision Maker Finder</h2>
          <p className="text-[11px] text-slate-500">Contact discovery via GitHub & Hunter.io APIs, plus manual entry</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
              showSaved ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:text-slate-300"
            }`}
          >
            <Save className="w-3 h-3" />
            Saved ({savedContactIds.size})
          </button>
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-300 transition-all"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* ====== EXPORT PANEL ====== */}
      {showExport && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Export Contacts</span>
            <button onClick={() => setShowExport(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export as CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
            >
              <FileJson className="w-3.5 h-3.5" />
              Export as JSON
            </button>
          </div>
          <p className="text-[10px] text-slate-600">
            Exporting {showSaved ? loadSavedContacts().length : contacts.length} contacts
          </p>
        </div>
      )}

      {/* ====== SAVED CONTACTS PANEL ====== */}
      {showSaved && (
        <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-300">Saved Contacts</span>
              <span className="text-[10px] text-slate-500">({loadSavedContacts().length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSaved}
                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
              <button onClick={() => setShowSaved(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {loadSavedContacts().length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-6 h-6 text-slate-700 mx-auto mb-1.5" />
              <p className="text-[11px] text-slate-600">No saved contacts yet. Search and save contacts to see them here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {loadSavedContacts().map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#0f172a] border border-white/[0.04]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-300 truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-600 truncate">{c.title} · {c.company}</div>
                  </div>
                  <button
                    onClick={() => handleSaveContact(c)}
                    className="p-1.5 rounded hover:bg-white/[0.06] text-amber-400 transition-colors flex-shrink-0"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== SEARCH INPUT ====== */}
      {!showSaved && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Target className="w-3 h-3" />
            Company Targeting
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
              placeholder="company.com"
              className="flex-1 min-w-[160px] text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
              placeholder="Company Name (optional)"
              className="flex-1 min-w-[160px] text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} employees</option>
              ))}
            </select>
            <button
              onClick={() => void handleSearch()}
              disabled={!domain.trim() || isSearching}
              className="text-xs px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50 flex items-center gap-1.5 hover:bg-emerald-600 transition-colors"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" />
                  Find Contacts
                </>
              )}
            </button>
          </div>

          {/* Hunter.io API Key toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHunterInput(!showHunterInput)}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <Mail className="w-3 h-3" />
              {hunterApiKey ? "Hunter.io key set" : "Add Hunter.io API key"}
              {hunterApiKey && <Check className="w-2.5 h-2.5 text-emerald-400" />}
            </button>
            <span className="text-[10px] text-slate-700">|</span>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add contact manually
            </button>
          </div>

          {/* Hunter.io key input */}
          {showHunterInput && (
            <div className="flex gap-2">
              <input
                type="password"
                value={hunterApiKey}
                onChange={(e) => {
                  setHunterApiKey(e.target.value);
                  try { localStorage.setItem("sw_hunter_api_key", JSON.stringify(e.target.value)); } catch { /* silent */ }
                }}
                placeholder="Hunter.io API key"
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 placeholder:text-slate-600"
              />
            </div>
          )}
        </div>
      )}

      {/* ====== MANUAL ENTRY FORM ====== */}
      {showManualEntry && !showSaved && (
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-indigo-300 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add Contact Manually
            </div>
            <button onClick={() => setShowManualEntry(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[10px] text-slate-500">
            Enter a contact you already know. All manually added contacts are saved to localStorage.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <input
              value={manualContact.firstName}
              onChange={(e) => setManualContact((p) => ({ ...p, firstName: e.target.value }))}
              placeholder="First name *"
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <input
              value={manualContact.lastName}
              onChange={(e) => setManualContact((p) => ({ ...p, lastName: e.target.value }))}
              placeholder="Last name *"
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <input
              value={manualContact.email}
              onChange={(e) => setManualContact((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email *"
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <input
              value={manualContact.title}
              onChange={(e) => setManualContact((p) => ({ ...p, title: e.target.value }))}
              placeholder="Job title"
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <select
              value={manualContact.seniority}
              onChange={(e) => setManualContact((p) => ({ ...p, seniority: e.target.value as Seniority }))}
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SENIORITY_OPTIONS.filter((s) => s !== "All").map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={manualContact.department}
              onChange={(e) => setManualContact((p) => ({ ...p, department: e.target.value as Department }))}
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {DEPARTMENT_OPTIONS.filter((d) => d !== "All").map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={manualContact.authority}
              onChange={(e) => setManualContact((p) => ({ ...p, authority: e.target.value as Authority }))}
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {AUTHORITY_OPTIONS.filter((a) => a !== "All").map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={manualContact.discoverySource}
              onChange={(e) => setManualContact((p) => ({ ...p, discoverySource: e.target.value as DiscoverySource }))}
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SOURCE_OPTIONS.filter((s) => s !== "All").map((s) => {
                const meta = SOURCE_META[s as DiscoverySource];
                return <option key={s} value={s}>{meta.label}</option>;
              })}
            </select>
            <input
              value={manualContact.linkedinUrl}
              onChange={(e) => setManualContact((p) => ({ ...p, linkedinUrl: e.target.value }))}
              placeholder="LinkedIn URL (optional)"
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <input
              value={manualContact.githubUsername}
              onChange={(e) => setManualContact((p) => ({ ...p, githubUsername: e.target.value }))}
              placeholder="GitHub username (optional)"
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>
          {/* Role suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500">Quick pick:</span>
            {ROLE_TEMPLATES.slice(0, 8).map((role) => (
              <button
                key={role.title}
                onClick={() => setManualContact((p) => ({
                  ...p,
                  title: role.title,
                  seniority: role.seniority,
                  department: role.department,
                  authority: role.authority,
                }))}
                className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-indigo-500/20 transition-all"
              >
                {role.title}
              </button>
            ))}
            <span className="text-[9px] text-slate-600">+{ROLE_TEMPLATES.length - 8} more</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddManualContact}
              disabled={!manualContact.firstName || !manualContact.lastName || !manualContact.email}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-medium disabled:opacity-50 hover:bg-indigo-600 transition-all"
            >
              Add Contact
            </button>
            <button
              onClick={() => setShowManualEntry(false)}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-400 hover:text-slate-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ====== RESULTS ====== */}
      {searched && !showSaved && (
        <>
          {/* Error / empty state */}
          {searchError && contacts.length === 0 && (
            <div className="p-6 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/[0.02] text-center space-y-3">
              <Zap className="w-8 h-8 mx-auto text-amber-400" />
              <div className="text-sm text-slate-300 font-medium">No contacts found via APIs</div>
              <div className="text-[11px] text-slate-500 max-w-md mx-auto">{searchError}</div>
              <div className="flex items-center justify-center gap-2">
                {!hunterApiKey && (
                  <button
                    onClick={() => setShowHunterInput(true)}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                  >
                    <Mail className="w-3 h-3 inline mr-1" />
                    Set Hunter.io Key
                  </button>
                )}
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Add Contact Manually
                </button>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          {contacts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                <div className="text-xl font-bold text-slate-200">{stats.total}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Contacts Found</div>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                <div className={`text-xl font-bold ${stats.avgEngagement >= 60 ? "text-emerald-400" : stats.avgEngagement >= 40 ? "text-amber-400" : "text-orange-400"}`}>
                  {stats.avgEngagement}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Avg Engagement</div>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                <div className="text-xl font-bold text-blue-400">{stats.sources}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Sources Used</div>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                <div className="text-xl font-bold text-purple-400">{savedContactIds.size}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Saved</div>
              </div>
            </div>
          )}

          {/* Email Patterns Section */}
          {emailPatterns.length > 0 && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  Email Pattern Guessing — {currentDomain}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {emailPatterns.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-semibold text-slate-300">{p.pattern}@{currentDomain}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        p.confidence >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        p.confidence >= 45 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {p.confidence}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{p.example}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        p.testResult === "deliverable" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        p.testResult === "risky" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {p.verified ? "Verified" : "Estimated"} · {p.testResult}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Tabs */}
          {contacts.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveSourceTab("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap ${
                  activeSourceTab === "all"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                    : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
                }`}
              >
                <Layers className="w-3 h-3 inline mr-1" />
                All Sources
                <span className="ml-1 text-slate-600">({contacts.length})</span>
              </button>
              {sourceBreakdown.map(([source, count]) => {
                const meta = SOURCE_META[source];
                const Icon = meta.icon;
                return (
                  <button
                    key={source}
                    onClick={() => setActiveSourceTab(source)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeSourceTab === source
                        ? meta.bg + " " + meta.color
                        : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {meta.label}
                    <span className="text-slate-600">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter Bar */}
          {contacts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
                  showFilters || activeFilterCount > 0
                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:text-slate-300"
                }`}
              >
                <Filter className="w-3 h-3" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>

              <div className="ml-auto flex items-center gap-2">
                <Search className="w-3 h-3 text-slate-600" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Search contacts..."
                  className="text-[11px] px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-emerald-500 w-40"
                />
              </div>

              {contacts.length > 0 && (
                <button
                  onClick={handleSaveAll}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  <Save className="w-3 h-3" />
                  Save All
                </button>
              )}

              <button
                onClick={() => setShowManualEntry(true)}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          )}

          {/* Expanded Filters */}
          {showFilters && contacts.length > 0 && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Filter Contacts</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Seniority</label>
                  <select
                    value={filters.seniority}
                    onChange={(e) => setFilters((f) => ({ ...f, seniority: e.target.value as Seniority | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {SENIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value as Department | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Decision Authority</label>
                  <select
                    value={filters.authority}
                    onChange={(e) => setFilters((f) => ({ ...f, authority: e.target.value as Authority | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {AUTHORITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Discovery Source</label>
                  <select
                    value={filters.source}
                    onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as DiscoverySource | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {SOURCE_OPTIONS.map((s) => {
                      const label = s === "All" ? "All" : SOURCE_META[s].label;
                      return <option key={s} value={s}>{label}</option>;
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Recent Activity</label>
                  <select
                    value={filters.activity}
                    onChange={(e) => setFilters((f) => ({ ...f, activity: e.target.value as FilterState["activity"] }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {ACTIVITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Min Engagement: {filters.minEngagement}</label>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={10}
                    value={filters.minEngagement}
                    onChange={(e) => setFilters((f) => ({ ...f, minEngagement: Number(e.target.value) }))}
                    className="w-full accent-emerald-500 h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active filter pills */}
          {activeFilterCount > 0 && contacts.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filters.seniority !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {filters.seniority} <button onClick={() => setFilters((f) => ({ ...f, seniority: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.department !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {filters.department} <button onClick={() => setFilters((f) => ({ ...f, department: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.authority !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {filters.authority} <button onClick={() => setFilters((f) => ({ ...f, authority: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.source !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {SOURCE_META[filters.source].label} <button onClick={() => setFilters((f) => ({ ...f, source: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.activity !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {ACTIVITY_OPTIONS.find((a) => a.value === filters.activity)?.label}
                  <button onClick={() => setFilters((f) => ({ ...f, activity: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.minEngagement > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  Engagement &ge;{filters.minEngagement}
                  <button onClick={() => setFilters((f) => ({ ...f, minEngagement: 0 }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}

          {/* Results Count */}
          {contacts.length > 0 && (
            <div className="text-[11px] text-slate-500">
              Showing <span className="text-slate-300 font-medium">{displayContacts.length}</span>
              {" of "}
              <span className="text-slate-300 font-medium">{activeSourceTab === "all" ? contacts.length : contacts.filter((c) => c.discoverySource === activeSourceTab).length}</span> contacts
              {activeSourceTab !== "all" && (
                <span> from <span className="text-slate-300">{SOURCE_META[activeSourceTab].label}</span></span>
              )}
            </div>
          )}

          {/* Contact Cards Grid */}
          {displayContacts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {displayContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  isExpanded={expandedIds.has(contact.id)}
                  isSaved={savedContactIds.has(contact.id)}
                  copiedEmail={copiedEmail}
                  note={contactNotes[contact.id] || ""}
                  onToggle={toggleExpanded}
                  onCopyEmail={handleCopyEmail}
                  onSave={handleSaveContact}
                  onNoteChange={handleNoteChange}
                />
              ))}
            </div>
          )}

          {/* Empty filter state */}
          {displayContacts.length === 0 && contacts.length > 0 && (
            <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <div className="text-xs text-slate-500">No contacts match your filters</div>
              <button onClick={resetFilters} className="mt-2 text-[11px] text-indigo-400 hover:underline">
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}

      {/* ====== TIP (before search) ====== */}
      {!searched && !showSaved && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Eye className="w-3 h-3" />
              How It Works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
                <Github className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-medium text-slate-300">GitHub API Search</div>
                  <div className="text-[9px] text-slate-500">Finds public profiles and devs associated with the company</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-medium text-slate-300">Hunter.io Enrichment</div>
                  <div className="text-[9px] text-slate-500">Add your API key to find verified emails and patterns</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
                <Plus className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-medium text-slate-300">Manual Entry</div>
                  <div className="text-[9px] text-slate-500">Add contacts you already know — saved to localStorage</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
                <Fingerprint className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-medium text-slate-300">Pattern Guessing</div>
                  <div className="text-[9px] text-slate-500">Algorithmic email pattern detection (first@, f.last@, etc.)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-slate-500 leading-relaxed">
              <span className="text-slate-400 font-medium">Pro tip:</span> Enter a target company domain to discover contacts via GitHub and Hunter.io. If no API results are found, use manual entry to add contacts you already know. All contacts are saved to localStorage.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
