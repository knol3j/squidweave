import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bot,
  BrainCircuit,
  Cable,
  ClipboardList,
  FolderKanban,
  ExternalLink,
  Globe2,
  Inbox,
  MemoryStick,
  Network,
  Play,
  Sparkles,
  Target,
  Workflow,
} from 'lucide-react';
import { useCollaboration } from './CollaborationProvider';
import { ConnectorStatus, dataService, MemoryPlaybook, MemoryRecall, OpenClawDiagnostic, ResearchRecord, SetupRequirements, TargetProfile } from '../services/dataService';
import { AGENT_SYSTEM } from '../lib/agentSystem';
import { formatPercent, formatShortDate } from '../lib/format';

type BrainState = {
  campaigns?: Record<string, any>;
  decisions?: any[];
  contentPacks?: any[];
  automationRuns?: any[];
  memory?: {
    targetProfiles?: TargetProfile[];
    tacticObservations?: any[];
    playbooks?: MemoryPlaybook[];
    memoryConsolidations?: any[];
  };
  scheduler?: {
    running: boolean;
    intervalSeconds: number;
    lastTickAt: string | null;
  };
};

const TABS = ['Knowledge Graph', 'Research Feed', 'Memory Recall', 'Reengagement'] as const;

function buildGraphNodes(state: BrainState, campaign: any) {
  const latestPack = state.contentPacks?.at(-1);
  const latestDecision = state.decisions?.at(-1);
  const locales = campaign?.locales?.length ? campaign.locales : [];
  const modules = campaign?.enabledModules?.slice(0, 5) || [];
  const playbooks = state.memory?.playbooks?.slice(0, 2) || [];

  const nodes = [
    { id: 'brain', label: 'Local Brain', x: 50, y: 48, size: 18, tone: 'bg-violet-500' },
    { id: 'campaign', label: campaign?.name || campaign?.id || 'Campaign', x: 27, y: 32, size: 14, tone: 'bg-indigo-500' },
  ];

  if (latestDecision?.plan?.recommendedAction?.type) {
    nodes.push({
      id: 'decision',
      label: latestDecision.plan.recommendedAction.type,
      x: 36,
      y: 70,
      size: 12,
      tone: 'bg-sky-500',
    });
  }

  locales.forEach((locale: string, index: number) => {
    nodes.push({
      id: `locale-${locale}`,
      label: locale,
      x: 66 + index * 9,
      y: 26 + (index % 2) * 17,
      size: 11,
      tone: 'bg-amber-400',
    });
  });

  modules.forEach((module: string, index: number) => {
    nodes.push({
      id: `module-${module}`,
      label: module,
      x: 18 + (index * 10),
      y: 82,
      size: 10,
      tone: 'bg-emerald-500',
    });
  });

  playbooks.forEach((playbook, index) => {
    nodes.push({
      id: `playbook-${playbook.id}`,
      label: `${playbook.segment}/${playbook.recommendedChannel}`,
      x: 74 + (index * 10),
      y: 56,
      size: 10,
      tone: 'bg-rose-400',
    });
  });

  (latestPack?.variants || []).slice(0, 2).forEach((variant: any, index: number) => {
    nodes.push({
      id: `variant-${variant.locale}`,
      label: variant.locale,
      x: 80 + index * 8,
      y: 72,
      size: 10,
      tone: 'bg-fuchsia-400',
    });
  });

  const edges = [
    ['brain', 'campaign'],
    ...locales.map((locale: string) => ['brain', `locale-${locale}`]),
    ...modules.map((module: string) => ['campaign', `module-${module}`]),
    ...playbooks.map((playbook) => ['brain', `playbook-${playbook.id}`]),
    ...(latestPack?.variants || []).slice(0, 2).map((variant: any) => ['brain', `variant-${variant.locale}`]),
  ];

  if (latestDecision?.plan?.recommendedAction?.type) {
    edges.push(['brain', 'decision']);
  }

  return { nodes, edges };
}

