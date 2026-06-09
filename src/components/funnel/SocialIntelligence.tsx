import { useState } from "react";
import {
  Activity,
  Linkedin,
  Twitter,
  Newspaper,
  Zap,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Heart,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  MapPin,
  UserPlus,
  Rocket,
  Target,
  Minus,
  Search,
  Star,
  ThumbsUp,
  Repeat2,
  Reply,
  Globe,
  Flame,
  ShoppingCart,
  Award,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

export interface LinkedInPost {
  id: string;
  author: string;
  authorRole: string;
  authorCompany: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  type: "post" | "article" | "poll" | "video";
  sentiment: "positive" | "neutral" | "negative";
  hashtags: string[];
  isPromoted: boolean;
  engagement: number;
}

export interface TwitterMention {
  id: string;
  author: string;
  authorHandle: string;
  authorFollowers: number;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  timestamp: string;
  sentiment: "positive" | "neutral" | "negative";
  isVerified: boolean;
  isReply: boolean;
  relatedCompanies: string[];
}

export interface CompanyNews {
  id: string;
  title: string;
  source: string;
  summary: string;
  url: string;
  publishedAt: string;
  category: "funding" | "hiring" | "product" | "partnership" | "acquisition" | "leadership" | "expansion";
  companies: string[];
  relevanceScore: number;
}

export interface IntentSignal {
  id: string;
  type: "hiring" | "funding" | "expansion" | "tech_stack" | "partnership" | "pain_point";
  company: string;
  description: string;
  confidence: number;
  detectedAt: string;
  source: string;
  suggestedAction: string;
  matchedProductArea: string;
  estimatedDealSize: string;
}

export interface ProspectProfile {
  id: string;
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  twitterHandle: string;
  recentPosts: LinkedInPost[];
  engagementScore: number;
  lastActive: string;
  interests: string[];
  intentScore: number;
}

export interface SocialIntelState {
  prospects: ProspectProfile[];
  twitterMentions: TwitterMention[];
  companyNews: CompanyNews[];
  intentSignals: IntentSignal[];
  trackedCompanies: string[];
  trackedKeywords: string[];
  lastUpdated: string;
}

// ─── Empty State ─────────────────────────────────────────────────────

const EMPTY_STATE: SocialIntelState = {
  prospects: [],
  twitterMentions: [],
  companyNews: [],
  intentSignals: [],
  trackedCompanies: [],
  trackedKeywords: [],
  lastUpdated: new Date().toISOString(),
};

// ─── localStorage helpers ────────────────────────────────────────────

function loadState(): SocialIntelState {
  try {
    const s = localStorage.getItem("sw_social_intel");
    if (s) return JSON.parse(s);
  } catch { /* silent */ }
  return EMPTY_STATE;
}

function saveState(state: SocialIntelState) {
  try {
    localStorage.setItem("sw_social_intel", JSON.stringify(state));
  } catch { /* silent */ }
}

// ─── Helper Components ───────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const config = {
    positive: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: TrendingUp },
    neutral: { classes: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: Minus },
    negative: { classes: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: TrendingDown },
  };
  const c = config[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.classes}`}>
      <c.icon className="w-3 h-3" />
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

function CategoryBadge({ category }: { category: CompanyNews["category"] }) {
  const config: Record<string, { classes: string; icon: typeof DollarSign }> = {
    funding: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: DollarSign },
    hiring: { classes: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: UserPlus },
    product: { classes: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: Rocket },
    partnership: { classes: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Globe },
    acquisition: { classes: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: ShoppingCart },
    leadership: { classes: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: Award },
    expansion: { classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: MapPin },
  };
  const c = config[category];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.classes}`}>
      <c.icon className="w-3 h-3" />
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}

