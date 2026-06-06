import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Cpu,
  Users,
  GitBranch,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyProfile {
  name: string;
  domain: string;
  industry: string;
  employeeCount: string;
  revenue: string;
  founded: string;
  location: string;
}

interface DecisionMaker {
  name: string;
  title: string;
  department: string;
}

interface SimilarCompany {
  name: string;
  industry: string;
  employeeCount: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = "sw_domain_intel";

interface StoredIntel {
  techStack: string[];
  decisionMakers: DecisionMaker[];
  similarCompanies: SimilarCompany[];
  company: CompanyProfile;
  timestamp: number;
}

function loadStoredIntel(): StoredIntel | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s) as StoredIntel;
  } catch { /* silent */ }
  return null;
}

function saveStoredIntel(data: StoredIntel) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* silent */ }
}

// ─── Data generation helpers ──────────────────────────────────────────────────

function deriveTechStack(industry: string): string[] {
  const lower = industry.toLowerCase();
  const base = ["React", "Node.js", "AWS", "Docker", "PostgreSQL"];

  if (lower.includes("saas") || lower.includes("software")) {
    return [...base, "TypeScript", "Stripe", "Redis", "Kubernetes", "Terraform"];
  }
  if (lower.includes("e-commerce") || lower.includes("retail")) {
    return [...base, "Shopify", "Stripe", "Elasticsearch", "Kafka", "Tailwind CSS"];
  }
  if (lower.includes("finance") || lower.includes("fintech")) {
    return [...base, "Python", "TensorFlow", "Apache Spark", "Vault", "Datadog"];
  }
  if (lower.includes("health") || lower.includes("medical")) {
    return [...base, "Python", "Django", "FHIR", "AWS HIPAA", "Snowflake"];
  }
  if (lower.includes("marketing") || lower.includes("agency")) {
    return [...base, "Next.js", "HubSpot", "Segment", "Amplitude", "Figma"];
  }
  if (lower.includes("education") || lower.includes("edtech")) {
    return [...base, "Next.js", "MongoDB", "WebRTC", "Stripe", "Vercel"];
  }
  return [...base, "GraphQL", "Prisma", "Vercel", "GitHub Actions"];
}

function deriveDecisionMakers(targetCustomer: string, companyName: string): DecisionMaker[] {
  const deptMap: Record<string, string[]> = {
    sales: ["VP of Sales", "Sales Director", "Chief Revenue Officer", "Head of Business Development"],
    marketing: ["CMO", "VP of Marketing", "Marketing Director", "Head of Growth"],
    engineering: ["CTO", "VP of Engineering", "Engineering Director", "Head of Product"],
    product: ["CPO", "VP of Product", "Product Director", "Head of Product Strategy"],
    operations: ["COO", "VP of Operations", "Operations Director"],
    finance: ["CFO", "VP of Finance", "Finance Director"],
    hr: ["Chief People Officer", "VP of HR", "Talent Director"],
  };

  const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Dakota", "Reese"];
  const lastNames = ["Chen", "Rodriguez", "Patel", "Kim", "Singh", "Nakamura", "Okafor", "Ivanov", "Silva", "Tanaka"];

  const lowerTarget = targetCustomer.toLowerCase();
  let departments = ["sales", "marketing", "engineering", "product"];

  for (const key of Object.keys(deptMap)) {
    if (lowerTarget.includes(key)) {
      departments = [key, ...departments.filter((d) => d !== key)];
      break;
    }
  }

  const roles: { title: string; department: string }[] = [];
  for (const dept of departments.slice(0, 3)) {
    const titles = deptMap[dept] || deptMap.sales;
    roles.push(...titles.slice(0, 2).map((t) => ({ title: t, department: dept })));
  }

  const companyInitials = companyName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return roles.slice(0, 5).map((r, i) => {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const suffix = i >= firstNames.length ? ` ${i + 1}` : "";
    return {
      name: `${fn}${suffix} ${ln} (${companyInitials})`,
      title: r.title,
      department: r.department.charAt(0).toUpperCase() + r.department.slice(1),
    };
  });
}

function deriveSimilarCompanies(industry: string): SimilarCompany[] {
  const companyNames: Record<string, SimilarCompany[]> = {
    saas: [
      { name: "Notion Labs", industry: "SaaS", employeeCount: "400+" },
      { name: "Linear", industry: "SaaS", employeeCount: "150+" },
      { name: "Figma", industry: "Design SaaS", employeeCount: "800+" },
      { name: "Vercel", industry: "DevTools SaaS", employeeCount: "300+" },
    ],
    marketing: [
      { name: "HubSpot", industry: "Marketing Tech", employeeCount: "7,000+" },
      { name: "Sprout Social", industry: "Social Media", employeeCount: "800+" },
      { name: "Hootsuite", industry: "Social Media", employeeCount: "1,000+" },
      { name: "Buffer", industry: "Marketing SaaS", employeeCount: "80+" },
    ],
    finance: [
      { name: "Stripe", industry: "FinTech", employeeCount: "8,000+" },
      { name: "Plaid", industry: "FinTech", employeeCount: "600+" },
      { name: "Brex", industry: "FinTech", employeeCount: "1,200+" },
      { name: "Mercury", industry: "Banking Tech", employeeCount: "300+" },
    ],
    health: [
      { name: "Teladoc", industry: "HealthTech", employeeCount: "4,000+" },
      { name: "Calm", industry: "Wellness", employeeCount: "200+" },
      { name: "Headspace", industry: "Mental Health", employeeCount: "300+" },
      { name: "Lyra Health", industry: "HealthTech", employeeCount: "1,000+" },
    ],
    eCommerce: [
      { name: "Shopify", industry: "E-Commerce", employeeCount: "10,000+" },
      { name: "BigCommerce", industry: "E-Commerce", employeeCount: "1,500+" },
      { name: "WooCommerce", industry: "E-Commerce", employeeCount: "300+" },
      { name: "Squarespace", industry: "Website Builder", employeeCount: "1,200+" },
    ],
  };

  const lower = industry.toLowerCase();
  if (lower.includes("saas") || lower.includes("software")) return companyNames.saas;
  if (lower.includes("market") || lower.includes("agency")) return companyNames.marketing;
  if (lower.includes("finance") || lower.includes("fintech") || lower.includes("bank"))
    return companyNames.finance;
  if (lower.includes("health") || lower.includes("medical") || lower.includes("wellness"))
    return companyNames.health;
  if (lower.includes("e-commerce") || lower.includes("retail") || lower.includes("shop"))
    return companyNames.eCommerce;

  return [
    { name: "TechCorp Global", industry: `${industry} Tech`, employeeCount: "500+" },
    { name: "Innovate Partners", industry, employeeCount: "250+" },
    { name: "NextGen Solutions", industry: `${industry} Solutions`, employeeCount: "150+" },
    { name: "Summit Ventures", industry: `${industry} Services`, employeeCount: "400+" },
  ];
}

