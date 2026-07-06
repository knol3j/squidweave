import { useApp } from "@/context/AppContext";
import { Lock, Check, Loader2 } from "lucide-react";

export function StepperSidebar() {
  const { stages } = useApp();
  return (
    <div className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-20 space-y-0.5">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{
                background: s.unlocked
                  ? s.completed
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(99,102,241,0.15)"
                  : "rgba(255,255,255,0.04)",
                color: s.unlocked
                  ? s.completed
                    ? "#34d399"
                    : "#a5b4fc"
                  : "#475569",
              }}
            >
              {s.completed ? (
                <Check className="w-3 h-3" />
              ) : s.unlocked ? (
                i + 1
              ) : (
                <Lock className="w-3 h-3" />
              )}
            </div>
            <div className="min-w-0">
              <div
                className="text-[11px] font-medium truncate"
                style={{ color: s.unlocked ? "#e2e8f0" : "#475569" }}
              >
                {s.label}
              </div>
              <div className="text-[9px] text-slate-700">
                {s.completed
                  ? "Done"
                  : s.unlocked
                    ? "In Progress"
                    : "Locked"}
              </div>
            </div>
            {s.running && (
              <Loader2 className="w-3 h-3 text-violet-400 animate-spin ml-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
