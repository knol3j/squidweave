import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Globe2,
  Inbox,
  Radar,
  Sparkles,
  Target,
  WandSparkles,
  AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCollaboration } from './CollaborationProvider';
import {
  ActivationRun,
  ApiError,
  dataService,
  FundingOutreachEvent,
  FundingPipeline,
  FundingRun,
  FundingInvestor,
  ProspectPipeline,
  ProspectingPlan,
  ProspectingRun,
  ResearchRecord,
  SourcedContact,
} from '../services/dataService';
import { AGENT_SYSTEM } from '../lib/agentSystem';
import ClientIntakeForm from './campaign/ClientIntakeForm';
import AgentModuleGrid from './campaign/AgentModuleGrid';
import ResearchIntakeForm from './campaign/ResearchIntakeForm';
import ProspectingEngine from './campaign/ProspectingEngine';
import FundingImportPanel from './campaign/FundingImportPanel';

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

type FundingImportDraft = {
  rows: string;
};

function splitList(value: string) {
  return value
    .split(/[\n,]/g)
    .map(item => item.trim())
    .filter(Boolean);
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

function emptyFundingImportDraft(): FundingImportDraft {
  return { rows: '' };
}

function parseFundingImportRows(rows: string): Array<Partial<FundingInvestor>> {
  return rows
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [fundName, partnerName, thesisMatch, stageMatch, checkSizeMatch, warmPath, status, thesis, warmIntroPath, sectors, stageFocus, geoFocus, notes] = line.split('|').map(part => part.trim());
      return {
        fundName,
        partnerName,
        thesisMatch: thesisMatch ? Number(thesisMatch) : undefined,
        stageMatch: stageMatch ? Number(stageMatch) : undefined,
        checkSizeMatch: checkSizeMatch ? Number(checkSizeMatch) : undefined,
        warmPath: warmPath ? Number(warmPath) : undefined,
        status: status || 'sourced',
        thesis: thesis || '',
        warmIntroPath: warmIntroPath || '',
        sectors: splitList(sectors || ''),
        stageFocus: splitList(stageFocus || ''),
        geoFocus: splitList(geoFocus || ''),
        notes: notes || '',
      };
    })
    .filter(record => record.fundName);
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

