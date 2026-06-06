import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
// All data comes from AppContext — real API calls, zero mock data

const STAGES = [
  { id: 0, name: "Setup",    accent: "#6366f1", angle: 270, label: "Campaign" },
  { id: 1, name: "Research", accent: "#06b6d4", angle: 210, label: "Research" },
  { id: 2, name: "Targets",  accent: "#f59e0b", angle: 150, label: "Targets" },
  { id: 3, name: "Pitches",  accent: "#f43f5e", angle: 30,  label: "Pitches" },
  { id: 4, name: "Launch",   accent: "#10b981", angle: 330, label: "Launch" },
  { id: 5, name: "Learn",    accent: "#8b5cf6", angle: 90,  label: "Learn" },
];

const FEEDBACK_LOOPS = [
  { from: 5, to: 2 },   // Learn -> Decide
  { from: 5, to: 0 },   // Memory -> Campaign
];

export default function NeuralNet() {
  const { state } = useApp();
  const { campaign, stages } = state;
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [pulses, setPulses] = useState<{ id: number; from: number; to: number }[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const handleResize = () => {
      const parent = svgRef.current?.parentElement;
      if (parent) setSvgSize({ w: parent.clientWidth, h: parent.clientHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Continuous data pulses on active synapses
  useEffect(() => {
    const activeStages = stages.filter(s => s.status !== "locked");
    if (activeStages.length < 2) return;
    const interval = setInterval(() => {
      const fromStage = activeStages[Math.floor(Math.random() * activeStages.length)];
      const toStage = activeStages[Math.floor(Math.random() * activeStages.length)];
      if (fromStage.id !== toStage.id) {
        const id = Date.now() + Math.random();
        setPulses(prev => [...prev.slice(-8), { id, from: fromStage.id, to: toStage.id }]);
        setTimeout(() => setPulses(prev => prev.filter(p => p.id !== id)), 2500);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [stages]);

  const cx = svgSize.w / 2;
  const cy = svgSize.h / 2;
  const centerR = 70;
  const orbitR = Math.min(svgSize.w, svgSize.h) * 0.32;

  const getPos = useCallback((angleDeg: number, radius: number) => {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }, [cx, cy]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden" style={{ background: "#020617" }}>
      {/* SVG Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}>
          <defs>
            {STAGES.map(s => (
              <radialGradient key={s.id} id={`grad-${s.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={s.accent} stopOpacity="0.9" />
                <stop offset="100%" stopColor={s.accent} stopOpacity="0.3" />
              </radialGradient>
            ))}
            <radialGradient id="center-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Synapse lines: center to each stage */}
          {STAGES.map(s => {
            const pos = getPos(s.angle, orbitR);
            const isActive = stages[s.id]?.status !== "locked";
            return (
              <g key={`syn-${s.id}`}>
                <line x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                  stroke={isActive ? s.accent : "rgba(255,255,255,0.04)"}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  strokeDasharray={isActive ? "none" : "4,4"}
                  opacity={isActive ? 0.4 : 0.2} />
              </g>
            );
          })}

          {/* Feedback loop lines (dashed) */}
          {FEEDBACK_LOOPS.map((loop, i) => {
            const fromStage = STAGES.find(s => s.id === loop.from);
            const toStage = STAGES.find(s => s.id === loop.to);
            if (!fromStage || !toStage) return null;
            const from = getPos(fromStage.angle, orbitR);
            const to = getPos(toStage.angle, orbitR);
            const bothActive = stages[loop.from]?.status !== "locked" && stages[loop.to]?.status !== "locked";
            return (
              <line key={`fb-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={bothActive ? "#8b5cf6" : "rgba(255,255,255,0.03)"}
                strokeWidth={bothActive ? 1 : 0.5}
                strokeDasharray="6,4"
                opacity={bothActive ? 0.25 : 0.1} />
            );
          })}

          {/* Adjacent stage connections */}
          {STAGES.map((s, i) => {
            const next = STAGES[(i + 1) % STAGES.length];
            const p1 = getPos(s.angle, orbitR);
            const p2 = getPos(next.angle, orbitR);
            return (
              <line key={`adj-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
            );
          })}

          {/* Data pulses */}
          <AnimatePresence>
            {pulses.map(pulse => {
              const fromS = STAGES.find(s => s.id === pulse.from);
              const toS = STAGES.find(s => s.id === pulse.to);
              if (!fromS || !toS) return null;
              const from = pulse.from === 0 ? { x: cx, y: cy } : getPos(fromS.angle, orbitR);
              const to = pulse.to === 0 ? { x: cx, y: cy } : getPos(toS.angle, orbitR);
              return (
                <motion.circle key={pulse.id} r={4} fill={fromS.accent} filter="url(#glow)"
                  initial={{ cx: from.x, cy: from.y, opacity: 1 }}
                  animate={{ cx: to.x, cy: to.y, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, ease: "easeInOut" }} />
              );
            })}
          </AnimatePresence>

          {/* Center Neuron (Campaign) */}
          <CenterNeuron cx={cx} cy={cy} r={centerR} campaign={campaign} onClick={() => setSelectedStage(selectedStage === 0 ? null : 0)} />

          {/* Stage Neurons */}
          {STAGES.slice(1).map(s => {
            const pos = getPos(s.angle, orbitR);
            const stageInfo = stages[s.id];
            return (
              <StageNeuron key={s.id} x={pos.x} y={pos.y} r={42} stage={s}
                status={stageInfo?.status || "locked"}
                onClick={() => stageInfo?.status !== "locked" && setSelectedStage(selectedStage === s.id ? null : s.id)}
                isSelected={selectedStage === s.id} />
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
          {STAGES.map(s => (
            <button key={s.id} onClick={() => stages[s.id]?.status !== "locked" && setSelectedStage(selectedStage === s.id ? null : s.id)}
              className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-all ${stages[s.id]?.status === "locked" ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5 cursor-pointer"}`}
              style={{ color: s.accent }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.accent }} />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedStage !== null && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-64 shrink-0 border-t border-white/[0.08] overflow-y-auto custom-scrollbar z-10"
            style={{ background: "#060e1a" }}>
            <DetailPanel stageId={selectedStage} onClose={() => setSelectedStage(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Center Neuron ── */
function CenterNeuron({ cx, cy, r, campaign, onClick }: { cx: number; cy: number; r: number; campaign: any; onClick: () => void }) {
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Glow ring */}
      <motion.circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="#6366f1" strokeWidth={1}
        opacity={0.15} strokeDasharray="4,4"
        animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }} />
      {/* Main body */}
      <motion.circle cx={cx} cy={cy} r={r} fill="url(#center-grad)" filter="url(#glow)"
        animate={{ r: [r, r + 3, r] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      <circle cx={cx} cy={cy} r={r} fill="url(#center-grad)" opacity={0.8} />
      {/* Label */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#e2e8f0" fontSize={11} fontWeight={600}>CAMPAIGN</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        {campaign?.name ? (campaign.name.length > 16 ? campaign.name.slice(0, 16) + "..." : campaign.name) : "No campaign"}
      </text>
    </g>
  );
}

/* ── Stage Neuron ── */
function StageNeuron({ x, y, r, stage, status, onClick, isSelected }: {
  x: number; y: number; r: number; stage: typeof STAGES[0]; status: string; onClick: () => void; isSelected: boolean;
}) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  return (
    <g onClick={onClick} style={{ cursor: isLocked ? "not-allowed" : "pointer" }}>
      {/* Glow */}
      {!isLocked && (
        <circle cx={x} cy={y} r={r + (isSelected ? 12 : 6)} fill="none" stroke={stage.accent}
          strokeWidth={isSelected ? 2 : 1} opacity={isSelected ? 0.3 : 0.15} />
      )}
      {/* Body */}
      <circle cx={x} cy={y} r={r} fill={`url(#grad-${stage.id})`} opacity={isLocked ? 0.2 : 0.75}
        filter={!isLocked ? "url(#glow)" : undefined} />
      {/* Border */}
      <circle cx={x} cy={y} r={r} fill="none" stroke={isLocked ? "rgba(255,255,255,0.08)" : stage.accent}
        strokeWidth={isSelected ? 2.5 : 1.5} opacity={isLocked ? 0.3 : 0.8} />
      {/* Lock icon */}
      {isLocked && (
        <text x={x} y={y + 4} textAnchor="middle" fill="#475569" fontSize={14}>🔒</text>
      )}
      {/* Completed check */}
      {isCompleted && (
        <text x={x} y={y + 4} textAnchor="middle" fill="#34d399" fontSize={14}>✓</text>
      )}
      {/* Label below */}
      <text x={x} y={y + r + 16} textAnchor="middle" fill={isLocked ? "#334155" : stage.accent}
        fontSize={10} fontWeight={600} opacity={isLocked ? 0.4 : 1}>{stage.name}</text>
      {/* Status below name */}
      <text x={x} y={y + r + 28} textAnchor="middle" fill="#475569" fontSize={8} opacity={0.6}>{status}</text>
    </g>
  );
}

/* ── Detail Panel ── */
function DetailPanel({ stageId, onClose }: { stageId: number; onClose: () => void }) {
  const { state } = useApp();
  const { campaign, stages } = state;
  const stage = stages[stageId];
  if (!stage) return null;

  const titles = ["Campaign Core", "Research Layer", "Target Markets", "Pitch Gallery", "Launch Control", "Memory Palace"];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.accent }} />
          <span className="text-sm font-semibold text-slate-100">{titles[stageId]}</span>
          <StatusBadge status={stage.status} />
        </div>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-white/5">✕ Close</button>
      </div>

      {stageId === 0 && <CampaignDetail campaign={campaign} />}
      {stageId === 1 && <IngestDetail stageData={stage.data} />}
      {stageId === 2 && <DecideDetail stageData={stage.data} />}
      {stageId === 3 && <CreateDetail contentPack={stage.data} />}
      {stageId === 4 && <SendDetail stageData={stage.data} />}
      {stageId === 5 && <LearnDetail stageData={stage.data} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    locked:    { bg: "rgba(255,255,255,0.04)", text: "#475569", label: "Locked" },
    ready:     { bg: "rgba(99,102,241,0.1)",   text: "#818cf8", label: "Ready" },
    active:    { bg: "rgba(99,102,241,0.15)",   text: "#a5b4fc", label: "Active" },
    completed: { bg: "rgba(16,185,129,0.1)",    text: "#34d399", label: "Done" },
  };
  const s = map[status] || map.locked;
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.text }}>{s.label}</span>;
}

/* ── Detail Sub-Components (all real data) ── */
function CampaignDetail({ campaign }: { campaign: any }) {
  if (!campaign) return <div className="text-xs text-slate-600 py-4">No campaign configured</div>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <DataChip label="Name" value={campaign.name} />
      <DataChip label="Objective" value={campaign.objective} />
      <DataChip label="Audience" value={campaign.audience} />
      <DataChip label="Channel" value={campaign.channel} />
      <DataChip label="Locales" value={(campaign.locales || []).join(", ")} />
      <DataChip label="Theme" value={campaign.designTheme} />
      <DataChip label="Automation" value={campaign.automationEnabled ? "Enabled" : "Disabled"} />
      <DataChip label="Modules" value={(campaign.enabledModules || []).length} />
    </div>
  );
}

function IngestDetail({ stageData }: { stageData: any }) {
  if (!stageData) return <div className="text-xs text-slate-600 py-4">No ingestion data</div>;
  const connectors = stageData.connectors || [];
  return (
    <div className="space-y-3">
      {connectors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {connectors.map((c: any) => (
            <div key={c.connector} className="px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-[#0f172a] text-[10px]">
              <span className="text-slate-400">{c.connector}</span>
              <span className={`ml-2 ${c.reachable ? "text-emerald-400" : "text-red-400"}`}>{c.reachable ? "●" : "○"}</span>
              <span className="ml-1 text-slate-600">{c.mode || (c.dryRun ? "dry-run" : "live")}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="p-2 rounded bg-[#0f172a] text-center">
          <div className="text-lg font-semibold text-cyan-400">{(stageData.researchRecords || []).length}</div>
          <div className="text-slate-600">Research</div>
        </div>
        <div className="p-2 rounded bg-[#0f172a] text-center">
          <div className="text-lg font-semibold text-cyan-400">{(stageData.analyticsEvents || []).length}</div>
          <div className="text-slate-600">Analytics</div>
        </div>
        <div className="p-2 rounded bg-[#0f172a] text-center">
          <div className="text-lg font-semibold text-cyan-400">{(stageData.outreachEvents || []).length}</div>
          <div className="text-slate-600">Outreach</div>
        </div>
      </div>
    </div>
  );
}

function DecideDetail({ stageData }: { stageData: any }) {
  if (!stageData) return <div className="text-xs text-slate-600 py-4">No decision data</div>;
  const targets = stageData.targets || [];
  const playbooks = stageData.playbooks || [];
  return (
    <div className="grid grid-cols-3 gap-2 text-[10px]">
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-amber-400">{targets.length}</div>
        <div className="text-slate-600">Targets</div>
      </div>
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-amber-400">{playbooks.length}</div>
        <div className="text-slate-600">Playbooks</div>
      </div>
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-amber-400">{(stageData.investors || []).length}</div>
        <div className="text-slate-600">Investors</div>
      </div>
      {playbooks.slice(0, 2).map((pb: any) => (
        <div key={pb.id} className="col-span-3 p-2 rounded border border-white/[0.04] text-slate-400">
          {pb.segment} · {pb.recommendedChannel} · Win {(pb.winRate * 100).toFixed(0)}% · Risk {(pb.riskRate * 100).toFixed(0)}%
        </div>
      ))}
    </div>
  );
}

function CreateDetail({ contentPack }: { contentPack: any }) {
  if (!contentPack) return <div className="text-xs text-slate-600 py-4">No content generated yet</div>;
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-slate-500">Pack: <span className="text-slate-200">{contentPack.id}</span></div>
      {(contentPack.variants || []).slice(0, 3).map((v: any, i: number) => (
        <div key={v.id || i} className="p-2 rounded border border-white/[0.04] text-[10px]">
          <span className="px-1 py-0.5 rounded bg-rose-500/10 text-rose-300 mr-2">{v.locale || "en"}</span>
          <span className="text-slate-400">{v.channel || "—"}</span>
          <div className="mt-1 text-slate-300 font-medium">{v.subject || v.headline || "No subject"}</div>
        </div>
      ))}
    </div>
  );
}

function SendDetail({ stageData }: { stageData: any }) {
  if (!stageData) return <div className="text-xs text-slate-600 py-4">No outreach data</div>;
  const dlqCount = stageData.dlq?.entries?.length || 0;
  return (
    <div className="grid grid-cols-3 gap-2 text-[10px]">
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-emerald-400">{(stageData.outreachEvents || []).length}</div>
        <div className="text-slate-600">Events</div>
      </div>
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className={`text-lg font-semibold ${dlqCount > 0 ? "text-red-400" : "text-emerald-400"}`}>{dlqCount}</div>
        <div className="text-slate-600">DLQ</div>
      </div>
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-emerald-400">{(stageData.safety || []).length}</div>
        <div className="text-slate-600">Safety</div>
      </div>
    </div>
  );
}

function LearnDetail({ stageData }: { stageData: any }) {
  if (!stageData) return <div className="text-xs text-slate-600 py-4">No memory data</div>;
  const mr = stageData.memoryRecall;
  return (
    <div className="grid grid-cols-3 gap-2 text-[10px]">
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-violet-400">{mr?.episodicMemories?.researchRecords?.length || 0}</div>
        <div className="text-slate-600">Research</div>
      </div>
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-violet-400">{mr?.episodicMemories?.outreachEvents?.length || 0}</div>
        <div className="text-slate-600">Outreach</div>
      </div>
      <div className="p-2 rounded bg-[#0f172a] text-center">
        <div className="text-lg font-semibold text-violet-400">{(stageData.playbooks || []).length}</div>
        <div className="text-slate-600">Playbooks</div>
      </div>
    </div>
  );
}

function DataChip({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="p-2 rounded bg-[#0f172a] border border-white/[0.04]">
      <div className="text-[10px] text-slate-600">{label}</div>
      <div className="text-xs text-slate-200 truncate">{value || "—"}</div>
    </div>
  );
}
