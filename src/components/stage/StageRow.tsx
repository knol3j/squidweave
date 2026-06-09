import { memo, useRef, useEffect } from "react";
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

// Scroll position storage per stage
function saveScroll(stageId: number, pos: number) {
  try { sessionStorage.setItem(`sw_scroll_${stageId}`, String(pos)); } catch { /* silent */ }
}
function loadScroll(stageId: number): number {
  try { const s = sessionStorage.getItem(`sw_scroll_${stageId}`); return s ? parseInt(s, 10) : 0; } catch { return 0; }
}

const StageRow = memo(function StageRow({
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
  const contentRef = useRef<HTMLDivElement>(null);

  // Restore scroll position when expanding
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const saved = loadScroll(stageId);
      if (saved > 0) {
        contentRef.current.scrollTop = saved;
      }
    }
  }, [isExpanded, stageId]);

  // Save scroll position when collapsing or unmounting
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handler = () => saveScroll(stageId, el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => { el.removeEventListener("scroll", handler); };
  }, [stageId, isExpanded]);

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        background: isExpanded ? "rgba(8,17,31,0.95)" : "rgba(8,17,31,0.6)",
        borderColor: isExpanded ? `${accent}25` : "rgba(255,255,255,0.04)",
        borderLeft: `3px solid ${isLocked ? "rgba(255,255,255,0.04)" : isExpanded ? accent : `${accent}50`}`,
        boxShadow: isExpanded ? `0 0 30px -10px ${accent}15, 0 8px 32px rgba(2,6,23,0.4)` : "none",
        willChange: "transform",
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

      <AnimatePresence initial={false}>
        {isExpanded && !isLocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              ref={contentRef}
              className="px-5 pb-4 border-t border-white/[0.04] overflow-y-auto max-h-[70vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default StageRow;

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
