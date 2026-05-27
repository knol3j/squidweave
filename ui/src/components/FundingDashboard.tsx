import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Banknote,
  Building2,
  Cable,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Mail,
  MailCheck,
  MessageSquare,
  Phone,
  Play,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { dataService, FundingInvestor, FundingPipeline, FundingOutreachEvent, FundingRun } from '../services/dataService';

/* ------------------------------------------------------------------ */
/*  Pipeline Stages (mirror real VC fundraising flow)                  */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES = [
  { key: 'sourced',    label: 'Sourced',    icon: Search,     color: 'text-slate-400',        bg: 'bg-slate-500/10',    border: 'border-slate-500/30' },
  { key: 'enriched',   label: 'Enriched',   icon: Mail,       color: 'text-blue-400',         bg: 'bg-blue-500/10',      border: 'border-blue-500/30' },
  { key: 'contacted',  label: 'Contacted',  icon: Send,       color: 'text-indigo-400',       bg: 'bg-indigo-500/10',    border: 'border-indigo-500/30' },
  { key: 'meeting',    label: 'Meeting',    icon: Users,      color: 'text-violet-400',       bg: 'bg-violet-500/10',    border: 'border-violet-500/30' },
  { key: 'dd',         label: 'Due Diligence', icon: Search,  color: 'text-amber-400',        bg: 'bg-amber-500/10',    border: 'border-amber-500/30' },
  { key: 'termsheet',  label: 'Term Sheet', icon: FileText,   color: 'text-emerald-400',      bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30' },
  { key: 'closed',     label: 'Closed',     icon: CheckCircle2, color: 'text-emerald-400',    bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function shortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shortDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function percent(value) {
  if (typeof value !== 'number') return '—';
  return `${Math.round(value * 100)}%`;
}

function scoreColor(score) {
  if (typeof score !== 'number') return 'text-slate-400';
  if (score >= 0.7) return 'text-emerald-400';
  if (score >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const stage = PIPELINE_STAGES.find(s => s.key === status);
  if (!stage) return <span className="text-[11px] text-slate-500">{status}</span>;
  const Icon = stage.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${stage.bg} ${stage.border} ${stage.color} px-2.5 py-0.5 text-[11px] font-medium`}>
      <Icon className="h-3 w-3" />
      {stage.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Investor Card                                                      */
/* ------------------------------------------------------------------ */

function InvestorCard({ investor, onSendDeck, onScheduleMeeting }) {
  const score = investor.score || investor.thesisMatch || 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-sm transition hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-white">{investor.fundName}</span>
            {investor.warmIntroPath && (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Warm
              </span>
            )}
          </div>
          {investor.partnerName && (
            <div className="mt-0.5 text-xs text-slate-400">{investor.partnerName}</div>
          )}
        </div>
        <StatusBadge status={investor.status} />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {investor.stageFocus?.slice(0, 2).map(s => (
          <span key={s} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-500">{s}</span>
        ))}
        {investor.sectors?.slice(0, 2).map(s => (
          <span key={s} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-500">{s}</span>
        ))}
        {investor.checkSize && (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">{investor.checkSize}</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px]">
        <span className={scoreColor(score)}>Score {percent(score)}</span>
        {investor.email && (
          <span className="text-slate-500">{investor.email}</span>
        )}
        {!investor.email && (
          <span className="text-amber-500">No email</span>
        )}
        {investor.lastContactAt && (
          <span className="text-slate-500">Contacted {shortDate(investor.lastContactAt)}</span>
        )}
      </div>

      {investor.notes && (
        <div className="mt-1.5 text-[11px] italic text-slate-500">{investor.notes}</div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {(investor.status === 'enriched' || investor.status === 'sourced') && (
          <button
            onClick={() => onSendDeck?.(investor)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium text-indigo-300 transition hover:bg-indigo-500/15"
          >
            <Send className="h-3 w-3" />
            Send Deck
          </button>
        )}
        {(investor.status === 'contacted' || investor.status === 'meeting') && (
          <button
            onClick={() => onScheduleMeeting?.(investor)}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-300 transition hover:bg-violet-500/15"
          >
            <Calendar className="h-3 w-3" />
            Log Meeting
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Column                                                    */
/* ------------------------------------------------------------------ */

function PipelineColumn({ stage, investors, onSendDeck, onScheduleMeeting }) {
  const Icon = stage.icon;
  return (
    <div className="flex w-[260px] shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] ${stage.color}`}>
          <Icon className="h-3.5 w-3.5" />
          {stage.label}
        </div>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-400">
          {investors.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {investors.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-8 text-[11px] text-slate-600">
            Empty
          </div>
        ) : (
          investors.map(inv => (
            <InvestorCard
              key={inv.id}
              investor={inv}
              onSendDeck={onSendDeck}
              onScheduleMeeting={onScheduleMeeting}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Enrichment Config Panel                                            */
/* ------------------------------------------------------------------ */

function EnrichmentConfigPanel() {
  const [providerStatus, setProviderStatus] = useState(null);

  useEffect(() => {
    dataService.getEnrichmentProvidersStatus()
      .then(setProviderStatus)
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Search className="h-4 w-4 text-indigo-400" />
          Email Enrichment
        </div>
        <span className="text-[10px] text-slate-500">Auto-finds partner emails</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Hunter.io</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              providerStatus?.hunter?.configured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'
            }`}>
              {providerStatus?.hunter?.configured ? 'Connected' : 'Not configured'}
            </span>
          </div>
          {providerStatus?.hunter?.keyPrefix && (
            <div className="mt-1 text-[10px] text-slate-600">Key: {providerStatus.hunter.keyPrefix}</div>
          )}
          {!providerStatus?.hunter?.configured && (
            <div className="mt-1 text-[10px] text-slate-600">Set HUNTER_API_KEY in .env</div>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Apollo.io</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              providerStatus?.apollo?.configured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'
            }`}>
              {providerStatus?.apollo?.configured ? 'Connected' : 'Not configured'}
            </span>
          </div>
          {providerStatus?.apollo?.keyPrefix && (
            <div className="mt-1 text-[10px] text-slate-600">Key: {providerStatus.apollo.keyPrefix}</div>
          )}
          {!providerStatus?.apollo?.configured && (
            <div className="mt-1 text-[10px] text-slate-600">Set APOLLO_API_KEY in .env</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Outreach Timeline                                                  */
/* ------------------------------------------------------------------ */

function OutreachTimeline({ events }) {
  if (!events?.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        No outreach events yet. Start the pipeline to log activity.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.slice().reverse().slice(0, 20).map((event, idx) => {
        const isLast = idx === 0;
        return (
          <div key={event.id || idx} className="relative flex gap-3 pl-4">
            {!isLast && <div className="absolute left-[7px] top-3 h-full w-px bg-white/10" />}
            <div className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ${
              event.type === 'deck_sent' ? 'bg-indigo-500'
              : event.type === 'meeting_scheduled' ? 'bg-violet-500'
              : event.type === 'meeting_completed' ? 'bg-emerald-500'
              : event.type === 'email_enriched' ? 'bg-blue-500'
              : event.type === 'follow_up' ? 'bg-amber-500'
              : event.type === 'intro_call' ? 'bg-cyan-500'
              : event.type === 'termsheet' ? 'bg-emerald-400'
              : event.type === 'closed' ? 'bg-green-400'
              : 'bg-slate-500'
            }`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">
                  {event.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-[10px] text-slate-600">{shortDateTime(event.timestamp)}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {event.channel} · {event.metadata?.score ? `Score ${percent(event.metadata.score)}` : ''}
              </div>
              {event.metadata?.reasons?.length > 0 && (
                <div className="mt-0.5 text-[10px] text-slate-600">
                  {event.metadata.reasons[0]}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Cards                                                      */
/* ------------------------------------------------------------------ */

function SummaryCards({ pipeline, runs, events }) {
  const cards = [
    {
      label: 'Pipeline Total',
      value: pipeline?.counts?.total || 0,
      detail: `${Object.keys(pipeline?.counts?.byStatus || {}).length} stages active`,
      icon: Target,
    },
    {
      label: 'Outreach Sent',
      value: events?.filter(e => e.type === 'deck_sent').length || 0,
      detail: `${runs?.length || 0} automation runs`,
      icon: Send,
    },
    {
      label: 'Enriched',
      value: pipeline?.counts?.byStatus?.enriched || 0,
      detail: `${pipeline?.counts?.byStatus?.contacted || 0} contacted so far`,
      icon: MailCheck,
    },
    {
      label: 'Meetings',
      value: (pipeline?.counts?.byStatus?.meeting || 0) + (pipeline?.counts?.byStatus?.dd || 0),
      detail: `${pipeline?.counts?.byStatus?.termsheet || 0} term sheets`,
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => (
        <div key={card.label} className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
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
  );
}

/* ------------------------------------------------------------------ */
/*  Main FundingDashboard Component                                    */
/* ------------------------------------------------------------------ */

export default function FundingDashboard() {
  const [pipeline, setPipeline] = useState(null);
  const [events, setEvents] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline'); // pipeline | timeline | config
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [sendingDeck, setSendingDeck] = useState(null);
  const [campaignId] = useState('main-campaign');

  const loadData = async () => {
    try {
      const [pipelineData, eventsData, runsData] = await Promise.all([
        dataService.getFundingPipeline(campaignId),
        dataService.getFundingOutreachEvents(campaignId),
        dataService.getFundingRuns(campaignId),
      ]);
      setPipeline(pipelineData);
      setEvents(eventsData);
      setRuns(runsData);
    } catch (err) {
      console.error('FundingDashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, [campaignId]);

  // Group investors by pipeline stage
  const stageGroups = useMemo(() => {
    const groups = {};
    for (const stage of PIPELINE_STAGES) {
      groups[stage.key] = [];
    }
    if (pipeline?.prioritized) {
      for (const inv of pipeline.prioritized) {
        const key = inv.status || 'sourced';
        if (groups[key]) {
          groups[key].push(inv);
        } else {
          groups['sourced'].push(inv);
        }
      }
    }
    return groups;
  }, [pipeline]);

  const runFunding = async () => {
    try {
      await dataService.runFunding(campaignId);
      await loadData();
    } catch (err) {
      console.error('runFunding error:', err);
    }
  };

  const handleEnrichAll = async () => {
    setEnrichingAll(true);
    try {
      await dataService.runEnrichment(campaignId);
      await loadData();
    } catch (err) {
      console.error('enrichAll error:', err);
    } finally {
      setEnrichingAll(false);
    }
  };

  const handleSendDeck = async (investor) => {
    setSendingDeck(investor.id);
    try {
      await dataService.sendInvestorDeck(campaignId, investor.id);
      await loadData();
    } catch (err) {
      console.error('sendDeck error:', err);
    } finally {
      setSendingDeck(null);
    }
  };

  const handleScheduleMeeting = async (investor) => {
    // For now, log a meeting event
    try {
      await dataService.logInvestorEvent(campaignId, investor.id, { type: 'meeting_scheduled', channel: 'email' });
      await loadData();
    } catch (err) {
      console.error('scheduleMeeting error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#08111f]">
        <div className="flex items-center gap-3 text-slate-400">
          <Activity className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Loading funding pipeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#08111f] px-6 py-5 text-slate-100 custom-scrollbar">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Funding Pipeline
            </div>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">
              Investor Outreach
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {pipeline?.counts?.total || 0} investors · {events?.length || 0} outreach events · automated enrichment + deck sending
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEnrichAll}
              disabled={enrichingAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 shadow-sm transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {enrichingAll ? 'Enriching...' : 'Enrich All'}
            </button>
            <button
              onClick={runFunding}
              className="inline-flex items-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 shadow-sm transition hover:bg-indigo-500/15"
            >
              <Send className="h-4 w-4" />
              Run Pipeline
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards pipeline={pipeline} runs={runs} events={events} />

        {/* Tabs */}
        <div className="border-b border-white/10">
          <div className="flex gap-6 text-sm">
            {[
              { key: 'pipeline', icon: Target, label: 'Pipeline Board' },
              { key: 'timeline', icon: Activity, label: 'Outreach Timeline' },
              { key: 'config', icon: Cable, label: 'Enrichment Config' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 pb-3 transition-colors ${
                  activeTab === tab.key ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'pipeline' && (
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-4">
              {PIPELINE_STAGES.map(stage => (
                <PipelineColumn
                  key={stage.key}
                  stage={stage}
                  investors={stageGroups[stage.key] || []}
                  onSendDeck={handleSendDeck}
                  onScheduleMeeting={handleScheduleMeeting}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Activity className="h-4 w-4 text-indigo-400" />
                Outreach History
              </div>
              <span className="text-xs text-slate-500">{events?.length || 0} events</span>
            </div>
            <OutreachTimeline events={events} />
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <EnrichmentConfigPanel />
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <RefreshCw className="h-4 w-4 text-indigo-400" />
                  Automation Runs
                </div>
                <span className="text-[10px] text-slate-500">{runs?.length || 0} total</span>
              </div>
              <div className="mt-3 space-y-2">
                {(runs || []).slice().reverse().slice(0, 10).map(run => (
                  <div key={run.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div>
                      <div className="text-xs font-medium text-slate-300">{run.type}</div>
                      <div className="text-[10px] text-slate-600">{shortDateTime(run.createdAt)}</div>
                    </div>
                    <span className="text-[10px] text-slate-500">{run.eventsCount || 0} events</span>
                  </div>
                ))}
                {(!runs || runs.length === 0) && (
                  <div className="py-6 text-center text-xs text-slate-600">No runs yet</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