export default function BrainDashboard() {
  const { campaignState } = useCollaboration();
  const [state, setState] = useState<BrainState>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Knowledge Graph');
  const [recall, setRecall] = useState<MemoryRecall | null>(null);
  const [reengagement, setReengagement] = useState<{ updatedAt: string; queue: any[] } | null>(null);
  const [researchRecords, setResearchRecords] = useState<ResearchRecord[]>([]);
  const [targetDecision, setTargetDecision] = useState<any>(null);
  const [connectorStatuses, setConnectorStatuses] = useState<ConnectorStatus[]>([]);
  const [connectorDrafts, setConnectorDrafts] = useState<Record<string, { baseUrl: string; token: string }>>({});
  const [connectorSaving, setConnectorSaving] = useState<string | null>(null);
  const [connectorMessage, setConnectorMessage] = useState<string | null>(null);
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [outreachEvents, setOutreachEvents] = useState<any[]>([]);
  const [setupRequirements, setSetupRequirements] = useState<SetupRequirements | null>(null);
  const [openClawDiagnostics, setOpenClawDiagnostics] = useState<OpenClawDiagnostic[]>([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const [nextState, nextRecall, nextReengagement, nextResearch, nextDecision, nextConnectors, nextAnalytics, nextOutreach, nextRequirements, nextDiagnostics] = await Promise.all([
          dataService.getState(),
          dataService.getMemoryRecall(campaignState.id || 'main-campaign'),
          dataService.getReengagementQueue(campaignState.id || 'main-campaign'),
          dataService.getResearchRecords(campaignState.id || 'main-campaign'),
          dataService.getTargetDecision(campaignState.id || 'main-campaign'),
          dataService.getConnectorStatuses(false),
          dataService.getAnalyticsEvents(campaignState.id || 'main-campaign'),
          dataService.getOutreachEvents(campaignState.id || 'main-campaign'),
          dataService.getSetupRequirements(),
          dataService.getOpenClawDiagnostics(),
        ]);
        if (active) {
          setState(nextState);
          setRecall(nextRecall);
          setReengagement(nextReengagement);
          setResearchRecords(nextResearch);
          setTargetDecision(nextDecision);
          setConnectorStatuses(nextConnectors);
          setConnectorDrafts(current => {
            const next = { ...current };
            for (const status of nextConnectors) {
              if (!next[status.connector]) {
                next[status.connector] = {
                  baseUrl: status.baseUrl || '',
                  token: '',
                };
              } else if (!next[status.connector].baseUrl && status.baseUrl) {
                next[status.connector] = {
                  ...next[status.connector],
                  baseUrl: status.baseUrl,
                };
              }
            }
            return next;
          });
          setAnalyticsEvents(nextAnalytics);
          setOutreachEvents(nextOutreach);
          setSetupRequirements(nextRequirements);
          setOpenClawDiagnostics(nextDiagnostics.diagnostics || []);
          setLoadError(null);
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load brain data');
        }
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    };
    run();
    const timer = window.setInterval(run, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [campaignState.id]);

  const decisionSeries = useMemo(() => {
    const decisions = state.decisions || [];
    return decisions.slice(-7).map((decision: any) => ({
      name: formatShortDate(decision.createdAt),
      activity: decision.summary?.eventCount || 0,
      variants: state.contentPacks?.filter((pack: any) => pack.decisionId === decision.id).length || 0,
    }));
  }, [state]);

  const cards = useMemo(() => {
    return [
      {
        label: 'Agent Mesh',
        value: `${campaignState.enabledModules?.length || 0}/${AGENT_SYSTEM.length} online`,
        detail: campaignState.clientNeed || campaignState.activePrompt || 'No mission brief captured',
        icon: BrainCircuit,
      },
      {
        label: 'Memory Layer',
        value: `${state.memory?.playbooks?.length || 0} playbooks`,
        detail: `${state.memory?.targetProfiles?.length || 0} target profiles`,
        icon: MemoryStick,
      },
      {
        label: 'Translation Layer',
        value: `${campaignState.locales?.length || 0} locales`,
        detail: campaignState.audience || 'No audience configured',
        icon: Workflow,
      },
      {
        label: 'Reengagement',
        value: `${reengagement?.queue?.length || 0} queued`,
        detail: reengagement?.updatedAt ? `Updated ${formatShortDate(reengagement.updatedAt)}` : 'No queue built',
        icon: Target,
      },
    ];
  }, [campaignState, state, reengagement]);

  const { nodes, edges } = useMemo(() => buildGraphNodes(state, campaignState), [state, campaignState]);
  const latestPack = state.contentPacks?.at(-1);
  const latestDecision = state.decisions?.at(-1);
  const playbooks = recall?.proceduralMemories || [];
  const targetProfiles = recall?.semanticMemories?.targetProfiles || [];
  const episodicEvents = recall?.episodicMemories?.outreachEvents || [];
  const rankedTargets = targetDecision?.topTargets || [];

  if (initialLoading) {
    return (
      <div className="h-full overflow-y-auto bg-[#08111f] px-6 py-5 text-slate-100 custom-scrollbar">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="animate-pulse space-y-3 p-6 glass-card">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-5 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04] p-6 space-y-3" style={{ minHeight: 470 }}>
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-32 bg-white/10 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-[#08111f]">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-red-400 text-sm font-medium">Failed to load brain data</p>
          <p className="text-slate-500 text-xs">{loadError}</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasBrainData = (state.decisions?.length || 0) > 0 || (state.memory?.playbooks?.length || 0) > 0 || researchRecords.length > 0 || (state.contentPacks?.length || 0) > 0;

  const saveConnector = async (connector: string) => {
    const draft = connectorDrafts[connector];
    if (!draft?.baseUrl || !draft?.token) {
      setConnectorMessage(`Enter both base URL and token for ${connector}.`);
      return;
    }

    setConnectorSaving(connector);
    setConnectorMessage(null);
    try {
      const result = await dataService.updateConnectorConfig(connector, {
        baseUrl: draft.baseUrl,
        token: draft.token,
        probe: true,
      });
      setConnectorStatuses(current => current.map(status => status.connector === connector ? result.status : status));
      setConnectorDrafts(current => ({
        ...current,
        [connector]: {
          baseUrl: result.config.baseUrl || draft.baseUrl,
          token: '',
        },
      }));
      setConnectorMessage(
        result.status.mode === 'live'
          ? `${connector} token updated and verified.`
          : `${connector} credentials saved, but probe returned ${result.status.mode}.`,
      );
    } catch (error) {
      setConnectorMessage(error instanceof Error ? error.message : `Failed to update ${connector}.`);
    } finally {
      setConnectorSaving(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#08111f] px-6 py-5 text-slate-100 custom-scrollbar">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Brain</div>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">Agent Platform</h2>
            <p className="mt-1 text-sm text-slate-400">
              {campaignState.markets?.join(' • ') || campaignState.locales?.join(' • ') || 'No markets configured'} · {campaignState.channel || 'No channel configured'} · persistent memory recall with live reengagement timing
            </p>
          </div>
          <button
            onClick={() => dataService.runAutomation(campaignState.id || 'main-campaign', 'brain-dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 shadow-sm hover:bg-indigo-500/15"
          >
            <Play className="h-4 w-4" />
            Trigger Brain
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => (
            <div key={card.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
              <div className="flex items-center gap-2 text-indigo-400">
                <div className="rounded-full bg-indigo-500/10 p-1.5">
                  <card.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-400">{card.label}</span>
              </div>
              <div className="mt-4 text-xl font-semibold text-white">{card.value}</div>
              <div className="mt-1 text-xs text-slate-500">{card.detail}</div>
            </div>
          ))}
        </div>

        {!hasBrainData && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] py-20 px-6 text-center">
            <Inbox className="h-12 w-12 text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold text-white">No brain activity yet</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Run the brain or trigger an automation cycle to populate the knowledge graph, memory recall, and decision history.
            </p>
            <button
              onClick={() => dataService.runAutomation(campaignState.id || 'main-campaign', 'brain-dashboard')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 shadow-sm transition hover:bg-indigo-500/15"
            >
              <Play className="h-4 w-4" />
              Trigger Brain
            </button>
          </div>
        )}

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Weekly Activity
            </div>
            <div className="text-xs text-slate-500">{state.decisions?.length || 0} decisions</div>
          </div>
          <div className="h-28">
            {decisionSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                No live decision history yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={decisionSeries}>
                  <defs>
                    <linearGradient id="brain-activity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="brain-variants" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c4b5fd" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#c4b5fd" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', fontSize: '12px', color: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="variants" stroke="#ddd6fe" fill="url(#brain-variants)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="activity" stroke="#8b5cf6" fill="url(#brain-activity)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
          <div className="border-b border-white/10 px-5 pt-4">
            <div className="flex gap-6 text-sm">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 pb-3 transition-colors ${
                    activeTab === tab ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.8fr_0.9fr]">
            <div className="min-h-[470px] border-r border-white/10 p-5">
              {activeTab === 'Knowledge Graph' && (
                <div className="relative h-full min-h-[430px] overflow-hidden rounded-[24px] bg-[#0b1526]">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                    {edges.map(([from, to], index) => {
                      const a = nodes.find(node => node.id === from);
                      const b = nodes.find(node => node.id === to);
                      if (!a || !b) return null;
                      return <line key={`${from}-${to}-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#6366f1" strokeWidth="0.35" />;
                    })}
                  </svg>
                  {nodes.map(node => (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                      <div className={`rounded-full ${node.tone} shadow-[0_0_0_12px_rgba(167,139,250,0.06)]`} style={{ width: node.size * 2, height: node.size * 2 }} />
                      <div className="mt-2 whitespace-nowrap text-center text-[11px] font-medium text-slate-300">{node.label}</div>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'Memory Recall' && (
                <div className="space-y-3">
                  {playbooks.length === 0 ? (
                    <div className="flex min-h-[430px] items-center justify-center rounded-[24px] bg-white/[0.04] text-sm text-slate-400">
                      No procedural memory has been promoted yet.
                    </div>
                  ) : (
                    playbooks.map(playbook => (
                      <div key={playbook.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-white">{playbook.segment} · {playbook.region}</div>
                          <div className="text-xs font-semibold text-violet-400">{formatPercent(playbook.confidence)}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          {playbook.recommendedChannel} every {playbook.cadenceDays} days · win rate {formatPercent(playbook.winRate)} · risk {formatPercent(playbook.riskRate)}
                        </div>
                        <div className="mt-2 text-sm text-slate-400">{playbook.rationale}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'Research Feed' && (
                <div className="space-y-3">
                  {researchRecords.length === 0 ? (
                    <div className="flex min-h-[430px] items-center justify-center rounded-[24px] bg-white/[0.04] text-sm text-slate-400">
                      No sourced research records have been ingested yet.
                    </div>
                  ) : (
                    researchRecords
                      .slice()
                      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
                      .map(record => (
                        <div key={record.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-white">{record.company || record.targetId}</div>
                              <div className="mt-1 text-xs text-slate-400">
                                {record.segment || 'No segment'} · {record.region || 'No region'} · {record.preferredChannel || 'No preferred channel'}
                              </div>
                            </div>
                            {record.metadata?.sourceUrl && (
                              <a
                                href={record.metadata.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300"
                              >
                                Source
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="mt-3 text-sm text-slate-400">{record.notes || 'No analyst note recorded.'}</div>
                          <div className="mt-3 grid gap-2 md:grid-cols-3">
                            <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-400">Fit {formatPercent(record.fitScore)}</div>
                            <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-400">Intent {formatPercent(record.intentScore)}</div>
                            <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-400">Recency {formatPercent(record.recencyScore)}</div>
                          </div>
                          {!!record.metadata?.evidence?.length && (
                            <div className="mt-3 space-y-1">
                              {record.metadata.evidence.slice(0, 3).map((item, index) => (
                                <div key={`${record.id}-evidence-${index}`} className="text-xs text-slate-500">
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              )}

              {activeTab === 'Reengagement' && (
                <div className="space-y-3">
                  {(reengagement?.queue || []).length === 0 ? (
                    <div className="flex min-h-[430px] items-center justify-center rounded-[24px] bg-white/[0.04] text-sm text-slate-400">
                      No reengagement queue is ready yet.
                    </div>
                  ) : (
                    reengagement?.queue.map((target: any) => (
                      <div key={target.targetId} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-white">{target.company || target.targetId}</div>
                          <div className="text-xs text-slate-400">{target.recommendedChannel || 'No channel'}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          next touch {formatShortDate(target.nextEligibleAt)} · score {formatPercent(target.score)}
                        </div>
                        <div className="mt-2 text-sm text-slate-400">{(target.reasons || []).join(' · ') || 'No memory-backed reason recorded.'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <BrainCircuit className="h-4 w-4 text-violet-500" />
                  Brain Summary
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-400">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Latest Action</div>
                    <div className="mt-1 font-medium text-white">{latestDecision?.plan?.recommendedAction?.type || 'No live action'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Memory Status</div>
                    <div className="mt-1">{state.memory?.memoryConsolidations?.length ? `Consolidated ${state.memory.memoryConsolidations.length} times` : 'No consolidation history yet'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Where Data Lives</div>
                    <div className="mt-1">{campaignState.channel || 'No channel configured'} · {analyticsEvents.length} analytics · {outreachEvents.length} outreach</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <MemoryStick className="h-4 w-4 text-violet-500" />
                  Memory Recall
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Playbooks</span>
                    <span>{playbooks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Profiles</span>
                    <span>{targetProfiles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Episodic Events</span>
                    <span>{episodicEvents.length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Inbox className="h-4 w-4 text-violet-500" />
                  Signal Intake
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Research Records</span>
                    <span>{researchRecords.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outreach Events</span>
                    <span>{outreachEvents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Analytics Events</span>
                    <span>{analyticsEvents.length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Cable className="h-4 w-4 text-violet-500" />
                  Connector Rails
                </div>
                <div className="mt-4 space-y-2">
                  {connectorStatuses.map(status => (
                    <div key={status.connector} className="rounded-xl bg-white/[0.06] px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-200">{status.connector}</div>
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${
                          status.mode === 'live' || status.mode === 'ready'
                            ? 'text-emerald-400'
                            : status.mode === 'dry-run'
                              ? 'text-amber-400'
                              : status.mode === 'auth-error'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                        }`}>
                          {status.mode}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {status.configured ? status.baseUrl || 'Configured' : 'Missing base URL or token'}
                      </div>
                      {status.tokenLikelyRotated && (
                        <div className="mt-1 text-[11px] text-rose-500">Token rejected by connector. Replace it below.</div>
                      )}
                      {status.error && <div className="mt-1 text-[11px] text-rose-500">{status.error}</div>}
                      {status.diagnosis?.recommendations?.length ? (
                        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-300">
                          {status.diagnosis.recommendations[0]}
                        </div>
                      ) : null}
                      <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <input
                          value={connectorDrafts[status.connector]?.baseUrl || ''}
                          onChange={event => setConnectorDrafts(current => ({
                            ...current,
                            [status.connector]: {
                              baseUrl: event.target.value,
                              token: current[status.connector]?.token || '',
                            },
                          }))}
                          placeholder={`${status.connector} base URL`}
                          className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-400"
                        />
                        <input
                          type="password"
                          value={connectorDrafts[status.connector]?.token || ''}
                          onChange={event => setConnectorDrafts(current => ({
                            ...current,
                            [status.connector]: {
                              baseUrl: current[status.connector]?.baseUrl || status.baseUrl || '',
                              token: event.target.value,
                            },
                          }))}
                          placeholder={`New ${status.connector} token`}
                          className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-400"
                        />
                        <button
                          onClick={() => saveConnector(status.connector)}
                          disabled={connectorSaving === status.connector}
                          className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {connectorSaving === status.connector ? 'Saving...' : `Update ${status.connector}`}
                        </button>
                      </div>
                    </div>
                  ))}
                  {connectorStatuses.length === 0 && (
                    <div className="text-xs text-slate-400">No connector rails discovered.</div>
                  )}
                  {openClawDiagnostics.some(item => !item.ready) && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-300">
                      {openClawDiagnostics.filter(item => !item.ready).map(item => (
                        <div key={`diagnostic-${item.connector}`} className="mb-2 last:mb-0">
                          <div className="font-semibold">{item.connector}: {item.summary}</div>
                          {item.recommendations[0] ? <div className="mt-1">{item.recommendations[0]}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                  {connectorMessage && (
                    <div className="text-xs text-slate-500">{connectorMessage}</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <ClipboardList className="h-4 w-4 text-violet-500" />
                  Setup Requirements
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Live Connector Env</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(setupRequirements?.environment.requiredForLiveConnectors || []).map(item => (
                        <span key={item} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-slate-400">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Accepted Outreach Events</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(setupRequirements?.outreachEventTypes || []).map(item => (
                        <span key={item} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-slate-400">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Target className="h-4 w-4 text-violet-500" />
                  Top Targets
                </div>
                <div className="mt-4 space-y-2">
                  {rankedTargets.slice(0, 3).map((profile: any) => (
                    <div key={profile.id} className="rounded-xl bg-white/[0.06] px-3 py-2">
                      <div className="text-xs font-semibold text-slate-200">{profile.company || profile.targetId}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {profile.segment || 'No segment'} · {profile.recommendedChannel || 'No channel'} · {profile.recommendation || 'no recommendation'}
                      </div>
                    </div>
                  ))}
                  {rankedTargets.length === 0 && (
                    <div className="text-xs text-slate-400">No memory-backed targets available yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Bot className="h-4 w-4 text-violet-500" />
                  Scheduler
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={state.scheduler?.running ? 'text-emerald-400' : 'text-slate-500'}>
                      {state.scheduler?.running ? 'Running' : 'Stopped'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interval</span>
                    <span>{state.scheduler?.intervalSeconds ? `${state.scheduler.intervalSeconds}s` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Tick</span>
                    <span>{formatShortDate(state.scheduler?.lastTickAt || undefined)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Agent Studio Output
                </div>
                <div className="mt-4 space-y-2">
                  {(latestPack?.variants || []).slice(0, 3).map((variant: any) => (
                    <div key={variant.locale} className="rounded-xl bg-white/[0.06] px-3 py-2">
                      <div className="text-xs font-semibold text-slate-200">{variant.locale}</div>
                      <div className="mt-1 text-xs text-slate-400">{variant.cta}</div>
                    </div>
                  ))}
                  {!(latestPack?.variants || []).length && (
                    <div className="text-xs text-slate-400">No live content pack available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
