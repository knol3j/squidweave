import { useState, useCallback, useRef, useMemo } from "react";
import {
  Search,
  Loader2,
  Check,
  Globe,
  Cpu,
  Users,
  AlertTriangle,
  UserCircle,
  Lightbulb,
  Trash2,
  Clock,
  Sparkles,
  Github,
  BookOpen,
  FileText,
  DollarSign,
  Linkedin,
  Newspaper,
  Rocket,
  MessageSquare,
  Hash,
  ExternalLink,
  Download,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Layers,
  Calendar,
  Shield,
  MapPin,
  Zap,
  Award,
  Target,
  Boxes,
  Radar,
  Briefcase,
  Mail,
  Code2,
  Radio,
  Share2,
} from "lucide-react";
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

  /* ---- Enrichment ---- */
  timeline: TimelineEvent[];
  keyTerms: KeyTerm[];
  competitorDetails: CompetitorDetail[];
  jobPostings: JobPosting[];
  emailPatterns: EmailPattern[];
  discoveredContacts: LinkedInProfile[];
}

/* ================================================================== */
/*  RESEARCH-STEP CONFIG                                               */
/* ================================================================== */
interface ResearchStep {
  name: string;
  status: string;
  sourceId: string;
  delay: number;
}

const researchSteps: ResearchStep[] = [
  { name: "Scraping company website", status: "Crawling pages, extracting metadata...", sourceId: "website", delay: 900 },
  { name: "Analyzing GitHub repositories", status: "Fetching repos, stars, languages...", sourceId: "github", delay: 1100 },
  { name: "Searching Wikipedia", status: "Retrieving company overview & history...", sourceId: "wikipedia", delay: 700 },
  { name: "Querying SEC EDGAR", status: "Pulling recent filings...", sourceId: "sec", delay: 900 },
  { name: "Researching Crunchbase", status: "Mapping funding rounds & investors...", sourceId: "crunchbase", delay: 800 },
  { name: "Discovering LinkedIn profiles", status: "Finding key hires & org chart...", sourceId: "linkedin", delay: 1000 },
  { name: "Fetching Google News", status: "Analyzing recent articles & sentiment...", sourceId: "news", delay: 800 },
  { name: "Checking Product Hunt", status: "Looking up launches & upvotes...", sourceId: "producthunt", delay: 600 },
  { name: "Monitoring Reddit", status: "Scanning subreddit mentions...", sourceId: "reddit", delay: 700 },
  { name: "Searching Hacker News", status: "Finding discussion threads...", sourceId: "hackernews", delay: 600 },
  { name: "Enriching contacts", status: "Discovering email patterns & job postings...", sourceId: "enrichment", delay: 900 },
  { name: "Building timeline & word cloud", status: "Synthesizing events & key terms...", sourceId: "synthesis", delay: 800 },
  { name: "Generating pitch angles", status: "Creating pitch frameworks...", sourceId: "pitch", delay: 700 },
];

const stepIcons: React.ElementType[] = [
  Globe, Github, BookOpen, FileText, DollarSign, Linkedin, Newspaper,
  Rocket, MessageSquare, Hash, UserCircle, Calendar, Lightbulb,
];

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

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function pickFromHash<T>(domain: string, arr: T[]): T {
  return arr[hashCode(domain) % arr.length];
}

/* ================================================================== */
/*  INDUSTRY INFERENCE                                                 */
/* ================================================================== */
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
/*  SEEDED DATA GENERATORS                                             */
/* ================================================================== */
const sizes = ["1-50", "50-200", "200-500", "500-1000", "1000-5000", "5000+"];
const revenueRanges = ["<$1M", "$1M-$5M", "$5M-$10M", "$10M-$50M", "$50M-$100M", "$100M-$500M", "$500M+"];
const foundedYears = ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
const locations = [
  "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA",
  "Boston, MA", "Denver, CO", "Chicago, IL", "Los Angeles, CA",
  "London, UK", "Berlin, DE", "Toronto, CA", "Remote-first",
];

function randomSize(domain: string): string { return pickFromHash(domain, sizes); }
function randomRevenue(domain: string): string { return pickFromHash(domain, revenueRanges); }
function randomFounded(domain: string): string { return pickFromHash(domain, foundedYears); }
function randomLocation(domain: string): string { return pickFromHash(domain, locations); }

/* ---- Products ---- */
interface Product { name: string; description: string; category: string; pricing?: string; }

const productCatalog: Record<string, Product[]> = {
  Healthcare: [
    { name: "Patient Management Platform", description: "Electronic health records and patient scheduling system", category: "Core Platform", pricing: "$99/provider/month" },
    { name: "Telehealth Suite", description: "HIPAA-compliant video consultations", category: "Telemedicine", pricing: "$49/month" },
    { name: "Insurance Claims Engine", description: "Automated claims processing and verification", category: "Operations", pricing: "Custom" },
    { name: "Analytics Dashboard", description: "Population health analytics and reporting", category: "Analytics", pricing: "$199/month" },
  ],
  Fintech: [
    { name: "Payment Processing API", description: "Multi-currency payment gateway with instant settlement", category: "Payments", pricing: "2.9% + $0.30" },
    { name: "Fraud Detection Engine", description: "ML-powered real-time transaction monitoring", category: "Security", pricing: "$0.05/transaction" },
    { name: "Lending Platform", description: "Digital loan origination and servicing", category: "Lending", pricing: "Custom" },
    { name: "Wealth Management Suite", description: "Portfolio tracking and robo-advisory tools", category: "Wealth", pricing: "0.25% AUM" },
  ],
  "E-commerce": [
    { name: "Store Builder", description: "No-code storefront with 100+ themes", category: "Core", pricing: "$29/month" },
    { name: "Inventory Manager", description: "Multi-channel inventory sync and forecasting", category: "Operations", pricing: "$79/month" },
    { name: "Marketing Automation", description: "Abandoned cart recovery and email campaigns", category: "Marketing", pricing: "$49/month" },
    { name: "Analytics Suite", description: "Customer lifetime value and cohort analysis", category: "Analytics", pricing: "$99/month" },
  ],
  EdTech: [
    { name: "Learning Management System", description: "Course creation, student tracking, and assessments", category: "Core", pricing: "$8/student/month" },
    { name: "Live Classroom", description: "Interactive virtual classroom with breakout rooms", category: "Live", pricing: "$49/instructor/month" },
    { name: "Content Library", description: "Pre-built curriculum and lesson plans", category: "Content", pricing: "$199/month" },
    { name: "Certification Engine", description: "Automated grading and credential issuance", category: "Assessment", pricing: "$2/certificate" },
  ],
  "Developer Tools": [
    { name: "Cloud IDE", description: "Browser-based development environment with collaboration", category: "IDE", pricing: "$15/dev/month" },
    { name: "CI/CD Pipeline", description: "Automated testing and deployment workflows", category: "DevOps", pricing: "$0.008/minute" },
    { name: "API Gateway", description: "Rate limiting, authentication, and monitoring", category: "Infrastructure", pricing: "$29/month" },
    { name: "Observability Suite", description: "Distributed tracing, logs, and metrics", category: "Monitoring", pricing: "$49/month" },
  ],
  "Marketing Tech": [
    { name: "Customer Data Platform", description: "Unified customer profiles and segmentation", category: "Data", pricing: "$499/month" },
    { name: "Campaign Manager", description: "Multi-channel campaign orchestration", category: "Campaigns", pricing: "$199/month" },
    { name: "Attribution Engine", description: "Multi-touch revenue attribution modeling", category: "Analytics", pricing: "$299/month" },
    { name: "Content Optimizer", description: "AI-powered A/B testing and personalization", category: "Optimization", pricing: "$149/month" },
  ],
  Cybersecurity: [
    { name: "Threat Detection Platform", description: "AI-powered real-time threat intelligence", category: "Detection", pricing: "$12/endpoint/month" },
    { name: "Vulnerability Scanner", description: "Automated security assessments and patching", category: "Prevention", pricing: "$499/month" },
    { name: "SIEM Dashboard", description: "Security event logging and correlation", category: "Monitoring", pricing: "$999/month" },
    { name: "Compliance Manager", description: "SOC 2, GDPR, HIPAA compliance automation", category: "Compliance", pricing: "Custom" },
  ],
  "HR Tech": [
    { name: "Applicant Tracking System", description: "End-to-end hiring pipeline management", category: "Recruiting", pricing: "$149/month" },
    { name: "HRIS Platform", description: "Employee records, onboarding, and offboarding", category: "Core HR", pricing: "$8/employee/month" },
    { name: "Performance Reviews", description: "360-degree feedback and goal tracking", category: "Performance", pricing: "$5/employee/month" },
    { name: "Payroll Engine", description: "Multi-state payroll and tax compliance", category: "Payroll", pricing: "$35/month base" },
  ],
  "B2B SaaS": [
    { name: "Workflow Automation", description: "No-code business process automation", category: "Automation", pricing: "$49/user/month" },
    { name: "Team Collaboration Hub", description: "Shared workspaces, docs, and messaging", category: "Collaboration", pricing: "$12/user/month" },
    { name: "Analytics Dashboard", description: "Custom reports and KPI tracking", category: "Analytics", pricing: "$199/month" },
    { name: "Integration Platform", description: "500+ native integrations and webhooks", category: "Integrations", pricing: "Custom" },
  ],
};

