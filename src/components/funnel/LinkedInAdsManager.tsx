import { useState, useMemo, useCallback } from "react";
import {
  Linkedin, Target, DollarSign, Calendar, Users, Type, Briefcase, Building2, GraduationCap, ChevronDown,
  Plus, Trash2, Copy, BarChart3, MousePointer, TrendingUp, MessageSquare, Save, Edit3, X, Check, Star, Layout,
  Megaphone
} from "lucide-react";
import type { AdCampaign, AdTargeting, AdCreative, AdMetrics } from "@/lib/adCampaignStore";
import { createCampaign, updateCampaign, loadCampaigns } from "@/lib/adCampaignStore";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

type ViewMode = "list" | "builder" | "formats" | "leadgen" | "analytics";
type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
type BudgetType = "daily" | "lifetime";
type BidStrategy = "cpc" | "cpm" | "cps";
type AdFormat = "single_image" | "carousel" | "video" | "document" | "message" | "conversation" | "spotlight" | "follower";
type Objective = "Brand Awareness" | "Website Visits" | "Engagement" | "Video Views" | "Lead Gen" | "Website Conversions" | "Job Applicants";

interface LeadGenForm {
  id: string;
  name: string;
  headline: string;
  details: string;
  privacyUrl: string;
  questions: LeadGenQuestion[];
  thankYouMessage: string;
  landingPageUrl: string;
  campaignId: string;
}

interface LeadGenQuestion {
  id: string;
  type: string;
  label: string;
  required: boolean;
}

interface LeadEntry {
  id: string;
  date: string;
  name: string;
  email: string;
  company: string;
  title: string;
  campaign: string;
  campaignId: string;
}

interface DemographicBreakdown {
  category: string;
  segments: { name: string; impressions: number; clicks: number; leads: number }[];
}

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const OBJECTIVES: Objective[] = ["Brand Awareness", "Website Visits", "Engagement", "Video Views", "Lead Gen", "Website Conversions", "Job Applicants"];

const AD_FORMATS: { value: AdFormat; label: string; desc: string; objective?: string }[] = [
  { value: "single_image", label: "Single Image Ad", desc: "Native feed ad with one image" },
  { value: "carousel", label: "Carousel Ad", desc: "Swipeable cards with multiple images" },
  { value: "video", label: "Video Ad", desc: "Native video in the LinkedIn feed" },
  { value: "document", label: "Document Ad", desc: "Share PDFs, decks, and whitepapers" },
  { value: "message", label: "Message Ad", desc: "Sponsored InMail to member inboxes" },
  { value: "conversation", label: "Conversation Ad", desc: "Interactive chat-style experience" },
  { value: "spotlight", label: "Spotlight Ad", desc: "Dynamic personalized ads" },
  { value: "follower", label: "Follower Ad", desc: "Grow your company page following" },
];

