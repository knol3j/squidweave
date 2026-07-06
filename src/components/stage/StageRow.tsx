import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lock, Loader2 } from "lucide-react";
import type { StageInfo } from "@/context/AppContext";

interface Props {
  stage: StageInfo;
  children: React.ReactNode;
}

export function StageRow({ stage, children }: Props) {
  const [isExpanded, setIsExpanded] = useState(stage.unlocked);
  const contentRef = useRef<HTMLDivElement>(null);

  const stageId = `stage-${stage.id}`;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        borderColor: stage.unlocked
          ? stage.completed
            ? "rgba(16,185,129,0.15)"
            : "rgba(99,102,241,0.12)"
          : "rgba(255,255,255,0.04)",
        background: stage.unlocked
          ? stage.completed
            ? "rgba(16,185,129,0.03)"
            : "rgba(99,102,241,0.03)"
          : "rgba(255,255,255,0.02)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => stage.unlocked && setIsExpanded(!isExpanded)}
        disabled={!stage.unlocked}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`stage-content-${stageId}`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: stage.unlocked
              ? stage.completed
                ? "rgba(16,185,129,0.15)"
                : "rgba(99,102,241,0.15)"
              : "rgba(255,255,255,0.04)",
          }}
        >
          {stage.running ? (
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
          ) : stage.unlocked ? (
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{
                color: stage.completed ? "#34d399" : "#a5b4fc",
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          ) : (
            <Lock className="w-4 h-4 text-slate-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: stage.unlocked ? "#e2e8f0" : "#475569" }}
            >
              {stage.label}
            </span>
            {stage.completed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                Done
              </span>
            )}
            {stage.running && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">
                Running
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5 truncate">
            {stage.unlocked ? stage.description : `Complete ${stage.dependsOn} to unlock`}
          </p>
        </div>

        {!stage.unlocked && (
          <Lock className="w-4 h-4 text-slate-700 shrink-0" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && stage.unlocked && (
          <motion.div
            id={`stage-content-${stageId}`}
            ref={contentRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
