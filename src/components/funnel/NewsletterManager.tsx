import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Mail, Users, Send, BarChart3, Plus, Trash2, Copy, Calendar, Eye, MousePointer,
  TrendingUp, X, Check, Save, Edit3, ChevronDown, Upload, Download, Tag, Hash,
  Type, Image, Code, Play, Pause, Search, Filter, Smartphone, Monitor, Clock, MoreHorizontal, ArrowUpRight, ArrowDownRight, Percent, Globe, SmartphoneIcon, Tablet, Star, AlertCircle, CheckCircle2, XCircle, Megaphone
} from "lucide-react";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

type SubscriberStatus = "subscribed" | "unsubscribed" | "bounced";
type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused";
type RecipType = "all" | "segment" | "tags";
type Tab = "campaigns" | "subscribers" | "templates" | "analytics";
type TemplateType = "Welcome" | "Weekly Digest" | "Product Update" | "Announcement" | "Curated Content" | "custom";

interface Subscriber {
  id: string;
  name: string;
  email: string;
  status: SubscriberStatus;
  tags: string[];
  signupDate: string;
  openRate: number;
  clickRate: number;
  location?: string;
  device?: string;
}

interface Segment {
  id: string;
  name: string;
  filters: SegmentFilter[];
  count: number;
}

interface SegmentFilter {
  field: "tags" | "status" | "openRate" | "clickRate" | "signupDate";
  operator: "is" | "isNot" | "greaterThan" | "lessThan" | "before" | "after" | "contains";
  value: string;
}

interface TemplateBlock {
  id: string;
  type: "header" | "text" | "image" | "button" | "divider" | "footer";
  content: Record<string, string>;
}

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  subject: string;
  blocks: TemplateBlock[];
  html: string;
  createdAt: string;
  updatedAt: string;
}

interface ABTest {
  enabled: boolean;
  testType: "subject" | "content" | "sendTime";
  variantA: string;
  variantB: string;
  splitPercent: number;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  templateId: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  status: CampaignStatus;
  recipientType: RecipType;
  recipientSegment?: string;
  recipientTags?: string[];
  abTest: ABTest;
  scheduledAt?: string;
  sentAt?: string;
  stats: CampaignStats;
  createdAt: string;
}

interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

interface LinkClick {
  url: string;
  label: string;
  clicks: number;
}

/* ═══════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════ */

const STATUS_COLORS: Record<string, string> = {
  subscribed: "text-emerald-400 bg-emerald-400/10",
  unsubscribed: "text-slate-400 bg-slate-400/10",
  bounced: "text-red-400 bg-red-400/10",
  draft: "text-slate-400 bg-slate-400/10",
  scheduled: "text-amber-400 bg-amber-400/10",
  sending: "text-sky-400 bg-sky-400/10",
  sent: "text-emerald-400 bg-emerald-400/10",
  paused: "text-orange-400 bg-orange-400/10",
};

const INITIAL_SEGMENTS: Segment[] = [];

function makeId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/* ═══════════════════════════════════════════
   DEFAULT TEMPLATES
   ═══════════════════════════════════════════ */

function defaultBlock(type: TemplateBlock["type"]): TemplateBlock {
  switch (type) {
    case "header": return { id: makeId("blk"), type, content: { logoText: "Your Brand", title: "Newsletter Title" } };
    case "text": return { id: makeId("blk"), type, content: { text: "Enter your text here..." } };
    case "image": return { id: makeId("blk"), type, content: { src: "https://images.unsplash.com/photo-1557683316-973673baf926?w=600", alt: "Image" } };
    case "button": return { id: makeId("blk"), type, content: { label: "Click Here", url: "https://example.com" } };
    case "divider": return { id: makeId("blk"), type, content: {} };
    case "footer": return { id: makeId("blk"), type, content: { company: "Your Company", address: "123 Main St", unsubscribeUrl: "{{unsubscribeUrl}}" } };
  }
}

function createTemplate(name: string, type: TemplateType, subject: string, blocks: TemplateBlock[]): Template {
  const now = new Date().toISOString();
  return { id: makeId("tmpl"), name, type, subject, blocks, html: "", createdAt: now, updatedAt: now };
}

function getDefaultTemplates(): Template[] {
  return [
    createTemplate("Welcome Email", "Welcome", "Welcome to {{company}}, {{firstName}}!", [
      defaultBlock("header"),
      { ...defaultBlock("text"), content: { text: "Hi {{firstName}},\n\nWelcome to our community! We're thrilled to have you on board." } },
      { ...defaultBlock("button"), content: { label: "Get Started", url: "https://example.com/start" } },
      defaultBlock("footer"),
    ]),
    createTemplate("Weekly Digest", "Weekly Digest", "Your Weekly Digest - {{date}}", [
      defaultBlock("header"),
      { ...defaultBlock("text"), content: { text: "Here's what happened this week..." } },
      defaultBlock("divider"),
      { ...defaultBlock("text"), content: { text: "## Top Stories\n\nStory 1: Exciting updates..." } },
      defaultBlock("divider"),
      { ...defaultBlock("button"), content: { label: "Read More", url: "https://example.com/blog" } },
      defaultBlock("footer"),
    ]),
    createTemplate("Product Update", "Product Update", "New: {{productName}} is here!", [
      defaultBlock("header"),
      { ...defaultBlock("text"), content: { text: "We've just shipped something exciting..." } },
      defaultBlock("image"),
      { ...defaultBlock("button"), content: { label: "Try It Now", url: "https://example.com/new" } },
      defaultBlock("footer"),
    ]),
    createTemplate("Announcement", "Announcement", "Important Announcement from {{company}}", [
      defaultBlock("header"),
      { ...defaultBlock("text"), content: { text: "We have an important announcement to share with you..." } },
      defaultBlock("divider"),
      { ...defaultBlock("button"), content: { label: "Learn More", url: "https://example.com/announcement" } },
      defaultBlock("footer"),
    ]),
    createTemplate("Curated Content", "Curated Content", "Hand-picked for you, {{firstName}}", [
      defaultBlock("header"),
      { ...defaultBlock("text"), content: { text: "This week's hand-picked articles and resources..." } },
      defaultBlock("divider"),
      { ...defaultBlock("text"), content: { text: "### Article 1\nA great read about..." } },
      { ...defaultBlock("text"), content: { text: "### Article 2\nAnother must-read..." } },
      { ...defaultBlock("button"), content: { label: "View All", url: "https://example.com/curated" } },
      defaultBlock("footer"),
    ]),
  ];
}