function generateProducts(industry: string): Product[] {
  return productCatalog[industry] || productCatalog["B2B SaaS"];
}

/* ---- Tech stack ---- */
const techPools: Record<string, string[]> = {
  Healthcare: ["React", "Node.js", "PostgreSQL", "AWS", "Docker", "HIPAA Vault", "HL7 FHIR", "Kubernetes"],
  Fintech: ["React", "Go", "PostgreSQL", "Redis", "AWS", "Stripe API", "Kafka", "Terraform"],
  "E-commerce": ["Next.js", "Node.js", "MongoDB", "Vercel", "Stripe", "Algolia", "Redis", "Cloudflare"],
  EdTech: ["React", "Python", "PostgreSQL", "AWS", "WebRTC", "TensorFlow", "Docker", "S3"],
  "Developer Tools": ["TypeScript", "Rust", "PostgreSQL", "Redis", "Kubernetes", "GitHub Actions", "gRPC", "Prometheus"],
  "Marketing Tech": ["React", "Python", "ClickHouse", "AWS", "Apache Airflow", "dbt", "BigQuery", "Looker"],
  Cybersecurity: ["Rust", "Go", "PostgreSQL", "Kafka", "ElasticSearch", "eBPF", "AWS", "YARA"],
  "HR Tech": ["React", "Ruby on Rails", "PostgreSQL", "Redis", "AWS", "Sidekiq", "Twilio", "DocuSign"],
  "B2B SaaS": ["React", "Node.js", "PostgreSQL", "Redis", "AWS", "Docker", "Stripe", "Segment"],
};

function generateTechStack(industry: string): string[] {
  return techPools[industry] || techPools["B2B SaaS"];
}

/* ---- Competitors ---- */
interface Competitor { name: string; domain: string; overlap: string; threatLevel: string; }

const competitorPools: Record<string, { name: string; domain: string }[]> = {
  Healthcare: [
    { name: "Epic Systems", domain: "epic.com" },
    { name: "Cerner", domain: "cerner.com" },
    { name: "Athenahealth", domain: "athenahealth.com" },
    { name: "Teladoc", domain: "teladoc.com" },
    { name: "Veeva Systems", domain: "veeva.com" },
  ],
  Fintech: [
    { name: "Stripe", domain: "stripe.com" },
    { name: "Plaid", domain: "plaid.com" },
    { name: "Marqeta", domain: "marqeta.com" },
    { name: "Brex", domain: "brex.com" },
    { name: "Mercury", domain: "mercury.com" },
  ],
  "E-commerce": [
    { name: "Shopify", domain: "shopify.com" },
    { name: "BigCommerce", domain: "bigcommerce.com" },
    { name: "WooCommerce", domain: "woocommerce.com" },
    { name: "Squarespace", domain: "squarespace.com" },
    { name: "Wix", domain: "wix.com" },
  ],
  EdTech: [
    { name: "Coursera", domain: "coursera.org" },
    { name: "Udemy", domain: "udemy.com" },
    { name: "Canvas LMS", domain: "instructure.com" },
    { name: "Blackboard", domain: "blackboard.com" },
    { name: "Duolingo", domain: "duolingo.com" },
  ],
  "Developer Tools": [
    { name: "GitHub", domain: "github.com" },
    { name: "GitLab", domain: "gitlab.com" },
    { name: "Vercel", domain: "vercel.com" },
    { name: "Docker", domain: "docker.com" },
    { name: "CircleCI", domain: "circleci.com" },
  ],
  "Marketing Tech": [
    { name: "HubSpot", domain: "hubspot.com" },
    { name: "Marketo", domain: "marketo.com" },
    { name: "Segment", domain: "segment.com" },
    { name: "Amplitude", domain: "amplitude.com" },
    { name: "Klaviyo", domain: "klaviyo.com" },
  ],
  Cybersecurity: [
    { name: "CrowdStrike", domain: "crowdstrike.com" },
    { name: "Palo Alto Networks", domain: "paloaltonetworks.com" },
    { name: "Cloudflare", domain: "cloudflare.com" },
    { name: "SentinelOne", domain: "sentinelone.com" },
    { name: "Wiz", domain: "wiz.io" },
  ],
  "HR Tech": [
    { name: "Greenhouse", domain: "greenhouse.io" },
    { name: "Lever", domain: "lever.co" },
    { name: "Workday", domain: "workday.com" },
    { name: "Gusto", domain: "gusto.com" },
    { name: "BambooHR", domain: "bamboohr.com" },
  ],
  "B2B SaaS": [
    { name: "Salesforce", domain: "salesforce.com" },
    { name: "HubSpot", domain: "hubspot.com" },
    { name: "Notion", domain: "notion.so" },
    { name: "Asana", domain: "asana.com" },
    { name: "Monday.com", domain: "monday.com" },
  ],
};

const overlaps = ["Product", "Pricing", "Feature Set", "Market Segment", "Geography"];
const threats = ["High", "Medium", "Low"];

function generateCompetitors(industry: string): Competitor[] {
  const pool = competitorPools[industry] || competitorPools["B2B SaaS"];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((c) => ({
    name: c.name,
    domain: c.domain,
    overlap: overlaps[Math.floor(Math.random() * overlaps.length)],
    threatLevel: threats[Math.floor(Math.random() * threats.length)],
  }));
}

/* ---- Pain points ---- */
interface PainPoint { problem: string; evidence: string; impact: string; confidence: number; }

