import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Zap,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Filter,
  Search,
  Target,
  BarChart3,
  Lightbulb,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface PainPointTemplate {
  problem: string;
  evidence: string;
  solution: string;
  impact: string;
  confidence: number;
  messageAngle: string;
}

/* ------------------------------------------------------------------ */
/*  Pain point templates by industry                                    */
/* ------------------------------------------------------------------ */
const industryPainPoints: Record<string, PainPointTemplate[]> = {
  "B2B SaaS": [
    { problem: "High customer acquisition cost", evidence: "SaaS companies typically spend 30-50% of revenue on sales & marketing with diminishing returns", solution: "AI-powered outreach reduces CAC by 40% through intelligent prospect targeting and automated nurture sequences", impact: "High", confidence: 92, messageAngle: "Cut acquisition costs while scaling pipeline" },
    { problem: "Long enterprise sales cycles", evidence: "Enterprise SaaS sales cycles average 3-6 months with 5+ stakeholders involved", solution: "Multi-channel sequences nurture prospects automatically, keeping deals warm and reducing cycle time by 35%", impact: "High", confidence: 88, messageAngle: "Close enterprise deals 35% faster" },
    { problem: "Poor lead qualification", evidence: "61% of B2B marketers send all leads to sales, regardless of quality", solution: "Intent scoring engine qualifies leads using 50+ behavioral signals before they reach your sales team", impact: "High", confidence: 90, messageAngle: "Only talk to prospects ready to buy" },
    { problem: "Sales and marketing misalignment", evidence: "Misalignment costs companies 10% of revenue annually in wasted efforts", solution: "Unified prospect intelligence gives both teams the same real-time data on every lead", impact: "Medium", confidence: 85, messageAngle: "One source of truth for revenue teams" },
    { problem: "Inability to scale personalization", evidence: "Personalized outreach gets 2x replies but takes 4x longer to create manually", solution: "AI generates personalized messaging at scale using company research, social signals, and intent data", impact: "High", confidence: 93, messageAngle: "Personalize every touch without manual work" },
  ],
  "Healthcare": [
    { problem: "Fragmented patient data across systems", evidence: "Average hospital uses 16+ disconnected EHR platforms causing data silos", solution: "Unified data platform with HIPAA-compliant connectors to 100+ health systems", impact: "High", confidence: 94, messageAngle: "Unify patient data without compromising compliance" },
    { problem: "High administrative overhead", evidence: "Administrative costs consume 25% of healthcare revenue, diverting resources from patient care", solution: "Automation engine handles scheduling, billing, and follow-ups reducing admin time by 60%", impact: "High", confidence: 91, messageAngle: "Reclaim 25% of your revenue from admin overhead" },
    { problem: "Patient no-show rates", evidence: "Industry average no-show rate is 18%, costing the US healthcare system $150B annually", solution: "AI-powered reminder system with predictive rescheduling reduces no-shows by 40%", impact: "Medium", confidence: 87, messageAngle: "Cut no-shows and recover lost revenue" },
    { problem: "Regulatory compliance burden", evidence: "HIPAA violations cost $100K-$1.5M per incident and compliance audits take 200+ hours", solution: "Continuous compliance monitoring with automated documentation and breach detection", impact: "High", confidence: 96, messageAngle: "Stay compliant without the manual overhead" },
  ],
  "Fintech": [
    { problem: "Payment fraud losses", evidence: "Global payment fraud expected to reach $40B by 2027 with synthetic identity fraud up 85%", solution: "Real-time ML fraud detection with behavioral biometrics and transaction pattern analysis", impact: "High", confidence: 95, messageAngle: "Stop fraud before it happens" },
    { problem: "Complex compliance requirements", evidence: "PCI DSS compliance takes 6+ months and costs $50K-$200K annually for mid-size companies", solution: "Compliance-as-code platform automates evidence collection and continuous monitoring", impact: "High", confidence: 92, messageAngle: "Get compliant in weeks, not months" },
    { problem: "Customer churn due to poor UX", evidence: "68% of users abandon fintech apps after one bad experience, churn costs 5x acquisition", solution: "User journey analytics identify friction points before they cause abandonment", impact: "Medium", confidence: 88, messageAngle: "Keep users engaged with data-driven UX insights" },
    { problem: "Integration with legacy banking systems", evidence: "Average fintech uses 5+ banking APIs with 99.9% uptime requirements and inconsistent reliability", solution: "Unified banking API gateway with automatic failover and sandbox testing environment", impact: "Medium", confidence: 85, messageAngle: "Bank integrations that never go down" },
  ],
  "E-commerce": [
    { problem: "Cart abandonment", evidence: "Average cart abandonment rate is 70.19% across industries, mobile is even higher at 85.65%", solution: "Intelligent recovery sequences with personalized incentives based on cart value and behavior", impact: "High", confidence: 97, messageAngle: "Recover 30% of abandoned carts automatically" },
    { problem: "Customer acquisition cost inflation", evidence: "CAC has risen 60% in the last 5 years for DTC brands, with Facebook CPA up 200%", solution: "AI-powered lookalike audience generation across emerging channels reduces CPA by 45%", impact: "High", confidence: 93, messageAngle: "Fight rising ad costs with smarter targeting" },
    { problem: "Inventory mismanagement", evidence: "Overstocking costs retailers $1.75T annually globally while stockouts cost 4% of revenue", solution: "Predictive inventory engine uses demand forecasting and seasonality to optimize stock levels", impact: "Medium", confidence: 89, messageAngle: "Never overstock or stock out again" },
    { problem: "Returns processing costs", evidence: "Return rates average 20-30% for online purchases, processing each return costs $10-$20", solution: "Smart sizing recommendations and virtual try-on reduce returns by 25% before purchase", impact: "Medium", confidence: 86, messageAngle: "Cut return rates with pre-purchase intelligence" },
  ],
  "EdTech": [
    { problem: "Low course completion rates", evidence: "MOOC completion rates average only 3-6%, paid courses fare slightly better at 15-20%", solution: "Adaptive learning paths with gamification and spaced repetition boost completion to 65%+", impact: "High", confidence: 93, messageAngle: "Turn dropouts into graduates" },
    { problem: "Student engagement decay", evidence: "Student engagement drops 40% after week 3 in online courses across all demographics", solution: "AI tutor provides personalized interventions when engagement drops, with nudges and peer matching", impact: "High", confidence: 90, messageAngle: "Keep learners engaged through week 12 and beyond" },
    { problem: "Content personalization gap", evidence: "78% of educators say one-size-fits-all content is their biggest challenge in online teaching", solution: "Content adaptation engine personalizes difficulty, format, and pacing to each learner's profile", impact: "Medium", confidence: 87, messageAngle: "Teach every student at their level" },
    { problem: "Credential verification fraud", evidence: "Fake credentials cost employers $5B annually in bad hires, manual verification takes 2-4 weeks", solution: "Blockchain-verified credentials with instant employer verification API", impact: "Medium", confidence: 84, messageAngle: "Fraud-proof credentials in seconds" },
  ],
  "Developer Tools": [
    { problem: "Developer onboarding friction", evidence: "New developers take 3-6 months to reach full productivity, costing $50K-$100K per hire", solution: "AI-powered onboarding with interactive codebase tours and contextual documentation", impact: "High", confidence: 91, messageAngle: "New devs ship code in week 1, not month 3" },
    { problem: "Tool fragmentation", evidence: "Average developer uses 8-12 different tools daily, context switching kills 40% of productive time", solution: "Unified developer platform integrates code, CI/CD, observability, and collaboration in one interface", impact: "Medium", confidence: 88, messageAngle: "One platform, not twelve tabs" },
    { problem: "CI/CD pipeline failures", evidence: "22% of deployments fail due to environment inconsistencies, flaky tests cost 10hrs/week per team", solution: "Deterministic build environment with intelligent test selection and automatic rollback", impact: "High", confidence: 90, messageAngle: "Deploy with confidence, rollback instantly" },
    { problem: "Documentation rot", evidence: "60% of internal docs are outdated within 3 months, causing repeated questions and wrong decisions", solution: "Auto-updating documentation synced from code with AI-generated explanations and examples", impact: "Low", confidence: 82, messageAngle: "Docs that update themselves" },
  ],
  "Marketing Tech": [
    { problem: "Data silos across channels", evidence: "Marketers waste 21% of budget due to poor data integration and incomplete customer views", solution: "Unified customer data platform with real-time identity resolution and 200+ connectors", impact: "High", confidence: 94, messageAngle: "See every customer touch in one place" },
    { problem: "Attribution complexity", evidence: "Only 17% of marketers are confident in their attribution models, 78% use last-click", solution: "Multi-touch attribution with ML-powered incrementality testing and marketing mix modeling", impact: "High", confidence: 92, messageAngle: "Know what actually drives revenue" },
    { problem: "Ad fatigue and banner blindness", evidence: "Average click-through rate for display ads is 0.35%, ad blocking costs publishers $54B", solution: "Creative optimization engine tests 100s of variants and predicts fatigue before it happens", impact: "Medium", confidence: 89, messageAngle: "Ads that stay fresh and convert" },
    { problem: "Privacy regulation compliance", evidence: "GDPR fines exceeded EUR2B in 2023, iOS 14.5 reduced attribution accuracy by 50%", solution: "Privacy-first measurement using cohort analysis, server-side tracking, and consent management", impact: "High", confidence: 95, messageAngle: "Measure everything, stay compliant" },
  ],
  Cybersecurity: [
    { problem: "Alert fatigue in SOC teams", evidence: "SOC teams receive 4,000+ alerts daily, 67% are false positives, burnout rate is 70%", solution: "AI alert triage reduces false positives by 85% and auto-resolves known threat patterns", impact: "High", confidence: 96, messageAngle: "Cut alert noise, catch real threats" },
    { problem: "Critical talent shortage", evidence: "3.5M cybersecurity jobs will be unfilled by 2025, average time to fill is 6 months", solution: "Autonomous threat response handles 80% of incidents without human intervention", impact: "High", confidence: 94, messageAngle: "Do more security with fewer people" },
    { problem: "Mean time to detect breaches", evidence: "Average breach detection time is 287 days, containment takes another 80 days", solution: "Behavioral analytics detect anomalies in real-time with automated containment playbooks", impact: "High", confidence: 93, messageAngle: "Detect breaches in minutes, not months" },
    { problem: "Cloud misconfiguration risks", evidence: "65% of cloud security incidents are due to misconfiguration, Gartner predicts 99% through 2025", solution: "Continuous configuration monitoring with automatic remediation and compliance drift detection", impact: "Medium", confidence: 91, messageAngle: "Secure cloud configs, automatically" },
  ],
  "HR Tech": [
    { problem: "Time-to-hire increasing", evidence: "Average time-to-hire reached 44 days in 2024, up from 36 days in 2019", solution: "AI-powered candidate sourcing and screening reduces time-to-hire by 50%", impact: "High", confidence: 92, messageAngle: "Hire great people in half the time" },
    { problem: "Candidate ghosting", evidence: "67% of recruiters report increased candidate ghosting, especially at the offer stage", solution: "Automated candidate engagement with personalized touchpoints and predictive churn alerts", impact: "Medium", confidence: 88, messageAngle: "Stop candidates from disappearing" },
    { problem: "Employee engagement decline", evidence: "Only 15% of global employees feel engaged, disengagement costs $7.8T globally in lost productivity", solution: "Continuous engagement analytics with personalized action plans for managers", impact: "High", confidence: 90, messageAngle: "Build teams that actually care" },
    { problem: "Onboarding inefficiency", evidence: "Poor onboarding leads to 50% higher turnover in the first year, costing 1.5-2x salary per lost employee", solution: "Structured onboarding automation with milestone tracking and buddy matching", impact: "Medium", confidence: 87, messageAngle: "New hires productive on day 3, not day 30" },
  ],
};

