import { useState } from "react";
import {
  Boxes,
  Cpu,
  Users,
  Target,
  AlertTriangle,
  UserCircle,
  Lightbulb,
  Calendar,
  Shield,
  MapPin,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Layers,
  Zap,
  Award,
  MessageSquare,
  Globe,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Type definitions                                                    */
/* ------------------------------------------------------------------ */
export interface Product {
  name: string;
  description: string;
  category: string;
  pricing?: string;
}

export interface Competitor {
  name: string;
  domain: string;
  overlap: string;
  threatLevel: string;
}

export interface PainPoint {
  problem: string;
  evidence: string;
  impact: string;
  confidence: number;
}

export interface DecisionMaker {
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

export interface PitchAngle {
  title: string;
  angle: string;
  targetPersona: string;
  keyMessage: string;
  expectedOutcome: string;
  priority: number;
}

export interface CompanyDossierData {
  name: string;
  domain: string;
  industry: string;
  size: string;
  founded: string;
  location: string;
  revenue: string;
  description: string;
  products: Product[];
  techStack: string[];
  competitors: Competitor[];
  painPoints: PainPoint[];
  decisionMakers: DecisionMaker[];
  pitchAngles: PitchAngle[];
  researchDate: string;
  confidence: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function impactColor(impact: string): string {
  switch (impact) {
    case "High": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    case "Medium": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "Low": return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

function threatColor(level: string): string {
  switch (level) {
    case "High": return "text-rose-400";
    case "Medium": return "text-amber-400";
    case "Low": return "text-emerald-400";
    default: return "text-slate-400";
  }
}

function confidenceBadgeColor(score: number): string {
  if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 80) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-slate-400 bg-slate-500/10 border-slate-500/20";
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                     */
/* ------------------------------------------------------------------ */
function Section({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
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

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */
export default function CompanyDossier({ dossier }: { dossier: CompanyDossierData }) {
  const dateStr = new Date(dossier.researchDate).toLocaleString();
  const confColor =
    dossier.confidence >= 90
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : dossier.confidence >= 80
        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-slate-400 bg-slate-500/10 border-slate-500/20";

  return (
    <div className="space-y-3">
      {/* ====== 1. Executive Summary ====== */}
      <div className="p-4 rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.04] to-transparent">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-white/[0.08] flex items-center justify-center text-lg font-bold text-slate-300">
              {dossier.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{dossier.name}</h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {dossier.domain}
                </span>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {dossier.location}
                </span>
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-md border text-[10px] font-bold ${confColor}`}>
            {dossier.confidence}% Confidence
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">{dossier.description}</p>

        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
              <Layers className="w-3 h-3" /> Industry
            </div>
            <div className="text-xs font-semibold text-slate-300">{dossier.industry}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
              <Users className="w-3 h-3" /> Size
            </div>
            <div className="text-xs font-semibold text-slate-300">{dossier.size}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
              <DollarSign className="w-3 h-3" /> Revenue
            </div>
            <div className="text-xs font-semibold text-slate-300">{dossier.revenue}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
              <Calendar className="w-3 h-3" /> Founded
            </div>
            <div className="text-xs font-semibold text-slate-300">{dossier.founded}</div>
          </div>
        </div>
      </div>

      {/* ====== 2. Products & Services ====== */}
      <Section icon={Boxes} title="Products & Services">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dossier.products.map((p) => (
            <div
              key={p.name}
              className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06] hover:border-indigo-500/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                {p.pricing && (
                  <span className="text-[10px] text-emerald-400 font-medium">{p.pricing}</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mb-1.5">{p.description}</div>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                {p.category}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ====== 3. Tech Stack ====== */}
      <Section icon={Cpu} title="Technology Stack">
        <div className="flex flex-wrap gap-1.5">
          {dossier.techStack.map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-[#0f172a] text-slate-400 border border-white/[0.06]"
            >
              {tech}
            </span>
          ))}
        </div>
      </Section>

      {/* ====== 4. Competitive Landscape ====== */}
      <Section icon={Target} title="Competitive Landscape">
        <div className="space-y-1.5">
          {dossier.competitors.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]"
            >
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300">{c.name}</div>
                <div className="text-[10px] text-slate-600 flex items-center gap-1">
                  <span>{c.domain}</span>
                  <span>&middot;</span>
                  <span>Overlap: {c.overlap}</span>
                </div>
              </div>
              <div className={`text-[10px] font-bold ${threatColor(c.threatLevel)}`}>{c.threatLevel} Threat</div>
              <a
                href={`https://${c.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </Section>

      {/* ====== 5. Pain Points & Opportunities ====== */}
      <Section icon={AlertTriangle} title="Pain Points & Opportunities">
        <div className="space-y-2">
          {dossier.painPoints.map((pp, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06]"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${impactColor(pp.impact)}`}>
                  {pp.impact} Impact
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${confidenceBadgeColor(pp.confidence)}`}>
                  {pp.confidence}% Confidence
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-300 mb-1">{pp.problem}</div>
              <div className="text-[10px] text-slate-500">{pp.evidence}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ====== 6. Decision Makers ====== */}
      <Section icon={UserCircle} title="Target Contacts">
        <div className="space-y-2">
          {dossier.decisionMakers.map((dm, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                  {dm.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200">{dm.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {dm.title} &middot; {dm.department}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600">Power</div>
                    <div className="w-12 h-1.5 rounded-full bg-white/[0.06] mt-0.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${dm.powerScore * 10}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600">Tech</div>
                    <div className="w-12 h-1.5 rounded-full bg-white/[0.06] mt-0.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${dm.techSavviness * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center gap-2 text-[10px] text-slate-500">
                <MessageSquare className="w-3 h-3 text-slate-600" />
                <span className="text-slate-400">Best channel:</span>
                <span className="text-indigo-400 font-medium">{dm.bestChannel}</span>
                <span className="text-slate-600 mx-1">|</span>
                <span className="truncate">{dm.emailPattern}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ====== 7. Pitch Angles ====== */}
      <Section icon={Lightbulb} title="Recommended Pitch Angles">
        <div className="space-y-2">
          {dossier.pitchAngles.map((pa) => (
            <div
              key={pa.title}
              className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    pa.priority === 1
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : pa.priority === 2
                        ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        : "bg-slate-500/10 text-slate-500 border border-slate-500/10"
                  }`}
                >
                  {pa.priority}
                </div>
                <span className="text-xs font-semibold text-slate-200">{pa.title}</span>
                <span className="ml-auto text-[10px] text-slate-600 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {pa.expectedOutcome}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mb-1.5 leading-relaxed">{pa.angle}</div>
              <div className="flex items-start gap-1.5">
                <Award className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="text-[10px] text-slate-500">
                  <span className="text-slate-400 font-medium">Target:</span> {pa.targetPersona}
                </div>
              </div>
              <div className="mt-1.5 p-2 rounded bg-white/[0.03] border border-white/[0.04]">
                <div className="text-[10px] text-slate-500 italic leading-relaxed">&ldquo;{pa.keyMessage}&rdquo;</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ====== 8. Research Metadata ====== */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.01]">
        <Shield className="w-3 h-3 text-slate-600" />
        <span className="text-[10px] text-slate-600">
          Research conducted on {dateStr} &middot; Confidence score: {dossier.confidence}% &middot; Powered by SquidWeave AI
        </span>
        <Sparkles className="w-3 h-3 text-indigo-500/50 ml-auto" />
      </div>
    </div>
  );
}