const painPointCatalog: Record<string, PainPoint[]> = {
  Healthcare: [
    { problem: "Fragmented patient data across systems", evidence: "Average hospital uses 16+ disconnected EHR platforms", impact: "High", confidence: 94 },
    { problem: "High administrative overhead", evidence: "Administrative costs consume 25% of healthcare revenue", impact: "High", confidence: 91 },
    { problem: "Patient no-show rates", evidence: "Industry average no-show rate is 18%, costing $150B annually", impact: "Medium", confidence: 87 },
    { problem: "Regulatory compliance burden", evidence: "HIPAA violations cost $100K-$1.5M per incident", impact: "High", confidence: 96 },
  ],
  Fintech: [
    { problem: "Payment fraud losses", evidence: "Global payment fraud expected to reach $40B by 2027", impact: "High", confidence: 95 },
    { problem: "Complex compliance requirements", evidence: "PCI DSS compliance takes 6+ months on average", impact: "High", confidence: 92 },
    { problem: "Customer churn due to poor UX", evidence: "68% of users abandon fintech apps after one bad experience", impact: "Medium", confidence: 88 },
    { problem: "Integration with legacy banking", evidence: "Average fintech uses 5+ banking APIs with inconsistent reliability", impact: "Medium", confidence: 85 },
  ],
  "E-commerce": [
    { problem: "Cart abandonment", evidence: "Average cart abandonment rate is 70.19% across industries", impact: "High", confidence: 97 },
    { problem: "Customer acquisition cost inflation", evidence: "CAC has risen 60% in the last 5 years for DTC brands", impact: "High", confidence: 93 },
    { problem: "Inventory mismanagement", evidence: "Overstocking costs retailers $1.75T annually globally", impact: "Medium", confidence: 89 },
    { problem: "Returns processing", evidence: "Return rates average 20-30% for online purchases", impact: "Medium", confidence: 86 },
  ],
  EdTech: [
    { problem: "Low course completion rates", evidence: "MOOC completion rates average only 3-6%", impact: "High", confidence: 93 },
    { problem: "Engagement decay", evidence: "Student engagement drops 40% after week 3 in online courses", impact: "High", confidence: 90 },
    { problem: "Content personalization gap", evidence: "78% of educators say one-size-fits-all content is their biggest challenge", impact: "Medium", confidence: 87 },
    { problem: "Credential verification", evidence: "Fake credentials cost employers $5B annually in bad hires", impact: "Medium", confidence: 84 },
  ],
  "Developer Tools": [
    { problem: "Developer onboarding friction", evidence: "New developers take 3-6 months to reach full productivity", impact: "High", confidence: 91 },
    { problem: "Tool fragmentation", evidence: "Average developer uses 8-12 different tools daily", impact: "Medium", confidence: 88 },
    { problem: "CI/CD pipeline failures", evidence: "22% of deployments fail due to environment inconsistencies", impact: "High", confidence: 90 },
    { problem: "Documentation rot", evidence: "60% of internal docs are outdated within 3 months", impact: "Low", confidence: 82 },
  ],
  "Marketing Tech": [
    { problem: "Data silos across channels", evidence: "Marketers waste 21% of budget due to poor data integration", impact: "High", confidence: 94 },
    { problem: "Attribution complexity", evidence: "Only 17% of marketers are confident in their attribution models", impact: "High", confidence: 92 },
    { problem: "Ad fatigue and banner blindness", evidence: "Average click-through rate for display ads is 0.35%", impact: "Medium", confidence: 89 },
    { problem: "Privacy regulation compliance", evidence: "GDPR fines exceeded EUR2B in 2023 alone", impact: "High", confidence: 95 },
  ],
  Cybersecurity: [
    { problem: "Alert fatigue", evidence: "SOC teams receive 4,000+ alerts daily, 67% are false positives", impact: "High", confidence: 96 },
    { problem: "Talent shortage", evidence: "3.5M cybersecurity jobs will be unfilled by 2025", impact: "High", confidence: 94 },
    { problem: "Mean time to detect breaches", evidence: "Average breach detection time is 287 days", impact: "High", confidence: 93 },
    { problem: "Cloud misconfiguration", evidence: "65% of cloud security incidents are due to misconfiguration", impact: "Medium", confidence: 91 },
  ],
  "HR Tech": [
    { problem: "Time-to-hire increasing", evidence: "Average time-to-hire reached 44 days in 2024", impact: "High", confidence: 92 },
    { problem: "Candidate ghosting", evidence: "67% of recruiters report increased candidate ghosting", impact: "Medium", confidence: 88 },
    { problem: "Employee engagement decline", evidence: "Only 15% of global employees feel engaged at work", impact: "High", confidence: 90 },
    { problem: "Onboarding inefficiency", evidence: "Poor onboarding leads to 50% higher turnover in first year", impact: "Medium", confidence: 87 },
  ],
  "B2B SaaS": [
    { problem: "High customer acquisition cost", evidence: "SaaS companies spend 30-50% of revenue on S&M", impact: "High", confidence: 93 },
    { problem: "Long sales cycles", evidence: "Enterprise SaaS sales cycles average 3-6 months", impact: "High", confidence: 91 },
    { problem: "Feature bloat", evidence: "80% of SaaS features are used by less than 5% of users", impact: "Low", confidence: 84 },
    { problem: "Churn prediction difficulty", evidence: "Unexpected churn accounts for 40% of lost revenue", impact: "Medium", confidence: 88 },
  ],
};

function generatePainPoints(industry: string): PainPoint[] {
  return painPointCatalog[industry] || painPointCatalog["B2B SaaS"];
}

/* ---- Decision makers ---- */
interface DecisionMaker {
  name: string; title: string; department: string; emailPattern: string;
  linkedinUrl: string; powerScore: number; techSavviness: number;
  bestChannel: string; firstTouchMessage: string;
}

const firstNames = ["Sarah","Michael","Jennifer","David","Emily","James","Jessica","Robert","Amanda","William","Laura","Daniel","Michelle","Christopher","Rebecca"];
const lastNames = ["Chen","Rodriguez","Johnson","Smith","Williams","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White"];

const dmBySize: Record<string, { title: string; dept: string }[]> = {
  "1-50": [
    { title: "CEO & Co-Founder", dept: "Executive" },
    { title: "CTO", dept: "Engineering" },
    { title: "Head of Growth", dept: "Growth" },
    { title: "VP of Operations", dept: "Operations" },
  ],
  "50-200": [
    { title: "VP of Marketing", dept: "Marketing" },
    { title: "VP of Sales", dept: "Sales" },
    { title: "Director of Growth", dept: "Growth" },
    { title: "Head of Product", dept: "Product" },
    { title: "Director of Engineering", dept: "Engineering" },
  ],
  "200-500": [
    { title: "CMO", dept: "Marketing" },
    { title: "VP of Demand Generation", dept: "Marketing" },
    { title: "Director of Marketing Ops", dept: "Marketing" },
    { title: "Head of Business Development", dept: "Sales" },
    { title: "VP of Product", dept: "Product" },
  ],
  "500-1000": [
    { title: "CMO", dept: "Marketing" },
    { title: "VP of Digital Marketing", dept: "Marketing" },
    { title: "Director of Revenue Operations", dept: "Revenue" },
    { title: "Head of Partnerships", dept: "Business Development" },
    { title: "VP of Strategy", dept: "Strategy" },
  ],
  "1000-5000": [
    { title: "Chief Revenue Officer", dept: "Revenue" },
    { title: "SVP of Marketing", dept: "Marketing" },
    { title: "VP of Growth Marketing", dept: "Marketing" },
    { title: "Director of GTM Strategy", dept: "GTM" },
    { title: "Head of Sales Enablement", dept: "Sales" },
  ],
  "5000+": [
    { title: "Chief Growth Officer", dept: "Growth" },
    { title: "EVP of Global Marketing", dept: "Marketing" },
    { title: "VP of Marketing Technology", dept: "MarTech" },
    { title: "Director of Digital Transformation", dept: "Digital" },
    { title: "Head of Innovation", dept: "Innovation" },
  ],
};

const outreachChannels = ["Email", "LinkedIn", "Email"];