function formatLoadError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Authentication expired. Sign in again to continue.';
    }
    if (error.status === 404) {
      return fallback;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export default function CampaignPreview() {
  const { messages, campaignState, updateCampaignState } = useCollaboration();
  const [researchRecords, setResearchRecords] = React.useState<ResearchRecord[]>([]);
  const [prospectingPlan, setProspectingPlan] = React.useState<ProspectingPlan | null>(null);
  const [prospects, setProspects] = React.useState<SourcedContact[]>([]);
  const [prospectingRuns, setProspectingRuns] = React.useState<ProspectingRun[]>([]);
  const [prospectPipeline, setProspectPipeline] = React.useState<ProspectPipeline | null>(null);
  const [activationRuns, setActivationRuns] = React.useState<ActivationRun[]>([]);
  const [fundingInvestors, setFundingInvestors] = React.useState<FundingInvestor[]>([]);
  const [fundingPipeline, setFundingPipeline] = React.useState<FundingPipeline | null>(null);
  const [fundingRuns, setFundingRuns] = React.useState<FundingRun[]>([]);
  const [fundingEvents, setFundingEvents] = React.useState<FundingOutreachEvent[]>([]);
  const [fundingImportDraft, setFundingImportDraft] = React.useState<FundingImportDraft>(() => emptyFundingImportDraft());
  const [fundingImporting, setFundingImporting] = React.useState(false);
  const [fundingSequencing, setFundingSequencing] = React.useState(false);
  const [fundingRunning, setFundingRunning] = React.useState(false);
  const [intakeDraft, setIntakeDraft] = React.useState<IntakeDraft>(() => buildIntakeDraft(campaignState));
  const [researchDraft, setResearchDraft] = React.useState<ResearchDraft>(() => emptyResearchDraft());
  const [contactImportDraft, setContactImportDraft] = React.useState<ContactImportDraft>(() => emptyContactImportDraft());
  const [intakeSaving, setIntakeSaving] = React.useState(false);
  const [researchSaving, setResearchSaving] = React.useState(false);
  const [prospectingLoading, setProspectingLoading] = React.useState(false);
  const [prospectingRunning, setProspectingRunning] = React.useState(false);
  const [contactImporting, setContactImporting] = React.useState(false);
  const [enrichingProspects, setEnrichingProspects] = React.useState(false);
  const [sequencingProspects, setSequencingProspects] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadWarnings, setLoadWarnings] = React.useState<string[]>([]);

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

  const refreshActivation = React.useCallback(async () => {
    const campaignId = campaignState.id || 'main-campaign';
    const [pipeline, runs] = await Promise.all([
      dataService.getProspectPipeline(campaignId),
      dataService.getActivationRuns(campaignId),
    ]);
    setProspectPipeline(pipeline);
    setActivationRuns(runs);
  }, [campaignState.id]);

  const refreshFunding = React.useCallback(async () => {
    const campaignId = campaignState.id || 'main-campaign';
    const [investors, pipeline, runs, events] = await Promise.all([
      dataService.getFundingInvestors(campaignId),
      dataService.getFundingPipeline(campaignId),
      dataService.getFundingRuns(campaignId),
      dataService.getFundingOutreachEvents(campaignId),
    ]);
    setFundingInvestors(investors);
    setFundingPipeline(pipeline);
    setFundingRuns(runs);
    setFundingEvents(events);
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

  const refreshAll = React.useCallback(async () => {
    setProspectingLoading(true);
    setLoadError(null);
    const warnings: string[] = [];
    let hardFailure: string | null = null;

    const [researchResult, prospectingResult, activationResult, fundingResult] = await Promise.allSettled([
      refreshResearch(),
      refreshProspecting(),
      refreshActivation(),
      refreshFunding(),
    ]);

    if (researchResult.status === 'rejected') {
      console.error(researchResult.reason);
      const message = formatLoadError(researchResult.reason, 'Research records are not available yet.');
      if (message.includes('Authentication expired')) {
        hardFailure = message;
      } else {
        warnings.push(message);
      }
    }

    if (prospectingResult.status === 'rejected') {
      console.error(prospectingResult.reason);
      const message = formatLoadError(prospectingResult.reason, 'Prospecting data is not available yet.');
      if (message.includes('Authentication expired')) {
        hardFailure = message;
      } else {
        warnings.push(message);
      }
    }

    if (activationResult.status === 'rejected') {
      console.error(activationResult.reason);
      const message = formatLoadError(activationResult.reason, 'Activation data is not available yet.');
      if (message.includes('Authentication expired')) {
        hardFailure = message;
      } else {
        warnings.push(message);
      }
    }

    if (fundingResult.status === 'rejected') {
      console.error(fundingResult.reason);
      const message = formatLoadError(fundingResult.reason, 'Funding data is not available yet.');
      if (message.includes('Authentication expired')) {
        hardFailure = message;
      } else {
        warnings.push(message);
      }
    }

    if (!hardFailure && researchResult.status === 'rejected' && prospectingResult.status === 'rejected' && activationResult.status === 'rejected' && fundingResult.status === 'rejected') {
      hardFailure = 'Campaign data could not be loaded from the live API.';
    }

    setLoadError(hardFailure);
    setLoadWarnings([...new Set(warnings)]);
    setProspectingLoading(false);
    setInitialLoading(false);
  }, [refreshResearch, refreshProspecting, refreshActivation, refreshFunding]);

  React.useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const lastCampaign = React.useMemo(
    () => [...messages].reverse().find(message => message.role === 'assistant' && message.content.includes('[Campaign Strategy]')),
    [messages],
  );

  const enabledModules = campaignState.enabledModules || [];
  const coverage = Math.round((enabledModules.length / AGENT_SYSTEM.length) * 100);
  const uniqueTargets = new Set(researchRecords.map(record => record.targetId)).size;

  const handleIntakeSave = async () => {
    setIntakeSaving(true);
    setStatus(null);
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
      setLoadError(null);
      setStatus({ type: 'success', text: 'Client intake saved. The brain now has a concrete mission brief.' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: formatLoadError(error, 'Failed to save the client intake.') });
    } finally {
      setIntakeSaving(false);
    }
  };

  const handleResearchSubmit = async () => {
    if (!researchDraft.targetId.trim()) {
      setStatus({ type: 'error', text: 'Research records require a target ID.' });
      return;
    }

    setResearchSaving(true);
    setStatus(null);
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
      setStatus({ type: 'success', text: 'Research record ingested into the brain.' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to ingest the research record.' });
    } finally {
      setResearchSaving(false);
    }
  };

  const handleProspectingRun = async () => {
    setProspectingRunning(true);
    setStatus(null);
    try {
      const campaignId = campaignState.id || 'main-campaign';
      const result = await dataService.generateProspects(campaignId, {
        reason: 'mission-control-run',
        limit: 24,
      });
      setProspectingPlan(result.plan);
      setProspects(result.candidates);
      setProspectingRuns(current => [result.run, ...current]);
      setStatus({ type: 'success', text: `Generated ${result.candidates.length} candidate contacts for enrichment and outreach review.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to generate candidate contacts.' });
    } finally {
      setProspectingRunning(false);
    }
  };

  const handleContactImport = async () => {
    const contacts = parseContactImportRows(contactImportDraft.rows);
    if (!contacts.length) {
      setStatus({ type: 'error', text: 'Add at least one contact row to import.' });
      return;
    }

    setContactImporting(true);
    setStatus(null);
    try {
      const imported = await dataService.importProspects(
        campaignState.id || 'main-campaign',
        contacts,
        contactImportDraft.source.trim() || 'manual-import',
      );
      setProspects(current => [...imported, ...current]);
      setContactImportDraft(emptyContactImportDraft());
      await Promise.all([refreshProspecting(), refreshActivation()]);
      setStatus({ type: 'success', text: `Imported ${imported.length} validated contacts into the sourcing queue.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to import contacts.' });
    } finally {
      setContactImporting(false);
    }
  };

  const handleProspectEnrichment = async () => {
    setEnrichingProspects(true);
    setStatus(null);
    try {
      const result = await dataService.enrichProspects(campaignState.id || 'main-campaign', {
        provider: 'internal-waterfall',
        limit: 24,
      });
      setProspects(result.contacts);
      setProspectPipeline(result.pipeline);
      setActivationRuns(current => [result.run, ...current]);
      setStatus({ type: 'success', text: `Enrichment advanced ${result.run.processedContacts} contacts toward sequencing.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to enrich prospect queue.' });
    } finally {
      setEnrichingProspects(false);
    }
  };

  const handleSequenceBuild = async () => {
    setSequencingProspects(true);
    setStatus(null);
    try {
      const result = await dataService.sequenceProspects(campaignState.id || 'main-campaign', {
        limit: 24,
      });
      setProspects(result.contacts);
      setProspectPipeline(result.pipeline);
      setActivationRuns(current => [result.run, ...current]);
      setStatus({ type: 'success', text: `Built sequence plans for ${result.run.processedContacts} contacts.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to build sequence plans.' });
    } finally {
      setSequencingProspects(false);
    }
  };

  const handleFundingImport = async () => {
    const records = parseFundingImportRows(fundingImportDraft.rows);
    if (!records.length) {
      setStatus({ type: 'error', text: 'Add at least one investor row to import.' });
      return;
    }

    setFundingImporting(true);
    setStatus(null);
    try {
      const campaignId = campaignState.id || 'main-campaign';
      const imported = await dataService.importFundingInvestors(campaignId, records);
      setFundingInvestors(current => [...imported, ...current]);
      setFundingImportDraft(emptyFundingImportDraft());
      await refreshFunding();
      setStatus({ type: 'success', text: `Imported ${imported.length} investor records into the funding pipeline.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to import investor records.' });
    } finally {
      setFundingImporting(false);
    }
  };

  const handleFundingSequence = async () => {
    setFundingSequencing(true);
    setStatus(null);
    try {
      const campaignId = campaignState.id || 'main-campaign';
      const result = await dataService.runFundingSequence(campaignId, { limit: 20 });
      setFundingPipeline(result.pipeline);
      setFundingRuns(current => [result.run, ...current]);
      setFundingEvents(current => [...result.events, ...current]);
      setStatus({ type: 'success', text: `Queued ${result.events.length} funding outreach steps.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to queue funding outreach.' });
    } finally {
      setFundingSequencing(false);
    }
  };

  const handleFundingRun = async () => {
    setFundingRunning(true);
    setStatus(null);
    try {
      const campaignId = campaignState.id || 'main-campaign';
      const result = await dataService.runFundingCampaign(campaignId, { limit: 20 });
      setFundingPipeline(result.pipeline);
      setFundingRuns(current => [result.sequence.run, ...current]);
      setFundingEvents(current => [...result.sequence.events, ...current]);
      setStatus({ type: 'success', text: `Funding automation run completed: ${result.sequence.run.processedInvestors} investors processed.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Funding automation run failed.' });
    } finally {
      setFundingRunning(false);
    }
  };

  const sections = lastCampaign?.content.split(/(\[.*?\]:)/g) || [];

  if (initialLoading) {
    return (
      <div className="h-full overflow-y-auto bg-[#08111f] p-4 md:p-8 custom-scrollbar">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="animate-pulse space-y-3 p-6 glass-card">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
            <div className="h-4 bg-white/10 rounded w-5/6" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-6 bg-white/10 rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="animate-pulse space-y-3 p-6 glass-card">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
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
          <p className="text-red-400 text-sm font-medium">Failed to load campaign data</p>
          <p className="text-slate-500 text-xs">{loadError}</p>
          <button onClick={() => void refreshAll()} className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasData = researchRecords.length > 0 || prospectingPlan || prospectPipeline || fundingPipeline || fundingInvestors.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-[#08111f] p-4 md:p-8 custom-scrollbar">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
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
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
                <div className="mt-2 text-xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {status && (
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            {status.type === 'success'
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <XCircle className="h-4 w-4 shrink-0" />}
            <span>{status.text}</span>
          </div>
        )}

        {!!loadWarnings.length && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Some live sections are still empty or unavailable.</span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-amber-200/90">
              {loadWarnings.map(warning => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          </div>
        )}

        {!hasData && !initialLoading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] py-24 px-6 text-center">
            <Inbox className="h-12 w-12 text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold text-white">No campaigns yet</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Fill in the client intake below to define your first mission brief. The system will use it to drive autonomous research, prospecting, and activation.
            </p>
            <a href="#intake" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 shadow-sm transition hover:bg-indigo-500/15">
              <Target className="h-4 w-4" />
              Start Intake
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ClientIntakeForm
            displayDraft={intakeDraft}
            setPendingDraft={draft => {
              if (draft !== null) {
                setIntakeDraft(current => typeof draft === 'function' ? draft(current) : draft);
              }
            }}
            intakeSaving={intakeSaving}
            onSave={handleIntakeSave}
          />

          <AgentModuleGrid
            enabledModules={enabledModules}
            onUpdateModules={modules => updateCampaignState({ enabledModules: modules })}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ResearchIntakeForm
            researchDraft={researchDraft}
            setResearchDraft={setResearchDraft}
            researchSaving={researchSaving}
            onSubmit={handleResearchSubmit}
            researchRecords={researchRecords}
            uniqueTargets={uniqueTargets}
            campaignResearchObjectives={campaignState.researchObjectives || []}
            campaignMarkets={campaignState.markets || campaignState.locales || []}
            prospectingLoading={prospectingLoading}
            onRefresh={() => refreshResearch().catch(error => console.error(error))}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <ProspectingEngine
            prospectingPlan={prospectingPlan}
            prospects={prospects}
            prospectingRuns={prospectingRuns}
            prospectPipeline={prospectPipeline}
            activationRuns={activationRuns}
            contactImportSource={contactImportDraft.source}
            contactImportRows={contactImportDraft.rows}
            onContactImportSourceChange={value => setContactImportDraft(current => ({ ...current, source: value }))}
            onContactImportRowsChange={value => setContactImportDraft(current => ({ ...current, rows: value }))}
            prospectingLoading={prospectingLoading}
            prospectingRunning={prospectingRunning}
            contactImporting={contactImporting}
            enrichingProspects={enrichingProspects}
            sequencingProspects={sequencingProspects}
            onRefresh={() => {
              setProspectingLoading(true);
              refreshProspecting()
                .catch(error => console.error(error))
                .finally(() => setProspectingLoading(false));
            }}
            onGenerateQueue={handleProspectingRun}
            onImportContacts={handleContactImport}
            onEnrich={handleProspectEnrichment}
            onBuildSequences={handleSequenceBuild}
          />
        </div>

        <FundingImportPanel
          fundingImportRows={fundingImportDraft.rows}
          onFundingImportRowsChange={value => setFundingImportDraft({ rows: value })}
          fundingImporting={fundingImporting}
          fundingSequencing={fundingSequencing}
          fundingRunning={fundingRunning}
          fundingInvestors={fundingInvestors}
          fundingPipeline={fundingPipeline}
          fundingRuns={fundingRuns}
          fundingEvents={fundingEvents}
          onImport={handleFundingImport}
          onSequence={handleFundingSequence}
          onRun={handleFundingRun}
          onRefresh={() => refreshFunding().catch(error => console.error(error))}
        />

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                <WandSparkles className="h-3.5 w-3.5 text-indigo-400" />
                Strategy Surface
              </div>
              <h3 className="mt-2 text-xl font-semibold text-white">Latest generated execution blueprint</h3>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-slate-400">
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
                  <div key={`${title}-${index}`} className="rounded-xl border border-white/10 bg-[#0b1526] p-5">
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
