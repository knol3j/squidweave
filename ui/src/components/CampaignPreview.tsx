import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Database,
  Globe2,
  Inbox,
  Layers3,
  MailPlus,
  Landmark,
  Radar,
  Search,
  Sparkles,
  Target,
  Upload,
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
import { AGENT_STAGES, AGENT_SYSTEM, getAllAgentIds } from '../lib/agentSystem';
import { formatPercent, formatDate } from '../lib/format';

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

const AUDIENCE_OPTIONS = [
  'Founders',
  'CEO',
  'COO',
  'CRO',
  'VP Revenue',
  'VP Revenue Operations',
  'Demand Gen Leaders',
  'Heads of Growth',
  'CMO',
  'Marketing Operations',
];

const OFFER_OPTIONS = [
  'Book a 20 minute audit',
  'Book a strategy review',
  'Request a demo',
  'Get a custom teardown',
  'Start a pilot',
  'Download the deck',
];

const MARKET_OPTIONS = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'DACH fintech',
  'UK SaaS',
  'US SaaS',
  'Mid-market SaaS',
  'Enterprise SaaS',
  'PLG SaaS',
  'B2B services',
];

const CHANNEL_OPTIONS = [
  'LinkedIn',
  'Email',
  'Landing page',
  'Outbound calling',
  'Paid social',
  'Google Search',
  'Webinar',
  'Partner co-marketing',
];

const BRAND_VOICE_OPTIONS = [
  'Direct',
  'Expert',
  'Specific',
  'No fluff',
  'Analytical',
  'Confident',
  'Warm',
  'Executive',
];

const SOURCE_OPTIONS = [
  'manual-ingest',
  'G2',
  'LinkedIn',
  'analyst-note',
  'CRM-export',
  'apollo',
  'zoominfo',
  'web-scrape',
  'referral',
];

const REGION_OPTIONS = [
  'US',
  'DACH',
  'France',
  'UK',
  'EMEA',
  'APAC',
  'NA',
  'LATAM',
];