function generateDecisionMakers(size: string, domain: string): DecisionMaker[] {
  const roles = dmBySize[size] || dmBySize["1-50"];
  const h = hashCode(domain);
  return roles.map((role, i) => {
    const fn = firstNames[(h + i * 3) % firstNames.length];
    const ln = lastNames[(h + i * 7) % lastNames.length];
    const power = Math.max(5, Math.min(10, 10 - i + (h % 3)));
    const tech = Math.max(4, Math.min(10, 8 - i + ((h + i) % 3)));
    return {
      name: `${fn} ${ln}`,
      title: role.title,
      department: role.dept,
      emailPattern: `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`,
      linkedinUrl: `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}-${(h % 900) + 100}`,
      powerScore: power,
      techSavviness: tech,
      bestChannel: outreachChannels[(h + i) % outreachChannels.length],
      firstTouchMessage: `Hi ${fn}, I noticed ${domainToName(domain)} is scaling fast in the ${inferIndustry(domain)} space. We've helped similar companies streamline their growth operations. Worth a brief conversation?`,
    };
  });
}

/* ---- Pitch angles ---- */
interface PitchAngle {
  title: string; angle: string; targetPersona: string;
  keyMessage: string; expectedOutcome: string; priority: number;
}

function generatePitchAngles(name: string, industry: string, painPoints: PainPoint[]): PitchAngle[] {
  const topPains = painPoints.slice(0, 3);
  return [
    {
      title: "Efficiency Play",
      angle: `Show ${name} how to reduce operational overhead by 40% through intelligent automation`,
      targetPersona: "COO / VP Operations",
      keyMessage: `${name} is likely spending ${topPains[0]?.impact === "High" ? "30-50%" : "20-30%"} of resources on ${topPains[0]?.problem.toLowerCase() || "manual processes"}. Our platform automates this end-to-end.`,
      expectedOutcome: "15-min discovery call booked",
      priority: 1,
    },
    {
      title: "Growth Acceleration",
      angle: `Position as the engine for ${name}'s next growth phase without proportional headcount increase`,
      targetPersona: "CMO / Head of Growth",
      keyMessage: `Companies in ${industry} using our platform see 2.3x pipeline growth in 90 days while keeping team size flat.`,
      expectedOutcome: "Demo scheduled with growth team",
      priority: 2,
    },
    {
      title: "Competitive Defense",
      angle: `Leverage ${name}'s competitive pressure as urgency driver`,
      targetPersona: "CEO / VP Strategy",
      keyMessage: `Your competitors are already investing in AI-powered outreach. The window to establish market position is narrowing.`,
      expectedOutcome: "Strategic conversation with leadership",
      priority: 3,
    },
    {
      title: "Pain-First Consultative",
      angle: `Lead with insight about ${topPains[1]?.problem || "industry challenge"} and offer diagnostic`,
      targetPersona: "Director-level practitioners",
      keyMessage: `We analyzed 200+ ${industry} companies and found ${topPains[1]?.confidence || "85"}% struggle with ${topPains[1]?.problem.toLowerCase() || "this"}. Want to see where you stand?`,
      expectedOutcome: "Free assessment accepted",
      priority: 4,
    },
  ];
}

/* ---- Description ---- */
function generateDescription(name: string, industry: string, size: string): string {
  const descriptions: Record<string, string> = {
    Healthcare: `${name} provides modern healthcare technology solutions designed to streamline clinical workflows, improve patient outcomes, and reduce administrative burden for providers of all sizes.`,
    Fintech: `${name} builds financial infrastructure and tools that help businesses move money programmatically, manage risk, and deliver better financial experiences to their customers.`,
    "E-commerce": `${name} empowers merchants with a comprehensive platform to build, operate, and scale online stores with powerful tools for inventory, marketing, and customer analytics.`,
    EdTech: `${name} delivers innovative learning technology that makes education more accessible, engaging, and effective for institutions, educators, and learners worldwide.`,
    "Developer Tools": `${name} creates developer-centric tools and infrastructure that help engineering teams ship faster, collaborate better, and maintain higher code quality.`,
    "Marketing Tech": `${name} offers a data-driven marketing platform that enables brands to understand their customers, orchestrate campaigns, and measure true marketing ROI.`,
    Cybersecurity: `${name} provides enterprise-grade security solutions that protect organizations from evolving cyber threats through AI-powered detection and automated response.`,
    "HR Tech": `${name} builds human capital management software that helps companies attract, develop, and retain talent while simplifying HR operations.`,
    "B2B SaaS": `${name} delivers cloud-based software solutions that help businesses automate workflows, improve collaboration, and drive operational efficiency at scale.`,
  };
  const base = descriptions[industry] || descriptions["B2B SaaS"];
  return `${base} Currently serving the ${size} employee segment.`;
}

// Prevent unused parameter warnings — these are used via the descriptions lookup
void generateDescription;

/* ================================================================== */
/*  10 FREE DATA-SOURCE SIMULATORS                                     */
/* ================================================================== */

function simulateWebsiteScrape(_domain: string, name: string): { pages: WebsitePage[]; confidence: number } {
  const pages: WebsitePage[] = [
    { path: "/", title: `${name} - Home`, foundOn: new Date(Date.now() - 86400000 * 2).toISOString() },
    { path: "/about", title: `About ${name}`, foundOn: new Date(Date.now() - 86400000 * 3).toISOString() },
    { path: "/products", title: "Products & Solutions", foundOn: new Date(Date.now() - 86400000 * 1).toISOString() },
    { path: "/pricing", title: "Pricing Plans", foundOn: new Date(Date.now() - 86400000 * 5).toISOString() },
    { path: "/blog", title: "Blog & Resources", foundOn: new Date(Date.now() - 86400000 * 0.5).toISOString() },
    { path: "/careers", title: "Join Our Team", foundOn: new Date(Date.now() - 86400000 * 7).toISOString() },
    { path: "/contact", title: "Contact Sales", foundOn: new Date(Date.now() - 86400000 * 4).toISOString() },
    { path: "/docs", title: "Documentation", foundOn: new Date(Date.now() - 86400000 * 1.5).toISOString() },
    { path: "/customers", title: "Customer Stories", foundOn: new Date(Date.now() - 86400000 * 6).toISOString() },
    { path: "/security", title: "Security & Compliance", foundOn: new Date(Date.now() - 86400000 * 10).toISOString() },
  ];
  return { pages, confidence: 92 };
}

function simulateGitHubRepos(domain: string, industry: string): { repos: GitHubRepo[]; confidence: number } {
  const h = hashCode(domain);
  const langPool = techPools[industry] || techPools["B2B SaaS"];
  const repoNames = ["core-platform", "web-app", "api-gateway", "ml-engine", "mobile-sdk", "docs", "infra"];
  const repos: GitHubRepo[] = repoNames.slice(0, 3 + (h % 3)).map((name, i) => ({
    name,
    stars: 50 + ((h + i * 137) % 4500),
    forks: 10 + ((h + i * 89) % 800),
    language: langPool[(h + i) % langPool.length],
    contributors: 3 + ((h + i * 53) % 45),
    lastCommit: new Date(Date.now() - 86400000 * ((h + i * 7) % 14)).toISOString(),
    description: `Official ${name.replace(/-/g, " ")} repository for ${domainToName(domain)}`,
    topics: [industry.toLowerCase().replace(/\s/g, "-"), "saas", "api", "cloud"],
  }));
  return { repos, confidence: 88 };
}

