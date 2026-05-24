import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Database,
  Globe2,
  Layers3,
  MailPlus,
  Radar,
  Search,
  Sparkles,
  Target,
  Upload,
  WandSparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCollaboration } from './CollaborationProvider';
import {
  dataService,
  ProspectingPlan,
  ProspectingRun,
  ResearchRecord,
  SourcedContact,
} from '../services/dataService';
import { AGENT_STAGES, AGENT_SYSTEM, getAllAgentIds } from '../lib/agentSystem';

type IntakeDraft = {
  clientName: string;
  brandName: string;
  clientNeed: string;
  audience: string;
  offer: string;
  markets: string;
  channel: string;
  brandVoice: string;
  differentiators: string;
  constraints: string;
  successDefinition: string;
  successMetrics: string;
  researchObjectives: string;
};

type ResearchDraft = {
  source: string;
  targetId: string;
  company: string;
  contactName: string;
  title: string;
  segment: string;
  region: string;
  preferredChannel: string;
  channels: string;
  fitScore: string;
  intentScore: string;
  recencyScore: string;
  estimatedReach: string;
  sourceUrl: string;
  evidence: string;
  notes: string;
};

type ContactImportDraft = {
  source: string;
  rows: string;
};

function splitList(value: string) {
  return value
    .split(/[\n,]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function percent(value?: number | null) {
  if (typeof value !== 'number') {
    return 'N/A';
  }
  return `${Math.round(value * 100)}%`;
}

function buildIntakeDraft(campaignState: ReturnType<typeof useCollaboration>['campaignState']): IntakeDraft {
  return {
    clientName: campaignState.clientName || '',
    brandName: campaignState.name || '',
    clientNeed: campaignState.clientNeed || campaignState.activePrompt || campaignState.objective || '',
    audience: campaignState.audience || '',
    offer: campaignState.offer || '',
    markets: (campaignState.markets || campaignState.locales || []).join(', '),
    channel: campaignState.channel || '',
    brandVoice: campaignState.brandVoice || '',
    differentiators: campaignState.differentiators || '',
    constraints: campaignState.constraints || '',
    successDefinition: campaignState.successDefinition || '',
    successMetrics: (campaignState.successMetrics || []).join('\n'),
    researchObjectives: (campaignState.researchObjectives || []).join('\n'),
  };
}

function emptyResearchDraft(): ResearchDraft {
  return {
    source: 'manual-ingest',
    targetId: '',
    company: '',
    contactName: '',
    title: '',
    segment: '',
    region: '',
    preferredChannel: '',
    channels: '',
    fitScore: '0.8',
    intentScore: '0.75',
    recencyScore: '0.7',
    estimatedReach: '',
    sourceUrl: '',
    evidence: '',
    notes: '',
  };
}

function emptyContactImportDraft(): ContactImportDraft {
  return {
    source: 'manual-import',
    rows: '',
  };
}

function parseContactImportRows(rows: string): Partial<SourcedContact>[] {
  return rows
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [company, fullName, title, email, linkedinUrl, region, segment] = line.split('|').map(part => part.trim());
      return {
        company,
        fullName,
        title,
        email,
        linkedinUrl,
        region,
        segment,
      };
    })
    .filter(contact => contact.company || contact.fullName || contact.email);
}