const JOB_FUNCTIONS = ["Marketing", "Sales", "Engineering", "Finance", "HR", "Operations", "IT", "Product", "Business Development", "Legal", "Consulting", "Administrative"];
const JOB_SENIORITIES = ["Intern", "Entry", "Senior", "Manager", "Director", "VP", "CXO", "Owner"];
const COMPANY_INDUSTRIES = ["Software", "Financial Services", "Healthcare", "Manufacturing", "Retail", "Telecommunications", "Education", "Professional Services", "Media", "Government", "Transportation", "Energy", "Real Estate", "Construction", "Agriculture"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"];
const DEGREES = ["Bachelor's", "Master's", "MBA", "PhD", "Associate's", "High School"];
const FIELDS_OF_STUDY = ["Computer Science", "Business Administration", "Engineering", "Marketing", "Finance", "Economics", "Psychology", "Data Science", "Communications", "Design"];
const SKILLS = ["JavaScript", "Python", "React", "Node.js", "AWS", "Machine Learning", "Data Analysis", "Project Management", "Agile", "Leadership", "Salesforce", "HubSpot", "SEO", "Content Marketing", "UX Design", "DevOps", "Cybersecurity", "Blockchain", "AI", "Cloud Computing"];
const MEMBER_GROUPS = ["SaaS Founders", "B2B Marketing Pros", "Tech Leaders", "Product Management", "Startup Founders", "Data Science Central", "Sales Hacker", "UX/UI Designers", "Cloud Architects", "AI/ML Enthusiasts"];
const CONNECTIONS = ["1st", "2nd", "3rd+"];
const CTA_OPTIONS = ["Learn More", "Sign Up", "Download", "Register", "Subscribe", "Apply", "Get Quote", "Contact Us", "Watch Now", "Request Demo"];

const BID_STRATEGIES: { value: BidStrategy; label: string; desc: string }[] = [
  { value: "cpc", label: "Cost Per Click (CPC)", desc: "Pay when someone clicks your ad" },
  { value: "cpm", label: "Cost Per 1000 Impressions (CPM)", desc: "Pay for ad impressions" },
  { value: "cps", label: "Cost Per Send (CPS)", desc: "Pay per message delivered (Message Ads only)" },
];

const LEAD_GEN_QUESTION_TYPES = [
  "Full name", "Email", "Phone", "City", "State", "Country", "Postal code",
  "Company", "Job title", "Seniority", "Custom text"
];

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

/* ═══════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════ */

const DEFAULT_LINKEDIN_TARGETING: AdTargeting = {
  locations: ["United States"],
  ageRange: { min: 25, max: 65 },
  genders: ["all"],
  languages: ["English"],
  interests: [],
  behaviors: [],
  keywords: [],
  customAudiences: [],
  excludedAudiences: [],
  placements: ["LinkedIn Feed", "LinkedIn Messaging", "LinkedIn Stories"],
  devices: ["Desktop", "Mobile"],
  jobTitles: [],
  industries: [],
  seniorities: [],
  companySizes: [],
  skills: [],
};

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function saveLeadGenForms(forms: LeadGenForm[]) {
  try { localStorage.setItem("sw_linkedin_leadgen_forms", JSON.stringify(forms)); } catch { /* */ }
}

function saveLeadEntries(leads: LeadEntry[]) {
  try { localStorage.setItem("sw_linkedin_leads", JSON.stringify(leads)); } catch { /* */ }
}

/* ═══════════════════════════════════════════
   TAG INPUT COMPONENT
   ═══════════════════════════════════════════ */

function TagInput({
  tags,
  onChange,
  placeholder,
  suggestions,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!input.trim() || !suggestions) return [];
    return suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s));
  }, [input, suggestions, tags]);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-800/60 border border-slate-700 rounded-lg min-h-[42px]">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0A66C2]/20 text-blue-300 rounded-md text-xs">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-400"><X size={10} /></button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(input); } }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="bg-transparent text-slate-200 text-sm outline-none flex-1 min-w-[120px] placeholder-slate-500"
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-32 overflow-y-auto">
          {filteredSuggestions.map(s => (
            <button key={s} onMouseDown={() => addTag(s)} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MULTI-SELECT DROPDOWN
   ═══════════════════════════════════════════ */

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-left text-sm text-slate-300 hover:border-[#0A66C2]/50">
        <span className="truncate">{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {options.map(opt => (
            <button key={opt} onClick={() => toggle(opt)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50">
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selected.includes(opt) ? "bg-[#0A66C2] border-[#0A66C2]" : "border-slate-500"}`}>
                {selected.includes(opt) && <Check size={10} className="text-white" />}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════
   CAMPAIGN CARD (List View)
   ═══════════════════════════════════════════ */

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusToggle,
}: {
  campaign: AdCampaign;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStatusToggle: () => void;
}) {
  const m = campaign.metrics;
  const ctr = m.ctr;
  const cpc = m.cpc;
  const leadCount = m.leads ?? 0;

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-[#0A66C2]/40 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Linkedin size={16} className="text-[#0A66C2]" />
            <h3 className="text-sm font-semibold text-slate-100 truncate">{campaign.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <StatusBadge status={campaign.status} />
            <span className="text-slate-500">|</span>
            <span>{campaign.objective}</span>
            <span className="text-slate-500">|</span>
            <span>{campaign.budget.type === "daily" ? `$${campaign.budget.amount}/day` : `$${campaign.budget.amount.toLocaleString()} lifetime`}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={onStatusToggle} className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400" title={campaign.status === "active" ? "Pause" : "Activate"}>
            {campaign.status === "active" ? <X size={14} /> : <Check size={14} />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-blue-400" title="Edit">
            <Edit3 size={14} />
          </button>
          <button onClick={onDuplicate} className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-amber-400" title="Duplicate">
            <Copy size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-red-400" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Impressions</div>
          <div className="text-sm font-semibold text-slate-200">{formatNumber(m.impressions)}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Clicks</div>
          <div className="text-sm font-semibold text-slate-200">{formatNumber(m.clicks)}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">CTR</div>
          <div className="text-sm font-semibold text-slate-200">{ctr.toFixed(2)}%</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">CPC</div>
          <div className="text-sm font-semibold text-slate-200">${cpc.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-2">
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Leads</div>
          <div className="text-sm font-semibold text-emerald-400">{formatNumber(leadCount)}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Spend</div>
          <div className="text-sm font-semibold text-slate-200">{formatCurrency(m.spend)}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Conversions</div>
          <div className="text-sm font-semibold text-slate-200">{m.conversions}</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Conv. Rate</div>
          <div className="text-sm font-semibold text-slate-200">
            {m.conversions > 0 && m.clicks > 0 ? ((m.conversions / m.clicks) * 100).toFixed(2) : "0.00"}%
          </div>
        </div>
      </div>

      {campaign.targeting.jobTitles && campaign.targeting.jobTitles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          <Briefcase size={11} className="text-slate-500 mt-0.5" />
          {campaign.targeting.jobTitles.slice(0, 3).map(jt => (
            <span key={jt} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">{jt}</span>
          ))}
          {campaign.targeting.jobTitles.length > 3 && (
            <span className="text-[10px] text-slate-500">+{campaign.targeting.jobTitles.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEAD GEN FORM BUILDER
   ═══════════════════════════════════════════ */

function LeadGenFormBuilder({
  forms,
  onChange,
}: {
  forms: LeadGenForm[];
  onChange: (forms: LeadGenForm[]) => void;
}) {
  const [activeForm, setActiveForm] = useState<LeadGenForm | null>(null);
  const [newQuestionType, setNewQuestionType] = useState(LEAD_GEN_QUESTION_TYPES[0]);

  const addForm = () => {
    const f: LeadGenForm = {
      id: `lgf-${Date.now()}`,
      name: "New Lead Gen Form",
      headline: "",
      details: "",
      privacyUrl: "",
      questions: [
        { id: `q-${Date.now()}`, type: "Full name", label: "Full name", required: true },
        { id: `q-${Date.now() + 1}`, type: "Email", label: "Work email", required: true },
      ],
      thankYouMessage: "Thank you for your interest! We'll be in touch soon.",
      landingPageUrl: "",
      campaignId: "",
    };
    const updated = [...forms, f];
    onChange(updated);
    setActiveForm(f);
  };

  const updateForm = (form: LeadGenForm) => {
    onChange(forms.map(f => f.id === form.id ? form : f));
    setActiveForm(form);
  };

  const deleteForm = (id: string) => {
    const updated = forms.filter(f => f.id !== id);
    onChange(updated);
    if (activeForm?.id === id) setActiveForm(null);
  };

  const addQuestion = () => {
    if (!activeForm) return;
    if (activeForm.questions.length >= 12) return;
    const q: LeadGenQuestion = {
      id: `q-${Date.now()}`,
      type: newQuestionType,
      label: newQuestionType,
      required: false,
    };
    updateForm({ ...activeForm, questions: [...activeForm.questions, q] });
  };

  const removeQuestion = (qid: string) => {
    if (!activeForm) return;
    updateForm({ ...activeForm, questions: activeForm.questions.filter(q => q.id !== qid) });
  };

  const updateQuestion = (qid: string, updates: Partial<LeadGenQuestion>) => {
    if (!activeForm) return;
    updateForm({ ...activeForm, questions: activeForm.questions.map(q => q.id === qid ? { ...q, ...updates } : q) });
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Form List */}
      <div className="col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Lead Gen Forms</h3>
          <button onClick={addForm} className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0A66C2] hover:bg-[#084d96] text-white rounded-lg text-xs transition-colors">
            <Plus size={12} /> New
          </button>
        </div>
        {forms.map(form => (
          <div
            key={form.id}
            onClick={() => setActiveForm(form)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${activeForm?.id === form.id ? "border-[#0A66C2] bg-[#0A66C2]/10" : "border-slate-700 bg-slate-900/40 hover:border-slate-600"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200 font-medium">{form.name}</span>
              <button onClick={e => { e.stopPropagation(); deleteForm(form.id); }} className="text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
            </div>
            <div className="text-xs text-slate-500 mt-1">{form.questions.length} questions</div>
          </div>
        ))}
      </div>

      {/* Form Editor */}
      <div className="col-span-8 space-y-4">
        {activeForm ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Edit Form</h3>
              <button onClick={() => { saveLeadGenForms(forms); }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs transition-colors">
                <Save size={12} /> Save
              </button>
            </div>

            <div className="space-y-3 bg-slate-900/40 border border-slate-700 rounded-xl p-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Form Name</label>
                <input
                  value={activeForm.name}
                  onChange={e => updateForm({ ...activeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Offer Headline</label>
                <input
                  value={activeForm.headline}
                  onChange={e => updateForm({ ...activeForm, headline: e.target.value })}
                  placeholder="e.g., Get Your Free Ebook"
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Offer Details</label>
                <textarea
                  value={activeForm.details}
                  onChange={e => updateForm({ ...activeForm, details: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Privacy Policy URL</label>
                <input
                  value={activeForm.privacyUrl}
                  onChange={e => updateForm({ ...activeForm, privacyUrl: e.target.value })}
                  placeholder="https://"
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50 placeholder-slate-600"
                />
              </div>
            </div>

            {/* Questions */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-slate-300">Questions ({activeForm.questions.length}/12)</h4>
                <div className="flex items-center gap-2">
                  <select
                    value={newQuestionType}
                    onChange={e => setNewQuestionType(e.target.value)}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 outline-none"
                  >
                    {LEAD_GEN_QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={addQuestion} className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs">
                    <Plus size={10} /> Add
                  </button>
                </div>
              </div>
              {activeForm.questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2 bg-slate-800/30 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 w-5">{i + 1}</span>
                  <select
                    value={q.type}
                    onChange={e => updateQuestion(q.id, { type: e.target.value })}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 outline-none"
                  >
                    {LEAD_GEN_QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    value={q.label}
                    onChange={e => updateQuestion(q.id, { label: e.target.value })}
                    className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 outline-none"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                      className="rounded"
                    />
                    Required
                  </label>
                  <button onClick={() => removeQuestion(q.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Thank You Message</label>
                <textarea
                  value={activeForm.thankYouMessage}
                  onChange={e => updateForm({ ...activeForm, thankYouMessage: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Landing Page URL (after submission)</label>
                <input
                  value={activeForm.landingPageUrl}
                  onChange={e => updateForm({ ...activeForm, landingPageUrl: e.target.value })}
                  placeholder="https://"
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50 placeholder-slate-600"
                />
              </div>
            </div>

            {/* Form Preview */}
            <div className="bg-white rounded-xl p-5 text-slate-800">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-1 text-[#0A66C2] mb-2">
                  <Linkedin size={18} />
                  <span className="text-xs font-semibold">LinkedIn Lead Gen Form</span>
                </div>
                <h4 className="text-base font-semibold text-slate-900">{activeForm.headline || "Form Preview"}</h4>
                <p className="text-xs text-slate-500 mt-1">{activeForm.details}</p>
              </div>
              <div className="space-y-2.5">
                {activeForm.questions.map(q => (
                  <div key={q.id}>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {q.label} {q.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="w-full h-8 bg-slate-100 border border-slate-300 rounded text-xs" />
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 bg-[#0A66C2] text-white rounded-md text-sm font-medium">Submit</button>
              <p className="text-[10px] text-slate-400 text-center mt-2">{activeForm.privacyUrl && `Privacy: ${activeForm.privacyUrl}`}</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Layout size={32} className="mb-2 opacity-40" />
            <p className="text-sm">Select or create a form to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   ANALYTICS PANEL
   ═══════════════════════════════════════════ */

function AnalyticsPanel({ campaigns }: { campaigns: AdCampaign[] }) {
  const leads = useMemo<LeadEntry[]>(() => [], []);

  const totals = useMemo(() => {
    return campaigns.reduce((acc, c) => ({
      impressions: acc.impressions + c.metrics.impressions,
      clicks: acc.clicks + c.metrics.clicks,
      spend: acc.spend + c.metrics.spend,
      leads: acc.leads + (c.metrics.leads ?? 0),
      conversions: acc.conversions + c.metrics.conversions,
      videoViews: acc.videoViews + c.metrics.videoViews,
    }), { impressions: 0, clicks: 0, spend: 0, leads: 0, conversions: 0, videoViews: 0 });
  }, [campaigns]);

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const costPerLead = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const convRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
  const vcr = totals.videoViews > 0 && totals.impressions > 0 ? (totals.videoViews / totals.impressions) * 100 : 0;

  const demoBreakdown: DemographicBreakdown[] = useMemo(() => {
    const jobFunctionData: Record<string, { impressions: number; clicks: number; leads: number }> = {};
    const seniorityData: Record<string, { impressions: number; clicks: number; leads: number }> = {};
    const companySizeData: Record<string, { impressions: number; clicks: number; leads: number }> = {};
    const industryData: Record<string, { impressions: number; clicks: number; leads: number }> = {};

    campaigns.forEach(c => {
      const share = c.metrics.impressions / (totals.impressions || 1);
      (c.targeting.jobTitles || []).forEach(jt => {
        const fn = jt.includes("Engineer") || jt.includes("DevOps") || jt.includes("CTO") ? "Engineering" :
                   jt.includes("Marketing") ? "Marketing" :
                   jt.includes("Sales") ? "Sales" :
                   jt.includes("Finance") || jt.includes("CFO") ? "Finance" : "Other";
        if (!jobFunctionData[fn]) jobFunctionData[fn] = { impressions: 0, clicks: 0, leads: 0 };
        jobFunctionData[fn].impressions += Math.floor(c.metrics.impressions * share);
        jobFunctionData[fn].clicks += Math.floor(c.metrics.clicks * share);
        jobFunctionData[fn].leads += Math.floor((c.metrics.leads ?? 0) * share);
      });
      (c.targeting.seniorities || []).forEach(s => {
        if (!seniorityData[s]) seniorityData[s] = { impressions: 0, clicks: 0, leads: 0 };
        seniorityData[s].impressions += Math.floor(c.metrics.impressions * share);
        seniorityData[s].clicks += Math.floor(c.metrics.clicks * share);
        seniorityData[s].leads += Math.floor((c.metrics.leads ?? 0) * share);
      });
      (c.targeting.companySizes || []).forEach(cs => {
        if (!companySizeData[cs]) companySizeData[cs] = { impressions: 0, clicks: 0, leads: 0 };
        companySizeData[cs].impressions += Math.floor(c.metrics.impressions * share);
        companySizeData[cs].clicks += Math.floor(c.metrics.clicks * share);
        companySizeData[cs].leads += Math.floor((c.metrics.leads ?? 0) * share);
      });
      (c.targeting.industries || []).forEach(ind => {
        if (!industryData[ind]) industryData[ind] = { impressions: 0, clicks: 0, leads: 0 };
        industryData[ind].impressions += Math.floor(c.metrics.impressions * share);
        industryData[ind].clicks += Math.floor(c.metrics.clicks * share);
        industryData[ind].leads += Math.floor((c.metrics.leads ?? 0) * share);
      });
    });

    return [
      { category: "Job Function", segments: Object.entries(jobFunctionData).map(([name, v]) => ({ name, ...v })) },
      { category: "Seniority", segments: Object.entries(seniorityData).map(([name, v]) => ({ name, ...v })) },
      { category: "Company Size", segments: Object.entries(companySizeData).map(([name, v]) => ({ name, ...v })) },
      { category: "Industry", segments: Object.entries(industryData).map(([name, v]) => ({ name, ...v })) },
    ];
  }, [campaigns, totals.impressions]);

  const sponsoredContent = campaigns.filter(c => {
    const type = c.creatives[0]?.type;
    return type === "single_image" || type === "carousel" || type === "video" || type === "document";
  });
  const messageAds = campaigns.filter(c => {
    const type = c.creatives[0]?.type;
    return type === "message" || type === "conversation";
  });

  const sponsoredMetrics = {
    impressions: sponsoredContent.reduce((s, c) => s + c.metrics.impressions, 0),
    clicks: sponsoredContent.reduce((s, c) => s + c.metrics.clicks, 0),
    leads: sponsoredContent.reduce((s, c) => s + (c.metrics.leads ?? 0), 0),
    spend: sponsoredContent.reduce((s, c) => s + c.metrics.spend, 0),
  };
  const messageMetrics = {
    impressions: messageAds.reduce((s, c) => s + c.metrics.impressions, 0),
    clicks: messageAds.reduce((s, c) => s + c.metrics.clicks, 0),
    leads: messageAds.reduce((s, c) => s + (c.metrics.leads ?? 0), 0),
    spend: messageAds.reduce((s, c) => s + c.metrics.spend, 0),
  };

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><Eye size={14} /> <span className="text-xs">Impressions</span></div>
          <div className="text-xl font-bold text-slate-100">{formatNumber(totals.impressions)}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><MousePointer size={14} /> <span className="text-xs">Clicks</span></div>
          <div className="text-xl font-bold text-slate-100">{formatNumber(totals.clicks)}</div>
          <div className="text-xs text-slate-500 mt-1">CTR: {ctr.toFixed(2)}%</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><MessageSquare size={14} /> <span className="text-xs">Leads</span></div>
          <div className="text-xl font-bold text-emerald-400">{formatNumber(totals.leads)}</div>
          <div className="text-xs text-slate-500 mt-1">CPL: {costPerLead > 0 ? formatCurrency(costPerLead) : "N/A"}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><DollarSign size={14} /> <span className="text-xs">Total Spend</span></div>
          <div className="text-xl font-bold text-slate-100">{formatCurrency(totals.spend)}</div>
          <div className="text-xs text-slate-500 mt-1">CPC: ${cpc.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><TrendingUp size={14} /> <span className="text-xs">CTR</span></div>
          <div className="text-xl font-bold text-[#0A66C2]">{ctr.toFixed(2)}%</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><DollarSign size={14} /> <span className="text-xs">CPC</span></div>
          <div className="text-xl font-bold text-slate-100">${cpc.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><BarChart3 size={14} /> <span className="text-xs">Conversion Rate</span></div>
          <div className="text-xl font-bold text-slate-100">{convRate.toFixed(2)}%</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><Video size={14} /> <span className="text-xs">Video Completion</span></div>
          <div className="text-xl font-bold text-slate-100">{vcr.toFixed(1)}%</div>
        </div>
      </div>

      {/* Format Comparison */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><BarChart3 size={16} /> Sponsored Content vs Message Ads</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[#0A66C2]">Sponsored Content ({sponsoredContent.length} campaigns)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Impressions</div><div className="text-slate-200 font-medium">{formatNumber(sponsoredMetrics.impressions)}</div></div>
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Clicks</div><div className="text-slate-200 font-medium">{formatNumber(sponsoredMetrics.clicks)}</div></div>
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Leads</div><div className="text-emerald-400 font-medium">{formatNumber(sponsoredMetrics.leads)}</div></div>
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Spend</div><div className="text-slate-200 font-medium">{formatCurrency(sponsoredMetrics.spend)}</div></div>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-purple-400">Message Ads ({messageAds.length} campaigns)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Impressions</div><div className="text-slate-200 font-medium">{formatNumber(messageMetrics.impressions)}</div></div>
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Clicks</div><div className="text-slate-200 font-medium">{formatNumber(messageMetrics.clicks)}</div></div>
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Leads</div><div className="text-emerald-400 font-medium">{formatNumber(messageMetrics.leads)}</div></div>
              <div className="bg-slate-800/40 p-2 rounded"><div className="text-slate-500">Spend</div><div className="text-slate-200 font-medium">{formatCurrency(messageMetrics.spend)}</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><Users size={16} /> Demographics Breakdown</h3>
        <div className="grid grid-cols-2 gap-4">
          {demoBreakdown.map(demo => (
            <div key={demo.category} className="bg-slate-800/30 rounded-lg p-3">
              <h4 className="text-xs font-medium text-slate-300 mb-2">{demo.category}</h4>
              <div className="space-y-1.5">
                {demo.segments.sort((a, b) => b.impressions - a.impressions).map(seg => {
                  const maxImp = Math.max(...demo.segments.map(s => s.impressions));
                  const pct = maxImp > 0 ? (seg.impressions / maxImp) * 100 : 0;
                  return (
                    <div key={seg.name}>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>{seg.name}</span>
                        <span>{formatNumber(seg.impressions)} imp</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0A66C2] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><MessageSquare size={16} /> Recent Leads</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 px-2 font-medium">Date</th>
                <th className="text-left py-2 px-2 font-medium">Name</th>
                <th className="text-left py-2 px-2 font-medium">Email</th>
                <th className="text-left py-2 px-2 font-medium">Company</th>
                <th className="text-left py-2 px-2 font-medium">Title</th>
                <th className="text-left py-2 px-2 font-medium">Campaign</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map(lead => (
                <tr key={lead.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-2 px-2 text-slate-400">{lead.date}</td>
                  <td className="py-2 px-2 text-slate-200 font-medium">{lead.name}</td>
                  <td className="py-2 px-2 text-[#0A66C2]">{lead.email}</td>
                  <td className="py-2 px-2 text-slate-300">{lead.company}</td>
                  <td className="py-2 px-2 text-slate-400">{lead.title}</td>
                  <td className="py-2 px-2 text-slate-400">{lead.campaign}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No leads captured yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Need this icon for analytics */
function Eye(props: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function Video(props: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
    </svg>
  );
}


/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function LinkedInAdsManager() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(() =>
    loadCampaigns().filter(c => c.platform === "linkedin")
  );
  const [view, setViewRaw] = useState<ViewMode>(() => {
    try { return (localStorage.getItem("sw_linkedin_view") as ViewMode) || "list"; } catch { return "list"; }
  });
  const setView = (v: ViewMode) => {
    setViewRaw(v);
    try { localStorage.setItem("sw_linkedin_view", v); } catch { /* silent */ }
  };
  const [editingCampaign, setEditingCampaignRaw] = useState<AdCampaign | null>(() => {
    try {
      const saved = localStorage.getItem("sw_linkedin_selected");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setEditingCampaign = (c: AdCampaign | null) => {
    setEditingCampaignRaw(c);
    try { if (c) localStorage.setItem("sw_linkedin_selected", JSON.stringify(c)); else localStorage.removeItem("sw_linkedin_selected"); } catch { /* silent */ }
  };
  const [leadGenForms, setLeadGenForms] = useState<LeadGenForm[]>([]);

  // Filter state
  const [filterObjective, setFilterObjective] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Builder state
  const [builderName, setBuilderName] = useState("");
  const [builderObjective, setBuilderObjective] = useState<Objective>("Lead Gen");
  const [builderBudgetType, setBuilderBudgetType] = useState<BudgetType>("daily");
  const [builderBudgetAmount, setBuilderBudgetAmount] = useState(100);
  const [builderBidStrategy, setBuilderBidStrategy] = useState<BidStrategy>("cpc");
  const [builderBidAmount, setBuilderBidAmount] = useState(8);
  const [builderStartDate, setBuilderStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [builderEndDate, setBuilderEndDate] = useState("");
  const [builderAdFormat, setBuilderAdFormat] = useState<AdFormat>("single_image");

  // Targeting state
  const [targeting, setTargeting] = useState<AdTargeting>({ ...DEFAULT_LINKEDIN_TARGETING });
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [memberGroups, setMemberGroups] = useState<string[]>([]);
  const [yearsExperienceMin, setYearsExperienceMin] = useState(0);
  const [yearsExperienceMax, setYearsExperienceMax] = useState(30);
  const [connectionDegrees, setConnectionDegrees] = useState<string[]>([]);
  const [retargetingOptions, setRetargetingOptions] = useState<string[]>([]);

  // Creative state
  const [creativeHeadline, setCreativeHeadline] = useState("");
  const [creativeBody, setCreativeBody] = useState("");
  const [CreativeIntroText, setCreativeIntroText] = useState("");
  const [creativeCta, setCreativeCta] = useState("Learn More");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [enableLeadGen, setEnableLeadGen] = useState(false);

  // Message ad specific state
  const [messageSubject, setMessageSubject] = useState("");
  const [messageSender, setMessageSender] = useState("");
  const [messageGreeting, setMessageGreeting] = useState("Hi {{first_name}},");
  const [messageBody, setMessageBody] = useState("");
  const [messageBanner, setMessageBanner] = useState("");

  // Spotlight ad state
  const [spotlightHeadline, setSpotlightHeadline] = useState("");
  const [spotlightCta, setSpotlightCta] = useState("");

  const refresh = useCallback(() => {
    setCampaigns(loadCampaigns().filter(c => c.platform === "linkedin"));
  }, []);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (filterObjective !== "all" && c.objective !== filterObjective) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      return true;
    });
  }, [campaigns, filterObjective, filterStatus]);

  const resetBuilder = () => {
    setBuilderName("");
    setBuilderObjective("Lead Gen");
    setBuilderBudgetType("daily");
    setBuilderBudgetAmount(100);
    setBuilderBidStrategy("cpc");
    setBuilderBidAmount(8);
    setBuilderStartDate(new Date().toISOString().split("T")[0]);
    setBuilderEndDate("");
    setBuilderAdFormat("single_image");
    setTargeting({ ...DEFAULT_LINKEDIN_TARGETING });
    setCompanyNames([]);
    setMemberGroups([]);
    setYearsExperienceMin(0);
    setYearsExperienceMax(30);
    setConnectionDegrees([]);
    setRetargetingOptions([]);
    setCreativeHeadline("");
    setCreativeBody("");
    setCreativeIntroText("");
    setCreativeCta("Learn More");
    setCreativeUrl("");
    setEnableLeadGen(false);
    setMessageSubject("");
    setMessageSender("");
    setMessageGreeting("Hi {{first_name}},");
    setMessageBody("");
    setMessageBanner("");
    setSpotlightHeadline("");
    setSpotlightCta("");
    setEditingCampaign(null);
  };

  const loadCampaignIntoBuilder = (campaign: AdCampaign) => {
    setBuilderName(campaign.name);
    setBuilderObjective(campaign.objective as Objective);
    setBuilderBudgetType(campaign.budget.type);
    setBuilderBudgetAmount(campaign.budget.amount);
    setBuilderStartDate(campaign.schedule.startDate);
    setBuilderEndDate(campaign.schedule.endDate || "");
    setTargeting({ ...campaign.targeting });
    setCompanyNames((campaign.targeting.customAudiences || []).filter(a => a.startsWith("company:")).map(a => a.replace("company:", "")));
    setMemberGroups((campaign.targeting.customAudiences || []).filter(a => a.startsWith("group:")).map(a => a.replace("group:", "")));
    setConnectionDegrees((campaign.targeting.customAudiences || []).filter(a => a.startsWith("conn:")).map(a => a.replace("conn:", "")));
    setRetargetingOptions((campaign.targeting.customAudiences || []).filter(a => a.startsWith("retarget:")).map(a => a.replace("retarget:", "")));
    setYearsExperienceMin(parseInt((campaign.targeting.customAudiences || []).find(a => a.startsWith("exp_min:"))?.replace("exp_min:", "") || "0"));
    setYearsExperienceMax(parseInt((campaign.targeting.customAudiences || []).find(a => a.startsWith("exp_max:"))?.replace("exp_max:", "") || "30"));
    if (campaign.creatives[0]) {
      const cr = campaign.creatives[0];
      setBuilderAdFormat(cr.type as AdFormat);
      setCreativeHeadline(cr.headline);
      setCreativeBody(cr.body);
      setCreativeIntroText(cr.description);
      setCreativeCta(cr.cta);
      setCreativeUrl(cr.destinationUrl);
    }
    setEditingCampaign(campaign);
    setView("builder");
  };

  const saveCampaign = () => {
    const creative: AdCreative = {
      id: `cr-${Date.now()}`,
      type: builderAdFormat,
      headline: creativeHeadline,
      description: CreativeIntroText,
      body: creativeBody,
      cta: creativeCta,
      imageUrl: "",
      videoUrl: builderAdFormat === "video" ? "video_placeholder" : "",
      destinationUrl: creativeUrl,
      utmParams: "utm_source=linkedin&utm_medium=paid",
      variants: [{ id: `v-${Date.now()}`, label: "Variant A", content: creativeHeadline }],
    };

    const customAudiences = [
      ...companyNames.map(n => `company:${n}`),
      ...memberGroups.map(g => `group:${g}`),
      ...connectionDegrees.map(d => `conn:${d}`),
      ...retargetingOptions.map(r => `retarget:${r}`),
      `exp_min:${yearsExperienceMin}`,
      `exp_max:${yearsExperienceMax}`,
    ];

    const finalTargeting: AdTargeting = {
      ...targeting,
      customAudiences,
    };

    if (editingCampaign) {
      updateCampaign(editingCampaign.id, {
        name: builderName,
        objective: builderObjective,
        budget: { amount: builderBudgetAmount, type: builderBudgetType, currency: "USD" },
        schedule: { startDate: builderStartDate, endDate: builderEndDate || null },
        targeting: finalTargeting,
        creatives: [creative],
        status: editingCampaign.status,
      });
    } else {
      createCampaign({
        platform: "linkedin",
        name: builderName,
        objective: builderObjective,
        status: "draft",
        budget: { amount: builderBudgetAmount, type: builderBudgetType, currency: "USD" },
        schedule: { startDate: builderStartDate, endDate: builderEndDate || null },
        targeting: finalTargeting,
        creatives: [creative],
        notes: builderBidStrategy === "cps" ? "Bid strategy: CPS (Cost Per Send)" : `Bid strategy: ${builderBidStrategy.toUpperCase()} at $${builderBidAmount}`,
      });
    }
    refresh();
    resetBuilder();
    setView("list");
  };

  const duplicateCampaign = (campaign: AdCampaign) => {
    const copy: AdCampaign = {
      ...campaign,
      id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${campaign.name} (Copy)`,
      status: "draft",
      metrics: { ...campaign.metrics, impressions: 0, clicks: 0, ctr: 0, cpc: 0, spend: 0, conversions: 0, costPerConversion: 0, roas: 0, reach: 0, frequency: 0, engagement: 0, videoViews: 0, leads: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = loadCampaigns();
    all.push(copy);
    try { localStorage.setItem("sw_ad_campaigns", JSON.stringify(all)); } catch { /* */ }
    refresh();
  };

  const deleteCampaign = (id: string) => {
    const all = loadCampaigns().filter(c => c.id !== id);
    try { localStorage.setItem("sw_ad_campaigns", JSON.stringify(all)); } catch { /* */ }
    refresh();
  };

  const toggleStatus = (campaign: AdCampaign) => {
    const newStatus: CampaignStatus = campaign.status === "active" ? "paused" : "active";
    updateCampaign(campaign.id, { status: newStatus });
    refresh();
  };

  const canSave = builderName.trim().length > 0 && builderBudgetAmount > 0;

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0A66C2] rounded-lg flex items-center justify-center">
              <Linkedin size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">LinkedIn Ads Manager</h1>
              <p className="text-[10px] text-slate-500">B2B Campaign Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === "list" && (
              <button
                onClick={() => { resetBuilder(); setView("builder"); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0A66C2] hover:bg-[#084d96] text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Plus size={14} /> New Campaign
              </button>
            )}
            {view !== "list" && (
              <button
                onClick={() => { resetBuilder(); setView("list"); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                <X size={14} /> Close
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-slate-700/50">
          {(["list", "builder", "leadgen", "analytics"] as ViewMode[]).map(tab => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                view === tab
                  ? "border-[#0A66C2] text-[#0A66C2]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "list" && "Campaigns"}
              {tab === "builder" && "Campaign Builder"}
              {tab === "leadgen" && "Lead Gen Forms"}
              {tab === "analytics" && "Analytics"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ═════ LIST VIEW ═════ */}
        {view === "list" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Target size={13} />
                <span>Objective:</span>
                <select
                  value={filterObjective}
                  onChange={e => setFilterObjective(e.target.value)}
                  className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 outline-none text-xs"
                >
                  <option value="all">All Objectives</option>
                  {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Star size={13} />
                <span>Status:</span>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 outline-none text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="ml-auto text-xs text-slate-500">
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Campaign Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCampaigns.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onEdit={() => loadCampaignIntoBuilder(campaign)}
                  onDelete={() => deleteCampaign(campaign.id)}
                  onDuplicate={() => duplicateCampaign(campaign)}
                  onStatusToggle={() => toggleStatus(campaign)}
                />
              ))}
            </div>

            {filteredCampaigns.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 text-slate-500">
                <Megaphone size={40} className="mb-3 text-[#0A66C2]" />
                <h3 className="text-lg font-semibold text-slate-200">No LinkedIn campaigns yet</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto text-center">Create your first LinkedIn campaign to start reaching B2B professionals.</p>
                <button
                  onClick={() => { resetBuilder(); setView("builder"); }}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] hover:bg-[#084d96] text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[#0A66C2]/20"
                >
                  <Plus size={18} /> Create Campaign
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═════ BUILDER VIEW ═════ */}
        {view === "builder" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Settings */}
            <div className="col-span-12 lg:col-span-7 space-y-5">
              {/* Campaign Name */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Edit3 size={14} /> Campaign Setup</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Campaign Name</label>
                  <input
                    value={builderName}
                    onChange={e => setBuilderName(e.target.value)}
                    placeholder="e.g., Q3 Enterprise Lead Generation"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50 placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Objective</label>
                  <div className="grid grid-cols-4 gap-2">
                    {OBJECTIVES.map(obj => (
                      <button
                        key={obj}
                        onClick={() => setBuilderObjective(obj)}
                        className={`px-2 py-2 rounded-lg text-[10px] font-medium border transition-all ${
                          builderObjective === obj
                            ? "border-[#0A66C2] bg-[#0A66C2]/15 text-[#0A66C2]"
                            : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {obj}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><DollarSign size={14} /> Budget & Bidding</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Budget Type</label>
                    <div className="flex gap-2">
                      {(["daily", "lifetime"] as BudgetType[]).map(bt => (
                        <button
                          key={bt}
                          onClick={() => setBuilderBudgetType(bt)}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs border transition-all ${
                            builderBudgetType === bt
                              ? "border-[#0A66C2] bg-[#0A66C2]/15 text-[#0A66C2]"
                              : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          {bt === "daily" ? "Daily" : "Lifetime"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Budget Amount ($)</label>
                    <input
                      type="number"
                      value={builderBudgetAmount}
                      onChange={e => setBuilderBudgetAmount(Number(e.target.value))}
                      min={1}
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bid Strategy</label>
                    <select
                      value={builderBidStrategy}
                      onChange={e => setBuilderBidStrategy(e.target.value as BidStrategy)}
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none"
                    >
                      {BID_STRATEGIES.map(bs => <option key={bs.value} value={bs.value}>{bs.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bid Amount ($)</label>
                    <input
                      type="number"
                      value={builderBidAmount}
                      onChange={e => setBuilderBidAmount(Number(e.target.value))}
                      min={1}
                      step={0.1}
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-[#0A66C2]/50"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">{BID_STRATEGIES.find(b => b.value === builderBidStrategy)?.desc}</p>
              </div>

              {/* Schedule */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Calendar size={14} /> Schedule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={builderStartDate}
                      onChange={e => setBuilderStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">End Date (optional)</label>
                    <input
                      type="date"
                      value={builderEndDate}
                      onChange={e => setBuilderEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Targeting */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Target size={14} /> LinkedIn Targeting</h3>

                {/* Job Titles */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Briefcase size={11} /> Job Titles</label>
                  <TagInput
                    tags={targeting.jobTitles || []}
                    onChange={titles => setTargeting({ ...targeting, jobTitles: titles })}
                    placeholder="Add job titles (e.g., CEO, CTO, VP Marketing)"
                    suggestions={["CEO", "CTO", "VP Marketing", "VP Sales", "Director of Sales", "Head of Engineering", "CFO", "CMO", "COO", "Principal Engineer", "Engineering Manager", "Product Manager", "Tech Lead"]}
                  />
                </div>

                {/* Job Functions */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Job Functions</label>
                  <MultiSelect
                    options={JOB_FUNCTIONS}
                    selected={targeting.interests?.filter(i => JOB_FUNCTIONS.includes(i)) || []}
                    onChange={vals => setTargeting({ ...targeting, interests: [...(targeting.interests || []).filter(i => !JOB_FUNCTIONS.includes(i)), ...vals] })}
                    placeholder="Select job functions"
                  />
                </div>

                {/* Job Seniorities */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Job Seniorities</label>
                  <MultiSelect
                    options={JOB_SENIORITIES}
                    selected={targeting.seniorities || []}
                    onChange={vals => setTargeting({ ...targeting, seniorities: vals })}
                    placeholder="Select seniority levels"
                  />
                </div>

                {/* Company Names */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Building2 size={11} /> Company Names</label>
                  <TagInput
                    tags={companyNames}
                    onChange={setCompanyNames}
                    placeholder="Target specific companies"
                    suggestions={["Microsoft", "Google", "Amazon", "Salesforce", "HubSpot", "Stripe", "Shopify", "Adobe", "Oracle", "SAP"]}
                  />
                </div>

                {/* Company Industries */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company Industries</label>
                  <MultiSelect
                    options={COMPANY_INDUSTRIES}
                    selected={targeting.industries || []}
                    onChange={vals => setTargeting({ ...targeting, industries: vals })}
                    placeholder="Select industries"
                  />
                </div>

                {/* Company Sizes */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company Sizes</label>
                  <MultiSelect
                    options={COMPANY_SIZES}
                    selected={targeting.companySizes || []}
                    onChange={vals => setTargeting({ ...targeting, companySizes: vals })}
                    placeholder="Select company sizes"
                  />
                </div>

                {/* Member Skills */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><GraduationCap size={11} /> Member Skills</label>
                  <TagInput
                    tags={targeting.skills || []}
                    onChange={skills => setTargeting({ ...targeting, skills })}
                    placeholder="Add skills"
                    suggestions={SKILLS}
                  />
                </div>

                {/* Member Groups */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Member Groups</label>
                  <MultiSelect
                    options={MEMBER_GROUPS}
                    selected={memberGroups}
                    onChange={setMemberGroups}
                    placeholder="Select LinkedIn groups"
                  />
                </div>

                {/* Degrees */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Degrees</label>
                  <MultiSelect
                    options={DEGREES}
                    selected={(targeting.behaviors || []).filter(b => DEGREES.includes(b))}
                    onChange={vals => setTargeting({ ...targeting, behaviors: [...(targeting.behaviors || []).filter(b => !DEGREES.includes(b)), ...vals] })}
                    placeholder="Select education levels"
                  />
                </div>

                {/* Fields of Study */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fields of Study</label>
                  <MultiSelect
                    options={FIELDS_OF_STUDY}
                    selected={(targeting.behaviors || []).filter(b => FIELDS_OF_STUDY.includes(b))}
                    onChange={vals => setTargeting({ ...targeting, behaviors: [...(targeting.behaviors || []).filter(b => !FIELDS_OF_STUDY.includes(b)), ...vals] })}
                    placeholder="Select fields of study"
                  />
                </div>

                {/* Years of Experience */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Years of Experience: {yearsExperienceMin} - {yearsExperienceMax}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={yearsExperienceMin}
                      onChange={e => { const v = Number(e.target.value); if (v <= yearsExperienceMax) setYearsExperienceMin(v); }}
                      className="flex-1 accent-[#0A66C2]"
                    />
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={yearsExperienceMax}
                      onChange={e => { const v = Number(e.target.value); if (v >= yearsExperienceMin) setYearsExperienceMax(v); }}
                      className="flex-1 accent-[#0A66C2]"
                    />
                  </div>
                </div>

                {/* Connection Degrees */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company Connections</label>
                  <div className="flex gap-2">
                    {CONNECTIONS.map(conn => (
                      <button
                        key={conn}
                        onClick={() => setConnectionDegrees(prev => prev.includes(conn) ? prev.filter(c => c !== conn) : [...prev, conn])}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          connectionDegrees.includes(conn)
                            ? "border-[#0A66C2] bg-[#0A66C2]/15 text-[#0A66C2]"
                            : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {conn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Locations</label>
                  <TagInput
                    tags={targeting.locations || []}
                    onChange={locs => setTargeting({ ...targeting, locations: locs })}
                    placeholder="Add locations"
                    suggestions={["United States", "Canada", "United Kingdom", "Germany", "France", "Australia", "Netherlands", "Singapore", "India", "Ireland"]}
                  />
                </div>

                {/* Retargeting */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Retargeting</label>
                  <div className="space-y-1.5">
                    {["Website visitors (30 days)", "Website visitors (90 days)", "Video viewers (25%)", "Video viewers (50%)", "Lead Gen form openers", "Lead Gen form submitters"].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={retargetingOptions.includes(opt)}
                          onChange={e => {
                            setRetargetingOptions(prev =>
                              e.target.checked ? [...prev, opt] : prev.filter(o => o !== opt)
                            );
                          }}
                          className="rounded accent-[#0A66C2]"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveCampaign}
                disabled={!canSave}
                className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  canSave
                    ? "bg-[#0A66C2] hover:bg-[#084d96] text-white"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Save size={16} /> {editingCampaign ? "Update Campaign" : "Save Campaign"}
              </button>
            </div>

            {/* Right Panel - Ad Format & Preview */}
            <div className="col-span-12 lg:col-span-5 space-y-5">
              {/* Ad Format */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Layout size={14} /> Ad Format</h3>
                <div className="grid grid-cols-2 gap-2">
                  {AD_FORMATS.map(fmt => (
                    <button
                      key={fmt.value}
                      onClick={() => setBuilderAdFormat(fmt.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        builderAdFormat === fmt.value
                          ? "border-[#0A66C2] bg-[#0A66C2]/15"
                          : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
                      }`}
                    >
                      <div className={`text-xs font-medium ${builderAdFormat === fmt.value ? "text-[#0A66C2]" : "text-slate-300"}`}>{fmt.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Creative */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Type size={14} /> Creative</h3>

                {/* Message Ad Fields */}
                {builderAdFormat === "message" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Sender Name</label>
                      <input
                        value={messageSender}
                        onChange={e => setMessageSender(e.target.value)}
                        placeholder="e.g., John from Acme"
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Subject Line</label>
                      <input
                        value={messageSubject}
                        onChange={e => setMessageSubject(e.target.value)}
                        placeholder="e.g., Quick question about your infrastructure"
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Greeting</label>
                      <input
                        value={messageGreeting}
                        onChange={e => setMessageGreeting(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Message Body</label>
                      <textarea
                        value={messageBody}
                        onChange={e => setMessageBody(e.target.value)}
                        rows={4}
                        placeholder="Write your message here..."
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none resize-none placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Banner Image URL</label>
                      <input
                        value={messageBanner}
                        onChange={e => setMessageBanner(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none placeholder-slate-600"
                      />
                    </div>
                  </div>
                )}

                {/* Spotlight Ad Fields */}
                {builderAdFormat === "spotlight" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Dynamic Headline</label>
                      <input
                        value={spotlightHeadline}
                        onChange={e => setSpotlightHeadline(e.target.value)}
                        placeholder="e.g., {{first_name}}, unlock your team's potential"
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">CTA Text</label>
                      <input
                        value={spotlightCta}
                        onChange={e => setSpotlightCta(e.target.value)}
                        placeholder="e.g., Act Now"
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none placeholder-slate-600"
                      />
                    </div>
                  </div>
                )}

                {/* Standard Creative Fields */}
                {(builderAdFormat === "single_image" || builderAdFormat === "carousel" || builderAdFormat === "video" || builderAdFormat === "document" || builderAdFormat === "conversation" || builderAdFormat === "follower") && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Headline</label>
                      <input
                        value={creativeHeadline}
                        onChange={e => setCreativeHeadline(e.target.value)}
                        placeholder="e.g., Reduce Cloud Costs by 40%"
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Intro Text</label>
                      <textarea
                        value={CreativeIntroText}
                        onChange={e => setCreativeIntroText(e.target.value)}
                        rows={2}
                        placeholder="Supporting text that appears before the CTA"
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none resize-none placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Body / Description</label>
                      <textarea
                        value={creativeBody}
                        onChange={e => setCreativeBody(e.target.value)}
                        rows={3}
                        placeholder="Main ad body text"
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none resize-none placeholder-slate-600"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs text-slate-400 mb-1">CTA Button</label>
                  <select
                    value={creativeCta}
                    onChange={e => setCreativeCta(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none"
                  >
                    {CTA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Destination URL</label>
                  <input
                    value={creativeUrl}
                    onChange={e => setCreativeUrl(e.target.value)}
                    placeholder="https://"
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none placeholder-slate-600"
                  />
                </div>

                {/* Lead Gen Toggle */}
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer border-t border-slate-700 pt-3 mt-2">
                  <input
                    type="checkbox"
                    checked={enableLeadGen}
                    onChange={e => setEnableLeadGen(e.target.checked)}
                    className="rounded accent-[#0A66C2]"
                  />
                  Enable LinkedIn Lead Gen Form (pre-filled with profile data)
                </label>
              </div>

              {/* Ad Preview */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Preview</h3>
                
                {builderAdFormat === "message" ? (
                  <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                      <Linkedin size={14} className="text-[#0A66C2]" />
                      <span className="text-xs text-slate-400">Message</span>
                    </div>
                    <div className="text-xs text-slate-300"><span className="text-slate-500">From:</span> {messageSender || "Your Company"}</div>
                    <div className="text-xs text-slate-300"><span className="text-slate-500">Subject:</span> {messageSubject || "Your subject line here"}</div>
                    <div className="text-xs text-slate-300 font-medium">{messageGreeting}</div>
                    <div className="text-xs text-slate-400 leading-relaxed">{messageBody || "Your message body will appear here..."}</div>
                    <div className="flex gap-2 pt-2">
                      <span className="px-3 py-1.5 bg-[#0A66C2] text-white rounded text-xs">{creativeCta}</span>
                    </div>
                    {messageBanner && <div className="h-16 bg-slate-700 rounded text-xs text-slate-500 flex items-center justify-center">Banner: {messageBanner}</div>}
                  </div>
                ) : builderAdFormat === "spotlight" ? (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="bg-gradient-to-r from-[#0A66C2] to-[#0077b5] rounded-lg p-4 text-white">
                      <div className="text-xs opacity-80 mb-1">Sponsored</div>
                      <h4 className="text-sm font-semibold">{spotlightHeadline || "Dynamic headline here"}</h4>
                      <p className="text-xs opacity-90 mt-1">{creativeBody || "Description text"}</p>
                      <div className="mt-3 px-3 py-1.5 bg-white text-[#0A66C2] rounded inline-block text-xs font-medium">
                        {spotlightCta || creativeCta}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800 rounded-lg overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-[#0A66C2] rounded-full flex items-center justify-center">
                          <Linkedin size={14} className="text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-200">Your Company</div>
                          <div className="text-[10px] text-slate-500">12,345 followers · Sponsored</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-2">
                        {creativeBody || "Your ad body text will appear here. Write something compelling to engage your B2B audience on LinkedIn."}
                      </p>
                      {builderAdFormat === "video" && (
                        <div className="h-28 bg-slate-700 rounded-lg flex items-center justify-center mb-2">
                          <Video size={24} className="text-slate-500" />
                        </div>
                      )}
                      {builderAdFormat === "document" && (
                        <div className="h-24 bg-slate-700 rounded-lg flex items-center justify-center mb-2 gap-2">
                          <div className="w-12 h-16 bg-slate-600 rounded" />
                          <div className="w-12 h-16 bg-slate-600 rounded" />
                          <div className="w-12 h-16 bg-slate-600 rounded" />
                        </div>
                      )}
                      {builderAdFormat === "carousel" && (
                        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-24 h-20 bg-slate-700 rounded-lg flex-shrink-0 flex items-center justify-center text-xs text-slate-500">Card {i}</div>
                          ))}
                        </div>
                      )}
                      {builderAdFormat !== "video" && builderAdFormat !== "document" && builderAdFormat !== "carousel" && (
                        <div className="h-24 bg-slate-700 rounded-lg flex items-center justify-center mb-2">
                          <span className="text-xs text-slate-500">{AD_FORMATS.find(f => f.value === builderAdFormat)?.label} Image</span>
                        </div>
                      )}
                      <h4 className="text-sm font-semibold text-slate-100 mb-1">{creativeHeadline || "Your headline here"}</h4>
                      <p className="text-[10px] text-slate-500 mb-2">{CreativeIntroText || "Supporting description text"}</p>
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1.5 bg-[#0A66C2] text-white rounded text-xs">{creativeCta}</span>
                        {enableLeadGen && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check size={10} /> Lead Gen Form</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════ LEAD GEN FORMS VIEW ═════ */}
        {view === "leadgen" && (
          <LeadGenFormBuilder
            forms={leadGenForms}
            onChange={forms => { setLeadGenForms(forms); saveLeadGenForms(forms); }}
          />
        )}

        {/* ═════ ANALYTICS VIEW ═════ */}
        {view === "analytics" && (
          <AnalyticsPanel campaigns={campaigns} />
        )}
      </div>
    </div>
  );
}