function simulateWikipedia(domain: string, name: string, industry: string): { entry: WikipediaEntry; confidence: number } {
  const h = hashCode(domain);
  return {
    entry: {
      summary: `${name} is a ${industry.toLowerCase()} company founded in ${foundedYears[h % foundedYears.length]}. The company provides software solutions for businesses, focusing on automation and efficiency. ${name} serves clients across multiple industries and has been recognized for its innovative approach to ${industry.toLowerCase()}.`,
      founded: foundedYears[h % foundedYears.length],
      headquarters: locations[h % locations.length],
      keyPeople: [
        `${firstNames[h % firstNames.length]} ${lastNames[h % lastNames.length]} (CEO)`,
        `${firstNames[(h + 3) % firstNames.length]} ${lastNames[(h + 5) % lastNames.length]} (CTO)`,
        `${firstNames[(h + 7) % firstNames.length]} ${lastNames[(h + 2) % lastNames.length]} (VP Engineering)`,
      ],
      industry,
      url: `https://en.wikipedia.org/wiki/${name.replace(/\s/g, "_")}`,
    },
    confidence: 85,
  };
}

function simulateSECFilings(domain: string): { filings: SECFiling[]; confidence: number } {
  const h = hashCode(domain);
  const forms = ["10-K", "10-Q", "8-K", "S-1", "DEF 14A"];
  const descs = [
    "Annual report filed for fiscal year",
    "Quarterly earnings report",
    "Current report - material event disclosure",
    "Registration statement for IPO",
    "Proxy statement for annual meeting",
  ];
  const filings: SECFiling[] = forms.map((form, i) => ({
    formType: form,
    filedDate: new Date(Date.now() - 86400000 * (30 + (h + i * 45) % 300)).toISOString(),
    description: `${descs[i]} - ${domainToName(domain)}`,
    accessionNumber: `000${(h + i * 1234) % 9999999}`.padStart(10, "0"),
    confidence: 90 + ((h + i) % 8),
  }));
  return { filings, confidence: 90 };
}

function simulateCrunchbase(domain: string, _name: string): { rounds: FundingRound[]; confidence: number } {
  const h = hashCode(domain);
  const rounds: FundingRound[] = [
    {
      round: "Seed",
      amount: "$1.2M",
      date: new Date(Date.now() - 86400000 * (365 + (h % 200))).toISOString(),
      leadInvestor: ["Y Combinator", "First Round Capital", "Accel", "Sequoia"][h % 4],
      investors: ["Angel Syndicate", "Founder Fund"],
      valuation: "$6M",
    },
    {
      round: "Series A",
      amount: ["$8M", "$12M", "$15M", "$20M"][h % 4],
      date: new Date(Date.now() - 86400000 * (180 + (h % 150))).toISOString(),
      leadInvestor: ["Andreessen Horowitz", "Bessemer Venture Partners", "Greylock", "Index Ventures"][(h + 1) % 4],
      investors: ["Previous Investors", "Strategic Angel"],
      valuation: ["$40M", "$60M", "$80M", "$100M"][h % 4],
    },
    {
      round: "Series B",
      amount: ["$30M", "$45M", "$60M", "$80M"][(h + 2) % 4],
      date: new Date(Date.now() - 86400000 * (60 + (h % 90))).toISOString(),
      leadInvestor: ["Insight Partners", "Tiger Global", "Coatue", "SoftBank"][(h + 2) % 4],
      investors: ["All Previous", "Strategic Corporate"],
      valuation: ["$200M", "$300M", "$400M", "$500M"][(h + 1) % 4],
    },
  ];
  return { rounds, confidence: 78 };
}

function simulateLinkedIn(domain: string, size: string): { profiles: LinkedInProfile[]; confidence: number } {
  const roles = dmBySize[size] || dmBySize["1-50"];
  const h = hashCode(domain);
  const profiles: LinkedInProfile[] = roles.slice(0, 4).map((role, i) => ({
    name: `${firstNames[(h + i * 4) % firstNames.length]} ${lastNames[(h + i * 6) % lastNames.length]}`,
    title: role.title,
    linkedInUrl: `https://linkedin.com/in/${firstNames[(h + i * 4) % firstNames.length].toLowerCase()}-${lastNames[(h + i * 6) % lastNames.length].toLowerCase()}-${(h + i * 100) % 900 + 100}`,
    isOpenToWork: (h + i) % 5 === 0,
    connectionDegree: ["1st", "2nd", "2nd", "3rd+"][(h + i) % 4],
    skills: ["Leadership", "Strategy", "SaaS", "Growth", "Operations"].slice(0, 3 + (h + i) % 3),
    confidence: 70 + ((h + i * 7) % 20),
  }));
  return { profiles, confidence: 72 };
}

function simulateNews(domain: string, name: string): { articles: NewsArticle[]; confidence: number } {
  const h = hashCode(domain);
  const sentiments: ("positive" | "neutral" | "negative")[] = ["positive", "positive", "neutral", "positive", "neutral"];
  const sources = ["TechCrunch", "Forbes", "Business Insider", "The Verge", "Reuters"];
  const titles = [
    `${name} raises Series B to expand ${inferIndustry(domain)} platform`,
    `${name} partners with Fortune 500 client for enterprise rollout`,
    `How ${name} is disrupting the ${inferIndustry(domain)} landscape`,
    `${name} announces new AI-powered features`,
    `${name} named to Forbes Cloud 100`,
  ];
  const articles: NewsArticle[] = titles.map((title, i) => ({
    title,
    source: sources[(h + i) % sources.length],
    publishedAt: new Date(Date.now() - 86400000 * ((h + i * 30) % 90)).toISOString(),
    url: `https://${sources[(h + i) % sources.length].toLowerCase().replace(/\s/g, "")}.com/${name.toLowerCase().replace(/\s/g, "-")}-article-${i}`,
    sentiment: sentiments[(h + i) % sentiments.length],
    summary: `${name} continues growth trajectory in the ${inferIndustry(domain)} sector with strategic initiatives and product innovation.`,
  }));
  return { articles, confidence: 80 };
}

function simulateProductHunt(domain: string, name: string): { launches: ProductHuntLaunch[]; confidence: number } {
  const h = hashCode(domain);
  const launches: ProductHuntLaunch[] = [
    {
      productName: `${name} 2.0`,
      tagline: `The modern ${inferIndustry(domain).toLowerCase()} platform`,
      upvotes: 120 + (h % 880),
      comments: 15 + (h % 85),
      launchDate: new Date(Date.now() - 86400000 * (60 + (h % 120))).toISOString(),
      rank: 1 + (h % 5),
      maker: `${firstNames[h % firstNames.length]} ${lastNames[h % lastNames.length]}`,
    },
    {
      productName: `${name} API`,
      tagline: "Developer-first integration toolkit",
      upvotes: 80 + (h % 420),
      comments: 10 + (h % 50),
      launchDate: new Date(Date.now() - 86400000 * (180 + (h % 180))).toISOString(),
      rank: 2 + (h % 4),
      maker: `${firstNames[(h + 3) % firstNames.length]} ${lastNames[(h + 7) % lastNames.length]}`,
    },
  ];
  return { launches, confidence: 82 };
}

function simulateReddit(domain: string, name: string): { mentions: RedditMention[]; confidence: number } {
  const h = hashCode(domain);
  const subreddits = ["r/startups", "r/SaaS", "r/Entrepreneur", "r/technology", "r/webdev"];
  const sentiments: ("positive" | "neutral" | "negative")[] = ["positive", "neutral", "positive", "neutral", "positive"];
  const titles = [
    `Has anyone tried ${name}? Thoughts?`,
    `${name} vs competitors - which is better?`,
    `Just integrated ${name} into our stack - review`,
    `Looking for alternatives to ${name}`,
    `${name} pricing seems steep for startups`,
  ];
  const mentions: RedditMention[] = titles.map((title, i) => ({
    subreddit: subreddits[(h + i) % subreddits.length],
    title,
    upvotes: 5 + (h + i * 50) % 500,
    comments: 2 + (h + i * 17) % 80,
    postedAt: new Date(Date.now() - 86400000 * ((h + i * 20) % 60)).toISOString(),
    sentiment: sentiments[(h + i) % sentiments.length],
    url: `https://reddit.com${subreddits[(h + i) % subreddits.length]}/comments/${(h + i * 1234) % 999999}`,
  }));
  return { mentions, confidence: 68 };
}

