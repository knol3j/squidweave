import { Check, Lock, Building2, Database, Users, MessageSquare, Send, Brain } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { StageStatus } from "@/context/AppContext";

const ACCENT_MAP: Record<number, string> = {
  0: "#6366f1", 1: "#06b6d4", 2: "#f59e0b", 3: "#f43f5e", 4: "#10b981", 5: "#8b5cf6",
};

const STAGE_ICONS = [Building2, Database, Users, MessageSquare, Send, Brain];
const LABELS = ["Setup", "Research", "Targets", "Pitches", "Launch", "Learn"];
const DESC = ["Business Profile", "Agent Research", "Target Markets", "Pitch Gallery", "Outreach", "Memory"];

function StageDot({ status, accent, num }: { status: StageStatus; accent: string; num: number }) {
  if (status === "completed") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center relative z-10"
        style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 12px rgba(16,185,129,0.4)" }}>
        <Check className="w-4 h-4 text-white" strokeWidth={3} />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center relative z-10 animate-pulse"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 0 16px ${accent}60, 0 0 4px ${accent}` }}>
        <span className="text-white text-xs font-bold">{num}</span>
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 relative z-10"
        style={{ borderColor: accent, background: `${accent}18` }}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/[0.08] relative z-10 bg-[#0a121f]">
      <Lock className="w-3.5 h-3.5 text-slate-700" />
    </div>
  );
}

export default function StepperSidebar() {
  const { state, setActiveStage } = useApp();
  const { stages, activeStage, approvals, pendingSafetyCount } = state;

  const openGates = [
    approvals.contentApproved,
    approvals.emailSendingEnabled,
    approvals.safetyAcknowledged,
  ].filter(Boolean).length;

  return (
    <div className="w-56 shrink-0 border-r border-white/[0.06] p-4 hidden md:flex flex-col gap-0 overflow-y-auto custom-scrollbar"
      style={{ background: "linear-gradient(180deg, #060e1a 0%, #08111f 100%)" }}>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 px-2 text-slate-700">Pipeline</div>

      {stages.map((stage, i) => {
        const clickable = stage.status !== "locked";
        const isActive = activeStage === stage.id;
        const accent = ACCENT_MAP[stage.id];
        const Icon = STAGE_ICONS[stage.id];

        return (
          <div key={stage.id} className="relative">
            {/* Connecting line */}
            {i < stages.length - 1 && (
              <div className="absolute left-[15px] top-[32px] w-[2px] h-[calc(100%+8px)]"
                style={{
                  background: stage.status === "completed"
                    ? `linear-gradient(180deg, ${accent}80, ${ACCENT_MAP[stage.id + 1]}80)`
                    : "rgba(255,255,255,0.04)",
                }} />
            )}

            <button
              onClick={() => clickable && setActiveStage(stage.id)}
              disabled={!clickable}
              className={`flex items-center gap-3 w-full px-2 py-2 rounded-xl text-left transition-all
                ${clickable ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-not-allowed"}
                ${isActive ? "bg-white/[0.04]" : ""}`}>
              <StageDot status={stage.status} accent={accent} num={stage.id + 1} />
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-[11px] truncate ${isActive ? "text-slate-100" : stage.status === "locked" ? "text-slate-700" : "text-slate-400"}`}>
                  {LABELS[stage.id]}
                </div>
                <div className="text-[10px] truncate flex items-center gap-1" style={{ color: stage.status === "locked" ? "#334155" : "#475569" }}>
                  <Icon className="w-2.5 h-2.5" />{DESC[stage.id]}
                </div>
              </div>
              {stage.status === "completed" && <span className="text-[9px] font-medium text-emerald-500/60 ml-1 shrink-0">Done</span>}
              {stage.status === "ready" && <span className="text-[9px] font-medium text-indigo-400/60 ml-1 shrink-0">Ready</span>}
              {stage.status === "locked" && <span className="text-[9px] font-medium text-slate-700 ml-1 shrink-0">Locked</span>}
            </button>
          </div>
        );
      })}

      {/* Send Gates Summary */}
      <div className="mt-4 mx-2 p-3 rounded-xl border border-white/[0.06]" style={{ background: "rgba(15,23,42,0.6)" }}>
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2">Send Gates</div>
        <div className="space-y-1.5">
          {[
            { label: "Content", ok: approvals.contentApproved, color: "#f43f5e" },
            { label: "Email", ok: approvals.emailSendingEnabled, color: "#10b981" },
            { label: "Safety", ok: approvals.safetyAcknowledged, color: "#8b5cf6" },
          ].map(g => (
            <div key={g.label} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{g.label}</span>
              <span className="text-[10px] font-semibold" style={{ color: g.ok ? g.color : "#475569" }}>
                {g.ok ? "OPEN" : "CLOSED"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">Progress</span>
            <span className="text-[10px] font-semibold" style={{ color: openGates === 3 ? "#34d399" : "#fbbf24" }}>{openGates}/3</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] mt-1">
            <div className="h-full rounded-full transition-all" style={{ width: `${(openGates / 3) * 100}%`, background: openGates === 3 ? "#10b981" : "#f59e0b" }} />
          </div>
        </div>
        {pendingSafetyCount > 0 && (
          <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
            {pendingSafetyCount} pending approval{pendingSafetyCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