export default function CampaignPreview() {
  const { messages, campaignState, updateCampaignState } = useCollaboration();
  const [researchRecords, setResearchRecords] = React.useState<ResearchRecord[]>([]);
  const [prospectingPlan, setProspectingPlan] = React.useState<ProspectingPlan | null>(null);
  const [prospects, setProspects] = React.useState<SourcedContact[]>([]);
  const [prospectingRuns, setProspectingRuns] = React.useState<ProspectingRun[]>([]);
  const [intakeDraft, setIntakeDraft] = React.useState<IntakeDraft>(() => buildIntakeDraft(campaignState));
  const [researchDraft, setResearchDraft] = React.useState<ResearchDraft>(() => emptyResearchDraft());
  const [contactImportDraft, setContactImportDraft] = React.useState<ContactImportDraft>(() => emptyContactImportDraft());
  const [intakeSaving, setIntakeSaving] = React.useState(false);
  const [researchSaving, setResearchSaving] = React.useState(false);
  const [prospectingLoading, setProspectingLoading] = React.useState(false);
  const [prospectingRunning, setProspectingRunning] = React.useState(false);
  const [contactImporting, setContactImporting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const refreshResearch = React.useCallback(async () => {
    const records = await dataService.getResearchRecords(campaignState.id || 'main-campaign');
    setResearchRecords(records);
  }, [campaignState.id]);

  const refreshProspecting = React.useCallback(async () => {
    const campaignId = campaignState.id || 'main-campaign';
    const [plan, nextProspects, runs] = await Promise.all([
      dataService.getProspectingPlan(campaignId),
      dataService.getProspects(campaignId),
      dataService.getProspectingRuns(campaignId),
    ]);
    setProspectingPlan(plan);
    setProspects(nextProspects);
    setProspectingRuns(runs);
  }, [campaignState.id]);

  React.useEffect(() => {
    setIntakeDraft(buildIntakeDraft(campaignState));
  }, [
    campaignState.clientName,
    campaignState.name,
    campaignState.clientNeed,
    campaignState.activePrompt,
    campaignState.objective,
    campaignState.audience,
    campaignState.offer,
    campaignState.markets,
    campaignState.locales,
    campaignState.channel,
    campaignState.brandVoice,
    campaignState.differentiators,
    campaignState.constraints,
    campaignState.successDefinition,
    campaignState.successMetrics,
    campaignState.researchObjectives,
  ]);

  React.useEffect(() => {
    refreshResearch().catch(error => console.error(error));
  }, [refreshResearch]);

  React.useEffect(() => {
    setProspectingLoading(true);
    refreshProspecting()
      .catch(error => console.error(error))
      .finally(() => setProspectingLoading(false));
  }, [refreshProspecting]);

  const lastCampaign = React.useMemo(
    () => [...messages].reverse().find(message => message.role === 'assistant' && message.content.includes('[Campaign Strategy]')),
    [messages],
  );

  const enabledModules = campaignState.enabledModules || [];
  const agentGroups = AGENT_STAGES.map(stage => ({
    stage,
    agents: AGENT_SYSTEM.filter(agent => agent.stage === stage),
  }));
  const enabledSet = new Set(enabledModules);
  const coverage = Math.round((enabledModules.length / AGENT_SYSTEM.length) * 100);
  const topResearch = researchRecords
    .slice()
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, 6);
  const uniqueTargets = new Set(researchRecords.map(record => record.targetId)).size;
  const recentProspects = prospects
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8);
  const latestProspectingRun = prospectingRuns
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

  const handleIntakeSave = async () => {
    setIntakeSaving(true);
    setStatusMessage(null);
    try {
      const markets = splitList(intakeDraft.markets);
      const researchObjectives = splitList(intakeDraft.researchObjectives);
      const successMetrics = splitList(intakeDraft.successMetrics);
      await updateCampaignState({
        name: intakeDraft.brandName || campaignState.name || 'Main Campaign',
        clientName: intakeDraft.clientName,
        clientNeed: intakeDraft.clientNeed,
        activePrompt: intakeDraft.clientNeed,
        objective: intakeDraft.clientNeed,
        audience: intakeDraft.audience,
        offer: intakeDraft.offer,
        markets,
        locales: markets.length ? markets : campaignState.locales,
        channel: intakeDraft.channel,
        brandVoice: intakeDraft.brandVoice,
        differentiators: intakeDraft.differentiators,
        constraints: intakeDraft.constraints,
        successDefinition: intakeDraft.successDefinition,
        successMetrics,
        researchObjectives,
        intakeStatus: 'ready',
      });
      setStatusMessage('Client intake saved. The brain now has a concrete mission brief.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Failed to save the client intake.');
    } finally {
      setIntakeSaving(false);
    }
  };

  const handleResearchSubmit = async () => {
    if (!researchDraft.targetId.trim()) {
      setStatusMessage('Research records require a target ID.');
      return;
    }

    setResearchSaving(true);
    setStatusMessage(null);
    try {
      await dataService.addResearchRecord({
        campaignId: campaignState.id || 'main-campaign',
        targetId: researchDraft.targetId.trim(),
        source: researchDraft.source.trim() || 'manual-ingest',
        company: researchDraft.company.trim(),
        contactName: researchDraft.contactName.trim(),
        title: researchDraft.title.trim(),
        segment: researchDraft.segment.trim(),
        region: researchDraft.region.trim(),
        preferredChannel: researchDraft.preferredChannel.trim(),
        channels: splitList(researchDraft.channels),
        fitScore: Number(researchDraft.fitScore),
        intentScore: Number(researchDraft.intentScore),
        recencyScore: Number(researchDraft.recencyScore),
        estimatedReach: researchDraft.estimatedReach ? Number(researchDraft.estimatedReach) : undefined,
        notes: researchDraft.notes.trim(),
        metadata: {
          sourceUrl: researchDraft.sourceUrl.trim() || undefined,
          evidence: splitList(researchDraft.evidence),
        },
      });
      await refreshResearch();
      setResearchDraft(emptyResearchDraft());
      setStatusMessage('Research record ingested into the brain.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Failed to ingest the research record.');
    } finally {
      setResearchSaving(false);
    }
  };

  const handleProspectingRun = async () => {
    setProspectingRunning(true);
    setStatusMessage(null);
    try {
      const campaignId = campaignState.id || 'main-campaign';
      const result = await dataService.generateProspects(campaignId, {
        reason: 'mission-control-run',
        limit: 24,
      });
      setProspectingPlan(result.plan);
      setProspects(result.candidates);
      setProspectingRuns(current => [result.run, ...current]);
      setStatusMessage(`Generated ${result.candidates.length} candidate contacts for enrichment and outreach review.`);
    } catch (error) {
      console.error(error);
      setStatusMessage('Failed to generate candidate contacts.');
    } finally {
      setProspectingRunning(false);
    }
  };

  const handleContactImport = async () => {
    const contacts = parseContactImportRows(contactImportDraft.rows);
    if (!contacts.length) {
      setStatusMessage('Add at least one contact row to import.');
      return;
    }

    setContactImporting(true);
    setStatusMessage(null);
    try {
      const imported = await dataService.importProspects(
        campaignState.id || 'main-campaign',
        contacts,
        contactImportDraft.source.trim() || 'manual-import',
      );
      setProspects(current => [...imported, ...current]);
      setContactImportDraft(emptyContactImportDraft());
      await refreshProspecting();
      setStatusMessage(`Imported ${imported.length} validated contacts into the sourcing queue.`);
    } catch (error) {
      console.error(error);
      setStatusMessage('Failed to import contacts.');
    } finally {
      setContactImporting(false);
    }
  };

  const sections = lastCampaign?.content.split(/(\[.*?\]:)/g) || [];

  return (
    <div className="h-full overflow-y-auto bg-[#08111f] p-4 md:p-8 custom-scrollbar">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              <ClipboardList className="h-3.5 w-3.5 text-indigo-400" />
              Client Intake and Market Operating System
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Marketing Mission Control</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              This replaces the shallow landing view with the front door the product was missing: client mandate capture,
              full-funnel autonomous agent coverage, and structured research ingestion for the brain.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Agents Online', value: `${enabledModules.length}/${AGENT_SYSTEM.length}` },
              { label: 'Coverage', value: `${coverage}%` },
              { label: 'Research Records', value: `${researchRecords.length}` },
              { label: 'Unique Targets', value: `${uniqueTargets}` },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                <div className="mt-2 text-xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Target className="h-3.5 w-3.5 text-indigo-400" />
                  Client Intake
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Capture what the client actually wants</h3>
              </div>
              <button
                onClick={handleIntakeSave}
                disabled={intakeSaving}
                className="rounded-2xl bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-indigo-400 disabled:opacity-60"
              >
                {intakeSaving ? 'Saving...' : 'Save Brief'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { key: 'clientName', label: 'Client Name', placeholder: 'Acme Growth Team' },
                { key: 'brandName', label: 'Brand / Campaign Name', placeholder: 'Acme Pipeline Acceleration' },
                { key: 'audience', label: 'Target Audience', placeholder: 'VP Revenue, demand gen leaders, founders' },
                { key: 'offer', label: 'Primary Offer', placeholder: 'Book a 20 minute audit' },
                { key: 'markets', label: 'Markets / Locales', placeholder: 'en-US, de-DE, UK SaaS, DACH fintech' },
                { key: 'channel', label: 'Primary Channel', placeholder: 'LinkedIn + email + landing page' },
                { key: 'brandVoice', label: 'Brand Voice', placeholder: 'Direct, expert, specific, no fluff' },
                { key: 'successDefinition', label: 'Success Definition', placeholder: '20 SQLs/month with CAC under target' },
              ].map(field => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{field.label}</span>
                  <input
                    value={intakeDraft[field.key as keyof IntakeDraft]}
                    onChange={event => setIntakeDraft(current => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              {[
                { key: 'clientNeed', label: 'What the client wants', rows: 4, placeholder: 'Describe the concrete business outcome, urgency, and non-negotiables.' },
                { key: 'differentiators', label: 'Differentiators and proof', rows: 3, placeholder: 'Why should the market trust this offer? What proof exists?' },
                { key: 'constraints', label: 'Constraints, risk, and guardrails', rows: 3, placeholder: 'Budget, legal boundaries, tone constraints, product realities, prohibited claims.' },
                { key: 'successMetrics', label: 'Success metrics', rows: 3, placeholder: 'One metric per line: SQLs, CAC, reply rate, retention, expansion revenue.' },
                { key: 'researchObjectives', label: 'Research objectives for the agent swarm', rows: 3, placeholder: 'One objective per line: competitors, ICP signals, objections, trends, retention blockers.' },
              ].map(field => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{field.label}</span>
                  <textarea
                    rows={field.rows}
                    value={intakeDraft[field.key as keyof IntakeDraft]}
                    onChange={event => setIntakeDraft(current => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-[24px] border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50"
                  />
                </label>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Bot className="h-3.5 w-3.5 text-fuchsia-400" />
                  Autonomous Coverage
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">One agent for each marketing job</h3>
              </div>
              <button
                onClick={() => updateCampaignState({ enabledModules: getAllAgentIds() })}
                className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-500/15"
              >
                Enable All
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {agentGroups.map(group => (
                <div key={group.stage} className="rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Layers3 className="h-4 w-4 text-indigo-400" />
                      {group.stage}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {group.agents.filter(agent => enabledSet.has(agent.id)).length}/{group.agents.length} enabled
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.agents.map(agent => {
                      const active = enabledSet.has(agent.id);
                      return (
                        <button
                          key={agent.id}
                          onClick={() => updateCampaignState({
                            enabledModules: active
                              ? enabledModules.filter(id => id !== agent.id)
                              : [...enabledModules, agent.id],
                          })}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            active
                              ? 'border-emerald-500/20 bg-emerald-500/10'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-white">{agent.label}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-400">{agent.description}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${active ? 'text-emerald-300' : 'text-slate-500'}`}>
                                {active ? 'online' : 'offline'}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">{agent.outcome}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                  Research Intake
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Feed the brain structured evidence</h3>
              </div>
              <button
                onClick={handleResearchSubmit}
                disabled={researchSaving}
                className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
              >
                {researchSaving ? 'Ingesting...' : 'Ingest Record'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { key: 'source', label: 'Source', placeholder: 'G2, LinkedIn, analyst note' },
                { key: 'targetId', label: 'Target ID', placeholder: 'segment-dach-revops-001' },
                { key: 'company', label: 'Company', placeholder: 'Acme GmbH' },
                { key: 'contactName', label: 'Contact Name', placeholder: 'Morgan Lee' },
                { key: 'title', label: 'Title', placeholder: 'VP Revenue Operations' },
                { key: 'segment', label: 'Segment', placeholder: 'Mid-market SaaS' },
                { key: 'region', label: 'Region', placeholder: 'DACH' },
                { key: 'preferredChannel', label: 'Preferred Channel', placeholder: 'linkedin' },
                { key: 'channels', label: 'All Channels', placeholder: 'linkedin, email, webinar' },
                { key: 'estimatedReach', label: 'Estimated Reach', placeholder: '5400' },
                { key: 'fitScore', label: 'Fit Score', placeholder: '0.0 - 1.0' },
                { key: 'intentScore', label: 'Intent Score', placeholder: '0.0 - 1.0' },
                { key: 'recencyScore', label: 'Recency Score', placeholder: '0.0 - 1.0' },
                { key: 'sourceUrl', label: 'Source URL', placeholder: 'https://...' },
              ].map(field => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{field.label}</span>
                  <input
                    value={researchDraft[field.key as keyof ResearchDraft]}
                    onChange={event => setResearchDraft(current => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence bullets</span>
                <textarea
                  rows={4}
                  value={researchDraft.evidence}
                  onChange={event => setResearchDraft(current => ({ ...current, evidence: event.target.value }))}
                  placeholder={'One evidence point per line.\nRecent funding event\nNew regional expansion\nHiring SDR leadership'}
                  className="w-full rounded-[24px] border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notes for the brain</span>
                <textarea
                  rows={4}
                  value={researchDraft.notes}
                  onChange={event => setResearchDraft(current => ({ ...current, notes: event.target.value }))}
                  placeholder="Why this target matters, what pain was observed, what message angle is likely to land."
                  className="w-full rounded-[24px] border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                  Live Research Feed
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Recent target intelligence</h3>
              </div>
              <button
                onClick={() => refreshResearch().catch(error => console.error(error))}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/[0.05]"
              >
                Refresh
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { label: 'Records', value: researchRecords.length },
                { label: 'Targets', value: uniqueTargets },
                { label: 'Objectives', value: (campaignState.researchObjectives || []).length },
                { label: 'Markets', value: (campaignState.markets || campaignState.locales || []).length },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[#0b1526] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {topResearch.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-[#0b1526] px-6 text-center">
                  <Search className="h-8 w-8 text-slate-600" />
                  <p className="mt-4 text-sm text-slate-400">No research has been ingested yet. The brain needs structured evidence before it can rank targets with confidence.</p>
                </div>
              ) : (
                topResearch.map(record => (
                  <div key={record.id} className="rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{record.company || record.targetId}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {record.title || 'Unknown role'} · {record.segment || 'Unclassified segment'} · {record.region || 'Unknown region'}
                        </div>
                      </div>
                      <div className="text-right text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        <div>{record.source}</div>
                        <div className="mt-1">{new Date(record.capturedAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Fit {percent(record.fitScore)}</span>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Intent {percent(record.intentScore)}</span>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Recency {percent(record.recencyScore)}</span>
                      {record.preferredChannel && <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-200">{record.preferredChannel}</span>}
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-400">{record.notes || 'No notes captured for this target yet.'}</p>

                    {!!record.metadata?.evidence?.length && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Evidence</div>
                        <div className="mt-2 space-y-1 text-sm text-slate-300">
                          {record.metadata.evidence.slice(0, 3).map(item => (
                            <div key={item}>{item}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-400" />
                  Contact Sourcing Engine
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Automate account selection and buyer discovery</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  This workflow turns campaign intake and research evidence into a compliant sourcing plan, buyer-role map,
                  enrichment checklist, and outreach-ready contact queue.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setProspectingLoading(true);
                    refreshProspecting()
                      .catch(error => console.error(error))
                      .finally(() => setProspectingLoading(false));
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/[0.05]"
                >
                  Refresh
                </button>
                <button
                  onClick={handleProspectingRun}
                  disabled={prospectingRunning}
                  className="rounded-2xl bg-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                >
                  {prospectingRunning ? 'Generating...' : 'Generate Queue'}
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Top Accounts', value: prospectingPlan?.topAccounts.length || 0 },
                { label: 'Stored Contacts', value: prospects.length },
                { label: 'Runs', value: prospectingRuns.length },
                { label: 'Actionable Targets', value: prospectingPlan?.targetSummary.actionableTargets || 0 },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[#0b1526] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Priority accounts</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {prospectingLoading ? 'Loading' : 'Live plan'}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {prospectingPlan?.topAccounts.length ? (
                    prospectingPlan.topAccounts.map(account => (
                      <div key={`${account.targetId}-${account.company}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{account.company}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {account.segment || 'Unclassified segment'} · {account.region || 'Unknown region'}
                            </div>
                          </div>
                          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">
                            {account.preferredChannel || 'channel pending'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {account.roleClusters.slice(0, 4).map(role => (
                            <span key={role} className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">
                              {role}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {account.sourceMix.map(source => (
                            <span key={source} className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100">
                              {source}
                            </span>
                          ))}
                        </div>
                        {!!account.evidence.length && (
                          <div className="mt-3 text-xs leading-5 text-slate-400">
                            {account.evidence.join(' · ')}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/10 px-5 py-8 text-sm text-slate-400">
                      Add research records first. The sourcing engine uses those records to pick accounts and infer likely buyer roles.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
                  <div className="text-sm font-semibold text-white">Sourcing workflow</div>
                  <div className="mt-4 space-y-3">
                    {(prospectingPlan?.sourcingWorkflow || []).map(step => (
                      <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
                  <div className="text-sm font-semibold text-white">Enrichment and compliance checklist</div>
                  <div className="mt-4 space-y-2">
                    {(prospectingPlan?.enrichmentChecklist || []).map(item => (
                      <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
                  <div className="text-sm font-semibold text-white">Procedural memory signals</div>
                  <div className="mt-4 space-y-3">
                    {prospectingPlan?.proceduralSignals.length ? (
                      prospectingPlan.proceduralSignals.map(signal => (
                        <div key={`${signal.segment}-${signal.region}-${signal.channel}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="text-sm text-white">{signal.segment || 'Unknown segment'}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {signal.region || 'Global'} · {signal.channel || 'No channel'} · {percent(signal.confidence)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
                        No learned sourcing patterns yet. As campaigns run, Hermes-backed memory can feed this panel.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <MailPlus className="h-3.5 w-3.5 text-emerald-400" />
                  Prospect Queue
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Generated buyers and imported contacts</h3>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1526] px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                {latestProspectingRun ? `${latestProspectingRun.generatedCandidates} last generated` : 'No run yet'}
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Manual or vendor-enriched import</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Paste one contact per line in this format: company | full name | title | email | LinkedIn URL | region | segment
                  </p>
                </div>
                <button
                  onClick={handleContactImport}
                  disabled={contactImporting}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-60"
                >
                  {contactImporting ? 'Importing...' : 'Import Contacts'}
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Import source</span>
                  <input
                    value={contactImportDraft.source}
                    onChange={event => setContactImportDraft(current => ({ ...current, source: event.target.value }))}
                    placeholder="apollo, crm-export, manual-import"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contact rows</span>
                  <textarea
                    rows={6}
                    value={contactImportDraft.rows}
                    onChange={event => setContactImportDraft(current => ({ ...current, rows: event.target.value }))}
                    placeholder={'Acme | Morgan Lee | VP Revenue Operations | morgan@acme.com | https://linkedin.com/in/morgan | DACH | Mid-market SaaS\nNorthwind | Jamie Fox | Head of Growth | jamie@northwind.io | https://linkedin.com/in/jamie | US | PLG SaaS'}
                    className="w-full rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recentProspects.length ? (
                recentProspects.map(contact => (
                  <div key={contact.id} className="rounded-[24px] border border-white/10 bg-[#0b1526] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{contact.fullName || contact.role || contact.company}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {contact.company} · {contact.title || contact.role || 'Role pending'} · {contact.region || 'Unknown region'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{contact.contactStatus}</div>
                        <div className="mt-1 text-xs text-emerald-300">{percent(contact.score)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {contact.preferredChannel && (
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">{contact.preferredChannel}</span>
                      )}
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">{contact.complianceStatus}</span>
                      {(contact.sourceMix || []).slice(0, 3).map(source => (
                        <span key={source} className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">
                          {source}
                        </span>
                      ))}
                    </div>

                    {contact.searchQuery && (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
                        Query: {contact.searchQuery}
                      </div>
                    )}

                    {!!contact.evidence?.length && (
                      <div className="mt-3 text-xs leading-5 text-slate-400">{contact.evidence.join(' · ')}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-[#0b1526] px-6 text-center">
                  <Search className="h-8 w-8 text-slate-600" />
                  <p className="mt-4 text-sm text-slate-400">
                    No prospect queue yet. Run the sourcing engine or import validated contacts from your CRM or enrichment provider.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <WandSparkles className="h-3.5 w-3.5 text-indigo-400" />
                Strategy Surface
              </div>
              <h3 className="mt-2 text-xl font-semibold text-white">Latest generated execution blueprint</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0b1526] px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              {lastCampaign ? 'Live' : 'Awaiting first run'}
            </div>
          </div>

          {!lastCampaign ? (
            <div className="mt-6 flex min-h-[240px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-[#0b1526] px-6 text-center">
              <Sparkles className="h-8 w-8 text-indigo-400/60" />
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                The intake and research system is now in place. Save the brief, ingest targets, then run the brain to generate a campaign plan grounded in actual context.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sections.map((part, index) => {
                if (!(part.startsWith('[') && part.endsWith(']:'))) {
                  return null;
                }

                const title = part.replace(/[\[\]:]/g, '');
                const content = sections[index + 1] || '';
                return (
                  <div key={`${title}-${index}`} className="rounded-[24px] border border-white/10 bg-[#0b1526] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      {title.toLowerCase().includes('strategy') && <Radar className="h-4 w-4 text-indigo-400" />}
                      {title.toLowerCase().includes('copy') && <ArrowRight className="h-4 w-4 text-fuchsia-400" />}
                      {title.toLowerCase().includes('social') && <Globe2 className="h-4 w-4 text-emerald-400" />}
                      {title}
                    </div>
                    <div className="mt-4 prose prose-invert prose-sm max-w-none text-slate-300">
                      <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