function buildHTMLFromBlocks(blocks: TemplateBlock[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case "header":
        return `<div style="text-align:center;padding:20px;background:#1e293b;border-radius:8px;margin:10px 0;"><h1 style="color:#f59e0b;margin:0;font-size:24px;">${b.content.logoText || ""}</h1><p style="color:#94a3b8;margin:8px 0 0;">${b.content.title || ""}</p></div>`;
      case "text":
        return `<div style="padding:16px;color:#e2e8f0;line-height:1.6;">${(b.content.text || "").replace(/\n/g, "<br/>")}</div>`;
      case "image":
        return `<div style="text-align:center;padding:10px;"><img src="${b.content.src || ""}" alt="${b.content.alt || ""}" style="max-width:100%;border-radius:8px;"/></div>`;
      case "button":
        return `<div style="text-align:center;padding:16px;"><a href="${b.content.url || "#"}" style="display:inline-block;padding:12px 28px;background:#f59e0b;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:600;">${b.content.label || "Button"}</a></div>`;
      case "divider":
        return `<hr style="border:0;border-top:1px solid #334155;margin:16px 0;"/>`;
      case "footer":
        return `<div style="text-align:center;padding:16px;color:#64748b;font-size:12px;border-top:1px solid #334155;margin-top:20px;"><p>${b.content.company || ""} — ${b.content.address || ""}</p><p><a href="{{unsubscribeUrl}}" style="color:#64748b;">Unsubscribe</a></p></div>`;
      default:
        return "";
    }
  }).join("\n");
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function NewsletterManager() {
  /* -- state: subscribers -- */
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() =>
    loadJSON<Subscriber[]>("nm_subscribers", [])
  );
  const [segments, setSegments] = useState<Segment[]>(() =>
    loadJSON<Segment[]>("nm_segments", INITIAL_SEGMENTS)
  );

  /* -- state: templates -- */
  const [templates, setTemplates] = useState<Template[]>(() =>
    loadJSON<Template[]>("nm_templates", getDefaultTemplates())
  );

  /* -- state: campaigns -- */
  const [campaigns, setCampaigns] = useState<Campaign[]>(() =>
    loadJSON<Campaign[]>("nm_campaigns", [])
  );

  /* -- tabs -- */
  const [activeTab, setActiveTabRaw] = useState<Tab>(() => {
    try { return (localStorage.getItem("sw_newsletter_tab") as Tab) || "campaigns"; } catch { return "campaigns"; }
  });
  const setActiveTab = (tab: Tab) => {
    setActiveTabRaw(tab);
    try { localStorage.setItem("sw_newsletter_tab", tab); } catch { /* silent */ }
  };

  /* -- localStorage sync -- */
  useEffect(() => { saveJSON("nm_subscribers", subscribers); }, [subscribers]);
  useEffect(() => { saveJSON("nm_segments", segments); }, [segments]);
  useEffect(() => { saveJSON("nm_templates", templates); }, [campaigns]);
  useEffect(() => { saveJSON("nm_campaigns", campaigns); }, [campaigns]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-[#0f172a]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Newsletter Manager</h1>
              <p className="text-xs text-slate-400">Campaigns, subscribers & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 px-2 py-1 rounded-md bg-slate-800/60">
              {subscribers.filter(s => s.status === "subscribed").length} active
            </span>
            <span className="text-xs text-slate-500 px-2 py-1 rounded-md bg-slate-800/60">
              {campaigns.length} campaigns
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(["campaigns", "subscribers", "templates", "analytics"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              {tab === "campaigns" && <Megaphone className="w-4 h-4" />}
              {tab === "subscribers" && <Users className="w-4 h-4" />}
              {tab === "templates" && <Type className="w-4 h-4" />}
              {tab === "analytics" && <BarChart3 className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "campaigns" && (
          <CampaignsTab
            campaigns={campaigns}
            setCampaigns={setCampaigns}
            templates={templates}
            subscribers={subscribers}
            segments={segments}
          />
        )}
        {activeTab === "subscribers" && (
          <SubscribersTab
            subscribers={subscribers}
            setSubscribers={setSubscribers}
            segments={segments}
            setSegments={setSegments}
          />
        )}
        {activeTab === "templates" && (
          <TemplatesTab
            templates={templates}
            setTemplates={setTemplates}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab
            campaigns={campaigns}
            subscribers={subscribers}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CAMPAIGNS TAB
   ═══════════════════════════════════════════ */

function CampaignsTab({
  campaigns, setCampaigns, templates, subscribers, segments,
}: {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  templates: Template[];
  subscribers: Subscriber[];
  segments: Segment[];
}) {
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");

  const filtered = useMemo(() =>
    campaigns.filter(c => statusFilter === "all" || c.status === statusFilter)
  , [campaigns, statusFilter]);

  const duplicateCampaign = (id: string) => {
    const c = campaigns.find(x => x.id === id);
    if (!c) return;
    const copy: Campaign = {
      ...c,
      id: makeId("c"),
      name: `${c.name} (Copy)`,
      status: "draft",
      sentAt: undefined,
      scheduledAt: undefined,
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
      createdAt: new Date().toISOString(),
    };
    setCampaigns(prev => [copy, ...prev]);
  };

  const openDetail = (id: string) => { setDetailId(id); setView("detail"); };

  if (view === "create") {
    return (
      <CampaignCreator
        templates={templates}
        segments={segments}
        subscribers={subscribers}
        onSave={(c) => { setCampaigns(prev => [c, ...prev]); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "detail" && detailId) {
    const campaign = campaigns.find(c => c.id === detailId);
    if (!campaign) return null;
    return (
      <CampaignDetail
        campaign={campaign}
        onBack={() => setView("list")}
        onDuplicate={() => duplicateCampaign(campaign.id)}
      />
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Campaigns</h2>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as CampaignStatus | "all")}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="paused">Paused</option>
          </select>
        </div>
        <button
          onClick={() => setView("create")}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Campaign Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Megaphone className="w-8 h-8" />} title="No campaigns yet" action="Create your first campaign" onAction={() => setView("create")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => openDetail(c.id)}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-amber-500/40 hover:bg-slate-800/80 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`text-xs font-medium px-2 py-1 rounded-md ${STATUS_COLORS[c.status] || ""}`}>
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); duplicateCampaign(c.id); }}
                  className="text-slate-500 hover:text-amber-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{c.name}</h3>
              <p className="text-sm text-slate-400 mb-3 truncate">{c.subject}</p>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-slate-900/60 rounded-lg p-2">
                  <div className="text-lg font-bold text-white">{c.stats.sent}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Sent</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-2">
                  <div className="text-lg font-bold text-emerald-400">
                    {c.stats.sent > 0 ? Math.round((c.stats.opened / c.stats.delivered) * 100) : 0}%
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Open</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-2">
                  <div className="text-lg font-bold text-sky-400">
                    {c.stats.delivered > 0 ? Math.round((c.stats.clicked / c.stats.delivered) * 100) : 0}%
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Click</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.sentAt ? formatDate(c.sentAt) : c.scheduledAt ? `Scheduled ${formatDate(c.scheduledAt)}` : "Draft"}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.stats.sent || c.stats.delivered || "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignDetail({ campaign, onBack, onDuplicate }: { campaign: Campaign; onBack: () => void; onDuplicate: () => void }) {
  const openRate = campaign.stats.delivered > 0 ? ((campaign.stats.opened / campaign.stats.delivered) * 100).toFixed(1) : "0";
  const ctr = campaign.stats.delivered > 0 ? ((campaign.stats.clicked / campaign.stats.delivered) * 100).toFixed(1) : "0";
  const bounceRate = campaign.stats.sent > 0 ? ((campaign.stats.bounced / campaign.stats.sent) * 100).toFixed(1) : "0";
  const unsubRate = campaign.stats.delivered > 0 ? ((campaign.stats.unsubscribed / campaign.stats.delivered) * 100).toFixed(1) : "0";

  return (
    <div>
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1">&larr; Back to campaigns</button>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{campaign.name}</h2>
            <p className="text-slate-400">{campaign.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium px-3 py-1 rounded-lg ${STATUS_COLORS[campaign.status] || ""}`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
            <button onClick={onDuplicate} className="p-2 text-slate-400 hover:text-amber-500 transition-colors" title="Duplicate"><Copy className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Sent" value={String(campaign.stats.sent)} icon={<Send className="w-4 h-4" />} />
          <StatCard label="Delivered" value={String(campaign.stats.delivered)} icon={<CheckCircle2 className="w-4 h-4" />} />
          <StatCard label="Opened" value={String(campaign.stats.opened)} icon={<Eye className="w-4 h-4" />} />
          <StatCard label="Clicked" value={String(campaign.stats.clicked)} icon={<MousePointer className="w-4 h-4" />} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Open Rate" value={`${openRate}%`} accent="text-emerald-400" />
          <StatCard label="Click Rate" value={`${ctr}%`} accent="text-sky-400" />
          <StatCard label="Bounce Rate" value={`${bounceRate}%`} accent="text-red-400" />
          <StatCard label="Unsub Rate" value={`${unsubRate}%`} accent="text-orange-400" />
        </div>

        {/* Details */}
        <div className="border-t border-slate-700/50 pt-6">
          <h3 className="font-semibold text-white mb-4">Campaign Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <DetailRow label="From" value={`${campaign.fromName} <${campaign.fromEmail}>`} />
            <DetailRow label="Reply-To" value={campaign.replyTo} />
            <DetailRow label="Preview Text" value={campaign.previewText || "—"} />
            <DetailRow label="Recipients" value={campaign.recipientType === "all" ? "All Subscribers" : campaign.recipientType === "segment" ? `Segment: ${campaign.recipientSegment}` : `Tags: ${campaign.recipientTags?.join(", ")}`} />
            <DetailRow label="A/B Test" value={campaign.abTest.enabled ? `${campaign.abTest.testType} (${campaign.abTest.splitPercent}%)` : "Disabled"} />
            <DetailRow label="Scheduled" value={campaign.scheduledAt ? formatDate(campaign.scheduledAt) : campaign.sentAt ? formatDate(campaign.sentAt) : "Not scheduled"} />
          </div>
        </div>

        {campaign.abTest.enabled && (
          <div className="border-t border-slate-700/50 pt-6 mt-6">
            <h3 className="font-semibold text-white mb-4">A/B Test Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/50">
                <div className="text-xs text-slate-500 mb-1">Variant A</div>
                <div className="text-sm text-white font-medium mb-2">{campaign.abTest.variantA}</div>
                <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: `${campaign.abTest.splitPercent}%` }} /></div>
                <div className="text-xs text-slate-500 mt-1">{campaign.abTest.splitPercent}% traffic</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/50">
                <div className="text-xs text-slate-500 mb-1">Variant B</div>
                <div className="text-sm text-white font-medium mb-2">{campaign.abTest.variantB}</div>
                <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-slate-500 h-2 rounded-full" style={{ width: `${100 - campaign.abTest.splitPercent}%` }} /></div>
                <div className="text-xs text-slate-500 mt-1">{100 - campaign.abTest.splitPercent}% traffic</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCreator({ templates, segments, subscribers, onSave, onCancel }: {
  templates: Template[];
  segments: Segment[];
  subscribers: Subscriber[];
  onSave: (c: Campaign) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"details" | "content" | "recipients" | "review">("details");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [fromName, setFromName] = useState("Your Name");
  const [fromEmail, setFromEmail] = useState("you@company.com");
  const [replyTo, setReplyTo] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [recipType, setRecipType] = useState<RecipType>("all");
  const [recipSegment, setRecipSegment] = useState("");
  const [recipTags, setRecipTags] = useState<string[]>([]);
  const [abEnabled, setAbEnabled] = useState(false);
  const [abType, setAbType] = useState<ABTest["testType"]>("subject");
  const [abVariantA, setAbVariantA] = useState("");
  const [abVariantB, setAbVariantB] = useState("");
  const [abSplit, setAbSplit] = useState(50);
  const [testEmail, setTestEmail] = useState("");
  const [testSent, setTestSent] = useState(false);

  const selectedTemplate = templates.find(t => t.id === templateId);
  const allTags = useMemo(() => Array.from(new Set(subscribers.flatMap(s => s.tags))), [subscribers]);

  const recipientCount = useMemo(() => {
    if (recipType === "all") return subscribers.filter(s => s.status === "subscribed").length;
    if (recipType === "segment" && recipSegment) {
      const seg = segments.find(s => s.id === recipSegment);
      if (!seg) return 0;
      return subscribers.filter(s => {
        return s.status === "subscribed" && seg.filters.every(f => {
          if (f.field === "tags") return f.operator === "contains" ? s.tags.includes(f.value) : !s.tags.includes(f.value);
          if (f.field === "status") return f.operator === "is" ? s.status === f.value : s.status !== f.value;
          if (f.field === "openRate") return f.operator === "greaterThan" ? s.openRate > Number(f.value) : s.openRate < Number(f.value);
          if (f.field === "signupDate") return f.operator === "after" ? s.signupDate > f.value : s.signupDate < f.value;
          return true;
        });
      }).length;
    }
    if (recipType === "tags") return subscribers.filter(s => s.status === "subscribed" && recipTags.some(t => s.tags.includes(t))).length;
    return 0;
  }, [recipType, recipSegment, recipTags, subscribers, segments]);

  const handleSend = () => {
    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: makeId("c"),
      name,
      subject,
      previewText,
      templateId,
      fromName,
      fromEmail,
      replyTo: replyTo || fromEmail,
      status: sendMode === "schedule" && scheduleDate ? "scheduled" : "sent",
      recipientType: recipType,
      recipientSegment: recipType === "segment" ? recipSegment : undefined,
      recipientTags: recipType === "tags" ? recipTags : undefined,
      abTest: { enabled: abEnabled, testType: abType, variantA: abVariantA, variantB: abVariantB, splitPercent: abSplit },
      scheduledAt: sendMode === "schedule" ? scheduleDate : undefined,
      sentAt: sendMode === "now" ? now : undefined,
      stats: { sent: recipientCount, delivered: Math.round(recipientCount * 0.95), opened: 0, clicked: 0, bounced: Math.round(recipientCount * 0.05), unsubscribed: 0 },
      createdAt: now,
    };
    onSave(campaign);
  };

  const toggleTag = (tag: string) => {
    setRecipTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const steps = ["details", "content", "recipients", "review"] as const;
  const stepIdx = steps.indexOf(step);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">New Campaign</h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                i <= stepIdx ? "bg-amber-500 text-slate-900" : "bg-slate-700 text-slate-400"
              } ${i < stepIdx ? "cursor-pointer" : ""}`}
            >
              {i < stepIdx ? <Check className="w-4 h-4" /> : i + 1}
            </button>
            <span className={`text-sm capitalize ${i <= stepIdx ? "text-white" : "text-slate-500"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`w-8 h-px ${i < stepIdx ? "bg-amber-500" : "bg-slate-700"}`} />}
          </div>
        ))}
      </div>

      {step === "details" && (
        <div className="space-y-4 max-w-2xl">
          <Field label="Campaign Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. April Newsletter" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></Field>
          <Field label="Subject Line"><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject line" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></Field>
          <Field label="Preview Text"><input value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Preview text shown in inbox" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From Name"><input value={fromName} onChange={e => setFromName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></Field>
            <Field label="From Email"><input value={fromEmail} onChange={e => setFromEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></Field>
          </div>
          <Field label="Reply-To"><input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="Optional" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></Field>
          <div className="flex justify-end pt-4">
            <button onClick={() => setStep("content")} disabled={!name || !subject} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm">Next: Content</button>
          </div>
        </div>
      )}

      {step === "content" && (
        <div className="space-y-4">
          <Field label="Select Template">
            <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>

          {selectedTemplate && (
            <div className="border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 text-xs font-medium text-slate-400 flex items-center gap-2">
                <Eye className="w-3 h-3" /> Template Preview
              </div>
              <div className="bg-[#0f172a] p-6 max-h-96 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: `<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#0f172a;">${buildHTMLFromBlocks(selectedTemplate.blocks)}</div>` }} />
              </div>
            </div>
          )}

          {/* A/B Test */}
          <div className="border border-slate-700/50 rounded-xl p-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={abEnabled} onChange={e => setAbEnabled(e.target.checked)} className="rounded border-slate-600 text-amber-500 focus:ring-amber-500/50 bg-slate-800" />
              <span className="text-sm font-medium text-white">Enable A/B Testing</span>
            </label>
            {abEnabled && (
              <div className="space-y-3 ml-6">
                <div className="flex gap-2">
                  {(["subject", "content", "sendTime"] as const).map(t => (
                    <button key={t} onClick={() => setAbType(t)} className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${abType === t ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>{t}</button>
                  ))}
                </div>
                {abType === "subject" && (
                  <div className="grid grid-cols-2 gap-3">
                    <input value={abVariantA} onChange={e => setAbVariantA(e.target.value)} placeholder="Subject A" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                    <input value={abVariantB} onChange={e => setAbVariantB(e.target.value)} placeholder="Subject B" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                  </div>
                )}
                {abType === "content" && (
                  <div className="grid grid-cols-2 gap-3">
                    <textarea value={abVariantA} onChange={e => setAbVariantA(e.target.value)} placeholder="Content variant A" rows={3} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
                    <textarea value={abVariantB} onChange={e => setAbVariantB(e.target.value)} placeholder="Content variant B" rows={3} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Split: {abSplit}% / {100 - abSplit}%</label>
                  <input type="range" min={10} max={90} value={abSplit} onChange={e => setAbSplit(Number(e.target.value))} className="w-full accent-amber-500" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep("details")} className="px-6 py-2.5 text-slate-300 hover:text-white text-sm">Back</button>
            <button onClick={() => setStep("recipients")} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg transition-colors text-sm">Next: Recipients</button>
          </div>
        </div>
      )}

      {step === "recipients" && (
        <div className="space-y-4 max-w-2xl">
          <Field label="Send To">
            <div className="flex gap-2">
              {(["all", "segment", "tags"] as const).map(r => (
                <button key={r} onClick={() => setRecipType(r)} className={`px-4 py-2 text-sm rounded-lg capitalize transition-colors ${recipType === r ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>{r === "all" ? "All Subscribers" : r}</button>
              ))}
            </div>
          </Field>

          {recipType === "segment" && (
            <Field label="Select Segment">
              <select value={recipSegment} onChange={e => setRecipSegment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                <option value="">Choose a segment</option>
                {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.count} subscribers)</option>)}
              </select>
            </Field>
          )}

          {recipType === "tags" && (
            <Field label="Select Tags">
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${recipTags.includes(tag) ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                    {recipTags.includes(tag) && <Check className="w-3 h-3" />}{tag}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <div className="text-sm text-amber-400 font-medium">{recipientCount} subscribers will receive this campaign</div>
          </div>

          {/* Schedule */}
          <div className="border border-slate-700/50 rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium text-white mb-2">Schedule</div>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sendMode" checked={sendMode === "now"} onChange={() => setSendMode("now")} className="text-amber-500" /> <span className="text-sm text-slate-300">Send Now</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sendMode" checked={sendMode === "schedule"} onChange={() => setSendMode("schedule")} className="text-amber-500" /> <span className="text-sm text-slate-300">Schedule</span></label>
            </div>
            {sendMode === "schedule" && (
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            )}
          </div>

          {/* Test Email */}
          <div className="border border-slate-700/50 rounded-xl p-4">
            <div className="text-sm font-medium text-white mb-2">Send Test</div>
            <div className="flex gap-2">
              <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              <button onClick={() => { setTestSent(true); setTimeout(() => setTestSent(false), 2000); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors flex items-center gap-1">{testSent ? <><Check className="w-3.5 h-3.5" /> Sent</> : "Send Test"}</button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep("content")} className="px-6 py-2.5 text-slate-300 hover:text-white text-sm">Back</button>
            <button onClick={() => setStep("review")} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg transition-colors text-sm">Review</button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-white text-lg mb-4">Review & Send</h3>
            <ReviewRow label="Campaign" value={name} />
            <ReviewRow label="Subject" value={subject} />
            <ReviewRow label="From" value={`${fromName} <${fromEmail}>`} />
            <ReviewRow label="Template" value={selectedTemplate?.name || "—"} />
            <ReviewRow label="Recipients" value={`${recipientCount} subscribers (${recipType === "all" ? "All" : recipType})`} />
            <ReviewRow label="Schedule" value={sendMode === "now" ? "Send immediately" : formatDate(scheduleDate)} />
            <ReviewRow label="A/B Test" value={abEnabled ? `${abType} (${abSplit}%)` : "Disabled"} />
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep("recipients")} className="px-6 py-2.5 text-slate-300 hover:text-white text-sm">Back</button>
            <button onClick={handleSend} className="px-8 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg transition-colors text-sm flex items-center gap-2"><Send className="w-4 h-4" /> {sendMode === "now" ? "Send Campaign" : "Schedule Campaign"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUBSCRIBERS TAB
   ═══════════════════════════════════════════ */

function SubscribersTab({
  subscribers, setSubscribers, segments, setSegments,
}: {
  subscribers: Subscriber[];
  setSubscribers: React.Dispatch<React.SetStateAction<Subscriber[]>>;
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubscriberStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [showSegments, setShowSegments] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTag, setBulkTag] = useState("");
  const [subView, setSubView] = useState<"list" | "segments">("list");

  const allTags = useMemo(() => Array.from(new Set(subscribers.flatMap(s => s.tags))).sort(), [subscribers]);

  const filtered = useMemo(() =>
    subscribers.filter(s => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (tagFilter !== "all" && !s.tags.includes(tagFilter)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q));
    })
  , [subscribers, search, statusFilter, tagFilter]);

  const handleImport = () => {
    const lines = importText.trim().split("\n");
    const newSubs: Subscriber[] = [];
    for (const line of lines) {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 2 && parts[1].includes("@")) {
        newSubs.push({
          id: makeId("s"),
          name: parts[0] || parts[1].split("@")[0],
          email: parts[1],
          status: "subscribed",
          tags: parts.slice(2).filter(Boolean),
          signupDate: new Date().toISOString().split("T")[0],
          openRate: 0,
          clickRate: 0,
        });
      }
    }
    setSubscribers(prev => [...newSubs, ...prev]);
    setImportText("");
    setShowImport(false);
  };

  const deleteSubscriber = (id: string) => setSubscribers(prev => prev.filter(s => s.id !== id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addTagToSelected = () => {
    if (!bulkTag) return;
    setSubscribers(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, tags: [...new Set([...s.tags, bulkTag])] } : s));
    setBulkTag("");
    setSelectedIds([]);
  };

  const removeTag = (subId: string, tag: string) => {
    setSubscribers(prev => prev.map(s => s.id === subId ? { ...s, tags: s.tags.filter(t => t !== tag) } : s));
  };

  const subscribedCount = subscribers.filter(s => s.status === "subscribed").length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Subscribers</h2>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
            <button onClick={() => setSubView("list")} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${subView === "list" ? "bg-slate-700 text-white" : "text-slate-400"}`}>All</button>
            <button onClick={() => setSubView("segments")} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${subView === "segments" ? "bg-slate-700 text-white" : "text-slate-400"}`}>Segments</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"><Upload className="w-4 h-4" /> Import</button>
          <button onClick={() => { const csv = subscribers.map(s => `${s.name},${s.email},${s.tags.join("|")}`).join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "subscribers.csv"; a.click(); }} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={String(subscribers.length)} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Subscribed" value={String(subscribedCount)} accent="text-emerald-400" icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatCard label="Bounced" value={String(subscribers.filter(s => s.status === "bounced").length)} accent="text-red-400" icon={<XCircle className="w-4 h-4" />} />
        <StatCard label="Growth" value="—" icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      {/* Empty state */}
      {subscribers.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center mb-6">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-400 mb-1">No subscribers yet</h3>
          <p className="text-sm text-slate-500 mb-4">Import subscribers from CSV or add them manually.</p>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors mx-auto"><Upload className="w-4 h-4" /> Import Subscribers</button>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
          <div className="text-sm text-slate-300 mb-2">Paste CSV (Name, Email, Tags...)</div>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={5} placeholder="John Doe, john@example.com, tag1, tag2" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button onClick={handleImport} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg text-sm transition-colors">Import</button>
          </div>
        </div>
      )}

      {subView === "list" ? (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or tags..." className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SubscriberStatus | "all")} className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              <option value="all">All Status</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
            </select>
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              <option value="all">All Tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mb-4 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2">
              <span className="text-sm text-amber-400">{selectedIds.length} selected</span>
              <input value={bulkTag} onChange={e => setBulkTag(e.target.value)} placeholder="Tag name" className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none" />
              <button onClick={addTagToSelected} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded text-sm font-medium">Add Tag</button>
              <button onClick={() => setSubscribers(prev => prev.filter(s => !selectedIds.includes(s.id)))} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Table */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-800/60">
                    <th className="text-left px-4 py-3 w-10"><input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={e => setSelectedIds(e.target.checked ? filtered.map(f => f.id) : [])} className="rounded border-slate-600 text-amber-500 focus:ring-amber-500/50 bg-slate-800" /></th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Tags</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Signup</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Open %</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Click %</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} className="rounded border-slate-600 text-amber-500 focus:ring-amber-500/50 bg-slate-800" /></td>
                      <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                      <td className="px-4 py-3 text-slate-400">{s.email}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-0.5 text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                              {tag}
                              <button onClick={() => removeTag(s.id, tag)} className="hover:text-red-400 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(s.signupDate)}</td>
                      <td className="px-4 py-3 text-emerald-400">{s.openRate}%</td>
                      <td className="px-4 py-3 text-sky-400">{s.clickRate}%</td>
                      <td className="px-4 py-3"><button onClick={() => deleteSubscriber(s.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">No subscribers match your filters.</div>
            )}
          </div>
        </>
      ) : (
        <SegmentsView segments={segments} setSegments={setSegments} subscribers={subscribers} allTags={allTags} />
      )}
    </div>
  );
}

function SegmentsView({ segments, setSegments, subscribers, allTags }: {
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  subscribers: Subscriber[];
  allTags: string[];
}) {
  const [name, setName] = useState("");
  const [filters, setFilters] = useState<SegmentFilter[]>([{ field: "tags", operator: "contains", value: "" }]);

  const addFilter = () => setFilters(prev => [...prev, { field: "tags", operator: "contains", value: "" }]);
  const removeFilter = (i: number) => setFilters(prev => prev.filter((_, idx) => idx !== i));
  const updateFilter = (i: number, patch: Partial<SegmentFilter>) => setFilters(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const computeCount = useCallback((segFilters: SegmentFilter[]) => {
    return subscribers.filter(s => s.status === "subscribed" && segFilters.every(f => {
      if (f.field === "tags") return f.operator === "contains" ? s.tags.includes(f.value) : !s.tags.includes(f.value);
      if (f.field === "status") return f.operator === "is" ? s.status === f.value : s.status !== f.value;
      if (f.field === "openRate") return f.operator === "greaterThan" ? s.openRate > Number(f.value) : s.openRate < Number(f.value);
      if (f.field === "clickRate") return f.operator === "greaterThan" ? s.clickRate > Number(f.value) : s.clickRate < Number(f.value);
      if (f.field === "signupDate") return f.operator === "after" ? s.signupDate > f.value : s.signupDate < f.value;
      return true;
    })).length;
  }, [subscribers]);

  const saveSegment = () => {
    if (!name || filters.some(f => !f.value)) return;
    const count = computeCount(filters);
    setSegments(prev => [...prev, { id: makeId("seg"), name, filters, count }]);
    setName("");
    setFilters([{ field: "tags", operator: "contains", value: "" }]);
  };

  const deleteSegment = (id: string) => setSegments(prev => prev.filter(s => s.id !== id));

  const previewCount = computeCount(filters);

  return (
    <div className="space-y-6">
      {/* Create */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Create Segment</h3>
        <div className="space-y-3 max-w-xl">
          <Field label="Segment Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High Engagers" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></Field>
          <div className="text-sm text-slate-400 mb-1">Filters (all must match)</div>
          {filters.map((f, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={f.field} onChange={e => updateFilter(i, { field: e.target.value as SegmentFilter["field"] })} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none">
                <option value="tags">Tags</option>
                <option value="status">Status</option>
                <option value="openRate">Open Rate</option>
                <option value="clickRate">Click Rate</option>
                <option value="signupDate">Signup Date</option>
              </select>
              <select value={f.operator} onChange={e => updateFilter(i, { operator: e.target.value as SegmentFilter["operator"] })} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none">
                {f.field === "tags" && <><option value="contains">contains</option><option value="isNot">does not contain</option></>}
                {f.field === "status" && <><option value="is">is</option><option value="isNot">is not</option></>}
                {(f.field === "openRate" || f.field === "clickRate") && <><option value="greaterThan">{'>'}</option><option value="lessThan">{'<'}</option></>}
                {f.field === "signupDate" && <><option value="after">after</option><option value="before">before</option></>}
              </select>
              <input value={f.value} onChange={e => updateFilter(i, { value: e.target.value })} placeholder="value" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              <button onClick={() => removeFilter(i)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button onClick={addFilter} className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Filter</button>
            <span className="text-sm text-slate-400">Preview: {previewCount} subscribers</span>
          </div>
          <button onClick={saveSegment} disabled={!name} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors">Save Segment</button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map(seg => (
          <div key={seg.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-white">{seg.name}</h4>
              <button onClick={() => deleteSegment(seg.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="text-2xl font-bold text-amber-400 mb-2">{seg.count || computeCount(seg.filters)}</div>
            <div className="text-xs text-slate-400 space-y-1">
              {seg.filters.map((f, i) => (
                <div key={i} className="bg-slate-900/60 rounded px-2 py-1">
                  {f.field} {f.operator} &quot;{f.value}&quot;
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEMPLATES TAB
   ═══════════════════════════════════════════ */

function TemplatesTab({ templates, setTemplates }: { templates: Template[]; setTemplates: React.Dispatch<React.SetStateAction<Template[]>> }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editBlocks, setEditBlocks] = useState<TemplateBlock[]>([]);
  const [htmlMode, setHtmlMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editHtml, setEditHtml] = useState("");
  const [newName, setNewName] = useState("");

  const startEdit = (t: Template) => {
    setEditing(t.id);
    setEditBlocks([...t.blocks]);
    setEditHtml(t.html || buildHTMLFromBlocks(t.blocks));
    setHtmlMode(false);
  };

  const saveEdit = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, blocks: editBlocks, html: htmlMode ? editHtml : buildHTMLFromBlocks(editBlocks), updatedAt: new Date().toISOString() } : t));
    setEditing(null);
  };

  const addBlock = (type: TemplateBlock["type"]) => setEditBlocks(prev => [...prev, defaultBlock(type)]);
  const removeBlock = (idx: number) => setEditBlocks(prev => prev.filter((_, i) => i !== idx));
  const moveBlock = (idx: number, dir: -1 | 1) => {
    setEditBlocks(prev => {
      const newArr = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= newArr.length) return prev;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr;
    });
  };

  const updateBlockContent = (idx: number, patch: Record<string, string>) => {
    setEditBlocks(prev => prev.map((b, i) => i === idx ? { ...b, content: { ...b.content, ...patch } } : b));
  };

  const createNewTemplate = () => {
    if (!newName) return;
    const id = `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const tmpl: Template = { id, name: newName, type: "custom", subject: newName, blocks: [defaultBlock("header"), defaultBlock("text"), defaultBlock("footer")], html: "", createdAt: now, updatedAt: now };
    setTemplates((prev: Template[]) => [tmpl, ...prev]);
    setNewName("");
  };

  const deleteTemplate = (id: string) => setTemplates(prev => prev.filter(t => t.id !== id));

  const editingTemplate = templates.find(t => t.id === editing);

  if (editing && editingTemplate) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Editing: {editingTemplate.name}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewMode(p => p === "desktop" ? "mobile" : "desktop")} className="p-2 text-slate-400 hover:text-white" title="Toggle Preview">
              {previewMode === "desktop" ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </button>
            <button onClick={() => setHtmlMode(p => !p)} className={`p-2 transition-colors ${htmlMode ? "text-amber-400" : "text-slate-400 hover:text-white"}`} title="HTML Mode"><Code className="w-4 h-4" /></button>
            <button onClick={() => saveEdit(editing)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg text-sm transition-colors"><Save className="w-4 h-4" /> Save</button>
            <button onClick={() => setEditing(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-3">
            {htmlMode ? (
              <textarea value={editHtml} onChange={e => setEditHtml(e.target.value)} rows={30} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
            ) : (
              <>
                {editBlocks.map((block, idx) => (
                  <div key={block.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">{block.type}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-1 text-slate-500 hover:text-white disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5 rotate-180" /></button>
                        <button onClick={() => moveBlock(idx, 1)} disabled={idx === editBlocks.length - 1} className="p-1 text-slate-500 hover:text-white disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeBlock(idx)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <BlockEditor block={block} onChange={patch => updateBlockContent(idx, patch)} />
                  </div>
                ))}
                {/* Add Block Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {(["header", "text", "image", "button", "divider", "footer"] as const).map(type => (
                    <button key={type} onClick={() => addBlock(type)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 capitalize transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" /> {type}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">{previewMode} Preview</div>
            <div className={`border border-slate-700/50 rounded-xl overflow-hidden ${previewMode === "mobile" ? "max-w-sm mx-auto" : ""}`}>
              <div className="bg-slate-900 p-4 max-h-[600px] overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: `<div style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;">${htmlMode ? editHtml : buildHTMLFromBlocks(editBlocks)}</div>` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Templates</h2>
        <div className="flex items-center gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New template name" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          <button onClick={createNewTemplate} disabled={!newName} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Create</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-amber-500/40 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${t.type === "custom" ? "bg-purple-500/10 text-purple-400" : "bg-sky-500/10 text-sky-400"}`}>
                {t.type}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(t)} className="p-1 text-slate-500 hover:text-amber-500"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => deleteTemplate(t.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-white mb-1">{t.name}</h3>
            <p className="text-sm text-slate-400 mb-3">{t.subject}</p>
            <div className="text-xs text-slate-500">{t.blocks.length} blocks &middot; Updated {formatDate(t.updatedAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: TemplateBlock; onChange: (patch: Record<string, string>) => void }) {
  const inp = (label: string, key: string, placeholder?: string) => (
    <div className="mb-2">
      <label className="text-xs text-slate-400 mb-0.5 block">{label}</label>
      <input value={block.content[key] || ""} onChange={e => onChange({ [key]: e.target.value })} placeholder={placeholder} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
    </div>
  );
  const txt = (label: string, key: string, placeholder?: string) => (
    <div className="mb-2">
      <label className="text-xs text-slate-400 mb-0.5 block">{label}</label>
      <textarea value={block.content[key] || ""} onChange={e => onChange({ [key]: e.target.value })} placeholder={placeholder} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none" />
    </div>
  );

  switch (block.type) {
    case "header": return <>{inp("Logo Text", "logoText")}{inp("Title", "title")}</>;
    case "text": return <>{txt("Text", "text", "Use {{firstName}}, {{company}}, {{unsubscribeUrl}}")}</>;
    case "image": return <>{inp("Image URL", "src")}{inp("Alt Text", "alt")}</>;
    case "button": return <>{inp("Label", "label")}{inp("URL", "url")}</>;
    case "divider": return <div className="text-xs text-slate-500 py-2">Horizontal divider</div>;
    case "footer": return <>{inp("Company", "company")}{inp("Address", "address")}{inp("Unsubscribe URL", "unsubscribeUrl")}</>;
    default: return null;
  }
}

/* ═══════════════════════════════════════════
   ANALYTICS TAB
   ═══════════════════════════════════════════ */

function AnalyticsTab({ campaigns, subscribers }: { campaigns: Campaign[]; subscribers: Subscriber[] }) {
  const sentCampaigns = campaigns.filter(c => c.status === "sent");
  const totalSent = sentCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const totalDelivered = sentCampaigns.reduce((sum, c) => sum + c.stats.delivered, 0);
  const totalOpened = sentCampaigns.reduce((sum, c) => sum + c.stats.opened, 0);
  const totalClicked = sentCampaigns.reduce((sum, c) => sum + c.stats.clicked, 0);
  const totalBounced = sentCampaigns.reduce((sum, c) => sum + c.stats.bounced, 0);
  const totalUnsubscribed = sentCampaigns.reduce((sum, c) => sum + c.stats.unsubscribed, 0);
  const avgOpenRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : "0";
  const avgCtr = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : "0";
  const unsubRate = totalDelivered > 0 ? ((totalUnsubscribed / totalDelivered) * 100).toFixed(1) : "0";

  // 7-day volume chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const dayLabels = last7Days.map(d => d.slice(5));
  const dayValues = last7Days.map(d => campaigns.filter(c => c.sentAt && c.sentAt.startsWith(d)).reduce((s, c) => s + c.stats.sent, 0));
  const maxDay = Math.max(...dayValues, 1);

  // Top campaigns by open rate
  const topCampaigns = [...sentCampaigns]
    .filter(c => c.stats.delivered > 0)
    .sort((a, b) => (b.stats.opened / b.stats.delivered) - (a.stats.opened / a.stats.delivered))
    .slice(0, 5);

  // Device breakdown — derived from subscriber data if available
  const devices = subscribers.length > 0
    ? [
        { name: "Desktop", percent: 0, icon: <Monitor className="w-4 h-4" /> },
        { name: "Mobile", percent: 0, icon: <SmartphoneIcon className="w-4 h-4" /> },
        { name: "Tablet", percent: 0, icon: <Tablet className="w-4 h-4" /> },
      ]
    : [];

  // Link click heatmap — placeholder until real click tracking data is available
  const linkClicks: LinkClick[] = [];
  const maxClicks = 1;

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Analytics Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Subscribers" value={String(subscribers.filter(s => s.status === "subscribed").length)} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Avg Open Rate" value={`${avgOpenRate}%`} accent="text-emerald-400" icon={<Eye className="w-4 h-4" />} />
          <StatCard label="Avg Click Rate" value={`${avgCtr}%`} accent="text-sky-400" icon={<MousePointer className="w-4 h-4" />} />
          <StatCard label="Total Sent" value={String(totalSent)} icon={<Send className="w-4 h-4" />} />
          <StatCard label="Unsub Rate" value={`${unsubRate}%`} accent="text-orange-400" icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="Campaigns" value={String(campaigns.length)} icon={<Megaphone className="w-4 h-4" />} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-day volume */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-500" /> 7-Day Send Volume</h3>
          <div className="flex items-end gap-3 h-40">
            {dayValues.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400">{v}</span>
                <div className="w-full bg-slate-900 rounded-t-md relative overflow-hidden" style={{ height: `${Math.max((v / maxDay) * 120, 4)}px` }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-amber-500/70 rounded-t-md" style={{ height: "100%" }} />
                </div>
                <span className="text-[10px] text-slate-500">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscriber growth */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" /> Subscriber Growth</h3>
          {subscribers.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs">No subscriber data yet</div>
          ) : (
          <div className="flex items-end gap-3 h-40">
            {[1].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400">{subscribers.length}</span>
                <div className="w-full bg-slate-900 rounded-t-md relative overflow-hidden" style={{ height: `${Math.min(subscribers.length * 4, 120)}px` }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/70 rounded-t-md" style={{ height: "100%" }} />
                </div>
                <span className="text-[10px] text-slate-500">Now</span>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Top Campaigns by Open Rate</h3>
          {topCampaigns.length === 0 ? (
            <div className="text-slate-500 text-sm">No sent campaigns yet.</div>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map(c => {
                const rate = ((c.stats.opened / c.stats.delivered) * 100).toFixed(1);
                return (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.stats.delivered} delivered</div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="w-24 bg-slate-900 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(Number(rate), 100)}%` }} /></div>
                      <span className="text-sm font-medium text-emerald-400 w-12 text-right">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-amber-500" /> Device Breakdown</h3>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs">No device data yet</div>
          ) : (
          <div className="space-y-4">
            {devices.map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <div className="text-slate-400">{d.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-white">{d.name}</span>
                    <span className="text-sm text-slate-400">{d.percent > 0 ? `${d.percent}%` : "—"}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: `${d.percent > 0 ? d.percent : 0}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Engagement Heatmap */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><MousePointer className="w-4 h-4 text-amber-500" /> Link Click Heatmap</h3>
        {linkClicks.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-xs">No click data yet. Data will appear once campaigns are sent and links are clicked.</div>
        ) : (
        <div className="space-y-3">
          {linkClicks.map(link => (
            <div key={link.url} className="flex items-center gap-3">
              <div className="w-48 min-w-0">
                <div className="text-sm text-white truncate">{link.label}</div>
                <div className="text-xs text-slate-500 truncate">{link.url}</div>
              </div>
              <div className="flex-1">
                <div className="w-full bg-slate-900 rounded-full h-3"><div className="bg-sky-500 h-3 rounded-full transition-all" style={{ width: `${(link.clicks / maxClicks) * 100}%` }} /></div>
              </div>
              <div className="w-12 text-right text-sm font-medium text-sky-400">{link.clicks}</div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Per-Campaign Stats Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Campaign Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/60">
                <th className="text-left px-4 py-3 font-medium text-slate-400">Campaign</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Sent</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Deliv.</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Opened</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Open %</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Clicked</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">CTR</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Bounced</th>
                <th className="text-right px-4 py-3 font-medium text-slate-400">Unsub</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const orate = c.stats.delivered > 0 ? ((c.stats.opened / c.stats.delivered) * 100).toFixed(1) : "0";
                const ctr = c.stats.delivered > 0 ? ((c.stats.clicked / c.stats.delivered) * 100).toFixed(1) : "0";
                return (
                  <tr key={c.id} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{c.stats.sent}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{c.stats.delivered}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{c.stats.opened}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{orate}%</td>
                    <td className="px-4 py-3 text-right text-sky-400">{c.stats.clicked}</td>
                    <td className="px-4 py-3 text-right text-sky-400">{ctr}%</td>
                    <td className="px-4 py-3 text-right text-red-400">{c.stats.bounced}</td>
                    <td className="px-4 py-3 text-right text-orange-400">{c.stats.unsubscribed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-500 mb-2">{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div>
      <div className={`text-2xl font-bold ${accent || "text-white"}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1 border-b border-slate-700/30">
      <span className="text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1 border-b border-slate-700/30">
      <span className="text-slate-400 w-32 shrink-0 text-sm">{label}</span>
      <span className="text-white font-medium">{value || "—"}</span>
    </div>
  );
}

function EmptyState({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action: string; onAction: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="text-slate-600 mb-3 flex justify-center">{icon}</div>
      <h3 className="text-lg font-medium text-slate-400 mb-2">{title}</h3>
      <button onClick={onAction} className="text-amber-500 hover:text-amber-400 text-sm font-medium">{action}</button>
    </div>
  );
}

function formatDate(d: string): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return d; }
}
