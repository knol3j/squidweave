import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Database, Brain, Sparkles, Zap, BookOpen, RefreshCw, Target, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3, Globe, FileText, Layers } from 'lucide-react';
import type { StageStatus } from '@/types';
import { useApp } from '@/context/AppContext';

interface DetailPanelProps {
  selectedNode: 'center' | string | null;
  stageName: string;
  stageDescription: string;
  accent: string;
  status: StageStatus;
  onClose: () => void;
}

export default function DetailPanel({
  selectedNode,
  stageName,
  stageDescription,
  accent,
  status,
  onClose,
}: DetailPanelProps) {
  const { state } = useApp();

  const statusColors: Record<StageStatus, string> = {
    locked: '#64748b',
    configuring: '#f59e0b',
    ready: '#3b82f6',
    active: '#10b981',
    completed: '#10b981',
  };

  const statusLabel = status.toUpperCase();
  const bgColor = `${accent}18`; // 10% opacity hex

  const renderContent = () => {
    if (selectedNode === 'center') {
      return <CenterContent accent={accent} />;
    }

    switch (stageName) {
      case 'INGEST':
        return <IngestContent accent={accent} />;
      case 'DECIDE':
        return <DecideContent accent={accent} />;
      case 'CREATE':
        return <CreateContent accent={accent} />;
      case 'SEND':
        return <SendContent accent={accent} />;
      case 'LEARN':
        return <LearnContent accent={accent} />;
      case 'MEMORY':
        return <MemoryContent accent={accent} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-[#64748b] text-sm">
            Select a neuron to view details
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {selectedNode !== null && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 z-30 border-t border-[rgba(255,255,255,0.08)]"
          style={{
            height: 320,
            backgroundColor: '#08111f',
            backgroundImage: `linear-gradient(180deg, ${bgColor} 0%, transparent 60%)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}80` }}
              />
              <span className="text-[#e2e8f0] font-semibold text-sm tracking-wide">
                {selectedNode === 'center' ? 'CAMPAIGN CORE' : `${stageName} LAYER`}
              </span>
              <span className="text-[#64748b] text-xs ml-1">{stageDescription}</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider"
                style={{
                  backgroundColor: `${statusColors[status]}20`,
                  color: statusColors[status],
                }}
              >
                {statusLabel}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                <X className="w-4 h-4 text-[#94a3b8]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="p-5 overflow-y-auto"
            style={{ height: 270 }}
          >
            {renderContent()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── INGEST LAYER CONTENT ─── */
function IngestContent({ accent }: { accent: string }) {
  const { state } = useApp();
  const connectors = state.connectors.slice(0, 3);
  const recentRecords = state.researchRecords.slice(0, 4);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Connector Cards */}
      <div className="col-span-2 space-y-2">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2 flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          Connectors
        </div>
        <div className="grid grid-cols-3 gap-2">
          {connectors.map((c) => (
            <div
              key={c.id}
              className="rounded-xl p-3 border border-[rgba(255,255,255,0.06)]"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#e2e8f0]">{c.name}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      c.status === 'live' ? '#10b981' : c.status === 'ready' ? '#3b82f6' : '#f59e0b',
                    boxShadow: `0 0 6px ${
                      c.status === 'live' ? '#10b981' : c.status === 'ready' ? '#3b82f6' : '#f59e0b'
                    }`,
                  }}
                />
              </div>
              <div className="text-[10px] text-[#64748b] mb-2">{c.mode}</div>
              {/* Health bar */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full"
                    style={{
                      backgroundColor: i < c.health ? accent : '#1e293b',
                      opacity: i < c.health ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
              <div className="text-[9px] text-[#64748b] mt-1">Health: {c.health}/5</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Research */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Recent Research
        </div>
        <div className="space-y-1.5">
          {recentRecords.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[rgba(255,255,255,0.04)]"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
            >
              <div>
                <div className="text-[10px] font-medium text-[#e2e8f0]">{r.company}</div>
                <div className="text-[9px] text-[#64748b]">{r.segment}</div>
              </div>
              <div
                className="text-[10px] font-semibold"
                style={{ color: r.fitScore >= 80 ? '#10b981' : r.fitScore >= 60 ? '#f59e0b' : '#64748b' }}
              >
                {r.fitScore}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── DECIDE LAYER CONTENT ─── */
function DecideContent({ accent }: { accent: string }) {
  const { state } = useApp();

  // Mock tactic scores - compute from state or use fallback
  const tacticScores = [
    { channel: 'Email', score: 84, color: '#6366f1' },
    { channel: 'LinkedIn', score: 62, color: '#06b6d4' },
    { channel: 'Reddit', score: 34, color: '#f59e0b' },
    { channel: 'Twitter', score: 45, color: '#8b5cf6' },
  ];

  const topTargets = state.targets.slice(0, 3);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Tactic Scores */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Channel Performance
        </div>
        {tacticScores.map((t) => (
          <div key={t.channel} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#94a3b8]">{t.channel}</span>
              <span className="font-semibold" style={{ color: t.color }}>
                {t.score}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${t.score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: t.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Top Targets */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          Top Targets
        </div>
        {topTargets.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.06)]"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: `${accent}20`, color: accent }}
              >
                {i + 1}
              </span>
              <div>
                <div className="text-xs font-medium text-[#e2e8f0]">{t.company}</div>
                <div className="text-[9px] text-[#64748b]">{t.segment}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold" style={{ color: t.score >= 90 ? '#10b981' : accent }}>
                {t.score}%
              </div>
              <div className="text-[9px] text-[#64748b]">{t.recommendedChannel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CREATE LAYER CONTENT ─── */
function CreateContent({ accent }: { accent: string }) {
  const { state } = useApp();
  const variants = state.contentVariants;
  const locales = [...new Set(variants.map((v) => v.locale))];

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" />
        Content Variants by Locale
      </div>
      <div className="grid grid-cols-3 gap-4">
        {locales.map((locale) => {
          const localeVariants = variants.filter((v) => v.locale === locale).slice(0, 2);
          return (
            <div key={locale} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-3 h-3" style={{ color: accent }} />
                <span className="text-xs font-semibold text-[#e2e8f0]">{locale}</span>
              </div>
              {localeVariants.map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-lg border border-[rgba(255,255,255,0.06)]"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
                >
                  <div className="text-[10px] font-medium text-[#e2e8f0] line-clamp-1 mb-1">
                    {v.subject}
                  </div>
                  <div className="text-[9px] text-[#64748b] line-clamp-2 mb-1.5">{v.body.slice(0, 80)}...</div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
                      style={{
                        backgroundColor:
                          v.status === 'approved'
                            ? '#10b98120'
                            : v.status === 'sent'
                              ? '#6366f120'
                              : '#f59e0b20',
                        color:
                          v.status === 'approved'
                            ? '#10b981'
                            : v.status === 'sent'
                              ? '#6366f1'
                              : '#f59e0b',
                      }}
                    >
                      {v.status.toUpperCase()}
                    </span>
                    <span className="text-[8px] text-[#64748b]">CTA: {v.cta}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SEND LAYER CONTENT ─── */
function SendContent({ accent }: { accent: string }) {
  const { state } = useApp();
  const recentEvents = state.outreachEvents.slice(0, 5);
  const dlqCount = state.dlqEntries.length;

  const eventTypeColors: Record<string, string> = {
    sent: '#6366f1',
    delivered: '#3b82f6',
    opened: '#06b6d4',
    clicked: '#10b981',
    replied: '#f59e0b',
    bounced: '#f43f5e',
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Execution Timeline */}
      <div className="col-span-2 space-y-2">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Recent Outreach Events
        </div>
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.08)]" />
          {recentEvents.map((e, i) => (
            <div key={e.id} className="flex items-start gap-3 relative py-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1 shrink-0 relative z-10"
                style={{
                  backgroundColor: eventTypeColors[e.type] || '#64748b',
                  boxShadow: `0 0 6px ${eventTypeColors[e.type] || '#64748b'}`,
                }}
              />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-medium text-[#e2e8f0]">{e.targetName}</span>
                  <span className="text-[9px] text-[#64748b] ml-2">{e.channel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${eventTypeColors[e.type]}15`,
                      color: eventTypeColors[e.type],
                    }}
                  >
                    {e.type}
                  </span>
                  <span className="text-[9px] text-[#64748b]">
                    {new Date(e.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DLQ Badge */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Dead Letter Queue
        </div>
        <div
          className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] text-center"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
        >
          <div className="text-3xl font-bold" style={{ color: dlqCount > 0 ? '#f43f5e' : '#10b981' }}>
            {dlqCount}
          </div>
          <div className="text-[10px] text-[#64748b] mt-1">failed items</div>
        </div>
        {dlqCount > 0 && (
          <div className="space-y-1.5">
            {state.dlqEntries.slice(0, 2).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                style={{ backgroundColor: 'rgba(244,63,94,0.08)' }}
              >
                <div className="text-[9px] text-[#e2e8f0] truncate max-w-[140px]">{entry.target}</div>
                <div className="text-[9px] text-[#f59e0b]">{entry.retries} retries</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── LEARN LAYER CONTENT ─── */
function LearnContent({ accent }: { accent: string }) {
  const { state } = useApp();
  const topPlaybooks = state.playbooks.slice(0, 2);
  const consolidationCount = state.researchRecords.length + state.outreachEvents.length;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Knowledge Graph Description */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <Brain className="w-3.5 h-3.5" />
          Knowledge Graph
        </div>
        <div
          className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)]"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4" style={{ color: accent }} />
            <span className="text-xs font-semibold text-[#e2e8f0]">{consolidationCount}</span>
          </div>
          <div className="text-[10px] text-[#94a3b8]">
            consolidated observations across research, outreach, and engagement data.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {state.consolidationEvents.slice(0, 4).map((ce) => (
            <div
              key={ce.id}
              className="px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.04)]"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.3)' }}
            >
              <div className="text-[9px] font-medium text-[#e2e8f0] capitalize">{ce.type}</div>
              <div className="text-[8px] text-[#64748b]">{ce.items} items</div>
            </div>
          ))}
        </div>
      </div>

      {/* Playbook Cards */}
      <div className="col-span-2 space-y-2">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" />
          Active Playbooks
        </div>
        <div className="grid grid-cols-2 gap-3">
          {topPlaybooks.map((pb) => (
            <div
              key={pb.id}
              className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)]"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#e2e8f0]">{pb.segment}</span>
                <span className="text-[9px] font-medium" style={{ color: accent }}>
                  {pb.winRate}% win
                </span>
              </div>
              <div className="text-[10px] text-[#94a3b8] mb-2 line-clamp-2">{pb.rationale}</div>
              <div className="flex items-center gap-2 text-[9px] text-[#64748b]">
                <Globe className="w-3 h-3" />
                {pb.region}
                <span className="mx-1">|</span>
                <Zap className="w-3 h-3" />
                {pb.channel}
              </div>
              <div className="mt-2 h-1 rounded-full bg-[#1e293b] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pb.confidence}%`,
                    backgroundColor: pb.confidence >= 85 ? '#10b981' : pb.confidence >= 70 ? '#f59e0b' : '#f43f5e',
                  }}
                />
              </div>
              <div className="text-[8px] text-[#64748b] mt-1 text-right">{pb.confidence}% confidence</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── MEMORY LAYER CONTENT ─── */
function MemoryContent({ accent }: { accent: string }) {
  const { state } = useApp();
  const consolidationCount = state.consolidationEvents.length;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Consolidation Stats */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          Consolidation
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div
            className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-center"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
          >
            <div className="text-xl font-bold" style={{ color: accent }}>
              {consolidationCount}
            </div>
            <div className="text-[9px] text-[#64748b]">events</div>
          </div>
          <div
            className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-center"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
          >
            <div className="text-xl font-bold text-[#10b981]">{state.playbooks.length}</div>
            <div className="text-[9px] text-[#64748b]">playbooks</div>
          </div>
        </div>
      </div>

      {/* Recent Consolidations */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          History
        </div>
        {state.consolidationEvents.slice(0, 4).map((ce) => (
          <div
            key={ce.id}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[rgba(255,255,255,0.04)]"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.3)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  ce.type === 'reflection' ? '#f59e0b' : ce.type === 'event' ? '#6366f1' : '#10b981',
              }}
            />
            <div className="text-[10px] text-[#e2e8f0] flex-1 truncate">{ce.description}</div>
          </div>
        ))}
      </div>

      {/* Reflection Trigger */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Actions
        </div>
        <button
          className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{
            backgroundColor: accent,
            boxShadow: `0 0 15px ${accent}40`,
          }}
          onClick={() => alert('Reflection triggered!')}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Trigger Reflection
        </button>
        <button
          className="w-full py-2.5 px-3 rounded-xl text-xs font-medium text-[#94a3b8] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Run Consolidation
        </button>
      </div>
    </div>
  );
}

/* ─── CENTER / CAMPAIGN EDITOR CONTENT ─── */
function CenterContent({ accent }: { accent: string }) {
  const { state, dispatch } = useApp();
  const campaign = state.campaign;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Campaign Name & Objective */}
      <div className="col-span-2 space-y-4">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Campaign Settings
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-[#64748b] block mb-1">Campaign Name</label>
            <input
              type="text"
              value={campaign.name}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_CAMPAIGN', campaign: { name: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg text-xs text-[#e2e8f0] border border-[rgba(255,255,255,0.08)] focus:border-[rgba(255,255,255,0.2)] outline-none transition-colors"
              style={{ backgroundColor: '#0f172a' }}
            />
          </div>
          <div>
            <label className="text-[10px] text-[#64748b] block mb-1">Channel</label>
            <input
              type="text"
              value={campaign.channel}
              readOnly
              className="w-full px-3 py-2 rounded-lg text-xs text-[#94a3b8] border border-[rgba(255,255,255,0.08)] cursor-not-allowed"
              style={{ backgroundColor: '#0f172a' }}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-[#64748b] block mb-1">Objective</label>
          <textarea
            value={campaign.objective}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_CAMPAIGN', campaign: { objective: e.target.value } })
            }
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-xs text-[#e2e8f0] border border-[rgba(255,255,255,0.08)] focus:border-[rgba(255,255,255,0.2)] outline-none transition-colors resize-none"
            style={{ backgroundColor: '#0f172a' }}
          />
        </div>
      </div>

      {/* Locales & Status */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-3.5 h-3.5" />
          Target Locales
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.locales.map((locale) => (
            <span
              key={locale}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{
                backgroundColor: `${accent}15`,
                borderColor: `${accent}30`,
                color: accent,
              }}
            >
              {locale}
            </span>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl border border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
          <div className="text-[10px] text-[#64748b] mb-1">Status</div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: campaign.active ? '#10b981' : '#f43f5e',
                boxShadow: `0 0 8px ${campaign.active ? '#10b981' : '#f43f5e'}`,
              }}
            />
            <span className="text-xs font-medium" style={{ color: campaign.active ? '#10b981' : '#f43f5e' }}>
              {campaign.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-[#64748b]">
          Audience: <span className="text-[#94a3b8]">{campaign.audience}</span>
        </div>
      </div>
    </div>
  );
}
