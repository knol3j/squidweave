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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DomainIntelligence() {
  const { state } = useApp();
  const { businessProfile } = state;

  const company = useMemo<CompanyProfile>(() => {
    return {
      name: businessProfile.businessName || "",
      domain: businessProfile.website
        ? businessProfile.website
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .split("/")[0]
        : "",
      industry: businessProfile.industry || "",
      employeeCount: "",
      revenue: "",
      founded: "",
      location: "",
    };
  }, [businessProfile.businessName, businessProfile.website, businessProfile.industry]);

  // Load from localStorage only — no fabricated data
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
      setTechStack([]);
      setDecisionMakers([]);
      setSimilarCompanies([]);
    }
  }, [company.name]);

  return (
    <div className="space-y-4 pt-3">
      {/* Company Profile Card */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-3">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-sm font-semibold text-slate-100">
              {company.name || "Your Company"}
            </div>
            <div className="text-[10px] text-slate-500">
              {company.domain || "No website set"} \u00b7 {company.industry || "No industry set"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs">
          {businessProfile.productDescription && (
            <div>
              <span className="text-slate-500">Product:</span>{" "}
              <span className="text-slate-300">{businessProfile.productDescription}</span>
            </div>
          )}
          {businessProfile.targetCustomer && (
            <div>
              <span className="text-slate-500">Target Customer:</span>{" "}
              <span className="text-slate-300">{businessProfile.targetCustomer}</span>
            </div>
          )}
          {businessProfile.valueProposition && (
            <div>
              <span className="text-slate-500">Value Proposition:</span>{" "}
              <span className="text-slate-300">{businessProfile.valueProposition}</span>
            </div>
          )}
          {businessProfile.goals && (
            <div>
              <span className="text-slate-500">Goals:</span>{" "}
              <span className="text-slate-300">{businessProfile.goals}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4" /> Tech Stack
        </div>
        {techStack.length === 0 ? (
          <div className="text-center py-4">
            <Cpu className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <div className="text-xs text-slate-400 font-medium">No tech stack data</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Tech stack analysis requires BuiltWith or SimilarTech API integration.
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Decision Makers */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Decision Makers
        </div>
        {decisionMakers.length === 0 ? (
          <div className="text-center py-4">
            <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <div className="text-xs text-slate-400 font-medium">No decision maker data</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Decision maker discovery requires LinkedIn Sales Navigator or ZoomInfo.
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Similar Companies */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> Similar Companies
        </div>
        {similarCompanies.length === 0 ? (
          <div className="text-center py-4">
            <GitBranch className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <div className="text-xs text-slate-400 font-medium">No similar company data</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Similar company data requires Crunchbase or PitchBook API.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {similarCompanies.map((sc) => (
              <div
                key={sc.name}
                className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors"
              >
                <div className="text-xs text-slate-300">{sc.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {sc.industry} \u00b7 {sc.employeeCount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
