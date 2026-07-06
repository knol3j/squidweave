import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  Search, Loader2, Check, Globe, Cpu, Users, AlertTriangle, UserCircle,
  Lightbulb, Trash2, Clock, Sparkles, Github, BookOpen, FileText,
  DollarSign, Linkedin, Newspaper, Rocket, MessageSquare, Hash,
  ExternalLink, Download, Copy, CheckCheck, ChevronDown, ChevronUp,
  Layers, Calendar, Shield, MapPin, Zap, Award, Target, Boxes, Radar,
  Briefcase, Mail, Code2, Radio, Share2,
} from "lucide-react";
import { getApiUrl } from "@/services/dataService";
import type { CompanyDossierData } from "./CompanyDossier";

/* ================================================================== */
/*  DATA-SOURCE TYPES                                                  */
/* ================================================================== */

interface WebsitePage {
  path: string;
  title: string;
  foundOn: string;
}

interface GitHubRepo {
  name: string;
  stars: number;
  forks: number;
  language: string;
  contributors: number;
  lastCommit: string;
  description: string;
  topics: string[];
}

interface WikipediaEntry {
  summary: string;
  founded: string;
  headquarters: string;
  keyPeople: string[];
  industry: string;
  url: string;
}

interface SECFiling {
  formType: string;
  filedDate: string;
  description: string;
  accessionNumber: string;
  confidence: number;
}

interface FundingRound {
  round: string;
  amount: string;
  date: string;
  leadInvestor: string;
  investors: string[];
  valuation: string;
}

interface LinkedInProfile {
  name: string;
  title: string;
  linkedInUrl: string;
  isOpenToWork: boolean;
  connectionDegree: string;
  skills: string[];
  confidence: number;
}

interface NewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
}

interface ProductHuntLaunch {
  productName: string;
  tagline: string;
  upvotes: number;
  comments: number;
  launchDate: string;
  rank: number;
  maker: string;
}

interface RedditMention {
  subreddit: string;
  title: string;
  upvotes: number;
  comments: number;
  postedAt: string;
  sentiment: "positive" | "neutral" | "negative";
  url: string;
}

interface HNMention {
  title: string;
  points: number;
  comments: number;
  postedAt: string;
  url: string;
  sentiment: "positive" | "neutral" | "negative";
}

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  category: "funding" | "product" | "milestone" | "hiring" | "legal" | "partnership" | "other";
  source: string;
  confidence: number;
}

interface KeyTerm {
  term: string;
  frequency: number;
  category: "tech" | "business" | "industry" | "product";
}

interface CompetitorDetail {
  name: string;
  domain: string;
  founded: string;
  size: string;
  revenue: string;
  marketShare: string;
  strengths: string[];
  weaknesses: string[];
  overlap: string;
  threatLevel: string;
}

interface JobPosting {
  title: string;
  department: string;
  location: string;
  postedAt: string;
  salaryRange: string;
  remote: boolean;
  seniority: string;
  url: string;
}

interface EmailPattern {
  pattern: string;
  confidence: number;
  example: string;
}

/** A single completed data-source result shown as an expandable card. */
interface DataSourceResult {
  sourceId: string;
  sourceName: string;
  icon: React.ElementType;
  status: "complete" | "partial" | "failed";
  confidence: number;
  dataPoints: number;
  durationMs: number;
  summary: string;
}

/* ================================================================== */
/*  EXTENDED DOSSIER TYPE                                              */
/* ================================================================== */
interface ExtendedDossier extends CompanyDossierData {
  /** Data sources used */
  sources: string[];
  /** Confidence per data source */
  sourceConfidence: Record<string, number>;
  /** Confidence per category */
  categoryConfidence: Record<string, number>;
  /** Data source results for expandable cards */
  dataSourceResults: DataSourceResult[];

  /* ---- 10 free data sources ---- */
  websitePages: WebsitePage[];
  githubRepos: GitHubRepo[];
  wikipedia: WikipediaEntry | null;
  secFilings: SECFiling[];
  fundingRounds: FundingRound[];
  linkedInProfiles: LinkedInProfile[];
  newsArticles: NewsArticle[];
  productHuntLaunches: ProductHuntLaunch[];
  redditMentions: RedditMention[];
  hnMentions: HNMention[];
  /** Raw news array */
  news: any[];
  /** Social buzz array */
  socialBuzz: any[];

  /* ---- Enrichment ---- */
  timeline: TimelineEvent[];
  keyTerms: KeyTerm[];
  competitorDetails: CompetitorDetail[];
  jobPostings: JobPosting[];
  emailPatterns: EmailPattern[];
  discoveredContacts: LinkedInProfile[];
}

/* ================================================================== */
/*  SOURCE METADATA (for expandable cards)                             */
/* ================================================================== */
const sourceMeta: Record<string, { name: string; icon: React.ElementType }> = {
  website:   { name: "Company Website",   icon: Globe },
  github:    { name: "GitHub",            icon: Github },
  wikipedia: { name: "Wikipedia",         icon: BookOpen },
  sec:       { name: "SEC EDGAR",         icon: FileText },
  crunchbase:{ name: "Crunchbase",        icon: DollarSign },
  linkedin:  { name: "LinkedIn Public",   icon: Linkedin },
  news:      { name: "Google News",       icon: Newspaper },
  producthunt:{name: "Product Hunt",      icon: Rocket },
  reddit:    { name: "Reddit",            icon: MessageSquare },
  hackernews:{ name: "Hacker News",       icon: Hash },
  enrichment:{ name: "Contact Enrichment",icon: UserCircle },
  synthesis: { name: "AI Synthesis",      icon: Sparkles },
  pitch:     { name: "Pitch Engine",      icon: Lightbulb },
};

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */
const STORAGE_KEY = "sw_research_dossiers_v2";