const allIndustries = Object.keys(industryPainPoints);

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function PainPointAnalyzer() {
  const [selectedIndustry, setSelectedIndustry] = useState("B2B SaaS");
  const [filterImpact, setFilterImpact] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const painPoints = industryPainPoints[selectedIndustry] || [];

  const filtered = useMemo(() => {
    return painPoints.filter((pp) => {
      const matchImpact = filterImpact === "All" || pp.impact === filterImpact;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        pp.problem.toLowerCase().includes(q) ||
        pp.evidence.toLowerCase().includes(q) ||
        pp.solution.toLowerCase().includes(q);
      return matchImpact && matchSearch;
    });
  }, [painPoints, filterImpact, searchQuery]);

  const impactCounts = useMemo(() => {
    const counts: Record<string, number> = { All: painPoints.length, High: 0, Medium: 0, Low: 0 };
    painPoints.forEach((pp) => { counts[pp.impact] = (counts[pp.impact] || 0) + 1; });
    return counts;
  }, [painPoints]);

  function impactBadgeClasses(impact: string): string {
    switch (impact) {
      case "High": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "Medium": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "Low": return "text-slate-400 bg-slate-500/10 border-slate-500/20";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100">Pain Point Analyzer</h2>
          <p className="text-[11px] text-slate-500">Industry-specific pain points mapped to SquidWeave solutions</p>
        </div>
      </div>

      {/* Industry Selector */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Target className="w-3 h-3" />
          Select Industry
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allIndustries.map((ind) => (
            <button
              key={ind}
              onClick={() => { setSelectedIndustry(ind); setExpandedIndex(0); }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                selectedIndustry === ind
                  ? "bg-indigo-500 text-white"
                  : "bg-[#0f172a] text-slate-400 border border-white/[0.06] hover:border-white/[0.12] hover:text-slate-300"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Filter className="w-3 h-3" />
          <span>Filter:</span>
        </div>
        {(["All", "High", "Medium", "Low"] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilterImpact(level)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
              filterImpact === level
                ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
                : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
            }`}
          >
            {level} ({impactCounts[level]})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <Search className="w-3 h-3 text-slate-600" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pain points..."
            className="text-[11px] px-2 py-1 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-indigo-500 w-40"
          />
        </div>
      </div>

      {/* Pain Point Cards */}
      <div className="space-y-2">
        {filtered.map((pp, i) => {
          const expanded = expandedIndex === i;
          return (
            <div
              key={pp.problem}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-colors"
            >
              <button
                onClick={() => setExpandedIndex(expanded ? null : i)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${impactBadgeClasses(pp.impact)}`}>
                  {pp.impact}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{pp.problem}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <BarChart3 className="w-3 h-3" />
                    {pp.confidence}%
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </button>

              {expanded && (
                <div className="px-3 pb-3 space-y-2.5">
                  {/* Evidence */}
                  <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Industry Evidence</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{pp.evidence}</p>
                  </div>

                  {/* SquidWeave Solution */}
                  <div className="p-2.5 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/15">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">SquidWeave Solution</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{pp.solution}</p>
                  </div>

                  {/* Suggested Messaging */}
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
                    <Lightbulb className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Suggested Messaging</div>
                      <p className="text-[11px] text-slate-400 italic">&ldquo;{pp.messageAngle}&rdquo;</p>
                    </div>
                  </div>

                  {/* Confidence indicator */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pp.confidence >= 90 ? "bg-emerald-500" : pp.confidence >= 80 ? "bg-amber-500" : "bg-slate-500"
                        }`}
                        style={{ width: `${pp.confidence}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <CheckCircle2 className="w-3 h-3" />
                      {pp.confidence}% match confidence
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <div className="text-xs text-slate-500">No pain points match your filters</div>
        </div>
      )}

      {/* Stats footer */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
          <div className="text-lg font-bold text-rose-400">{painPoints.filter((p) => p.impact === "High").length}</div>
          <div className="text-[10px] text-slate-500">High Impact</div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
          <div className="text-lg font-bold text-amber-400">{painPoints.filter((p) => p.impact === "Medium").length}</div>
          <div className="text-[10px] text-slate-500">Medium Impact</div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
          <div className="text-lg font-bold text-slate-400">{Math.round(painPoints.reduce((acc, p) => acc + p.confidence, 0) / (painPoints.length || 1))}%</div>
          <div className="text-[10px] text-slate-500">Avg Confidence</div>
        </div>
      </div>
    </div>
  );
}