function simulateHN(domain: string, name: string): { mentions: HNMention[]; confidence: number } {
  const h = hashCode(domain);
  const sentiments: ("positive" | "neutral" | "negative")[] = ["positive", "neutral", "positive", "neutral"];
  const titles = [
    `Show HN: ${name} – ${inferIndustry(domain)} platform`,
    `Ask HN: Experience with ${name}?`,
    `${name} (YC S${foundedYears[h % foundedYears.length].slice(2)}) is hiring`,
    `${name} open sources their core engine`,
  ];
  const mentions: HNMention[] = titles.map((title, i) => ({
    title,
    points: 20 + (h + i * 80) % 480,
    comments: 5 + (h + i * 23) % 120,
    postedAt: new Date(Date.now() - 86400000 * ((h + i * 35) % 120)).toISOString(),
    url: `https://news.ycombinator.com/item?id=${(h + i * 99999) % 99999999}`,
    sentiment: sentiments[(h + i) % sentiments.length],
  }));
  return { mentions, confidence: 70 };
}

/* ================================================================== */
/*  ENRICHMENT SIMULATORS                                              */
/* ================================================================== */

function generateTimeline(
  domain: string, name: string, industry: string,
  fundingRounds: FundingRound[], productHuntLaunches: ProductHuntLaunch[]
): TimelineEvent[] {
  const h = hashCode(domain);
  const events: TimelineEvent[] = [
    {
      date: new Date(Date.now() - 86400000 * (400 + (h % 200))).toISOString(),
      title: "Company Founded",
      description: `${name} was founded in ${locations[h % locations.length]} to address ${industry.toLowerCase()} challenges.`,
      category: "milestone",
      source: "Wikipedia",
      confidence: 88,
    },
    {
      date: new Date(Date.now() - 86400000 * (300 + (h % 150))).toISOString(),
      title: "Seed Funding",
      description: `Raised initial seed round to build the core platform.`,
      category: "funding",
      source: "Crunchbase",
      confidence: 80,
    },
    ...fundingRounds.map((r): TimelineEvent => ({
      date: r.date,
      title: `${r.round} Round - ${r.amount}`,
      description: `Led by ${r.leadInvestor} at a ${r.valuation} valuation.`,
      category: "funding",
      source: "Crunchbase",
      confidence: 78,
    })),
    {
      date: new Date(Date.now() - 86400000 * (100 + (h % 80))).toISOString(),
      title: "Product Hunt Launch",
      description: `${name} launched on Product Hunt, reaching #${productHuntLaunches[0]?.rank || 1} position.`,
      category: "product",
      source: "Product Hunt",
      confidence: 92,
    },
    {
      date: new Date(Date.now() - 86400000 * (50 + (h % 40))).toISOString(),
      title: "Major Partnership",
      description: `Announced strategic partnership with enterprise client.`,
      category: "partnership",
      source: "Google News",
      confidence: 72,
    },
    {
      date: new Date(Date.now() - 86400000 * (20 + (h % 15))).toISOString(),
      title: "Hiring Spree",
      description: `Opened 15+ new positions across engineering and sales.`,
      category: "hiring",
      source: "LinkedIn",
      confidence: 75,
    },
  ];
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateKeyTerms(industry: string, techStack: string[]): KeyTerm[] {
  const businessTerms = ["SaaS", "B2B", "Revenue Growth", "Customer Retention", "Market Expansion", "Digital Transformation", "API-first", "Cloud-native"];
  const industryTerms: Record<string, string[]> = {
    Healthcare: ["HIPAA", "Telehealth", "EHR", "Patient Care", "Population Health", "Clinical Workflow"],
    Fintech: ["Payments", "Fraud Prevention", "Lending", "WealthTech", "Embedded Finance", "Open Banking"],
    "E-commerce": ["Omnichannel", "Cart Abandonment", "Inventory", "DTC", "Marketplace", "Fulfillment"],
    EdTech: ["LMS", "MOOC", "Credentialing", "Adaptive Learning", "Student Engagement", "Edutainment"],
    "Developer Tools": ["DevOps", "CI/CD", "Observability", "Serverless", "Microservices", "Developer Experience"],
    "Marketing Tech": ["Attribution", "CDP", "MarTech", "Lead Scoring", "Account-Based Marketing", "CRO"],
    Cybersecurity: ["Zero Trust", "Threat Intel", "SIEM", "XDR", "SOC", "Vulnerability Management"],
    "HR Tech": ["ATS", "People Analytics", "Talent Acquisition", "Employee Experience", "DEI", "HRIS"],
    "B2B SaaS": ["Product-Led Growth", "Net Revenue Retention", "Sales Efficiency", "Customer Success", "Land and Expand"],
  };
  const indTerms = industryTerms[industry] || industryTerms["B2B SaaS"];
  const terms: KeyTerm[] = [
    ...techStack.map((t, i): KeyTerm => ({ term: t, frequency: 60 + (i * 13) % 40, category: "tech" })),
    ...indTerms.map((t, i): KeyTerm => ({ term: t, frequency: 70 + (i * 17) % 30, category: "industry" })),
    ...businessTerms.map((t, i): KeyTerm => ({ term: t, frequency: 50 + (i * 11) % 50, category: "business" })),
  ];
  return terms.sort((a, b) => b.frequency - a.frequency).slice(0, 20);
}

function generateCompetitorDetails(industry: string, domain: string): CompetitorDetail[] {
  const pool = competitorPools[industry] || competitorPools["B2B SaaS"];
  const h = hashCode(domain);
  return pool.slice(0, 4).map((c, i) => ({
    name: c.name,
    domain: c.domain,
    founded: foundedYears[(h + i * 3) % foundedYears.length],
    size: sizes[(h + i * 2) % sizes.length],
    revenue: revenueRanges[Math.min(revenueRanges.length - 1, (h + i) % revenueRanges.length + 2)],
    marketShare: `${(3 + (h + i * 7) % 20)}%`,
    strengths: ["Brand recognition", "Enterprise customer base", "Mature ecosystem"].slice(0, 2 + (h + i) % 2),
    weaknesses: ["Slow innovation", "Complex pricing", "Legacy tech stack"].slice(0, 1 + (h + i) % 2),
    overlap: overlaps[(h + i) % overlaps.length],
    threatLevel: threats[(h + i) % threats.length],
  }));
}

function generateJobPostings(domain: string, _industry: string, _size: string): JobPosting[] {
  const h = hashCode(domain);
  const departments: Record<string, string[]> = {
    Engineering: ["Senior Full-Stack Engineer", "Staff Engineer", "Engineering Manager", "DevOps Engineer", "ML Engineer"],
    Sales: ["Account Executive", "Sales Development Rep", "Solutions Engineer", "VP Sales"],
    Marketing: ["Growth Marketing Manager", "Content Strategist", "Product Marketing Manager"],
    Product: ["Product Manager", "UX Designer", "Product Analyst"],
    Operations: ["Customer Success Manager", "Operations Analyst", "Technical Support Lead"],
  };
  const depts = Object.keys(departments);
  const jobs: JobPosting[] = [];
  for (let i = 0; i < 6 + (h % 4); i++) {
    const dept = depts[(h + i) % depts.length];
    const title = departments[dept][(h + i) % departments[dept].length];
    jobs.push({
      title,
      department: dept,
      location: locations[(h + i) % locations.length],
      postedAt: new Date(Date.now() - 86400000 * ((h + i * 5) % 30)).toISOString(),
      salaryRange: `$${90 + (h + i * 17) % 110}K - $${140 + (h + i * 23) % 130}K`,
      remote: (h + i) % 3 !== 0,
      seniority: ["Senior", "Mid", "Lead", "Staff"][(h + i) % 4],
      url: `https://${domain}/careers/${title.toLowerCase().replace(/\s/g, "-")}`,
    });
  }
  return jobs;
}

function generateEmailPatterns(domain: string): EmailPattern[] {
  const h = hashCode(domain);
  const patterns: EmailPattern[] = [
    { pattern: "first.last", confidence: 85 + (h % 10), example: `john.smith@${domain}` },
    { pattern: "firstlast", confidence: 70 + (h % 15), example: `johnsmith@${domain}` },
    { pattern: "first_initial.last", confidence: 60 + (h % 20), example: `j.smith@${domain}` },
    { pattern: "first", confidence: 40 + (h % 20), example: `john@${domain}` },
  ];
  return patterns;
}

/* ================================================================== */
/*  MAIN RESEARCH FUNCTION                                             */
/* ================================================================== */

function researchCompany(domain: string): Promise<ExtendedDossier> {
  return new Promise((resolve) => {
    const name = domainToName(domain);
    const industry = inferIndustry(domain);
    const size = randomSize(domain);
    const products = generateProducts(industry);
    const techStack = generateTechStack(industry);
    const competitors = generateCompetitors(industry);
    const painPoints = generatePainPoints(industry);
    const decisionMakers = generateDecisionMakers(size, domain);
    const pitchAngles = generatePitchAngles(name, industry, painPoints);

    /* Simulate the 10 free data sources */
    const website = simulateWebsiteScrape(domain, name);
    const github = simulateGitHubRepos(domain, industry);
    const wiki = simulateWikipedia(domain, name, industry);
    const sec = simulateSECFilings(domain);
    const crunchbase = simulateCrunchbase(domain, name);
    const linkedin = simulateLinkedIn(domain, size);
    const news = simulateNews(domain, name);
    const ph = simulateProductHunt(domain, name);
    const reddit = simulateReddit(domain, name);
    const hn = simulateHN(domain, name);

    /* Enrichment */
    const timeline = generateTimeline(domain, name, industry, crunchbase.rounds, ph.launches);
    const keyTerms = generateKeyTerms(industry, techStack);
    const competitorDetails = generateCompetitorDetails(industry, domain);
    const jobPostings = generateJobPostings(domain, industry, size);
    const emailPatterns = generateEmailPatterns(domain);

    /* Build data source results for expandable cards */
    const dataSourceResults: DataSourceResult[] = [
      { sourceId: "website",    sourceName: "Company Website",   icon: Globe,       status: "complete", confidence: website.confidence,    dataPoints: website.pages.length,     durationMs: 890,  summary: `Scraped ${website.pages.length} pages from ${domain}` },
      { sourceId: "github",     sourceName: "GitHub",            icon: Github,      status: "complete", confidence: github.confidence,     dataPoints: github.repos.length,      durationMs: 1200, summary: `Found ${github.repos.length} public repos, ${github.repos.reduce((s, r) => s + r.stars, 0)} total stars` },
      { sourceId: "wikipedia",  sourceName: "Wikipedia",         icon: BookOpen,    status: "complete", confidence: wiki.confidence,       dataPoints: 3,                        durationMs: 650,  summary: `Retrieved company overview, ${wiki.entry.keyPeople.length} key people listed` },
      { sourceId: "sec",        sourceName: "SEC EDGAR",         icon: FileText,    status: sec.filings.length > 0 ? "complete" : "failed", confidence: sec.confidence, dataPoints: sec.filings.length, durationMs: 950, summary: `${sec.filings.length} recent filings retrieved` },
      { sourceId: "crunchbase", sourceName: "Crunchbase",        icon: DollarSign,  status: "complete", confidence: crunchbase.confidence, dataPoints: crunchbase.rounds.length, durationMs: 780,  summary: `Mapped ${crunchbase.rounds.length} funding rounds` },
      { sourceId: "linkedin",   sourceName: "LinkedIn Public",   icon: Linkedin,    status: "complete", confidence: linkedin.confidence,   dataPoints: linkedin.profiles.length, durationMs: 1100, summary: `Discovered ${linkedin.profiles.length} key profiles` },
      { sourceId: "news",       sourceName: "Google News",       icon: Newspaper,   status: "complete", confidence: news.confidence,       dataPoints: news.articles.length,     durationMs: 720,  summary: `${news.articles.length} articles analyzed` },
      { sourceId: "producthunt",sourceName: "Product Hunt",      icon: Rocket,      status: "complete", confidence: ph.confidence,         dataPoints: ph.launches.length,       durationMs: 580,  summary: `${ph.launches.length} launches found` },
      { sourceId: "reddit",     sourceName: "Reddit",            icon: MessageSquare,status:"complete",confidence: reddit.confidence,     dataPoints: reddit.mentions.length,   durationMs: 680,  summary: `${reddit.mentions.length} subreddit mentions` },
      { sourceId: "hackernews", sourceName: "Hacker News",       icon: Hash,        status: "complete", confidence: hn.confidence,         dataPoints: hn.mentions.length,       durationMs: 590,  summary: `${hn.mentions.length} discussion threads` },
      { sourceId: "enrichment", sourceName: "Contact Enrichment",icon: UserCircle,  status: "complete", confidence: 82,                      dataPoints: jobPostings.length + emailPatterns.length, durationMs: 900, summary: `${jobPostings.length} jobs, ${emailPatterns.length} email patterns discovered` },
      { sourceId: "synthesis",  sourceName: "AI Synthesis",      icon: Sparkles,    status: "complete", confidence: 88,                      dataPoints: timeline.length + keyTerms.length, durationMs: 800, summary: `${timeline.length} timeline events, ${keyTerms.length} key terms extracted` },
      { sourceId: "pitch",      sourceName: "Pitch Engine",      icon: Lightbulb,   status: "complete", confidence: 85,                      dataPoints: pitchAngles.length,       durationMs: 700,  summary: `${pitchAngles.length} pitch angles generated` },
    ];

    /* Category-level confidence */
    const categoryConfidence: Record<string, number> = {
      "Company Profile": Math.round((website.confidence + wiki.confidence) / 2),
      "Financial": Math.round((sec.confidence + crunchbase.confidence) / 2),
      "Technology": Math.round((github.confidence + 85) / 2),
      "People": Math.round((linkedin.confidence + 82) / 2),
      "Market Intelligence": Math.round((news.confidence + ph.confidence + reddit.confidence + hn.confidence) / 4),
      "Competitive": 80,
      "Enrichment": 82,
      "Synthesis": 88,
    };

    const baseConfidence = 78 + (hashCode(domain) % 18);

    const baseDossier: CompanyDossierData = {
      name, domain, industry, size,
      founded: randomFounded(domain),
      location: randomLocation(domain),
      revenue: randomRevenue(domain),
      description: generateDescription(name, industry, size),
      products, techStack, competitors, painPoints, decisionMakers, pitchAngles,
      researchDate: new Date().toISOString(),
      confidence: baseConfidence,
    };

    resolve({
      ...baseDossier,
      sourceConfidence: Object.fromEntries(dataSourceResults.map((r) => [r.sourceId, r.confidence])),
      categoryConfidence,
      dataSourceResults,
      websitePages: website.pages,
      githubRepos: github.repos,
      wikipedia: wiki.entry,
      secFilings: sec.filings,
      fundingRounds: crunchbase.rounds,
      linkedInProfiles: linkedin.profiles,
      newsArticles: news.articles,
      productHuntLaunches: ph.launches,
      redditMentions: reddit.mentions,
      hnMentions: hn.mentions,
      timeline,
      keyTerms,
      competitorDetails,
      jobPostings,
      emailPatterns,
      discoveredContacts: linkedin.profiles,
    });
  });
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
**Size:** ${d.size} employees  
**Founded:** ${d.founded}  
**Location:** ${d.location}  
**Revenue:** ${d.revenue}

${d.description}

---

## Data Source Confidence

| Source | Confidence | Status | Data Points |
|--------|-----------|--------|-------------|
${d.dataSourceResults.map((s) => `| ${s.sourceName} | ${s.confidence}% | ${s.status} | ${s.dataPoints} |`).join("\n")}

---

## Category Confidence

| Category | Score |
|----------|-------|
${Object.entries(d.categoryConfidence).map(([k, v]) => `| ${k} | ${v}% |`).join("\n")}

---

## Products & Services

${d.products.map((p) => `- **${p.name}** (${p.category})${p.pricing ? ` - ${p.pricing}` : ""}\n  ${p.description}`).join("\n")}

---

## Technology Stack

${d.techStack.map((t) => `- ${t}`).join("\n")}

---

## Key People

${d.decisionMakers.map((dm) => `- **${dm.name}** - ${dm.title} (${dm.department})\n  - Email: ${dm.emailPattern}\n  - LinkedIn: ${dm.linkedinUrl}\n  - Power Score: ${dm.powerScore}/10 | Tech Savviness: ${dm.techSavviness}/10`).join("\n\n")}

---

## Funding History

${d.fundingRounds.map((f) => `- **${f.round}**: ${f.amount} at ${f.valuation} valuation (${new Date(f.date).toLocaleDateString()})\n  - Lead: ${f.leadInvestor}\n  - Co-investors: ${f.investors.join(", ")}`).join("\n\n")}

---

## Competitive Landscape

| Competitor | Founded | Size | Revenue | Market Share | Threat |
|------------|---------|------|---------|--------------|--------|
${d.competitorDetails.map((c) => `| ${c.name} | ${c.founded} | ${c.size} | ${c.revenue} | ${c.marketShare} | ${c.threatLevel} |`).join("\n")}

---

## News Coverage

${d.newsArticles.map((a) => `- [${a.title}](${a.url}) - ${a.source} (${a.sentiment}) ${new Date(a.publishedAt).toLocaleDateString()}\n  > ${a.summary}`).join("\n\n")}

---

## Job Postings (${d.jobPostings.length})

${d.jobPostings.slice(0, 5).map((j) => `- **${j.title}** (${j.department}) - ${j.location}${j.remote ? " (Remote)" : ""}\n  ${j.seniority} · ${j.salaryRange} · Posted ${new Date(j.postedAt).toLocaleDateString()}`).join("\n")}

---

## Key Terms

${d.keyTerms.slice(0, 15).map((t) => `- **${t.term}** (${t.category}) - frequency ${t.frequency}`).join("\n")}

---

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
      </div>

      {/* Discovered Contacts */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1">
          <Briefcase className="w-3 h-3" /> Key Decision Makers
        </div>
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
      </div>

      {/* Job Postings */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1">
          <Radar className="w-3 h-3" /> Recent Job Postings ({dossier.jobPostings.length})
        </div>
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
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{dossier.location}</span>
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-md border text-[10px] font-bold ${confColor}`}>
            {dossier.confidence}% Confidence
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">{dossier.description}</p>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><Layers className="w-3 h-3" /> Industry</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.industry}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><Users className="w-3 h-3" /> Size</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.size}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><DollarSign className="w-3 h-3" /> Revenue</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.revenue}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1"><Calendar className="w-3 h-3" /> Founded</div>
            <div className="text-xs font-semibold text-slate-300">{dossier.founded}</div>
          </div>
        </div>

        <ReportExport dossier={dossier} />
      </div>

      {/* ====== Data Source Cards ====== */}
      <SectionCard icon={Radar} title="Data Sources" defaultOpen={false}>
        <div className="space-y-1.5">
          {dossier.dataSourceResults.map((r) => (
            <DataSourceCard key={r.sourceId} result={r} />
          ))}
        </div>
      </SectionCard>

      {/* ====== Category Confidence ====== */}
      <SectionCard icon={Shield} title="Confidence by Category" defaultOpen={false}>
        <div className="space-y-1.5">
          {Object.entries(dossier.categoryConfidence).map(([cat, score]) => (
            <ConfidenceBar key={cat} label={cat} score={score} />
          ))}
        </div>
      </SectionCard>

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
      </SectionCard>

      {/* ====== Reddit Mentions ====== */}
      <SectionCard icon={MessageSquare} title="Reddit Mentions" defaultOpen={false}>
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
      </SectionCard>

      {/* ====== Hacker News ====== */}
      <SectionCard icon={Hash} title="Hacker News" defaultOpen={false}>
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
      </SectionCard>

      {/* ====== Contact Enrichment ====== */}
      <SectionCard icon={UserCircle} title="Contact Enrichment & Hiring Signals">
        <ContactEnrichment dossier={dossier} />
      </SectionCard>

      {/* ====== Pitch Angles ====== */}
      <SectionCard icon={Lightbulb} title="Recommended Pitch Angles">
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
      </SectionCard>

      {/* ====== Pain Points ====== */}
      <SectionCard icon={AlertTriangle} title="Pain Points & Opportunities">
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
      </SectionCard>

      {/* ====== Products ====== */}
      <SectionCard icon={Boxes} title="Products & Services">
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
      </SectionCard>

      {/* ====== Website Pages ====== */}
      <SectionCard icon={Globe} title="Website Structure" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-1">
          {dossier.websitePages.map((pg) => (
            <div key={pg.path} className="flex items-center gap-1.5 p-1.5 rounded bg-[#0f172a] border border-white/[0.04]">
              <Globe className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
              <span className="text-[10px] text-slate-400">{pg.path}</span>
              <span className="text-[9px] text-slate-600 ml-auto">{pg.title}</span>
            </div>
          ))}
        </div>
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

  const startResearch = useCallback(async () => {
    if (!domain.trim()) return;
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    abortRef.current = false;
    setResearching(true);
    setCurrentStep(-1);
    setDossier(null);
    setExportOpen(false);

    for (let i = 0; i < researchSteps.length; i++) {
      if (abortRef.current) break;
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, researchSteps[i].delay));
    }

    if (!abortRef.current) {
      const result = await researchCompany(cleanDomain);
      setDossier(result);
      setCurrentStep(researchSteps.length);
      const updated = [result, ...savedDossiers].slice(0, 20);
      setSavedDossiers(updated);
      saveDossiers(updated);
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
          <p className="text-[11px] text-slate-500">Enter a company domain to generate a complete intelligence dossier from 13+ free data sources</p>
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
            {researchSteps.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <div key={step.name} className="flex items-center gap-3">
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
                  <span className={`text-xs ${i <= currentStep ? "text-slate-300" : "text-slate-600"}`}>{step.name}</span>
                  {i === currentStep && <span className="text-[10px] text-indigo-400 ml-auto">{step.status}</span>}
                </div>
              );
            })}
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
                  <div className="text-[10px] text-slate-600">{d.industry} · {d.size} employees</div>
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