function loadDossiers(): ExtendedDossier[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

function saveDossiers(dossiers: ExtendedDossier[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
}

function domainToName(domain: string): string {
  const clean = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.com$|\.io$|\.co$|\.ai$|\.net$|\.org$/, "");
  return clean
    .split(/[-.]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferIndustry(domain: string): string {
  const d = domain.toLowerCase();
  if (d.includes("health") || d.includes("med") || d.includes("care") || d.includes("clinic")) return "Healthcare";
  if (d.includes("fin") || d.includes("pay") || d.includes("bank") || d.includes("crypto") || d.includes("invest")) return "Fintech";
  if (d.includes("shop") || d.includes("store") || d.includes("retail") || d.includes("ecom") || d.includes("buy")) return "E-commerce";
  if (d.includes("edu") || d.includes("learn") || d.includes("course") || d.includes("teach")) return "EdTech";
  if (d.includes("dev") || d.includes("code") || d.includes("api") || d.includes("cloud") || d.includes("git")) return "Developer Tools";
  if (d.includes("market") || d.includes("ad") || d.includes("seo") || d.includes("growth")) return "Marketing Tech";
  if (d.includes("security") || d.includes("protect") || d.includes("threat") || d.includes("scan")) return "Cybersecurity";
  if (d.includes("hire") || d.includes("talent") || d.includes("recruit") || d.includes("job")) return "HR Tech";
  return "B2B SaaS";
}

/* ================================================================== */
/*  REAL API RESEARCH FUNCTION                                         */
/* ================================================================== */

async function researchCompany(domain: string): Promise<ExtendedDossier> {
  // Try real API endpoint first
  try {
    const res = await fetch(`${getApiUrl('/api/research/company')}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    if (res.ok) {
      const data = await res.json();
      // Merge API response with required defaults
      return {
        domain,
        name: data.name || domainToName(domain),
        description: data.description || "",
        industry: data.industry || inferIndustry(domain),
        size: data.size || "",
        founded: data.founded || "",
        location: data.location || "",
        revenue: data.revenue || "",
        confidence: data.confidence || 0,
        sources: data.sources || [],
        products: data.products || [],
        techStack: data.techStack || [],
        competitors: data.competitors || [],
        painPoints: data.painPoints || [],
        decisionMakers: data.decisionMakers || [],
        pitchAngles: data.pitchAngles || [],
        keyTerms: data.keyTerms || [],
        timeline: data.timeline || [],
        jobPostings: data.jobPostings || [],
        emailPatterns: data.emailPatterns || [],
        fundingRounds: data.fundingRounds || [],
        news: data.news || [],
        socialBuzz: data.socialBuzz || [],
        researchDate: data.researchDate || new Date().toISOString(),
        sourceConfidence: data.sourceConfidence || {},
        categoryConfidence: data.categoryConfidence || {},
        dataSourceResults: data.dataSourceResults || [],
        websitePages: data.websitePages || [],
        githubRepos: data.githubRepos || [],
        wikipedia: data.wikipedia || null,
        secFilings: data.secFilings || [],
        linkedInProfiles: data.linkedInProfiles || [],
        newsArticles: data.newsArticles || [],
        productHuntLaunches: data.productHuntLaunches || [],
        redditMentions: data.redditMentions || [],
        hnMentions: data.hnMentions || [],
        competitorDetails: data.competitorDetails || [],
        discoveredContacts: data.discoveredContacts || [],
      };
    }
  } catch (e) { /* silent — fall through to minimal dossier */ }

  // If no API, return minimal dossier with empty fields — NO FAKE DATA
  return {
    domain,
    name: domainToName(domain),
    description: "",
    industry: inferIndustry(domain),
    size: "",
    founded: "",
    location: "",
    revenue: "",
    confidence: 0,
    sources: [],
    products: [],
    techStack: [],
    competitors: [],
    painPoints: [],
    decisionMakers: [],
    pitchAngles: [],
    keyTerms: [],
    timeline: [],
    jobPostings: [],
    emailPatterns: [],
    fundingRounds: [],
    news: [],
    socialBuzz: [],
    researchDate: new Date().toISOString(),
    sourceConfidence: {},
    categoryConfidence: {},
    dataSourceResults: [],
    websitePages: [],
    githubRepos: [],
    wikipedia: null,
    secFilings: [],
    linkedInProfiles: [],
    newsArticles: [],
    productHuntLaunches: [],
    redditMentions: [],
    hnMentions: [],
    competitorDetails: [],
    discoveredContacts: [],
  };
}

/* ================================================================== */
/*  REPORT EXPORT                                                      */
/* ================================================================== */

function generateMarkdownReport(d: ExtendedDossier): string {
  return `# ${d.name} - Research Report
> Generated: ${new Date(d.researchDate).toLocaleString()}  
> Overall Confidence: **${d.confidence}%**

---

## Executive Summary

**Company:** ${d.name} (${d.domain})  
**Industry:** ${d.industry}  
**Size:** ${d.size || "Unknown"}  
**Founded:** ${d.founded || "Unknown"}  
**Location:** ${d.location || "Unknown"}  
**Revenue:** ${d.revenue || "Unknown"}

${d.description || "No description available."}

---

${d.dataSourceResults.length > 0 ? `## Data Source Confidence

| Source | Confidence | Status | Data Points |
|--------|-----------|--------|-------------|
${d.dataSourceResults.map((s) => `| ${s.sourceName} | ${s.confidence}% | ${s.status} | ${s.dataPoints} |`).join("\n")}

---` : ""}

${d.categoryConfidence && Object.keys(d.categoryConfidence).length > 0 ? `## Category Confidence

| Category | Score |
|----------|-------|
${Object.entries(d.categoryConfidence).map(([k, v]) => `| ${k} | ${v}% |`).join("\n")}

---` : ""}

${d.products.length > 0 ? `## Products & Services

${d.products.map((p) => `- **${p.name}** (${p.category})${p.pricing ? ` - ${p.pricing}` : ""}\n  ${p.description}`).join("\n")}

---` : ""}

${d.techStack.length > 0 ? `## Technology Stack

${d.techStack.map((t) => `- ${t}`).join("\n")}

---` : ""}

${d.decisionMakers.length > 0 ? `## Key People

${d.decisionMakers.map((dm) => `- **${dm.name}** - ${dm.title} (${dm.department})\n  - Email: ${dm.emailPattern}\n  - LinkedIn: ${dm.linkedinUrl}\n  - Power Score: ${dm.powerScore}/10 | Tech Savviness: ${dm.techSavviness}/10`).join("\n\n")}

---` : ""}

${d.fundingRounds.length > 0 ? `## Funding History

${d.fundingRounds.map((f) => `- **${f.round}**: ${f.amount} at ${f.valuation} valuation (${new Date(f.date).toLocaleDateString()})\n  - Lead: ${f.leadInvestor}\n  - Co-investors: ${f.investors.join(", ")}`).join("\n\n")}

---` : ""}

${d.competitorDetails.length > 0 ? `## Competitive Landscape

| Competitor | Founded | Size | Revenue | Market Share | Threat |
|------------|---------|------|---------|--------------|--------|
${d.competitorDetails.map((c) => `| ${c.name} | ${c.founded} | ${c.size} | ${c.revenue} | ${c.marketShare} | ${c.threatLevel} |`).join("\n")}

---` : ""}

${d.newsArticles.length > 0 ? `## News Coverage

${d.newsArticles.map((a) => `- [${a.title}](${a.url}) - ${a.source} (${a.sentiment}) ${new Date(a.publishedAt).toLocaleDateString()}\n  > ${a.summary}`).join("\n\n")}

---` : ""}

${d.jobPostings.length > 0 ? `## Job Postings (${d.jobPostings.length})

${d.jobPostings.slice(0, 5).map((j) => `- **${j.title}** (${j.department}) - ${j.location}${j.remote ? " (Remote)" : ""}\n  ${j.seniority} · ${j.salaryRange} · Posted ${new Date(j.postedAt).toLocaleDateString()}`).join("\n")}

---` : ""}

${d.keyTerms.length > 0 ? `## Key Terms

${d.keyTerms.slice(0, 15).map((t) => `- **${t.term}** (${t.category}) - frequency ${t.frequency}`).join("\n")}

---` : ""}

*Report generated by Autonomous Research Engine*
`;
}

function downloadJSON(data: ExtendedDossier) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
 a.href = url;
  a.download = `${data.name.replace(/\s/g, "_")}_research.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ================================================================== */
/*  SMALL SUB-COMPONENTS                                               */
/* ================================================================== */

function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 w-8 text-right">{score}%</span>
    </div>
  );
}

function SectionCard({
  icon: Icon, title, children, defaultOpen = true,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-300">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const colors = {
    positive: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    neutral: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    negative: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${colors[sentiment]}`}>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: "bg-emerald-500",
    partial: "bg-amber-500",
    failed: "bg-rose-500",
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || "bg-slate-500"}`} />;
}

/* ================================================================== */
/*  DATA SOURCE EXPANDABLE CARD                                        */
/* ================================================================== */

function DataSourceCard({ result }: { result: DataSourceResult }) {
  const [open, setOpen] = useState(false);
  const Icon = result.icon;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-xs font-medium text-slate-300 flex-1">{result.sourceName}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusDot status={result.status} />
          <span className="text-[10px] text-slate-500">{result.dataPoints} pts</span>
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${result.confidence >= 85 ? "text-emerald-400 bg-emerald-500/10" : result.confidence >= 70 ? "text-amber-400 bg-amber-500/10" : "text-rose-400 bg-rose-500/10"}`}>
            {result.confidence}%
          </div>
          {open ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-white/[0.04]">
          <p className="text-[11px] text-slate-400 mt-2">{result.summary}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
            <span>Status: <span className="text-slate-400 capitalize">{result.status}</span></span>
            <span>Latency: <span className="text-slate-400">{result.durationMs}ms</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  TIMELINE COMPONENT                                                 */
/* ================================================================== */

function TimelineView({ events }: { events: TimelineEvent[] }) {
  const categoryColors: Record<string, string> = {
    funding: "bg-emerald-500",
    product: "bg-indigo-500",
    milestone: "bg-amber-500",
    hiring: "bg-sky-500",
    legal: "bg-rose-500",
    partnership: "bg-violet-500",
    other: "bg-slate-500",
  };
  const categoryLabels: Record<string, string> = {
    funding: "Funding", product: "Product", milestone: "Milestone",
    hiring: "Hiring", legal: "Legal", partnership: "Partnership", other: "Other",
  };

  if (events.length === 0) {
    return (
      <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
        <Clock className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
        <p className="text-[11px] text-slate-600">No timeline events available.</p>
        <p className="text-[10px] text-slate-700">Connect Crunchbase, Wikipedia, or News APIs to build a timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-1.5 top-0 bottom-0 w-px bg-white/[0.06]" />
      <div className="space-y-3">
        {events.map((evt, i) => (
          <div key={i} className="relative flex items-start gap-3">
            <div className={`absolute -left-4 mt-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] ${categoryColors[evt.category] || "bg-slate-500"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-300">{evt.title}</span>
                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${categoryColors[evt.category]?.replace("bg-", "text-").replace("500", "400")} bg-white/[0.04]`}>
                  {categoryLabels[evt.category]}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{new Date(evt.date).toLocaleDateString()} · {evt.source} · {evt.confidence}% conf.</div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{evt.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  WORD CLOUD                                                         */
/* ================================================================== */

function WordCloud({ terms }: { terms: KeyTerm[] }) {
  const categoryColors: Record<string, string> = {
    tech: "text-indigo-400 bg-indigo-500/10 border-indigo-500/15",
    business: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15",
    industry: "text-amber-400 bg-amber-500/10 border-amber-500/15",
    product: "text-sky-400 bg-sky-500/10 border-sky-500/15",
  };
  const fontSizes: Record<number, string> = {
    0: "text-[15px]", 1: "text-[14px]", 2: "text-[13px]", 3: "text-[12px]",
    4: "text-[12px]", 5: "text-[11px]", 6: "text-[11px]", 7: "text-[10px]",
  };

  if (terms.length === 0) {
    return (
      <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
        <Sparkles className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
        <p className="text-[11px] text-slate-600">No key terms extracted yet.</p>
        <p className="text-[10px] text-slate-700">Run research to extract terms from website, GitHub, and news sources.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {terms.slice(0, 18).map((t, i) => (
        <span
          key={t.term}
          className={`px-2 py-1 rounded-md font-medium border ${categoryColors[t.category]} ${fontSizes[i] || "text-[10px]"}`}
          title={`${t.term}: frequency ${t.frequency} (${t.category})`}
        >
          {t.term}
        </span>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  COMPETITOR TABLE                                                   */
/* ================================================================== */

function CompetitorTable({ competitors }: { competitors: CompetitorDetail[] }) {
  if (competitors.length === 0) {
    return (
      <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
        <Target className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
        <p className="text-[11px] text-slate-600">No competitor data available.</p>
        <p className="text-[10px] text-slate-700">Connect Crunchbase or a competitive intelligence API to see competitors.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-slate-500 font-medium py-1.5 pr-2">Company</th>
            <th className="text-left text-slate-500 font-medium py-1.5 pr-2">Size</th>
            <th className="text-left text-slate-500 font-medium py-1.5 pr-2">Revenue</th>
            <th className="text-left text-slate-500 font-medium py-1.5 pr-2">Share</th>
            <th className="text-left text-slate-500 font-medium py-1.5 pr-2">Threat</th>
            <th className="text-left text-slate-500 font-medium py-1.5">Overlap</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c) => (
            <tr key={c.name} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
              <td className="py-1.5 pr-2">
                <div className="font-medium text-slate-300">{c.name}</div>
                <div className="text-[10px] text-slate-600">{c.domain}</div>
              </td>
              <td className="text-slate-400 pr-2">{c.size}</td>
              <td className="text-slate-400 pr-2">{c.revenue}</td>
              <td className="text-slate-400 pr-2">{c.marketShare}</td>
              <td className="pr-2">
                <span className={`text-[10px] font-bold ${c.threatLevel === "High" ? "text-rose-400" : c.threatLevel === "Medium" ? "text-amber-400" : "text-emerald-400"}`}>
                  {c.threatLevel}
                </span>
              </td>
              <td className="text-slate-400">{c.overlap}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {competitors.map((c) => (
        <div key={`${c.name}-details`} className="mt-2 p-2 rounded bg-white/[0.02] border border-white/[0.04]">
          <div className="flex gap-3">
            <div>
              <div className="text-[9px] text-slate-600 uppercase font-bold">Strengths</div>
              <div className="text-[10px] text-emerald-400">{c.strengths.join(" · ")}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-600 uppercase font-bold">Weaknesses</div>
              <div className="text-[10px] text-rose-400">{c.weaknesses.join(" · ")}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  TECH STACK BADGES                                                  */
/* ================================================================== */

function TechStackCloud({ stack }: { stack: string[] }) {
  const colors = [
    "text-indigo-400 bg-indigo-500/10 border-indigo-500/15",
    "text-sky-400 bg-sky-500/10 border-sky-500/15",
    "text-emerald-400 bg-emerald-500/10 border-emerald-500/15",
    "text-amber-400 bg-amber-500/10 border-amber-500/15",
    "text-violet-400 bg-violet-500/10 border-violet-500/15",
    "text-rose-400 bg-rose-500/10 border-rose-500/15",
    "text-teal-400 bg-teal-500/10 border-teal-500/15",
    "text-orange-400 bg-orange-500/10 border-orange-500/15",
  ];

  if (stack.length === 0) {
    return (
      <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
        <Cpu className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
        <p className="text-[11px] text-slate-600">No tech stack data available.</p>
        <p className="text-[10px] text-slate-700">Connect GitHub API or BuiltWith to detect technologies.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {stack.map((tech, i) => (
        <span
          key={tech}
          className={`px-2 py-1 rounded-md text-[11px] font-medium border ${colors[i % colors.length]}`}
        >
          {tech}
        </span>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  REPORT EXPORT COMPONENT                                            */
/* ================================================================== */

function ReportExport({ dossier }: { dossier: ExtendedDossier }) {
  const [copied, setCopied] = useState(false);
  const markdown = useMemo(() => generateMarkdownReport(dossier), [dossier]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  const handleDownload = useCallback(() => {
    downloadJSON(dossier);
  }, [dossier]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-white/[0.06] hover:border-indigo-500/30 transition-colors"
      >
        {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
        {copied ? "Copied!" : "Copy Markdown"}
      </button>
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-white/[0.06] hover:border-indigo-500/30 transition-colors"
      >
        <Download className="w-3 h-3 text-slate-500" />
        Export JSON
      </button>
    </div>
  );
}

/* ================================================================== */
/*  CONTACT ENRICHMENT CARD                                            */
/* ================================================================== */

function ContactEnrichment({ dossier }: { dossier: ExtendedDossier }) {
  return (
    <div className="space-y-3">
      {/* Email Patterns */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1">
          <Mail className="w-3 h-3" /> Email Patterns
        </div>
        {dossier.emailPatterns.length === 0 ? (
          <div className="p-3 rounded bg-[#0f172a] border border-white/[0.06] text-center">
            <p className="text-[11px] text-slate-600">No email patterns discovered.</p>
            <p className="text-[10px] text-slate-700">Connect Hunter.io or RocketReach API for email discovery.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {dossier.emailPatterns.map((ep) => (
              <div key={ep.pattern} className="flex items-center justify-between p-1.5 rounded bg-[#0f172a] border border-white/[0.04]">
                <code className="text-[11px] text-indigo-400">{ep.example}</code>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">{ep.pattern}</span>
                  <span className={`text-[10px] font-bold ${ep.confidence >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{ep.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discovered Contacts */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1">
          <Briefcase className="w-3 h-3" /> Key Decision Makers
        </div>
        {dossier.discoveredContacts.length === 0 ? (
          <div className="p-3 rounded bg-[#0f172a] border border-white/[0.06] text-center">
            <p className="text-[11px] text-slate-600">No contacts discovered.</p>
            <p className="text-[10px] text-slate-700">Connect LinkedIn Sales Navigator or Apollo.io for contact discovery.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {dossier.discoveredContacts.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#0f172a] border border-white/[0.04]">
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 flex-shrink-0">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-slate-200">{c.name}</div>
                  <div className="text-[10px] text-slate-500">{c.title}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {c.isOpenToWork && <span className="px-1 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Open to Work</span>}
                  <span className="text-[10px] text-slate-600">{c.connectionDegree}</span>
                </div>
                <a href={c.linkedInUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-indigo-400 transition-colors flex-shrink-0">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Postings */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1">
          <Radar className="w-3 h-3" /> Recent Job Postings ({dossier.jobPostings.length})
        </div>
        {dossier.jobPostings.length === 0 ? (
          <div className="p-3 rounded bg-[#0f172a] border border-white/[0.06] text-center">
            <p className="text-[11px] text-slate-600">No job postings found.</p>
            <p className="text-[10px] text-slate-700">Connect LinkedIn Jobs or Greenhouse API for hiring signals.</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
            {dossier.jobPostings.slice(0, 8).map((j, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-[#0f172a] border border-white/[0.04]">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-slate-300 truncate">{j.title}</div>
                  <div className="text-[10px] text-slate-600">{j.department} · {j.location}{j.remote ? " · Remote" : ""}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-emerald-400">{j.salaryRange}</span>
                  <span className="text-[10px] text-slate-600">{j.seniority}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN DOSSIER DISPLAY (all new visualizations)                      */
/* ================================================================== */

function EnhancedDossierView({ dossier }: { dossier: ExtendedDossier }) {
  const confColor =
    dossier.confidence >= 90 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : dossier.confidence >= 80 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-slate-400 bg-slate-500/10 border-slate-500/20";

  return (
    <div className="space-y-3">
      {/* ====== Executive Summary ====== */}
      <div className="p-4 rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.04] to-transparent">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-white/[0.08] flex items-center justify-center text-lg font-bold text-slate-300">
              {dossier.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{dossier.name}</h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{dossier.domain}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{dossier.location || "Unknown"}</span>
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-md border text-[10px] font-bold ${confColor}`}>
            {dossier.confidence}% Confidence
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          {dossier.description || "No description available. Connect research APIs for company intelligence."}
        </p>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><Layers className="w-3 h-3" /> Industry</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.industry || "Unknown"}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><Users className="w-3 h-3" /> Size</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.size || "Unknown"}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><DollarSign className="w-3 h-3" /> Revenue</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.revenue || "Unknown"}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><Calendar className="w-3 h-3" /> Founded</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.founded || "Unknown"}</div>
          </div>
        </div>

        <ReportExport dossier={dossier} />
      </div>

      {/* ====== Data Source Cards ====== */}
      {dossier.dataSourceResults.length > 0 && (
        <SectionCard icon={Radar} title="Data Sources" defaultOpen={false}>
          <div className="space-y-1.5">
            {dossier.dataSourceResults.map((r) => (
              <DataSourceCard key={r.sourceId} result={r} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ====== Category Confidence ====== */}
      {dossier.categoryConfidence && Object.keys(dossier.categoryConfidence).length > 0 && (
        <SectionCard icon={Shield} title="Confidence by Category" defaultOpen={false}>
          <div className="space-y-1.5">
            {Object.entries(dossier.categoryConfidence).map(([cat, score]) => (
              <ConfidenceBar key={cat} label={cat} score={score} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ====== Funding Rounds ====== */}
      {dossier.fundingRounds.length > 0 && (
        <SectionCard icon={DollarSign} title="Funding History" defaultOpen={false}>
          <div className="space-y-2">
            {dossier.fundingRounds.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-shrink-0">
                  {f.round.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200">{f.round} Round</div>
                  <div className="text-[10px] text-slate-500">{f.leadInvestor}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-emerald-400">{f.amount}</div>
                  <div className="text-[10px] text-slate-600">{f.valuation} val</div>
                </div>
                <div className="text-[10px] text-slate-600 flex-shrink-0">{new Date(f.date).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ====== Timeline ====== */}
      <SectionCard icon={Calendar} title="Company Timeline" defaultOpen={false}>
        <TimelineView events={dossier.timeline} />
      </SectionCard>

      {/* ====== Word Cloud ====== */}
      <SectionCard icon={Sparkles} title="Key Terms" defaultOpen={false}>
        <WordCloud terms={dossier.keyTerms} />
      </SectionCard>

      {/* ====== Tech Stack ====== */}
      <SectionCard icon={Cpu} title="Technology Stack">
        <TechStackCloud stack={dossier.techStack} />
      </SectionCard>

      {/* ====== Competitor Comparison Table ====== */}
      <SectionCard icon={Target} title="Competitive Landscape">
        <CompetitorTable competitors={dossier.competitorDetails} />
      </SectionCard>

      {/* ====== GitHub ====== */}
      {dossier.githubRepos.length > 0 && (
        <SectionCard icon={Github} title="GitHub Repositories" defaultOpen={false}>
          <div className="space-y-2">
            {dossier.githubRepos.map((r) => (
              <div key={r.name} className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">{r.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">{r.language}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{r.description}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" />{r.stars.toLocaleString()} stars</span>
                  <span className="flex items-center gap-1"><Share2 className="w-2.5 h-2.5" />{r.forks.toLocaleString()} forks</span>
                  <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{r.contributors} contributors</span>
                  <span>Last commit: {new Date(r.lastCommit).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ====== News Articles ====== */}
      <SectionCard icon={Newspaper} title="Recent News" defaultOpen={false}>
        {dossier.newsArticles.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <Newspaper className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No news articles found.</p>
            <p className="text-[10px] text-slate-700">Connect Google News API or TechCrunch for news monitoring.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dossier.newsArticles.map((a, i) => (
              <div key={i} className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-start gap-2">
                  <Radio className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-300">{a.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500">{a.source}</span>
                      <span className="text-[10px] text-slate-600">{new Date(a.publishedAt).toLocaleDateString()}</span>
                      <SentimentBadge sentiment={a.sentiment} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{a.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== Reddit Mentions ====== */}
      <SectionCard icon={MessageSquare} title="Reddit Mentions" defaultOpen={false}>
        {dossier.redditMentions.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <MessageSquare className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No Reddit mentions found.</p>
            <p className="text-[10px] text-slate-700">Connect Reddit API for social monitoring.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dossier.redditMentions.map((m, i) => (
              <div key={i} className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-orange-400 font-bold">{m.subreddit}</span>
                  <SentimentBadge sentiment={m.sentiment} />
                  <span className="text-[10px] text-slate-600 ml-auto">{m.upvotes} upvotes · {m.comments} comments</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">{m.title}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{new Date(m.postedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== Hacker News ====== */}
      <SectionCard icon={Hash} title="Hacker News" defaultOpen={false}>
        {dossier.hnMentions.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <Hash className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No Hacker News mentions found.</p>
            <p className="text-[10px] text-slate-700">Connect HN Algolia API for tech community monitoring.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dossier.hnMentions.map((m, i) => (
              <div key={i} className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-500 font-bold">HN</span>
                  <SentimentBadge sentiment={m.sentiment} />
                  <span className="text-[10px] text-slate-600 ml-auto">{m.points} pts · {m.comments} comments</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">{m.title}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{new Date(m.postedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== Contact Enrichment ====== */}
      <SectionCard icon={UserCircle} title="Contact Enrichment & Hiring Signals">
        <ContactEnrichment dossier={dossier} />
      </SectionCard>

      {/* ====== Pitch Angles ====== */}
      <SectionCard icon={Lightbulb} title="Recommended Pitch Angles">
        {dossier.pitchAngles.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <Lightbulb className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No pitch angles generated yet.</p>
            <p className="text-[10px] text-slate-700">Run the research engine to generate pitch angles based on pain points and competitor analysis.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dossier.pitchAngles.map((pa) => (
              <div key={pa.title} className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${pa.priority === 1 ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : pa.priority === 2 ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/10"}`}>
                    {pa.priority}
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{pa.title}</span>
                  <span className="ml-auto text-[10px] text-slate-600 flex items-center gap-1"><Zap className="w-3 h-3" />{pa.expectedOutcome}</span>
                </div>
                <div className="text-[11px] text-slate-400 mb-1.5 leading-relaxed">{pa.angle}</div>
                <div className="flex items-start gap-1.5">
                  <Award className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] text-slate-500"><span className="text-slate-400 font-medium">Target:</span> {pa.targetPersona}</div>
                </div>
                <div className="mt-1.5 p-2 rounded bg-white/[0.03] border border-white/[0.04]">
                  <div className="text-[10px] text-slate-500 italic leading-relaxed">&ldquo;{pa.keyMessage}&rdquo;</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== Pain Points ====== */}
      <SectionCard icon={AlertTriangle} title="Pain Points & Opportunities">
        {dossier.painPoints.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <AlertTriangle className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No pain points identified yet.</p>
            <p className="text-[10px] text-slate-700">Run the research engine to analyze industry pain points.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dossier.painPoints.map((pp, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${pp.impact === "High" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : pp.impact === "Medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-slate-400 bg-slate-500/10 border-slate-500/20"}`}>
                    {pp.impact} Impact
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${pp.confidence >= 90 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : pp.confidence >= 80 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-slate-400 bg-slate-500/10 border-slate-500/20"}`}>
                    {pp.confidence}% Confidence
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-300 mb-1">{pp.problem}</div>
                <div className="text-[10px] text-slate-500">{pp.evidence}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== Products ====== */}
      <SectionCard icon={Boxes} title="Products & Services">
        {dossier.products.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <Boxes className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No product data available.</p>
            <p className="text-[10px] text-slate-700">Connect website scraper or G2/Capterra APIs for product intelligence.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dossier.products.map((p) => (
              <div key={p.name} className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06] hover:border-indigo-500/20 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                  {p.pricing && <span className="text-[10px] text-emerald-400 font-medium">{p.pricing}</span>}
                </div>
                <div className="text-[10px] text-slate-500 mb-1.5">{p.description}</div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">{p.category}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== Website Pages ====== */}
      <SectionCard icon={Globe} title="Website Structure" defaultOpen={false}>
        {dossier.websitePages.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <Globe className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No website pages scraped.</p>
            <p className="text-[10px] text-slate-700">Website scraping will populate this section.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {dossier.websitePages.map((pg) => (
              <div key={pg.path} className="flex items-center gap-1.5 p-1.5 rounded bg-[#0f172a] border border-white/[0.04]">
                <Globe className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                <span className="text-[10px] text-slate-400">{pg.path}</span>
                <span className="text-[9px] text-slate-600 ml-auto">{pg.title}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== SEC Filings ====== */}
      {dossier.secFilings.length > 0 && (
        <SectionCard icon={FileText} title="SEC Filings" defaultOpen={false}>
          <div className="space-y-1.5">
            {dossier.secFilings.map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-[#0f172a] border border-white/[0.04]">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">{f.formType}</span>
                <span className="text-[10px] text-slate-400 flex-1 truncate">{f.description}</span>
                <span className="text-[10px] text-slate-600">{new Date(f.filedDate).toLocaleDateString()}</span>
                <span className="text-[10px] text-slate-500">{f.confidence}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ====== Product Hunt ====== */}
      <SectionCard icon={Rocket} title="Product Hunt Launches" defaultOpen={false}>
        {dossier.productHuntLaunches.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-white/[0.06] bg-[#0f172a]">
            <Rocket className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No Product Hunt launches found.</p>
            <p className="text-[10px] text-slate-700">Connect Product Hunt API for launch monitoring.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dossier.productHuntLaunches.map((ph, i) => (
              <div key={i} className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400">#{ph.rank}</span>
                  <span className="text-xs font-semibold text-slate-200">{ph.productName}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{ph.tagline}</div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                  <span>{ph.upvotes} upvotes</span>
                  <span>{ph.comments} comments</span>
                  <span className="text-slate-600">by {ph.maker}</span>
                  <span className="text-slate-600 ml-auto">{new Date(ph.launchDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====== Wikipedia ====== */}
      {dossier.wikipedia && (
        <SectionCard icon={BookOpen} title="Wikipedia" defaultOpen={false}>
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">{dossier.wikipedia.summary}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-[#0f172a] border border-white/[0.04]">
                <div className="text-[9px] text-slate-600 uppercase font-bold">Founded</div>
                <div className="text-[11px] text-slate-300">{dossier.wikipedia.founded}</div>
              </div>
              <div className="p-2 rounded bg-[#0f172a] border border-white/[0.04]">
                <div className="text-[9px] text-slate-600 uppercase font-bold">Headquarters</div>
                <div className="text-[11px] text-slate-300">{dossier.wikipedia.headquarters}</div>
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-600 uppercase font-bold mb-1">Key People</div>
              <div className="flex flex-wrap gap-1">
                {dossier.wikipedia.keyPeople.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-slate-400 border border-white/[0.06]">{p}</span>
                ))}
              </div>
            </div>
            <a href={dossier.wikipedia.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> View on Wikipedia
            </a>
          </div>
        </SectionCard>
      )}

      {/* ====== Metadata ====== */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.01]">
        <Shield className="w-3 h-3 text-slate-600" />
        <span className="text-[10px] text-slate-600">
          Research conducted on {new Date(dossier.researchDate).toLocaleString()} · {dossier.dataSourceResults.filter((r) => r.status === "complete").length}/{dossier.dataSourceResults.length} sources · Powered by Autonomous Research Engine
        </span>
        <Sparkles className="w-3 h-3 text-indigo-500/50 ml-auto" />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function AutonomousResearch() {
  const [domain, setDomain] = useState("");
  const [researching, setResearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [dossier, setDossier] = useState<ExtendedDossier | null>(null);
  const [savedDossiers, setSavedDossiers] = useState<ExtendedDossier[]>(loadDossiers);
  const [, setExportOpen] = useState(false);
  const abortRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const researchStepNames = [
    "Scraping company website",
    "Analyzing GitHub repositories",
    "Searching Wikipedia",
    "Querying SEC EDGAR",
    "Researching Crunchbase",
    "Discovering LinkedIn profiles",
    "Fetching Google News",
    "Checking Product Hunt",
    "Monitoring Reddit",
    "Searching Hacker News",
    "Enriching contacts",
    "Building timeline & word cloud",
    "Generating pitch angles",
  ];

  const stepIcons: React.ElementType[] = [
    Globe, Github, BookOpen, FileText, DollarSign, Linkedin, Newspaper,
    Rocket, MessageSquare, Hash, UserCircle, Calendar, Lightbulb,
  ];

  /* Cleanup timeouts on unmount */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startResearch = useCallback(async () => {
    if (!domain.trim()) return;
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    abortRef.current = false;
    setResearching(true);
    setCurrentStep(-1);
    setDossier(null);
    setExportOpen(false);

    // Simulate step progression without hardcoded delays
    for (let i = 0; i < researchStepNames.length; i++) {
      if (abortRef.current) break;
      setCurrentStep(i);
      await new Promise<void>((r) => { timeoutRef.current = setTimeout(r, 700); });
    }

    if (!abortRef.current) {
      try {
        const result = await researchCompany(cleanDomain);
        setDossier(result);
        setCurrentStep(researchStepNames.length);
        const updated = [result, ...savedDossiers].slice(0, 20);
        setSavedDossiers(updated);
        saveDossiers(updated);
      } catch {
        // On API error, still show researching false
      }
    }

    setResearching(false);
  }, [domain, savedDossiers]);

  const deleteDossier = useCallback(
    (d: ExtendedDossier) => {
      const updated = savedDossiers.filter((s) => s.domain !== d.domain || s.researchDate !== d.researchDate);
      setSavedDossiers(updated);
      saveDossiers(updated);
      if (dossier?.domain === d.domain && dossier?.researchDate === d.researchDate) {
        setDossier(null);
      }
    },
    [savedDossiers, dossier]
  );

  const loadSaved = useCallback((d: ExtendedDossier) => {
    setDossier(d);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100">Autonomous Research Engine</h2>
          <p className="text-[11px] text-slate-500">Enter a company domain to generate a complete intelligence dossier from multiple data sources</p>
        </div>
      </div>

      {/* Research Input */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Target Company Research</div>
        <div className="flex gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !researching && startResearch()}
            placeholder="company.com"
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={startResearch}
            disabled={researching || !domain.trim()}
            className="text-xs px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium disabled:opacity-50 flex items-center gap-1.5 hover:bg-indigo-600 transition-colors"
          >
            {researching ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Researching...</>
            ) : (
              <><Search className="w-3 h-3" /> Research</>
            )}
          </button>
        </div>

        {/* Quick source badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {Object.entries(sourceMeta).map(([id, meta]) => (
            <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-white/[0.03] text-slate-600 border border-white/[0.04]">
              <meta.icon className="w-2.5 h-2.5" />
              {meta.name}
            </span>
          ))}
        </div>
      </div>

      {/* Research Progress Steps */}
      {researching && (
        <div className="p-4 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03]">
          <div className="text-xs font-semibold text-indigo-300 mb-3 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Research in Progress...
          </div>
          <div className="space-y-2">
            {researchStepNames.map((stepName, i) => {
              const Icon = stepIcons[i];
              return (
                <div key={stepName} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      i < currentStep
                        ? "bg-emerald-500/20 text-emerald-400"
                        : i === currentStep
                          ? "bg-indigo-500/20 text-indigo-400 animate-pulse"
                          : "bg-white/[0.06] text-slate-600"
                    }`}
                  >
                    {i < currentStep ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  </div>
                  <span className={`text-xs ${i <= currentStep ? "text-slate-300" : "text-slate-600"}`}>{stepName}</span>
                  {i === currentStep && <span className="text-[10px] text-indigo-400 ml-auto">Processing...</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when no dossier and not researching */}
      {!dossier && !researching && savedDossiers.length === 0 && (
        <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
          <Search className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-xs text-slate-500 mb-1">No research conducted yet.</p>
          <p className="text-[11px] text-slate-600 max-w-md mx-auto">
            Enter a company domain above to start research. The engine will attempt to call the backend API first, then fall back to an empty template if no API is configured.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Company Website</span>
            <span className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">GitHub</span>
            <span className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Wikipedia</span>
            <span className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Crunchbase</span>
          </div>
        </div>
      )}

      {/* Research Results */}
      {dossier && <EnhancedDossierView dossier={dossier} />}

      {/* Saved Dossiers */}
      {savedDossiers.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Research History ({savedDossiers.length})
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {savedDossiers.map((d) => (
              <div
                key={`${d.domain}-${d.researchDate}`}
                onClick={() => loadSaved(d)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  dossier?.domain === d.domain && dossier?.researchDate === d.researchDate
                    ? "bg-indigo-500/10 border border-indigo-500/20"
                    : "hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <div className="w-6 h-6 rounded bg-[#0f172a] flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">
                  {d.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-300 truncate">{d.name}</div>
                  <div className="text-[10px] text-slate-600">{d.industry} · {d.size || "Unknown size"}</div>
                </div>
                <div className="text-[10px] text-slate-600">{new Date(d.researchDate).toLocaleDateString()}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDossier(d); }}
                  className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
