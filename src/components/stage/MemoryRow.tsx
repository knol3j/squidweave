import { useState } from "react";
import {
  Brain,
  BookOpen,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

function Empty({ message }: { message: string }) {
  return (
    <div className="p-6 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <p className="text-xs text-slate-600">{message}</p>
    </div>
  );
}

export function MemoryRow() {
  const { stageData } = useApp();
  const { memoryRecall, playbooks, targetProfiles } = stageData;
  const recall = memoryRecall as any;
  const playbooks = (playbooks as any[]) || [];
  const profiles = (targetProfiles as any[]) || [];

  const [tab, setTab] = useState<"recall" | "playbooks" | "profiles">("recall");

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-1" role="tablist">
        {[
          { key: "recall" as const, label: "Recall", icon: Brain },
          { key: "playbooks" as const, label: "Playbooks", icon: BookOpen },
          { key: "profiles" as const, label: "Profiles", icon: Users },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            role="tab"
            aria-selected={tab === t.key}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={
              tab === t.key
                ? { background: "rgba(139,92,246,0.15)", color: "#c4b5fd" }
                : { color: "#475569" }
            }
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "recall" && (
        <div className="pt-3">
          {!recall?.targetProfile && !recall?.semanticMemories ? (
            <Empty message="No memory recall data yet" />
          ) : (
            <div className="space-y-3">
              {recall.targetProfile && (
                <div className="p-3 rounded-lg border border-white/[0.06] bg-[#0f172a]">
                  <div className="text-xs font-medium mb-2 text-violet-300">
                    Target Profile
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-600">Company:</span>{" "}
                      <span className="text-slate-100">
                        {recall.targetProfile.company}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Contact:</span>{" "}
                      <span className="text-slate-100">
                        {recall.targetProfile.contactName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Segment:</span>{" "}
                      <span className="text-slate-100">
                        {recall.targetProfile.segment}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Channel:</span>{" "}
                      <span className="text-slate-100">
                        {recall.targetProfile.preferredChannel}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {recall.episodicMemories && (
                <div className="grid grid-cols-3 gap-2">
                  {["researchRecords", "outreachEvents", "decisions"].map(
                    (k) => (
                      <div
                        key={k}
                        className="p-2.5 rounded-lg border border-white/[0.06] bg-[#0f172a] text-center"
                      >
                        <div className="text-lg font-semibold text-violet-300">
                          {(recall.episodicMemories as any)?.[k]?.length || 0}
                        </div>
                        <div className="text-[10px] capitalize text-slate-600">
                          {k.replace(/([A-Z])/g, " $1")}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
              {recall.semanticMemories?.tacticObservations && (
                <div>
                  <div className="text-xs font-medium mb-1.5 text-slate-400">
                    Tactic Observations (
                    {recall.semanticMemories.tacticObservations?.length || 0})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {recall.semanticMemories.tacticObservations
                      .slice(0, 10)
                      .map((obs: any, i: number) => (
                        <div
                          key={i}
                          className="text-[10px] p-2 rounded bg-white/[0.02] text-slate-400"
                        >
                          {obs.channel || obs.tactic || "Observation"}:{" "}
                          <span className="text-slate-100">
                            {obs.outcome ||
                              obs.rationale ||
                              JSON.stringify(obs).slice(0, 120)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "playbooks" && (
        <div className="pt-3">
          {playbooks.length === 0 ? (
            <Empty message="No playbooks in memory" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar">
              {playbooks.map((pb: any) => (
                <div
                  key={pb.id}
                  className="p-3 rounded-lg border border-white/[0.06] bg-[#0f172a]"
                >
                  <div className="text-xs font-medium text-slate-100">
                    {pb.segment} &middot; {pb.region}
                  </div>
                  <div className="text-[10px] mt-1 text-slate-600">
                    {pb.recommendedChannel} &middot; {pb.cadenceDays}d cadence
                  </div>
                  <div className="flex gap-3 mt-2">
                    <div>
                      <div className="text-[10px] text-slate-600">Win</div>
                      <div className="text-sm font-semibold text-emerald-400">
                        {(pb.winRate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600">Risk</div>
                      <div className="text-sm font-semibold text-rose-400">
                        {(pb.riskRate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600">Conf</div>
                      <div className="text-sm font-semibold text-indigo-300">
                        {(pb.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  {pb.rationale && (
                    <div className="text-[10px] mt-2 line-clamp-2 text-slate-600">
                      {pb.rationale}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "profiles" && (
        <div className="pt-3">
          {profiles.length === 0 ? (
            <Empty message="No target profiles" />
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-1.5 px-2 font-medium text-slate-600">
                      Company
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-slate-600">
                      Contact
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-slate-600">
                      Segment
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-slate-600">
                      Fit
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.slice(0, 40).map((p: any) => (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.02] border-b border-white/[0.03]"
                    >
                      <td className="py-1.5 px-2 text-slate-100">
                        {p.company}
                      </td>
                      <td className="py-1.5 px-2 text-slate-400">
                        {p.contactName || "\u2014"}
                      </td>
                      <td className="py-1.5 px-2 text-slate-400">
                        {p.segment}
                      </td>
                      <td className="py-1.5 px-2">
                        {p.fitScore != null && (
                          <div className="w-10 h-1 rounded-full overflow-hidden bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${p.fitScore}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
