import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  UserCircle, Mail, Linkedin, Twitter, Phone, Zap, Users, Search,
  Filter, ChevronDown, ChevronUp, Copy, Check, Building2, MessageSquare,
  Monitor, Sparkles, Download, Save, Github, Globe, Newspaper, Mic,
  Database, Calendar, TrendingUp, Clock, Target, X, BarChart3,
  Trash2, FileJson, FileSpreadsheet, RefreshCw, ExternalLink,
  Layers, Eye, Send,
} from "lucide-react";
import { getApiUrl } from "@/services/dataService";

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


/* ================================================================== */
/*  CONSTANTS                                                          */
/* ================================================================== */

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
  contact, isExpanded, isSaved, copiedEmail, note,
  onToggle, onCopyEmail, onSave, onNoteChange,
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
            {contact.title} &middot; {contact.department}
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
                <span className="text-[11px] text-slate-300">{contact.githubUsername}</span>
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
                {contact.engagementScore}/100 &mdash; {getEngagementLabel(contact.engagementScore)}
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

          {/* Outreach Strategy */}
          <div className="p-3 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/15 space-y-2">
            <div className="flex items-center gap-1.5">
              <Send className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Outreach Strategy</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-[#0f172a] border border-white/[0.06]">
                <div className="text-[9px] text-slate-600 mb-0.5">Best Channel</div>
                <div className={`text-[11px] font-medium flex items-center gap-1 ${channelInfo.color}`}>
                  <ChannelIcon className="w-3 h-3" />
                  {channelInfo.label}
                </div>
              </div>
              <div className="p-2 rounded bg-[#0f172a] border border-white/[0.06]">
                <div className="text-[9px] text-slate-600 mb-0.5">Best Time</div>
                <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {contact.bestTime}
                </div>
              </div>
            </div>

            {/* Icebreaker */}
            <div className="p-2 rounded bg-[#0f172a] border border-white/[0.06]">
              <div className="text-[9px] text-slate-600 mb-1 flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5" /> Suggested Icebreaker
              </div>
              <p className="text-[11px] text-slate-400 italic leading-relaxed">&ldquo;{contact.icebreaker}&rdquo;</p>
            </div>
          </div>

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

  /* -- Search handler — calls REAL API -- */
  const handleSearch = useCallback(async () => {
    if (!domain.trim()) return;
    setIsSearching(true);
    setSearched(false);
    setContacts([]);
    setEmailPatterns([]);

    try {
      // Try real backend API
      const res = await fetch(`${getApiUrl('/api/contacts/search')}?company=${encodeURIComponent(domain)}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.contacts && Array.isArray(data.contacts)) {
          setContacts(data.contacts);
        }
        if (data.emailPatterns && Array.isArray(data.emailPatterns)) {
          setEmailPatterns(data.emailPatterns);
        }
        showToast(`Found ${data.contacts?.length || 0} contacts`, data.contacts?.length ? "success" : "info");
      } else {
        // No API available — show empty state
        showToast("Contact discovery requires a connected data source", "info");
      }
    } catch {
      showToast("Contact discovery requires ZoomInfo, LinkedIn Sales Navigator, or Apollo.io integration", "info");
    }

    setSearched(true);
    setIsSearching(false);
    setActiveSourceTab("all");
    setExpandedIds(new Set());
  }, [domain, showToast]);

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

  /* -- Ref for latest contactNotes to avoid stale closure -- */
  const contactNotesRef = useRef(contactNotes);
  useEffect(() => { contactNotesRef.current = contactNotes; }, [contactNotes]);

  /* -- Save individual contact -- */
  const handleSaveContact = useCallback((contact: Contact) => {
    const note = contactNotesRef.current[contact.id] || "";
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
  }, [showToast]);

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
          <p className="text-[11px] text-slate-500">Multi-source contact discovery, enrichment & outreach strategy</p>
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
                    <div className="text-[10px] text-slate-600 truncate">{c.title} &middot; {c.company}</div>
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
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="company.com"
              className="flex-1 min-w-[160px] text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
              onClick={handleSearch}
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
        </div>
      )}

      {/* ====== EMPTY STATE (before search or no results) ====== */}
      {!searched && !showSaved && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
            <Search className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-xs text-slate-500 mb-2 font-medium">Search for contacts by company domain.</p>
            <p className="text-[11px] text-slate-600 max-w-md mx-auto mb-4">
              Contact discovery requires ZoomInfo, LinkedIn Sales Navigator, or Apollo.io integration. Enter a company domain above to search.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Eye className="w-3 h-3" />
              Supported Discovery Sources
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                ["linkedin", "Public profiles, titles, connections"],
                ["about-page", "Leadership team listings"],
                ["press-release", "Quoted executives"],
                ["conference", "Speaker lists & events"],
                ["github", "Technical leaders, commits"],
                ["twitter", "Active executives, followers"],
                ["crunchbase", "Founders, board members"],
                ["podcast", "Guest appearances"],
              ] as [DiscoverySource, string][]).map(([source, desc]) => {
                const meta = SOURCE_META[source];
                const Icon = meta.icon;
                return (
                  <div key={source} className={`p-2.5 rounded-lg border ${meta.bg} flex items-start gap-2`}>
                    <Icon className={`w-4 h-4 ${meta.color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <div className={`text-[11px] font-medium ${meta.color}`}>{meta.label}</div>
                      <div className="text-[9px] text-slate-500">{desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-slate-500 leading-relaxed">
              <span className="text-slate-400 font-medium">Pro tip:</span> Enter a target company domain and select their size range to discover contacts across supported data sources. Results depend on your connected data provider.
            </div>
          </div>
        </div>
      )}

      {/* ====== RESULTS ====== */}
      {searched && !showSaved && (
        <>
          {/* Stats Bar */}
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

          {/* Email Patterns Section */}
          {emailPatterns.length > 0 && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  Email Pattern Verification &mdash; {currentDomain}
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
                        {p.verified ? "Verified" : "Estimated"} &middot; {p.testResult}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results empty state */}
          {contacts.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 mb-2">No contacts found.</p>
              <p className="text-[11px] text-slate-600 max-w-md mx-auto">
                Contact discovery requires ZoomInfo, LinkedIn Sales Navigator, or Apollo.io integration. Connect a data provider to discover contacts.
              </p>
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

          {/* Empty state after filtering */}
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
    </div>
  );
}