function splitList(value: string) {
  return value
    .split(/[\n,]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function splitChannelList(value: string) {
  return value
    .split(/[\n,+]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function uniqueOptions(options: string[], currentValue: string, splitter: (value: string) => string[]) {
  return [...new Set([...options, ...splitter(currentValue)])];
}

function PresetSingleSelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (nextValue: string) => void;
}) {
  const mergedOptions = React.useMemo(
    () => [...new Set([...options, ...(value && !options.includes(value) ? [value] : [])])],
    [options, value],
  );

  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/50"
      >
        <option value="">{placeholder}</option>
        {mergedOptions.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PresetMultiSelectField({
  label,
  value,
  options,
  placeholder,
  splitter,
  joiner,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  splitter: (value: string) => string[];
  joiner: (values: string[]) => string;
  onChange: (nextValue: string) => void;
}) {
  const selected = splitter(value);
  const mergedOptions = React.useMemo(() => uniqueOptions(options, value, splitter), [options, value, splitter]);

  const toggleOption = (option: string) => {
    const nextSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(joiner(nextSelected));
  };

  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <details className="rounded-xl border border-white/10 bg-[#0b1526]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm text-white outline-none">
          <div className="flex items-center justify-between gap-3">
            <span className={selected.length ? 'text-white' : 'text-slate-600'}>
              {selected.length ? selected.join(', ') : placeholder}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-300">
              {selected.length || 0} selected
            </span>
          </div>
        </summary>
        <div className="border-t border-white/10 px-4 py-3">
          <div className="grid gap-2">
            {mergedOptions.map(option => (
              <label key={option} className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="h-4 w-4 rounded border-white/10 bg-[#08111f] text-indigo-500 focus:ring-indigo-400"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      </details>
    </label>
  );
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
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <Target className="h-3.5 w-3.5 text-indigo-400" />
                  Client Intake
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Capture what the client actually wants</h3>
              </div>
              <button
                onClick={handleIntakeSave}
                disabled={intakeSaving}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-indigo-400 disabled:opacity-60"
              >
                {intakeSaving ? 'Saving...' : 'Save Brief'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { key: 'clientName', label: 'Client Name', placeholder: 'Acme Growth Team' },
                { key: 'brandName', label: 'Brand / Campaign Name', placeholder: 'Acme Pipeline Acceleration' },
                { key: 'successDefinition', label: 'Success Definition', placeholder: '20 SQLs/month with CAC under target' },
              ].map(field => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{field.label}</span>
                  <input
                    value={intakeDraft[field.key as keyof IntakeDraft]}
                    onChange={event => setIntakeDraft(current => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50"
                  />
                </label>
              ))}

              <PresetSingleSelectField
                label="Target Audience"
                value={intakeDraft.audience}
                options={AUDIENCE_OPTIONS}
                placeholder="Select target audience"
                onChange={nextValue => setIntakeDraft(current => ({ ...current, audience: nextValue }))}
              />

              <PresetSingleSelectField
                label="Primary Offer"
                value={intakeDraft.offer}
                options={OFFER_OPTIONS}
                placeholder="Select primary offer"
                onChange={nextValue => setIntakeDraft(current => ({ ...current, offer: nextValue }))}
              />

              <PresetMultiSelectField
                label="Markets / Locales"
                value={intakeDraft.markets}
                options={MARKET_OPTIONS}
                placeholder="Select markets and locales"
                splitter={splitList}
                joiner={values => values.join(', ')}
                onChange={nextValue => setIntakeDraft(current => ({ ...current, markets: nextValue }))}
              />

              <PresetMultiSelectField
                label="Primary Channel"
                value={intakeDraft.channel}
                options={CHANNEL_OPTIONS}
                placeholder="Select primary channels"
                splitter={splitChannelList}
                joiner={values => values.join(' + ')}
                onChange={nextValue => setIntakeDraft(current => ({ ...current, channel: nextValue }))}
              />

              <PresetMultiSelectField
                label="Brand Voice"
                value={intakeDraft.brandVoice}
                options={BRAND_VOICE_OPTIONS}
                placeholder="Select brand voice traits"
                splitter={splitList}
                joiner={values => values.join(', ')}
                onChange={nextValue => setIntakeDraft(current => ({ ...current, brandVoice: nextValue }))}
              />
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
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{field.label}</span>
                  <textarea
                    rows={field.rows}
                    value={intakeDraft[field.key as keyof IntakeDraft]}
                    onChange={event => setIntakeDraft(current => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50"
                  />
                </label>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <Bot className="h-3.5 w-3.5 text-fuchsia-400" />
                  Autonomous Coverage
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">One agent for each marketing job</h3>
              </div>
              <button
                onClick={() => updateCampaignState({ enabledModules: getAllAgentIds() })}
                className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-fuchsia-100 transition hover:bg-fuchsia-500/15"
              >
                Enable All
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {agentGroups.map(group => (
                <div key={group.stage} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Layers3 className="h-4 w-4 text-indigo-400" />
                      {group.stage}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
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
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
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
                              <div className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${active ? 'text-emerald-300' : 'text-slate-500'}`}>
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
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                  Research Intake
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Feed the brain structured evidence</h3>
              </div>
              <button
                onClick={handleResearchSubmit}
                disabled={researchSaving}
                className="rounded-xl bg-amber-500 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
              >
                {researchSaving ? 'Ingesting...' : 'Ingest Record'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Dropdown: Source */}
              <PresetSingleSelectField
                label="SOURCE"
                value={researchDraft.source}
                options={SOURCE_OPTIONS}
                placeholder="Select source"
                onChange={v => setResearchDraft(current => ({ ...current, source: v }))}
              />
              {/* Text: Target ID */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">TARGET ID</span>
                <input
                  value={researchDraft.targetId}
                  onChange={event => setResearchDraft(current => ({ ...current, targetId: event.target.value }))}
                  placeholder="segment-dach-revops-001"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
              {/* Text: Company */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">COMPANY</span>
                <input
                  value={researchDraft.company}
                  onChange={event => setResearchDraft(current => ({ ...current, company: event.target.value }))}
                  placeholder="Acme GmbH"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
              {/* Text: Contact Name */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">CONTACT NAME</span>
                <input
                  value={researchDraft.contactName}
                  onChange={event => setResearchDraft(current => ({ ...current, contactName: event.target.value }))}
                  placeholder="Morgan Lee"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
              {/* Dropdown: Title */}
              <PresetSingleSelectField
                label="TITLE"
                value={researchDraft.title}
                options={AUDIENCE_OPTIONS}
                placeholder="Select job title"
                onChange={v => setResearchDraft(current => ({ ...current, title: v }))}
              />
              {/* Dropdown: Segment */}
              <PresetSingleSelectField
                label="SEGMENT"
                value={researchDraft.segment}
                options={MARKET_OPTIONS}
                placeholder="Select segment"
                onChange={v => setResearchDraft(current => ({ ...current, segment: v }))}
              />
              {/* Dropdown: Region */}
              <PresetSingleSelectField
                label="REGION"
                value={researchDraft.region}
                options={REGION_OPTIONS}
                placeholder="Select region"
                onChange={v => setResearchDraft(current => ({ ...current, region: v }))}
              />
              {/* Dropdown: Preferred Channel */}
              <PresetSingleSelectField
                label="PREFERRED CHANNEL"
                value={researchDraft.preferredChannel}
                options={CHANNEL_OPTIONS}
                placeholder="Select primary channel"
                onChange={v => setResearchDraft(current => ({ ...current, preferredChannel: v }))}
              />
              {/* Multi-select: All Channels */}
              <PresetMultiSelectField
                label="ALL CHANNELS"
                value={researchDraft.channels}
                options={CHANNEL_OPTIONS}
                placeholder="Select channels"
                splitter={splitChannelList}
                joiner={(vals: string[]) => vals.join(', ')}
                onChange={v => setResearchDraft(current => ({ ...current, channels: v }))}
              />
              {/* Number: Estimated Reach */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">ESTIMATED REACH</span>
                <input
                  type="number"
                  min="0"
                  value={researchDraft.estimatedReach}
                  onChange={event => setResearchDraft(current => ({ ...current, estimatedReach: event.target.value }))}
                  placeholder="5400"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
              {/* Number: Fit Score (0-1) */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">FIT SCORE</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={researchDraft.fitScore}
                  onChange={event => setResearchDraft(current => ({ ...current, fitScore: event.target.value }))}
                  placeholder="0.0 – 1.0"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
              {/* Number: Intent Score (0-1) */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">INTENT SCORE</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={researchDraft.intentScore}
                  onChange={event => setResearchDraft(current => ({ ...current, intentScore: event.target.value }))}
                  placeholder="0.0 – 1.0"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
              {/* Number: Recency Score (0-1) */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">RECENCY SCORE</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={researchDraft.recencyScore}
                  onChange={event => setResearchDraft(current => ({ ...current, recencyScore: event.target.value }))}
                  placeholder="0.0 – 1.0"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
              {/* URL: Source URL */}
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">SOURCE URL</span>
                <input
                  type="url"
                  value={researchDraft.sourceUrl}
                  onChange={event => setResearchDraft(current => ({ ...current, sourceUrl: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Evidence bullets</span>
                <textarea
                  rows={4}
                  value={researchDraft.evidence}
                  onChange={event => setResearchDraft(current => ({ ...current, evidence: event.target.value }))}
                  placeholder={'One evidence point per line.\nRecent funding event\nNew regional expansion\nHiring SDR leadership'}
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Notes for the brain</span>
                <textarea
                  rows={4}
                  value={researchDraft.notes}
                  onChange={event => setResearchDraft(current => ({ ...current, notes: event.target.value }))}
                  placeholder="Why this target matters, what pain was observed, what message angle is likely to land."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                  Live Research Feed
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Recent target intelligence</h3>
              </div>
              <button
                onClick={() => refreshResearch().catch(error => console.error(error))}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]"
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
                <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
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
                  <div key={record.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{record.company || record.targetId}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {record.title || 'Unknown role'} · {record.segment || 'Unclassified segment'} · {record.region || 'Unknown region'}
                        </div>
                      </div>
                      <div className="text-right text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        <div>{record.source}</div>
                        <div className="mt-1">{formatDate(record.capturedAt)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Fit {formatPercent(record.fitScore)}</span>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Intent {formatPercent(record.intentScore)}</span>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Recency {formatPercent(record.recencyScore)}</span>
                      {record.preferredChannel && <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-200">{record.preferredChannel}</span>}
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-400">{record.notes || 'No notes captured for this target yet.'}</p>

                    {!!record.metadata?.evidence?.length && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Evidence</div>
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
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
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
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]"
                >
                  Refresh
                </button>
                <button
                  onClick={handleProspectingRun}
                  disabled={prospectingRunning}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
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
                <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Priority accounts</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {prospectingLoading ? 'Loading' : 'Live plan'}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {prospectingPlan?.topAccounts.length ? (
                    prospectingPlan.topAccounts.map(account => (
                      <div key={`${account.targetId}-${account.company}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
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
                <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                  <div className="text-sm font-semibold text-white">Sourcing workflow</div>
                  <div className="mt-4 space-y-3">
                    {(prospectingPlan?.sourcingWorkflow || []).map(step => (
                      <div key={step} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                  <div className="text-sm font-semibold text-white">Enrichment and compliance checklist</div>
                  <div className="mt-4 space-y-2">
                    {(prospectingPlan?.enrichmentChecklist || []).map(item => (
                      <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                  <div className="text-sm font-semibold text-white">Procedural memory signals</div>
                  <div className="mt-4 space-y-3">
                    {prospectingPlan?.proceduralSignals.length ? (
                      prospectingPlan.proceduralSignals.map(signal => (
                        <div key={`${signal.segment}-${signal.region}-${signal.channel}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="text-sm text-white">{signal.segment || 'Unknown segment'}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {signal.region || 'Global'} · {signal.channel || 'No channel'} · {formatPercent(signal.confidence)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
                        No learned sourcing patterns yet. As campaigns run, Hermes-backed memory can feed this panel.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <MailPlus className="h-3.5 w-3.5 text-emerald-400" />
                  Prospect Queue
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">Generated buyers and imported contacts</h3>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-slate-400">
                {latestProspectingRun ? `${latestProspectingRun.generatedCandidates} last generated` : 'No run yet'}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1526] p-4">
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
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-60"
                >
                  {contactImporting ? 'Importing...' : 'Import Contacts'}
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Import source</span>
                  <input
                    value={contactImportDraft.source}
                    onChange={event => setContactImportDraft(current => ({ ...current, source: event.target.value }))}
                    placeholder="apollo, crm-export, manual-import"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Contact rows</span>
                  <textarea
                    rows={6}
                    value={contactImportDraft.rows}
                    onChange={event => setContactImportDraft(current => ({ ...current, rows: event.target.value }))}
                    placeholder={'Acme | Morgan Lee | VP Revenue Operations | morgan@acme.com | https://linkedin.com/in/morgan | DACH | Mid-market SaaS\nNorthwind | Jamie Fox | Head of Growth | jamie@northwind.io | https://linkedin.com/in/jamie | US | PLG SaaS'}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { label: 'Ready for Enrichment', value: prospectPipeline?.counts.readyForEnrichment || 0 },
                { label: 'Ready for Sequencing', value: prospectPipeline?.counts.readyForSequencing || 0 },
                { label: 'Sequenced', value: prospectPipeline?.counts.sequenced || 0 },
                { label: 'Suppressed', value: prospectPipeline?.counts.suppressed || 0 },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1526] p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleProspectEnrichment}
                  disabled={enrichingProspects}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {enrichingProspects ? 'Enriching...' : 'Run Enrichment'}
                </button>
                <button
                  onClick={handleSequenceBuild}
                  disabled={sequencingProspects}
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-100 transition hover:bg-cyan-500/15 disabled:opacity-60"
                >
                  {sequencingProspects ? 'Planning...' : 'Build Sequences'}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {(activationRuns.slice(0, 3) || []).map(run => (
                  <div key={run.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{run.action}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {run.processedContacts} contacts processed
                          {run.provider ? ` via ${run.provider}` : ''}
                        </div>
                      </div>
                      <div className="text-right text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        <div>{run.status}</div>
                        <div className="mt-1">{formatDate(run.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {!activationRuns.length && (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
                    No activation runs yet. Enrichment turns sourced contacts into sequence-ready records, then sequence planning turns them into outreach cadences.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recentProspects.length ? (
                recentProspects.map(contact => (
                  <div key={contact.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{contact.fullName || contact.role || contact.company}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {contact.company} · {contact.title || contact.role || 'Role pending'} · {contact.region || 'Unknown region'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{contact.contactStatus}</div>
                        <div className="mt-1 text-xs text-emerald-300">{formatPercent(contact.score)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {contact.preferredChannel && (
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">{contact.preferredChannel}</span>
                      )}
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">{contact.complianceStatus}</span>
                      {contact.enrichmentStatus && (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100">{contact.enrichmentStatus}</span>
                      )}
                      {contact.sequenceStatus && (
                        <span className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-[11px] text-fuchsia-100">{contact.sequenceStatus}</span>
                      )}
                      {(contact.sourceMix || []).slice(0, 3).map(source => (
                        <span key={source} className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">
                          {source}
                        </span>
                      ))}
                    </div>

                    {contact.searchQuery && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
                        Query: {contact.searchQuery}
                      </div>
                    )}

                    {!!contact.sequencePlan?.steps?.length && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                          {contact.sequencePlan.channel} sequence
                        </div>
                        <div className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                          {contact.sequencePlan.steps.slice(0, 3).map(step => (
                            <div key={step}>{step}</div>
                          ))}
                        </div>
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

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                <Landmark className="h-3.5 w-3.5 text-amber-300" />
                VC Funding Automation
              </div>
              <h3 className="mt-2 text-xl font-semibold text-white">Investor pipeline, prioritization, and outreach sequencing</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => refreshFunding().catch(error => console.error(error))}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]"
              >
                Refresh
              </button>
              <button
                onClick={handleFundingRun}
                disabled={fundingRunning}
                className="rounded-xl bg-amber-300 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
              >
                {fundingRunning ? 'Running...' : 'Run Funding'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Investors', value: fundingPipeline?.counts.total || fundingInvestors.length },
              { label: 'Prioritized', value: fundingPipeline?.prioritized.length || 0 },
              { label: 'Funding Runs', value: fundingRuns.length },
              { label: 'Outreach Events', value: fundingEvents.length },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
                <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Investor import</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    One line per investor: fund | partner | thesisMatch | stageMatch | checkSizeMatch | warmPath | status | thesis | warmIntroPath | sectors | stageFocus | geoFocus | notes
                  </p>
                </div>
                <button
                  onClick={handleFundingImport}
                  disabled={fundingImporting}
                  className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-60"
                >
                  {fundingImporting ? 'Importing...' : 'Import Investors'}
                </button>
              </div>
              <textarea
                rows={6}
                value={fundingImportDraft.rows}
                onChange={event => setFundingImportDraft({ rows: event.target.value })}
                placeholder={'Alpha Ventures | Dana Smith | 0.92 | 0.88 | 0.7 | 0.65 | sourced | B2B infra thesis | Intro via portfolio CTO | b2b,infra | seed,series-a | us,eu | strong fit\nNorth Bridge | Alex Kim | 0.74 | 0.8 | 0.68 | 0.9 | follow_up | AI tooling thesis | Warm intro from advisor | ai,saas | seed | us | requested deck'}
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-300/50"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
              <div className="text-sm font-semibold text-white">Funding actions</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleFundingSequence}
                  disabled={fundingSequencing}
                  className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:opacity-60"
                >
                  {fundingSequencing ? 'Queuing...' : 'Queue Outreach'}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {fundingRuns.slice(0, 3).map(run => (
                  <div key={run.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="text-sm font-semibold text-white">{run.type}</div>
                    <div className="mt-1 text-xs text-slate-500">{run.processedInvestors} investors · {run.status} · {formatDate(run.createdAt)}</div>
                  </div>
                ))}
                {!fundingRuns.length && (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">No funding runs yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {(fundingPipeline?.prioritized || []).slice(0, 8).map(investor => (
              <div key={investor.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{investor.fundName}</div>
                    <div className="mt-1 text-xs text-slate-500">{investor.partnerName || 'No partner'} · {investor.status} · step {investor.sequenceStep || 0}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Priority score</div>
                    <div className="mt-1 text-xs text-amber-200">{formatPercent(investor.score)}</div>
                  </div>
                </div>
                {!!investor.reasons?.length && (
                  <div className="mt-3 text-xs text-slate-400">{investor.reasons.join(' · ')}</div>
                )}
              </div>
            ))}
            {!(fundingPipeline?.prioritized || []).length && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
                No funding pipeline yet. Import investor rows, then run funding automation.
              </div>
            )}
          </div>
        </section>

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