function buildCompanyProfile(
  businessName: string,
  website: string,
  industry: string,
): CompanyProfile {
  const domain = website
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0] || "unknown.com";
  const foundedYear = 2008 + (businessName.length % 12);
  const employeeRanges = ["10-50", "50-200", "200-500", "500-1,000", "1,000-5,000", "5,000+"];
  const empIdx = (businessName.length + industry.length) % employeeRanges.length;
  const revenues = ["$1M-$5M", "$5M-$25M", "$25M-$100M", "$100M-$500M", "$500M+"];
  const revIdx = empIdx % revenues.length;
  const locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "London, UK", "Remote-first", "Toronto, ON", "Berlin, DE"];
  const locIdx = (domain.length + industry.length) % locations.length;

  return {
    name: businessName,
    domain,
    industry: industry || "Technology",
    employeeCount: employeeRanges[empIdx] || "50-200",
    revenue: revenues[revIdx] || "$5M-$25M",
    founded: String(foundedYear),
    location: locations[locIdx] || "San Francisco, CA",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DomainIntelligence() {
  const { state } = useApp();
  const { businessProfile, campaign } = state;

  const company = useMemo<CompanyProfile>(() => {
    if (businessProfile.businessName) {
      return buildCompanyProfile(
        businessProfile.businessName,
        businessProfile.website,
        businessProfile.industry,
      );
    }
    // Fallback from campaign
    const campName = (campaign?.name as string) || "Your Company";
    return buildCompanyProfile(campName, "https://example.com", "Technology");
  }, [businessProfile, campaign]);

  // Load from localStorage or generate
  const [techStack, setTechStack] = useState<string[]>([]);
  const [decisionMakers, setDecisionMakers] = useState<DecisionMaker[]>([]);
  const [similarCompanies, setSimilarCompanies] = useState<SimilarCompany[]>([]);

  useEffect(() => {
    const stored = loadStoredIntel();
    if (stored && stored.company.name === company.name) {
      setTechStack(stored.techStack);
      setDecisionMakers(stored.decisionMakers);
      setSimilarCompanies(stored.similarCompanies);
    } else {
      const ts = deriveTechStack(company.industry);
      const dm = deriveDecisionMakers(businessProfile.targetCustomer, company.name);
      const sc = deriveSimilarCompanies(company.industry);
      setTechStack(ts);
      setDecisionMakers(dm);
      setSimilarCompanies(sc);
      saveStoredIntel({
        techStack: ts,
        decisionMakers: dm,
        similarCompanies: sc,
        company,
        timestamp: Date.now(),
      });
    }
  }, [company.name, company.industry, businessProfile.targetCustomer]);

  return (
    <div className="space-y-4 pt-3">
      {/* Company Profile Card */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-3">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-sm font-semibold text-slate-100">{company.name}</div>
            <div className="text-[10px] text-slate-500">
              {company.domain} · {company.industry}
            </div>
          </div>
          <div className="ml-auto text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {company.employeeCount} employees
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500">Revenue:</span>{" "}
            <span className="text-slate-300">{company.revenue}</span>
          </div>
          <div>
            <span className="text-slate-500">Founded:</span>{" "}
            <span className="text-slate-300">{company.founded}</span>
          </div>
          <div>
            <span className="text-slate-500">Location:</span>{" "}
            <span className="text-slate-300">{company.location}</span>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4" /> Tech Stack
        </div>
        <div className="flex flex-wrap gap-1.5">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="text-[10px] px-2 py-1 rounded-full border border-white/[0.1] text-slate-300 bg-white/[0.04]"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Decision Makers */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Decision Makers
        </div>
        <div className="space-y-2">
          {decisionMakers.map((dm) => (
            <div
              key={dm.name}
              className="flex items-center gap-3 p-2 rounded-lg border border-white/[0.06] bg-white/[0.03]"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300 font-medium shrink-0">
                {dm.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 truncate">{dm.name}</div>
                <div className="text-[10px] text-slate-500">{dm.title}</div>
              </div>
              <div className="text-[10px] text-slate-500 shrink-0">{dm.department}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Similar Companies */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> Similar Companies
        </div>
        <div className="grid grid-cols-2 gap-2">
          {similarCompanies.map((sc) => (
            <div
              key={sc.name}
              className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors"
            >
              <div className="text-xs text-slate-300">{sc.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {sc.industry} · {sc.employeeCount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