function IntentTypeBadge({ type }: { type: IntentSignal["type"] }) {
  const config: Record<string, { classes: string; icon: typeof Zap }> = {
    hiring: { classes: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: UserPlus },
    funding: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: DollarSign },
    expansion: { classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: MapPin },
    tech_stack: { classes: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: Target },
    partnership: { classes: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Globe },
    pain_point: { classes: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertTriangle },
  };
  const c = config[type];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.classes}`}>
      <c.icon className="w-3 h-3" />
      {type === "tech_stack" ? "Tech Stack" : type === "pain_point" ? "Pain Point" : type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            confidence >= 90 ? "bg-emerald-500" : confidence >= 75 ? "bg-sky-500" : confidence >= 60 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className={`text-[10px] font-medium w-8 text-right ${
        confidence >= 90 ? "text-emerald-400" : confidence >= 75 ? "text-sky-400" : confidence >= 60 ? "text-amber-400" : "text-rose-400"
      }`}>{confidence}%</span>
    </div>
  );
}

function EngagementBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`w-1.5 h-3 rounded-sm ${i < Math.round(score / 20) ? "bg-amber-400" : "bg-white/[0.06]"}`} />
        ))}
      </div>
      <span className="text-[10px] text-slate-500">{score}/100</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function SocialIntelligence() {
  const [data, setData] = useState<SocialIntelState>(loadState);
  const [activeTab, setActiveTab] = useState<"linkedin" | "twitter" | "news" | "intent">("linkedin");
  const [selectedProspect, setSelectedProspect] = useState<ProspectProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSignals, setExpandedSignals] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formTwitter, setFormTwitter] = useState("");
  const [formRole, setFormRole] = useState("");

  const toggleSignal = (id: string) => {
    setExpandedSignals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addProspect = () => {
    if (!formName.trim() || !formCompany.trim()) return;
    const newProspect: ProspectProfile = {
      id: `p_${Date.now()}`,
      name: formName.trim(),
      role: formRole.trim() || "Unknown",
      company: formCompany.trim(),
      linkedinUrl: formLinkedin.trim(),
      twitterHandle: formTwitter.trim(),
      engagementScore: 0,
      lastActive: "Just added",
      interests: [],
      intentScore: 0,
      recentPosts: [],
    };
    const updated: SocialIntelState = {
      ...data,
      prospects: [...data.prospects, newProspect],
      trackedCompanies: data.trackedCompanies.includes(formCompany.trim())
        ? data.trackedCompanies
        : [...data.trackedCompanies, formCompany.trim()],
      lastUpdated: new Date().toISOString(),
    };
    setData(updated);
    saveState(updated);
    setFormName("");
    setFormCompany("");
    setFormLinkedin("");
    setFormTwitter("");
    setFormRole("");
    setShowAddForm(false);
  };

  const removeProspect = (id: string) => {
    const updated = { ...data, prospects: data.prospects.filter(p => p.id !== id), lastUpdated: new Date().toISOString() };
    setData(updated);
    saveState(updated);
    if (selectedProspect?.id === id) setSelectedProspect(null);
  };

  const filteredProspects = data.prospects.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.interests.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredNews = data.companyNews.filter(n => {
    const matchesSearch = !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.companies.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredMentions = data.twitterMentions.filter(m => {
    const matchesSearch = !searchQuery ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredSignals = data.intentSignals.filter(s => {
    const matchesSearch = !searchQuery ||
      s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const tabs = [
    { id: "linkedin" as const, label: "LinkedIn", icon: Linkedin, count: data.prospects.reduce((acc, p) => acc + p.recentPosts.length, 0) },
    { id: "twitter" as const, label: "Twitter/X", icon: Twitter, count: data.twitterMentions.length },
    { id: "news" as const, label: "Company News", icon: Newspaper, count: data.companyNews.length },
    { id: "intent" as const, label: "Intent Signals", icon: Zap, count: data.intentSignals.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            Social Intelligence
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {data.trackedCompanies.length > 0
              ? `Tracking ${data.trackedCompanies.length} companies${data.trackedKeywords.length > 0 ? ` · ${data.trackedKeywords.length} keywords` : ""} · Last updated: ${new Date(data.lastUpdated).toLocaleTimeString()}`
              : "No prospects tracked yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/20 hover:bg-violet-500/25 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Prospect
            </button>
          )}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="text-[11px] pl-6 pr-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30 w-40"
            />
          </div>
        </div>
      </div>

      {/* Add Prospect Form */}
      {showAddForm && (
        <div className="p-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.03] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">Add New Prospect</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Name *</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="w-full text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Company *</label>
              <input
                value={formCompany}
                onChange={e => setFormCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Role</label>
              <input
                value={formRole}
                onChange={e => setFormRole(e.target.value)}
                placeholder="e.g. VP of Engineering"
                className="w-full text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">LinkedIn URL</label>
              <input
                value={formLinkedin}
                onChange={e => setFormLinkedin(e.target.value)}
                placeholder="linkedin.com/in/..."
                className="w-full text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Twitter Handle</label>
              <input
                value={formTwitter}
                onChange={e => setFormTwitter(e.target.value)}
                placeholder="@handle"
                className="w-full text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={addProspect}
              disabled={!formName.trim() || !formCompany.trim()}
              className="flex items-center gap-1 text-[11px] font-medium px-4 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Prospect
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedProspect(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ─── LinkedIn Tab ─────────────────────────────── */}
      {activeTab === "linkedin" && (
        <div className="space-y-3">
          {/* Empty state */}
          {data.prospects.length === 0 && !selectedProspect && (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">No social intelligence data</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Add prospects to track their social activity, engagement, and intent signals.
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-4 py-2 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/20 hover:bg-violet-500/25 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Prospect
              </button>
            </div>
          )}

          {data.prospects.length > 0 && !selectedProspect ? (
            <>
              {/* Prospect cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProspects.map(prospect => (
                  <div
                    key={prospect.id}
                    className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all"
                    onClick={() => setSelectedProspect(prospect)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-violet-300">
                        {prospect.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200">{prospect.name}</div>
                        <div className="text-[10px] text-slate-500">{prospect.role} at {prospect.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-500">Intent Score</div>
                        <div className={`text-xs font-bold ${prospect.intentScore >= 85 ? "text-emerald-400" : prospect.intentScore >= 70 ? "text-sky-400" : "text-amber-400"}`}>
                          {prospect.intentScore}
                        </div>
                      </div>
                    </div>

                    <EngagementBar score={prospect.engagementScore} />

                    <div className="flex flex-wrap gap-1 mt-2.5 mb-2.5">
                      {prospect.interests.slice(0, 3).map(i => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{i}</span>
                      ))}
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{prospect.recentPosts.length} posts tracked</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{prospect.lastActive}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* All recent posts */}
              {data.prospects.some(p => p.recentPosts.length > 0) && (
                <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Linkedin className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-semibold text-slate-200">Recent LinkedIn Activity</span>
                  </div>
                  <div className="space-y-3">
                    {data.prospects.flatMap(p => p.recentPosts).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8).map(post => (
                      <div key={post.id} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-medium text-slate-200">{post.author}</span>
                          <span className="text-[10px] text-slate-500">{post.authorRole} · {post.authorCompany}</span>
                          <SentimentBadge sentiment={post.sentiment} />
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed mb-2 line-clamp-3">{post.content}</div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments}</span>
                          <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{post.shares}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(post.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {post.hashtags.map(h => (
                            <span key={h} className="text-[9px] text-sky-400/70">{h}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : selectedProspect ? (
            /* Selected Prospect Detail */
            <div className="p-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.03] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-lg font-bold text-violet-200">
                    {selectedProspect.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{selectedProspect.name}</div>
                    <div className="text-xs text-slate-500">{selectedProspect.role} · {selectedProspect.company}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500">Active {selectedProspect.lastActive}</span>
                      <span className="text-[10px] text-violet-400">Intent: {selectedProspect.intentScore}/100</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeProspect(selectedProspect.id)}
                    className="text-[10px] px-2 py-1 rounded-lg border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setSelectedProspect(null)}
                    className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedProspect.interests.map(i => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-300">{i}</span>
                ))}
              </div>

              {/* Social links */}
              <div className="flex items-center gap-3 text-[10px]">
                {selectedProspect.linkedinUrl && (
                  <a href={`https://${selectedProspect.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors">
                    <Linkedin className="w-3 h-3" />
                    LinkedIn
                  </a>
                )}
                {selectedProspect.twitterHandle && (
                  <a href={`https://twitter.com/${selectedProspect.twitterHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors">
                    <Twitter className="w-3 h-3" />
                    {selectedProspect.twitterHandle}
                  </a>
                )}
              </div>

              {selectedProspect.recentPosts.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent Posts ({selectedProspect.recentPosts.length})</div>
                  {selectedProspect.recentPosts.map(post => (
                    <div key={post.id} className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 capitalize">{post.type}</span>
                        <SentimentBadge sentiment={post.sentiment} />
                        <span className="text-[10px] text-slate-500">{new Date(post.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed mb-2">{post.content}</div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments}</span>
                        <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{post.shares}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />Eng: {post.engagement}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] text-center">
                  <p className="text-[11px] text-slate-500">No posts tracked yet for this prospect.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ─── Twitter/X Tab ────────────────────────────── */}
      {activeTab === "twitter" && (
        <div className="space-y-3">
          {data.twitterMentions.length === 0 ? (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <p className="text-sm font-medium text-slate-300">No Twitter mentions tracked</p>
              <p className="text-[11px] text-slate-500 mt-1">Add prospects and set tracked keywords to see mentions here.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex flex-wrap gap-1">
                  {data.trackedKeywords.map(kw => (
                    <span key={kw} className="text-[9px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/15">{kw}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredMentions.map(mention => (
                  <div key={mention.id} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-sky-300 shrink-0">
                        {mention.author.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-slate-200">{mention.author}</span>
                          {mention.isVerified && <Star className="w-3 h-3 text-sky-400 fill-sky-400" />}
                          <span className="text-[10px] text-slate-500">{mention.authorHandle}</span>
                          <span className="text-[10px] text-slate-600">· {mention.authorFollowers.toLocaleString()} followers</span>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed mb-2">{mention.content}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{mention.likes}</span>
                            <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{mention.retweets}</span>
                            <span className="flex items-center gap-1"><Reply className="w-3 h-3" />{mention.replies}</span>
                          </div>
                          <SentimentBadge sentiment={mention.sentiment} />
                          <span className="text-[10px] text-slate-600">{new Date(mention.timestamp).toLocaleDateString()}</span>
                        </div>
                        {mention.relatedCompanies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {mention.relatedCompanies.map(co => (
                              <span key={co} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{co}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Company News Tab ─────────────────────────── */}
      {activeTab === "news" && (
        <div className="space-y-2.5">
          {data.companyNews.length === 0 ? (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <p className="text-sm font-medium text-slate-300">No company news tracked</p>
              <p className="text-[11px] text-slate-500 mt-1">Add prospects to track company news and updates.</p>
            </div>
          ) : (
            filteredNews.map(news => (
              <div key={news.id} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    news.category === "funding" ? "bg-emerald-500/10" :
                    news.category === "hiring" ? "bg-sky-500/10" :
                    news.category === "product" ? "bg-violet-500/10" :
                    news.category === "acquisition" ? "bg-orange-500/10" :
                    news.category === "partnership" ? "bg-amber-500/10" :
                    news.category === "leadership" ? "bg-pink-500/10" : "bg-cyan-500/10"
                  }`}>
                    <Newspaper className={`w-4 h-4 ${
                      news.category === "funding" ? "text-emerald-400" :
                      news.category === "hiring" ? "text-sky-400" :
                      news.category === "product" ? "text-violet-400" :
                      news.category === "acquisition" ? "text-orange-400" :
                      news.category === "partnership" ? "text-amber-400" :
                      news.category === "leadership" ? "text-pink-400" : "text-cyan-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryBadge category={news.category} />
                      <span className="text-[10px] text-slate-500">{news.source}</span>
                      <span className="text-[10px] text-slate-600">{new Date(news.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 mb-1 leading-snug">{news.title}</div>
                    <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-2">{news.summary}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {news.companies.map(co => (
                          <span key={co} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{co}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-slate-600" />
                        <span className="text-[10px] text-slate-500">{news.relevanceScore}% relevant</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Intent Signals Tab ───────────────────────── */}
      {activeTab === "intent" && (
        <div className="space-y-3">
          {data.intentSignals.length === 0 ? (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <p className="text-sm font-medium text-slate-300">No intent signals detected</p>
              <p className="text-[11px] text-slate-500 mt-1">Add prospects to detect intent signals like hiring, funding, and expansion.</p>
            </div>
          ) : (
            <>
              {/* Intent summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: "Hiring Signals", count: data.intentSignals.filter(s => s.type === "hiring").length, icon: UserPlus, color: "sky" },
                  { label: "Funding Signals", count: data.intentSignals.filter(s => s.type === "funding").length, icon: DollarSign, color: "emerald" },
                  { label: "Expansion", count: data.intentSignals.filter(s => s.type === "expansion").length, icon: MapPin, color: "cyan" },
                  { label: "Tech Stack", count: data.intentSignals.filter(s => s.type === "tech_stack").length, icon: Target, color: "violet" },
                ].map(stat => (
                  <div key={stat.label} className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <stat.icon className={`w-3.5 h-3.5 text-${stat.color}-400`} />
                      <span className="text-[9px] text-slate-500">{stat.label}</span>
                    </div>
                    <div className={`text-lg font-bold text-${stat.color}-400`}>{stat.count}</div>
                  </div>
                ))}
              </div>

              {/* Signals list */}
              <div className="space-y-2.5">
                {filteredSignals.map(signal => (
                  <div key={signal.id} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        signal.type === "hiring" ? "bg-sky-500/10" :
                        signal.type === "funding" ? "bg-emerald-500/10" :
                        signal.type === "expansion" ? "bg-cyan-500/10" :
                        signal.type === "tech_stack" ? "bg-violet-500/10" :
                        signal.type === "partnership" ? "bg-amber-500/10" : "bg-rose-500/10"
                      }`}>
                        <Zap className={`w-4 h-4 ${
                          signal.type === "hiring" ? "text-sky-400" :
                          signal.type === "funding" ? "text-emerald-400" :
                          signal.type === "expansion" ? "text-cyan-400" :
                          signal.type === "tech_stack" ? "text-violet-400" :
                          signal.type === "partnership" ? "text-amber-400" : "text-rose-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-200">{signal.company}</span>
                          <IntentTypeBadge type={signal.type} />
                          <span className="text-[10px] text-slate-600">{new Date(signal.detectedAt).toLocaleDateString()}</span>
                        </div>

                        <div className="text-xs text-slate-300 leading-relaxed mb-2">{signal.description}</div>

                        <ConfidenceBar confidence={signal.confidence} />

                        <button
                          onClick={() => toggleSignal(signal.id)}
                          className="flex items-center gap-1 mt-2 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          {expandedSignals[signal.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedSignals[signal.id] ? "Hide details" : "Show details"}
                        </button>

                        {expandedSignals[signal.id] && (
                          <div className="mt-2 space-y-1.5 p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                            <div className="flex items-start gap-1.5">
                              <Target className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[9px] text-slate-500">Matched Product Area</span>
                                <div className="text-[10px] text-slate-300">{signal.matchedProductArea}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <DollarSign className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[9px] text-slate-500">Estimated Deal Size</span>
                                <div className="text-[10px] text-emerald-400 font-medium">{signal.estimatedDealSize}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <Flame className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[9px] text-slate-500">Suggested Action</span>
                                <div className="text-[10px] text-amber-300">{signal.suggestedAction}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <Globe className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[9px] text-slate-500">Source</span>
                                <div className="text-[10px] text-slate-400">{signal.source}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
