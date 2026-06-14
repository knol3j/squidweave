import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lock, CheckCircle, Play, Circle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { StageStatus } from "@/context/AppContext";

const ACCENTS: Record<number, string> = {
  0: "#6366f1", 1: "#06b6d4", 2: "#f59e0b", 3: "#f43f5e", 4: "#10b981", 5: "#8b5cf6",
};

const ICONS: Record<StageStatus, React.ReactNode> = {
  locked: <Lock className="w-3 h-3" />,
  ready: <Circle className="w-3 h-3" />,
  active: <Play className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
};

export default function StageRow({
  stageId, title, summary, children,
}: {
  stageId: number;
  title: string;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const { state, setActiveStage } = useApp();
  const { stages, activeStage } = state;
  const stage = stages[stageId];
  const isExpanded = activeStage === stageId;
  const isLocked = stage?.status === "locked";
  const accent = ACCENTS[stageId];

  return (
    <motion.div
      layout
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: isExpanded ? "rgba(8,17,31,0.95)" : "rgba(8,17,31,0.6)",
        borderColor: isExpanded ? `${accent}25` : "rgba(255,255,255,0.04)",
        borderLeft: `3px solid ${isLocked ? "rgba(255,255,255,0.04)" : isExpanded ? accent : `${accent}50`}`,
        boxShadow: isExpanded ? `0 0 30px -10px ${accent}15, 0 8px 32px rgba(2,6,23,0.4)` : "none",
      }}
    >
      <button
        onClick={() => !isLocked && setActiveStage(isExpanded ? -1 : stageId)}
        disabled={isLocked}
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${isLocked ? "cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.02]"}`}>
        {/* Status indicator */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: isLocked ? "rgba(255,255,255,0.04)" : `${accent}15`,
            color: isLocked ? "#475569" : accent,
          }}>
          {ICONS[stage?.status || "locked"]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isLocked ? "text-slate-700" : "text-slate-100"}`}>{title}</span>
            <StatusBadge status={stage?.status || "locked"} accent={accent} />
          </div>
          {!isExpanded && <div className="mt-0.5 text-xs text-slate-600">{summary}</div>}
        </div>

        {!isLocked && (
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}
            className="text-slate-600">
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && !isLocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusBadge({ status, accent }: { status: StageStatus; accent: string }) {
  const map: Record<StageStatus, { bg: string; text: string; label: string }> = {
    locked:    { bg: "rgba(255,255,255,0.04)", text: "#475569", label: "Locked" },
    ready:     { bg: `${accent}15`, text: accent, label: "Ready" },
    active:    { bg: `${accent}20`, text: `${accent}cc`, label: "Active" },
    completed: { bg: "rgba(16,185,129,0.1)", text: "#34d399", label: "Done" },
  };
  const s = map[status];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide"
      style={{ background: s.bg, color: s.text }}>{s.label}</span>
  );
}
