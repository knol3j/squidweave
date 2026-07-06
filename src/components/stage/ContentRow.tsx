import { useState } from "react";
import { Palette, Sparkles, Check, X, ShieldCheck, AlertTriangle, FileCheck, MessageSquare, ThumbsUp, ThumbsDown, Send, Languages, ClipboardList, Mail, Thermometer, GitCompare, Code2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { PitchOption } from "@/context/AppContext";
import EmailIntelligence from "@/components/funnel/EmailIntelligence";
import EmailWarming from "@/components/funnel/EmailWarming";
import ABTestingEngine from "@/components/funnel/ABTestingEngine";
import CodeParser from "@/components/funnel/CodeParser";

export default function ContentRow() {
  const { state, toggleApproval, approveVariant, rejectVariant, approvePitch, rejectPitch, generatePitches } = useApp();
  const { campaign, approvals, pitches, businessProfile } = state;
  const [tab, setTabRaw] = useState<"pitches" | "email" | "warming" | "abtest" | "code">(() => {
    try { const s = localStorage.getItem("sw_tab_content"); return (s as any) || "pitches"; } catch { return "pitches"; }
  });
  const setTab = (t: "pitches" | "email" | "warming" | "abtest" | "code") => {
    setTabRaw(t);
    try { localStorage.setItem("sw_tab_content", t); } catch { /* silent */ }
  };
  const [generating, setGenerating] = useState(false);
  const [activePitchTab, setActivePitchTab] = useState<string | null>(null);
  const pack = campaign?.latestContentPack;
  const palette = campaign?.designPalette || [];
  const angles = campaign?.contentAngles || [];

  const hasApprovedPitch = pitches.some(p => p.status === "approved");
  const draftPitches = pitches.filter(p => p.status === "draft");

  const handleGenerate = async () => {
    setGenerating(true);
    try { await generatePitches(); }
    catch (err: any) { console.error("Generate failed:", err); }
    finally { setGenerating(false); }
  };

  const handleApprovePitch = (id: string) => {
    approvePitch(id);
    if (!approvals.contentApproved) toggleApproval("contentApproved");
  };

  const tabs = [
    { key: "pitches" as const, label: "Pitches", icon: MessageSquare },
    { key: "email" as const, label: "Email Intel", icon: Mail },
    { key: "warming" as const, label: "Warming", icon: Thermometer },
    { key: "abtest" as const, label: "A/B Test", icon: GitCompare },
    { key: "code" as const, label: "Code", icon: Code2 },
  ];

  return (
    <div className="space-y-4 pt-3">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1" role="tablist">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} role="tab" aria-selected={tab === t.key}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={tab === t.key ? { background: "rgba(244,63,94,0.12)", color: "#fb7185" } : { color: "#475569" }}>
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {tab === "pitches" && (<>
      {/* Master Approval Banner */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${hasApprovedPitch ? "border-emerald-500/20" : "border-amber-500/20"}`}
        style={{ background: hasApprovedPitch ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)" }}>
        {hasApprovedPitch ? <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
        <div className="flex-1">
          <div className={`text-xs font-medium ${hasApprovedPitch ? "text-emerald-400" : "text-amber-400"}`}>
            {hasApprovedPitch ? "Pitch Approved for Launch" : "Select a Pitch to Approve"}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            {hasApprovedPitch
              ? "Your chosen pitch is ready. Proceed to Launch stage."
              : "Review the generated pitch options below and approve your favorite."}
          </div>
        </div>
      </div>

      {/* Generate Pitches Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          <MessageSquare className="w-3 h-3 inline mr-1" />
          Pitches: <span className="text-slate-100">{pitches.length}</span>
          {hasApprovedPitch && <span className="text-emerald-400 ml-2">(1 approved)</span>}
        </div>
        <button onClick={handleGenerate} disabled={generating || !businessProfile.businessName}
          className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", color: "#fff" }}>
          {generating ? <Sparkles className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {generating ? "Agents Writing..." : draftPitches.length > 0 ? "Generate More" : "Generate Pitches"}
        </button>
      </div>

      {/* Agent Studio Output Panel */}
      {state.brainState?.contentPacks?.length > 0 && (
        <div className="p-4 rounded-2xl border border-fuchsia-500/15 bg-fuchsia-500/[0.04]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-fuchsia-300">Agent Studio Output</span>
          </div>
          <div className="space-y-2">
            {(state.brainState.contentPacks[state.brainState.contentPacks.length - 1]?.variants || []).length > 0 ? (
              (state.brainState.contentPacks[state.brainState.contentPacks.length - 1]?.variants || []).slice(0, 3).map((variant: any, i: number) => (
                <div key={i} className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200">{variant.locale}</span>
                    <span className="text-[10px] text-slate-500">{variant.channel || campaign?.channel || 'email'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{variant.cta || variant.subject}</div>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] text-center">
                <div className="text-xs text-slate-400">{state.brainState.contentPacks.length} content pack(s) generated</div>
                <div className="text-[10px] text-slate-600 mt-1">Variants pending LLM connector configuration</div>
                <div className="text-[10px] text-slate-600">Configure OpenClaw in Outreach → Connectors to enable content generation</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pitch Gallery */}
      {draftPitches.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">Agent-Generated Pitch Options</div>
          {draftPitches.map((pitch: PitchOption) => (
            <PitchCard key={pitch.id} pitch={pitch} isActive={activePitchTab === pitch.id}
              onToggle={() => setActivePitchTab(activePitchTab === pitch.id ? null : pitch.id)}
              onApprove={() => handleApprovePitch(pitch.id)}
              onReject={() => rejectPitch(pitch.id)} />
          ))}
        </div>
      )}

      {pitches.length === 0 && (
        <div className="py-6 text-center">
          <MessageSquare className="w-8 h-8 mx-auto text-slate-700 mb-2" />
          <p className="text-xs text-slate-600">No pitches generated yet.</p>
          <p className="text-[10px] text-slate-700 mt-1">
            {businessProfile.businessName
              ? "Click 'Generate Pitches' to have agents write options for you."
              : "Fill in your Business Profile in Stage 1 first."}
          </p>
        </div>
      )}

      {/* Approved Pitch Display */}
      {hasApprovedPitch && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Approved Pitch</span>
          </div>
          {pitches.filter(p => p.status === "approved").map(pitch => (
            <div key={pitch.id}>
              <div className="text-xs font-semibold text-slate-100 mb-1">{pitch.title}</div>
              <div className="text-[10px] text-slate-500 mb-1">Subject: <span className="text-slate-300">{pitch.subject}</span></div>
              <div className="text-[11px] text-slate-300 whitespace-pre-line mb-2">{pitch.body}</div>
              <div className="text-[10px] font-medium text-amber-300">CTA: {pitch.cta}</div>
              <div className="flex gap-2 mt-2 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">{pitch.angle}</span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{pitch.tone}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">{pitch.targetSegment}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Pack Variants (from backend) */}
      {pack?.variants && pack.variants.length > 0 && (
        <div className="border-t border-white/[0.04] pt-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Backend Content Variants</div>
          <VariantList variants={pack.variants} approvals={approvals} onApprove={approveVariant} onReject={rejectVariant} />
        </div>
      )}

      {/* Locale Conversions Panel */}
      {campaign?.locales && campaign.locales.length > 0 && (
        <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-sky-300">Locale Conversions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {campaign.locales.map((loc: string) => (
              <span key={loc} className="text-xs px-2.5 py-1 rounded-full border border-sky-500/30 text-sky-300 bg-sky-500/10">
                {loc}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-2">Source locale: {campaign.sourceLocale || 'en-US'}</div>
        </div>
      )}

      {/* Campaign Checklist */}
      <div className="p-3 rounded-xl border border-white/[0.06]" style={{ background: "#0a121f" }}>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-3">
          <FileCheck className="w-3 h-3" /> Campaign Checklist
        </div>
        <div className="space-y-2">
          <CheckItem label="I have reviewed the campaign name, objective, and audience" checked={approvals.campaignReviewed} onToggle={() => toggleApproval("campaignReviewed")} />
          <CheckItem label="I have selected and approved a pitch for outreach" checked={hasApprovedPitch} onToggle={() => {}} readOnly />
          <CheckItem label="I have reviewed the design theme, palette, and guidelines" checked={!!campaign?.designTheme} onToggle={() => {}} readOnly={!campaign?.designTheme} />
        </div>
      </div>

      {/* Design System */}
      {campaign?.designTheme && (
        <div className="pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
            <Palette className="w-3 h-3" /> Design System
          </div>
          <div className="text-[10px] text-slate-500 mb-1">Theme: <span className="text-slate-200">{campaign.designTheme}</span></div>
          {campaign.designGuidelines?.length > 0 && (
            <ul className="space-y-0.5 mb-2">
              {campaign.designGuidelines.map((g: string, i: number) => <li key={i} className="text-[10px] text-slate-600">\u2022 {g}</li>)}
            </ul>
          )}
          {palette.length > 0 && (
            <div className="flex gap-1.5">
              {palette.map((c: string, i: number) => <div key={i} className="w-5 h-5 rounded-full border border-white/20" style={{ background: c }} title={c} />)}
            </div>
          )}
        </div>
      )}

      {angles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] font-medium text-slate-600">Angles:</span>
          {angles.map((a: string, i: number) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">{a}</span>)}
        </div>
      )}

      {/* Setup Requirements Panel */}
      {state.setupRequirements && (
        <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Setup Requirements</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Live Connector Env</div>
              <div className="flex flex-wrap gap-1.5">
                {(state.setupRequirements.environment?.requiredForLiveConnectors || []).map((item: string) => (
                  <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{item}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Accepted Outreach Events</div>
              <div className="flex flex-wrap gap-1.5">
                {(state.setupRequirements.outreachEventTypes || []).map((item: string) => (
                  <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </>)}

      {tab === "email" && <EmailIntelligence />}

      {tab === "warming" && <EmailWarming />}

      {tab === "abtest" && <ABTestingEngine />}

      {tab === "code" && <CodeParser />}
    </div>
  );
}

function PitchCard({ pitch, isActive, onToggle, onApprove, onReject }: {
  pitch: PitchOption; isActive: boolean; onToggle: () => void; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className={`rounded-xl border transition-all overflow-hidden ${isActive ? "border-rose-500/25" : "border-white/[0.06]"}`}
      style={{ background: isActive ? "rgba(244,63,94,0.04)" : "#0f172a" }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-400">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-100">{pitch.title}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">{pitch.angle} \u00b7 {pitch.tone} tone \u00b7 {pitch.targetSegment}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onApprove(); }} aria-label="Approve pitch"
            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onReject(); }} aria-label="Reject pitch"
            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </button>
      {isActive && (
        <div className="px-4 pb-3 border-t border-white/[0.04]">
          <div className="pt-3 space-y-2">
            <div>
              <div className="text-[10px] font-medium text-slate-600 mb-0.5">Subject Line</div>
              <div className="text-xs text-slate-200 font-medium">{pitch.subject}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-slate-600 mb-0.5">Body</div>
              <div className="text-[11px] text-slate-400 whitespace-pre-line leading-relaxed">{pitch.body}</div>
            </div>
            <div className="flex items-center gap-2">
              <Send className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-medium text-amber-300">{pitch.cta}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VariantList({ variants, approvals, onApprove, onReject }: { variants: any[]; approvals: any; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {variants.map((v: any, i: number) => {
        const isApproved = approvals.approvedVariantIds.includes(v.id);
        return (
          <div key={v.id || i} className={`p-3 rounded-xl border transition-all ${isApproved ? "border-emerald-500/20" : "border-white/[0.06]"}`}
            style={{ background: isApproved ? "rgba(16,185,129,0.04)" : "#0f172a" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">{v.locale || "en"}</span>
              <span className="text-[10px] text-slate-600">{v.channel || "\u2014"}</span>
              <span className="text-[10px] ml-auto" style={{ color: isApproved ? "#34d399" : "#475569" }}>{isApproved ? "Approved" : v.status || "draft"}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-100 mb-1">{v.subject || v.headline || "No subject"}</div>
            <div className="text-[10px] text-slate-500 line-clamp-2">{v.body || v.preheader || "No body"}</div>
            <div className="flex gap-2 pt-1.5 mt-1.5 border-t border-white/[0.04]">
              <button onClick={() => onApprove(v.id)} disabled={isApproved}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded font-medium ${isApproved ? "opacity-40" : "hover:opacity-80"}`}
                style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                <Check className="w-2.5 h-2.5" /> {isApproved ? "Approved" : "Approve"}
              </button>
              <button onClick={() => onReject(v.id)}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded font-medium hover:opacity-80"
                style={{ background: "rgba(244,63,94,0.1)", color: "#fb7185" }}>
                <X className="w-2.5 h-2.5" /> Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CheckItem({ label, checked, onToggle, readOnly }: { label: string; checked: boolean; onToggle: () => void; readOnly?: boolean }) {
  return (
    <button onClick={readOnly ? undefined : onToggle}
      className={`flex items-start gap-2 w-full text-left transition-opacity ${readOnly ? "opacity-40 cursor-default" : "cursor-pointer hover:bg-white/[0.02]"}`}>
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${checked ? "bg-emerald-500 border-emerald-500" : "border-slate-600 bg-transparent"}`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-[11px] leading-5 ${checked ? "text-slate-300 line-through" : "text-slate-400"}`}>{label}</span>
    </button>
  );
}
