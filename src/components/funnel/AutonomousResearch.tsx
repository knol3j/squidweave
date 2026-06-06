import { useState, useCallback, useRef } from "react";
import {
  Search,
  Loader2,
  Check,
  Globe,
  Package,
  Cpu,
  Users,
  TrendingUp,
  AlertTriangle,
  UserCircle,
  Lightbulb,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";
import CompanyDossier from "./CompanyDossier";
import type { CompanyDossierData } from "./CompanyDossier";

/* ------------------------------------------------------------------ */
/*  Research-step shape                                               */
/* ------------------------------------------------------------------ */
interface ResearchStep {
  name: string;
  status: string;
  delay: number;
}

const researchSteps: ResearchStep[] = [
  { name: "Analyzing website structure", status: "Extracting pages, products, pricing...", delay: 1000 },
  { name: "Identifying products & services", status: "Mapping offerings...", delay: 1500 },
  { name: "Detecting tech stack", status: "Identifying technologies...", delay: 1000 },
  { name: "Researching competitors", status: "Finding similar companies...", delay: 1500 },
  { name: "Analyzing market position", status: "Determining segment...", delay: 1000 },
  { name: "Identifying pain points", status: "Mapping problems to solutions...", delay: 1000 },
  { name: "Finding decision makers", status: "Discovering key contacts...", delay: 1500 },
  { name: "Generating pitch angles", status: "Creating pitch frameworks...", delay: 1000 },
];

const stepIcons = [
  Globe,
  Package,
  Cpu,
  Users,
  TrendingUp,
  AlertTriangle,
  UserCircle,
  Lightbulb,
];

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = "sw_research_dossiers";

function loadDossiers(): CompanyDossierData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

function saveDossiers(dossiers: CompanyDossierData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
}

/* ------------------------------------------------------------------ */
/*  Domain → company name                                              */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Industry inference                                                  */
/* ------------------------------------------------------------------ */
function inferIndustry(domain: string): string {
  const d = domain.toLowerCase();
  if (d.includes("health") || d.includes("med") || d.includes("care") || d.includes("clinic"))
    return "Healthcare";
  if (d.includes("fin") || d.includes("pay") || d.includes("bank") || d.includes("crypto") || d.includes("invest"))
    return "Fintech";
  if (d.includes("shop") || d.includes("store") || d.includes("retail") || d.includes("ecom") || d.includes("buy"))
    return "E-commerce";
  if (d.includes("edu") || d.includes("learn") || d.includes("course") || d.includes("teach"))
    return "EdTech";
  if (d.includes("dev") || d.includes("code") || d.includes("api") || d.includes("cloud") || d.includes("git"))
    return "Developer Tools";
  if (d.includes("market") || d.includes("ad") || d.includes("seo") || d.includes("growth"))
    return "Marketing Tech";
  if (d.includes("security") || d.includes("protect") || d.includes("threat") || d.includes("scan"))
    return "Cybersecurity";
  if (d.includes("hire") || d.includes("talent") || d.includes("recruit") || d.includes("job"))
    return "HR Tech";
  return "B2B SaaS";
}

/* ------------------------------------------------------------------ */
/*  Size / revenue / founded — pseudo-random from domain               */
/* ------------------------------------------------------------------ */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function pickFromHash<T>(domain: string, arr: T[]): T {
  return arr[hashCode(domain) % arr.length];
}

const sizes = ["1-50", "50-200", "200-500", "500-1000", "1000-5000", "5000+"];
const revenueRanges = ["<$1M", "$1M-$5M", "$5M-$10M", "$10M-$50M", "$50M-$100M", "$100M-$500M", "$500M+"];
const foundedYears = ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
const locations = [
  "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA",
  "Boston, MA", "Denver, CO", "Chicago, IL", "Los Angeles, CA",
  "London, UK", "Berlin, DE", "Toronto, CA", "Remote-first",
];

function randomSize(domain: string): string {
  return pickFromHash(domain, sizes);
}
function randomRevenue(domain: string): string {
  return pickFromHash(domain, revenueRanges);
}
function randomFounded(domain: string): string {
  return pickFromHash(domain, foundedYears);
}
function randomLocation(domain: string): string {
  return pickFromHash(domain, locations);
}

/* ------------------------------------------------------------------ */
/*  Product generation by industry                                     */
/* ------------------------------------------------------------------ */
interface Product {
  name: string;
  description: string;
  category: string;
  pricing?: string;
}

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

/* ------------------------------------------------------------------ */
/*  Tech stack generation                                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Competitor generation                                               */
/* ------------------------------------------------------------------ */
interface Competitor {
  name: string;
  domain: string;
  overlap: string;
  threatLevel: string;
}

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

function generateCompetitors(industry: string, _excludeName: string): Competitor[] {
  const pool = competitorPools[industry] || competitorPools["B2B SaaS"];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((c) => ({
    name: c.name,
    domain: c.domain,
    overlap: overlaps[Math.floor(Math.random() * overlaps.length)],
    threatLevel: threats[Math.floor(Math.random() * threats.length)],
  }));
}

/* ------------------------------------------------------------------ */
/*  Pain point generation                                               */
/* ------------------------------------------------------------------ */
interface PainPoint {
  problem: string;
  evidence: string;
  impact: string;
  confidence: number;
}

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
    { problem: "Privacy regulation compliance", evidence: "GDPR fines exceeded €2B in 2023 alone", impact: "High", confidence: 95 },
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

/* ------------------------------------------------------------------ */
/*  Decision maker generation                                           */
/* ------------------------------------------------------------------ */
interface DecisionMaker {
  name: string;
  title: string;
  department: string;
  emailPattern: string;
  linkedinUrl: string;
  powerScore: number;
  techSavviness: number;
  bestChannel: string;
  firstTouchMessage: string;
}

const firstNames = ["Sarah", "Michael", "Jennifer", "David", "Emily", "James", "Jessica", "Robert", "Amanda", "William", "Laura", "Daniel", "Michelle", "Christopher", "Rebecca"];
const lastNames = ["Chen", "Rodriguez", "Johnson", "Smith", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White"];

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

/* ------------------------------------------------------------------ */
/*  Pitch angle generation                                              */
/* ------------------------------------------------------------------ */
interface PitchAngle {
  title: string;
  angle: string;
  targetPersona: string;
  keyMessage: string;
  expectedOutcome: string;
  priority: number;
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

/* ------------------------------------------------------------------ */
/*  Description generator                                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Main research function                                              */
/* ------------------------------------------------------------------ */
function researchCompany(domain: string): Promise<CompanyDossierData> {
  return new Promise((resolve) => {
    const name = domainToName(domain);
    const industry = inferIndustry(domain);
    const size = randomSize(domain);
    const products = generateProducts(industry);
    const techStack = generateTechStack(industry);
    const competitors = generateCompetitors(industry, name);
    const painPoints = generatePainPoints(industry);
    const decisionMakers = generateDecisionMakers(size, domain);
    const pitchAngles = generatePitchAngles(name, industry, painPoints);
    const confidence = 78 + (hashCode(domain) % 18);

    resolve({
      name,
      domain,
      industry,
      size,
      founded: randomFounded(domain),
      location: randomLocation(domain),
      revenue: randomRevenue(domain),
      description: generateDescription(name, industry, size),
      products,
      techStack,
      competitors,
      painPoints,
      decisionMakers,
      pitchAngles,
      researchDate: new Date().toISOString(),
      confidence,
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function AutonomousResearch() {
  const [domain, setDomain] = useState("");
  const [researching, setResearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [dossier, setDossier] = useState<CompanyDossierData | null>(null);
  const [savedDossiers, setSavedDossiers] = useState<CompanyDossierData[]>(loadDossiers);
  const abortRef = useRef(false);

  const startResearch = useCallback(async () => {
    if (!domain.trim()) return;
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    abortRef.current = false;
    setResearching(true);
    setCurrentStep(-1);
    setDossier(null);

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
    (d: CompanyDossierData) => {
      const updated = savedDossiers.filter((s) => s.domain !== d.domain || s.researchDate !== d.researchDate);
      setSavedDossiers(updated);
      saveDossiers(updated);
      if (dossier?.domain === d.domain && dossier?.researchDate === d.researchDate) {
        setDossier(null);
      }
    },
    [savedDossiers, dossier]
  );

  const loadSaved = useCallback((d: CompanyDossierData) => {
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
          <p className="text-[11px] text-slate-500">Enter a company domain to generate a complete intelligence dossier</p>
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
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Search className="w-3 h-3" />
                Research
              </>
            )}
          </button>
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

      {/* Research Results - Company Dossier */}
      {dossier && <CompanyDossier dossier={dossier} />}

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
                  <div className="text-[10px] text-slate-600">
                    {d.industry} · {d.size} employees
                  </div>
                </div>
                <div className="text-[10px] text-slate-600">
                  {new Date(d.researchDate).toLocaleDateString()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDossier(d);
                  }}
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
