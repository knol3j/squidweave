import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { dataService } from "@/services/dataService";

/** Deep equality check for state comparison — prevents unnecessary re-renders */
function deepEqual(a: any, b: any, visited = new WeakSet<object>()): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr) {
    if (a.length !== b.length) return false;
    return a.every((v: any, i: number) => deepEqual(v, b[i], visited));
  }
  if (visited.has(a)) return true;
  visited.add(a);
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k => bKeys.includes(k) && deepEqual(a[k], b[k], visited));
}

export type StageStatus = "locked" | "ready" | "active" | "completed";

export interface BusinessProfile {
  businessName: string;
  website: string;
  goals: string;
  industry: string;
  productDescription: string;
  targetCustomer: string;
  valueProposition: string;
  researchStatus: "idle" | "researching" | "completed" | "error";
  researchFindings: string[];
  scrapedUrls: string[];
}

export interface TargetMarket {
  id: string;
  segment: string;
  description: string;
  estimatedReach: number;
  fitScore: number;
  channels: string[];
  painPoints: string[];
  status: "discovered" | "approved" | "rejected";
}

export interface PitchOption {
  id: string;
  title: string;
  subject: string;
  body: string;
  cta: string;
  angle: string;
  tone: string;
  targetSegment: string;
  status: "draft" | "approved" | "rejected";
}

export interface ApprovalState {
  campaignReviewed: boolean;
  contentApproved: boolean;
  emailSendingEnabled: boolean;
  safetyAcknowledged: boolean;
  approvedVariantIds: string[];
}

export interface StageInfo {
  id: number;
  name: string;
  status: StageStatus;
  accent: string;
  data?: any;
}

interface AppState {
  campaigns: any[];
  campaign: any | null;
  campaignId: string;
  stages: StageInfo[];
  activeStage: number;
  isLoading: boolean;
  error: string | null;
  health: any | null;
  lastRefresh: string;
  isPolling: boolean;
  approvals: ApprovalState;
  pendingSafetyCount: number;
  businessProfile: BusinessProfile;
  targetMarkets: TargetMarket[];
  pitches: PitchOption[];
  brainState: any | null;
  connectorStatuses: any[];
  prospectPipeline: any | null;
  prospectingRuns: any[];
  fundingPipeline: any | null;
  fundingInvestors: any[];
  fundingRuns: any[];
  reengagement: any | null;
  setupRequirements: any | null;
  openClawDiagnostics: any[];
  scheduler: any | null;
  connectorDrafts: Record<string, { baseUrl: string; token: string }>;
  researchDossiers: any[];
}

interface AppContextValue {
  state: AppState;
  setActiveStage: (id: number) => void;
  setCampaignId: (id: string) => void;
  refresh: () => void;
  runAutomation: () => Promise<void>;
  generateContent: () => Promise<void>;
  clearError: () => void;
  toggleApproval: (key: keyof ApprovalState) => void;
  approveVariant: (variantId: string) => void;
  rejectVariant: (variantId: string) => void;
  updateBusinessProfile: (p: Partial<BusinessProfile>) => void;
  setBusinessResearchStatus: (s: BusinessProfile["researchStatus"]) => void;
  approveTargetMarket: (id: string) => void;
  rejectTargetMarket: (id: string) => void;
  approvePitch: (id: string) => void;
  rejectPitch: (id: string) => void;
  generatePitches: () => Promise<void>;
  runResearch: () => Promise<void>;
  discoverMarkets: () => Promise<void>;
  generateProspects: () => Promise<void>;
  enrichProspects: () => Promise<void>;
  sequenceProspects: () => Promise<void>;
  runFunding: () => Promise<void>;
  updateConnector: (connector: string, baseUrl: string, token: string) => Promise<void>;
  runPromptAutopilot: (prompt: string) => Promise<void>;
  ingestOutcomes: (payload: any) => Promise<void>;
  addResearchRecord: (record: any) => Promise<void>;
  getTargetDecision: () => Promise<void>;
}

const POLL_INTERVAL = 5000;
const AUTO_POLL = 3000;
const AUTO_TIMEOUT = 60000;

function loadApprovals(): ApprovalState {
  try { const s = localStorage.getItem("sw_approvals"); if (s) return JSON.parse(s); } catch { /* silent */ }
  return { campaignReviewed: false, contentApproved: false, emailSendingEnabled: false, safetyAcknowledged: false, approvedVariantIds: [] };
}
function saveApprovals(a: ApprovalState) { localStorage.setItem("sw_approvals", JSON.stringify(a)); }

function loadBusinessProfile(): BusinessProfile {
  try { const s = localStorage.getItem("sw_business"); if (s) return JSON.parse(s); } catch { /* silent */ }
  return { businessName: "", website: "", goals: "", industry: "", productDescription: "", targetCustomer: "", valueProposition: "", researchStatus: "idle", researchFindings: [], scrapedUrls: [] };
}
function saveBusinessProfile(b: BusinessProfile) { localStorage.setItem("sw_business", JSON.stringify(b)); }

function loadTargetMarkets(): TargetMarket[] {
  try { const s = localStorage.getItem("sw_markets"); if (s) return JSON.parse(s); } catch { /* silent */ }
  return [];
}
function saveTargetMarkets(m: TargetMarket[]) { localStorage.setItem("sw_markets", JSON.stringify(m)); }

function loadPitches(): PitchOption[] {
  try { const s = localStorage.getItem("sw_pitches"); if (s) return JSON.parse(s); } catch { /* silent */ }
  return [];
}
function savePitches(p: PitchOption[]) { localStorage.setItem("sw_pitches", JSON.stringify(p)); }

function computeStages(
  campaign: any | null, data: Record<string, any>, approvals: ApprovalState,
  profile: BusinessProfile, markets: TargetMarket[], pitches: PitchOption[]
): StageInfo[] {
  const hasBusinessProfile = profile.businessName && profile.website && profile.goals;
  const hasResearch = profile.researchStatus === "completed" || (data.researchRecords?.length || 0) > 0;
  const hasDataSources = (data.researchRecords?.length || 0) > 0 || (data.analyticsEvents?.length || 0) > 0 || (data.outreachEvents?.length || 0) > 0;
  const hasTargets = (data.targets?.length || 0) > 0;
  const hasPlaybooks = (data.playbooks?.length || 0) > 0;
  const hasMarkets = markets.length > 0;
  const hasApprovedMarkets = markets.some(m => m.status === "approved");
  void hasApprovedMarkets;
  const hasContent = !!campaign?.latestContentPack || (data.contentPacks?.length || 0) > 0;
  const hasPitches = pitches.length > 0;
  const hasApprovedPitches = pitches.some(p => p.status === "approved");
  const hasApprovedContent = approvals.contentApproved && approvals.approvedVariantIds.length > 0;
  const hasOutreach = (data.outreachEvents?.length || 0) > 0;
  const hasMemory = !!data.memoryRecall?.targetProfile || (data.memoryRecall?.semanticMemories?.tacticObservations?.length || 0) > 0;

  // Progressive gating: each stage unlocks when previous stage is active/completed
  // Setup: completed when business profile saved, active when campaign exists
  const s0: StageStatus = hasBusinessProfile ? "completed" : campaign ? "active" : "active";
  // Research: unlocked when Setup has profile, completed when research data exists
  const s1: StageStatus = !hasBusinessProfile ? "locked" : hasResearch || hasDataSources ? "completed" : "active";
  // Targets: unlocked when Research completed, completed when targets/markets exist
  const s2: StageStatus = s1 === "locked" ? "locked" : hasTargets || hasPlaybooks || hasMarkets ? "completed" : "active";
  // Pitches: unlocked when Targets completed, completed when content approved
  const s3: StageStatus = s2 === "locked" ? "locked" : hasApprovedContent || hasApprovedPitches ? "completed" : hasContent || hasPitches ? "active" : "ready";
  // Launch: unlocked when Pitches completed, active when gates open
  const sendGates = approvals.contentApproved && approvals.emailSendingEnabled && approvals.safetyAcknowledged;
  const s4: StageStatus = s3 === "locked" ? "locked" : hasOutreach && sendGates ? "completed" : sendGates ? "active" : "ready";
  // Learn: unlocked when Launch active, completed when memory exists
  const s5: StageStatus = s4 === "locked" ? "locked" : hasMemory ? "completed" : "active";

  return [
    { id: 0, name: "Setup", status: s0, accent: "#6366f1", data: { campaign, profile } },
    { id: 1, name: "Research", status: s1, accent: "#06b6d4", data: { researchRecords: data.researchRecords, connectors: data.connectors, profile } },
    { id: 2, name: "Targets", status: s2, accent: "#f59e0b", data: { targets: data.targets, playbooks: data.playbooks, investors: data.investors, pipeline: data.fundingPipeline, markets } },
    { id: 3, name: "Pitches", status: s3, accent: "#f43f5e", data: { contentPack: campaign?.latestContentPack, approvals, pitches } },
    { id: 4, name: "Launch", status: s4, accent: "#10b981", data: { outreachEvents: data.outreachEvents, dlq: data.dlq, safety: data.safety, approvals } },
    { id: 5, name: "Learn", status: s5, accent: "#8b5cf6", data: { memoryRecall: data.memoryRecall, playbooks: data.playbooks, targetProfiles: data.targetProfiles } },
  ];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Core state with stable setters that skip identical values
  const [campaigns, setCampaignsRaw] = useState<any[]>([]);
  const [campaign, setCampaignRaw] = useState<any | null>(null);
  const [campaignId, setCampaignIdState] = useState<string>("");
  const [activeStage, setActiveStage] = useState(() => { try { const s = localStorage.getItem("sw_active_stage"); return s ? parseInt(s, 10) : 0; } catch { return 0; } });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealthRaw] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [stageData, setStageDataRaw] = useState<Record<string, any>>({});
  const [approvals, setApprovals] = useState<ApprovalState>(loadApprovals);
  const [pendingSafetyCount, setPendingSafetyCountRaw] = useState(0);
  const [businessProfile, setBusinessProfileRaw] = useState<BusinessProfile>(loadBusinessProfile);
  const [targetMarkets, setTargetMarkets] = useState<TargetMarket[]>(loadTargetMarkets);
  const [pitches, setPitches] = useState<PitchOption[]>(loadPitches);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const campaignIdRef = useRef(campaignId);
  campaignIdRef.current = campaignId;
  const abortControllerRef = useRef<AbortController | null>(null);

  // New backend-data-funnel state
  const [brainState, setBrainStateRaw] = useState<any | null>(null);
  const [connectorStatuses, setConnectorStatusesRaw] = useState<any[]>([]);
  const [prospectPipeline, setProspectPipelineRaw] = useState<any | null>(null);
  const [prospectingRuns, setProspectingRunsRaw] = useState<any[]>([]);
  const [fundingPipeline, setFundingPipelineRaw] = useState<any | null>(null);
  const [fundingInvestors, setFundingInvestorsRaw] = useState<any[]>([]);
  const [fundingRuns, setFundingRunsRaw] = useState<any[]>([]);
  const [reengagement, setReengagementRaw] = useState<any | null>(null);
  const [setupRequirements, setSetupRequirementsRaw] = useState<any | null>(null);
  const [openClawDiagnostics, setOpenClawDiagnosticsRaw] = useState<any[]>([]);
  const [scheduler, setSchedulerRaw] = useState<any | null>(null);
  const [connectorDrafts, setConnectorDraftsRaw] = useState<Record<string, { baseUrl: string; token: string }>>({});
  const [researchDossiers, _setResearchDossiers] = useState<any[]>(() => {
    try { const s = localStorage.getItem("sw_research_dossiers"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  void _setResearchDossiers;

  // Refs for stable comparison in fetchAll — prevents setState when data unchanged
  const campaignsRef = useRef(campaigns); campaignsRef.current = campaigns;
  const campaignRef = useRef(campaign); campaignRef.current = campaign;
  const brainStateRef = useRef(brainState); brainStateRef.current = brainState;
  const healthRef = useRef(health); healthRef.current = health;
  const stageDataRef = useRef(stageData); stageDataRef.current = stageData;
  const connectorStatusesRef = useRef(connectorStatuses); connectorStatusesRef.current = connectorStatuses;
  const prospectPipelineRef = useRef(prospectPipeline); prospectPipelineRef.current = prospectPipeline;
  const prospectingRunsRef = useRef(prospectingRuns); prospectingRunsRef.current = prospectingRuns;
  const fundingPipelineRef = useRef(fundingPipeline); fundingPipelineRef.current = fundingPipeline;
  const fundingInvestorsRef = useRef(fundingInvestors); fundingInvestorsRef.current = fundingInvestors;
  const fundingRunsRef = useRef(fundingRuns); fundingRunsRef.current = fundingRuns;
  const reengagementRef = useRef(reengagement); reengagementRef.current = reengagement;
  const setupRequirementsRef = useRef(setupRequirements); setupRequirementsRef.current = setupRequirements;
  const openClawDiagnosticsRef = useRef(openClawDiagnostics); openClawDiagnosticsRef.current = openClawDiagnostics;
  const schedulerRef = useRef(scheduler); schedulerRef.current = scheduler;
  const pendingSafetyCountRef = useRef(pendingSafetyCount); pendingSafetyCountRef.current = pendingSafetyCount;
  const businessProfileRef = useRef(businessProfile); businessProfileRef.current = businessProfile;
  const connectorDraftsRef = useRef(connectorDrafts); connectorDraftsRef.current = connectorDrafts;

  // setBusinessProfile is used by updateBusinessProfile callback — stable, skips identical values
  const setBusinessProfile = useCallback((v: BusinessProfile | ((prev: BusinessProfile) => BusinessProfile)) => {
    if (typeof v === "function") {
      setBusinessProfileRaw(prev => { const next = (v as (prev: BusinessProfile) => BusinessProfile)(prev); return deepEqual(next, prev) ? prev : next; });
    } else if (!deepEqual(v, businessProfileRef.current)) {
      setBusinessProfileRaw(v);
    }
  }, []);

  // Resolve to a valid campaign ID
  const getCampaignId = useCallback(() => campaignId || campaigns[0]?.id || "main-campaign", [campaignId, campaigns]);

  const setCampaignId = useCallback((id: string) => { setCampaignIdState(id); setErrorGuarded(null); }, []);

  const setActiveStagePersisted = useCallback((id: number) => {
    setActiveStage(id);
    try { localStorage.setItem("sw_active_stage", String(id)); } catch { /* silent */ }
  }, []);

  // Guarded error setter — syncs both state and ref
  function setErrorGuarded(msg: string | null) {
    if (msg !== errorRef.current) { setError(msg); errorRef.current = msg; }
  }

  // Base fetch: /state is PRIMARY, supplementary calls are parallel
  // CRITICAL: silent polls skip ALL state changes unless data actually differs.
  // This prevents the "blinking" issue where 5-second polling re-renders the entire tree.
  const isPollingRef = useRef(false);
  const isLoadingRef = useRef(true);
  const errorRef = useRef<string | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    // SILENT POLLS: absolutely no state changes for loading/polling indicators.
    // This is the #1 fix for the "blinking" issue — background polls must be invisible.
    if (!silent) {
      if (!isLoadingRef.current) { setIsLoading(true); isLoadingRef.current = true; }
      if (errorRef.current !== null) { setErrorGuarded(null); }
      if (!isPollingRef.current) { setIsPolling(true); isPollingRef.current = true; }
    }
    let hasUpdates = false;
    // Capture scroll position BEFORE any state changes
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    try {
      const stateResult = await dataService.getState();
      const nextBrain = stateResult;
      if (!deepEqual(nextBrain, brainStateRef.current)) { setBrainStateRaw(nextBrain); hasUpdates = true; }

      const campaignsMap = (stateResult as any).campaigns || {};
      const campaignsList = Object.values(campaignsMap);
      if (!deepEqual(campaignsList, campaignsRef.current)) { setCampaignsRaw(campaignsList); hasUpdates = true; }

      const cid = campaignIdRef.current || (campaignsList[0] as any)?.id || "main-campaign";
      if (!campaignIdRef.current && (campaignsList[0] as any)?.id) setCampaignIdState(cid);

      const activeCampaign = campaignsMap[cid] || campaignsList[0] || null;
      if (!deepEqual(activeCampaign, campaignRef.current)) { setCampaignRaw(activeCampaign); hasUpdates = true; }

      const nextScheduler = (stateResult as any).scheduler || null;
      if (!deepEqual(nextScheduler, schedulerRef.current)) { setSchedulerRaw(nextScheduler); hasUpdates = true; }

      const nextStageData = {
        researchRecords: (stateResult as any).researchRecords || [],
        analyticsEvents: (stateResult as any).analyticsEvents || [],
        outreachEvents: (stateResult as any).outreachEvents || [],
        targets: (stateResult as any).targetProfiles || [],
        playbooks: (stateResult as any).memory?.playbooks || [],
        investors: (stateResult as any).investorRecords || [],
        fundingPipeline: null,
        memoryRecall: null,
        targetProfiles: (stateResult as any).memory?.targetProfiles || [],
        dlq: (stateResult as any).dlq || null,
        safety: (stateResult as any).safetyExecutions || [],
        decisions: (stateResult as any).decisions || [],
        contentPacks: (stateResult as any).contentPacks || [],
      };
      if (!deepEqual(nextStageData, stageDataRef.current)) { setStageDataRaw(nextStageData); hasUpdates = true; }

      const cId = getCampaignId();
      const [healthData, connectors, reqs, diagnostics, prospectPipe, prospects, fundPipe, fundInv, fundRun, reeng] = await Promise.allSettled([
        dataService.getHealth().catch(() => null),
        dataService.getConnectorStatuses(false).catch(() => []),
        dataService.getSetupRequirements().catch(() => null),
        dataService.getOpenClawDiagnostics().catch(() => ({ diagnostics: [] })),
        dataService.getProspectPipeline(cId).catch(() => null),
        dataService.getProspects(cId).catch(() => []),
        dataService.getFundingPipeline(cId).catch(() => null),
        dataService.getFundingInvestors(cId).catch(() => []),
        dataService.getFundingRuns(cId).catch(() => []),
        dataService.getReengagementQueue(cId).catch(() => null),
      ]);

      const nextHealth = healthData.status === "fulfilled" ? healthData.value : null;
      if (!deepEqual(nextHealth, healthRef.current)) { setHealthRaw(nextHealth); hasUpdates = true; }

      const connectorArr = connectors.status === "fulfilled" ? (connectors.value as any[]) : [];
      if (!deepEqual(connectorArr, connectorStatusesRef.current)) { setConnectorStatusesRaw(connectorArr); hasUpdates = true; }
      if (connectorArr.length > 0) {
        const nextDrafts = { ...connectorDraftsRef.current };
        let draftsChanged = false;
        for (const st of connectorArr) {
          if (st && st.connector && !nextDrafts[st.connector]) { nextDrafts[st.connector] = { baseUrl: st.baseUrl || "", token: "" }; draftsChanged = true; }
        }
        if (draftsChanged) setConnectorDraftsRaw(nextDrafts);
      }

      const nextSetupReqs = reqs.status === "fulfilled" ? reqs.value : null;
      if (!deepEqual(nextSetupReqs, setupRequirementsRef.current)) { setSetupRequirementsRaw(nextSetupReqs); hasUpdates = true; }

      const nextDiagnostics = diagnostics.status === "fulfilled" ? ((diagnostics.value as any)?.diagnostics || []) : [];
      if (!deepEqual(nextDiagnostics, openClawDiagnosticsRef.current)) { setOpenClawDiagnosticsRaw(nextDiagnostics); hasUpdates = true; }

      const nextProspectPipe = prospectPipe.status === "fulfilled" ? prospectPipe.value : null;
      if (!deepEqual(nextProspectPipe, prospectPipelineRef.current)) { setProspectPipelineRaw(nextProspectPipe); hasUpdates = true; }

      const nextProspects = prospects.status === "fulfilled" ? prospects.value : [];
      if (!deepEqual(nextProspects, prospectingRunsRef.current)) { setProspectingRunsRaw(nextProspects); hasUpdates = true; }

      const nextFundPipe = fundPipe.status === "fulfilled" ? fundPipe.value : null;
      if (!deepEqual(nextFundPipe, fundingPipelineRef.current)) { setFundingPipelineRaw(nextFundPipe); hasUpdates = true; }

      const nextFundInv = fundInv.status === "fulfilled" ? fundInv.value : [];
      if (!deepEqual(nextFundInv, fundingInvestorsRef.current)) { setFundingInvestorsRaw(nextFundInv); hasUpdates = true; }

      const nextFundRuns = fundRun.status === "fulfilled" ? fundRun.value : [];
      if (!deepEqual(nextFundRuns, fundingRunsRef.current)) { setFundingRunsRaw(nextFundRuns); hasUpdates = true; }

      const nextReeng = reeng.status === "fulfilled" ? reeng.value : null;
      if (!deepEqual(nextReeng, reengagementRef.current)) { setReengagementRaw(nextReeng); hasUpdates = true; }

      const nextSafetyCount = ((stateResult as any).safetyExecutions || []).filter((r: any) => r.status === "pending").length;
      if (nextSafetyCount !== pendingSafetyCountRef.current) { setPendingSafetyCountRaw(nextSafetyCount); hasUpdates = true; }

      // Only update timestamp when data actually changed
      if (hasUpdates) setLastRefresh(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (!silent) setErrorGuarded(err.message || "Failed to fetch data");
    } finally {
      // Silent polls: DO NOT touch isPolling or isLoading — stay completely invisible
      if (!silent) {
        if (isLoadingRef.current) { setIsLoading(false); isLoadingRef.current = false; }
        if (isPollingRef.current) { setIsPolling(false); isPollingRef.current = false; }
      }
      // Restore scroll position if we had updates (prevents jumping on data refresh)
      if (hasUpdates && scrollY > 0 && typeof window !== "undefined") {
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCampaignId]);

  const fetchAllRef = useRef(fetchAll);
  fetchAllRef.current = fetchAll;

  // Effects — stable polling: uses ref to avoid infinite re-render loop
  useEffect(() => {
    fetchAllRef.current(false);
    timerRef.current = setInterval(() => fetchAllRef.current(true), POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);
  useEffect(() => { saveApprovals(approvals); }, [approvals]);
  useEffect(() => { saveBusinessProfile(businessProfile); }, [businessProfile]);
  useEffect(() => { saveTargetMarkets(targetMarkets); }, [targetMarkets]);
  useEffect(() => { savePitches(pitches); }, [pitches]);
  useEffect(() => { localStorage.setItem("sw_research_dossiers", JSON.stringify(researchDossiers)); }, [researchDossiers]);
  // Persist active stage whenever it changes
  useEffect(() => {
    try { localStorage.setItem("sw_active_stage", String(activeStage)); } catch { /* silent */ }
  }, [activeStage]);

  // Auto-trigger research when business profile has a website
  useEffect(() => {
    if (businessProfile.website && businessProfile.website.length > 3) {
      const timer = setTimeout(() => {
        localStorage.setItem("sw_trigger_research", businessProfile.website);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [businessProfile.website]);

  const clearError = () => setErrorGuarded(null);
  const refresh = useCallback(() => fetchAll(false), [fetchAll]);

  const toggleApproval = useCallback((key: keyof ApprovalState) => { setApprovals(prev => ({ ...prev, [key]: !prev[key] })); }, []);
  const approveVariant = useCallback((vid: string) => { setApprovals(prev => ({ ...prev, approvedVariantIds: prev.approvedVariantIds.includes(vid) ? prev.approvedVariantIds : [...prev.approvedVariantIds, vid] })); }, []);
  const rejectVariant = useCallback((vid: string) => { setApprovals(prev => ({ ...prev, approvedVariantIds: prev.approvedVariantIds.filter(id => id !== vid) })); }, []);

  const updateBusinessProfile = useCallback((p: Partial<BusinessProfile>) => { setBusinessProfile(prev => ({ ...prev, ...p })); }, []);
  const setBusinessResearchStatus = useCallback((s: BusinessProfile["researchStatus"]) => { setBusinessProfile(prev => ({ ...prev, researchStatus: s })); }, []);

  const approveTargetMarket = useCallback((id: string) => { setTargetMarkets(prev => prev.map(m => m.id === id ? { ...m, status: "approved" as const } : m)); }, []);
  const rejectTargetMarket = useCallback((id: string) => { setTargetMarkets(prev => prev.map(m => m.id === id ? { ...m, status: "rejected" as const } : m)); }, []);

  const approvePitch = useCallback((id: string) => { setPitches(prev => prev.map(p => ({ ...p, status: p.id === id ? "approved" as const : p.status === "approved" ? "rejected" as const : p.status }))); }, []);
  const rejectPitch = useCallback((id: string) => { setPitches(prev => prev.map(p => p.id === id ? { ...p, status: "rejected" as const } : p)); }, []);

  // Automation methods
  const runAutomation = useCallback(async () => {
    setIsLoading(true);
    try { await dataService.runAutomation(getCampaignId()); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
    finally { setIsLoading(false); }
  }, [getCampaignId, fetchAll]);

  const generateContent = useCallback(async () => {
    setIsLoading(true);
    try { await dataService.generateContent(getCampaignId()); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
    finally { setIsLoading(false); }
  }, [getCampaignId, fetchAll]);

  const runResearch = useCallback(async () => {
    setBusinessResearchStatus("researching");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const cid = getCampaignId();
    try {
      await dataService.runAutomation(cid);
      const startTime = Date.now();
      let records: any[] = [];
      while (Date.now() - startTime < AUTO_TIMEOUT && !controller.signal.aborted) {
        await new Promise(r => setTimeout(r, AUTO_POLL));
        if (controller.signal.aborted) break;
        try { records = await dataService.getResearchRecords(cid); } catch { /* silent */ }
        if (records.length > 0) break;
      }
      if (controller.signal.aborted) return;
      await fetchAll(true);
      const findings = records.length > 0
        ? records.slice(0, 5).map((r: any, i: number) => {
            const source = r.source || r.url || r.domain || r.origin || "research";
            const insight = r.insight || r.summary || r.title || r.finding || r.content || JSON.stringify(r).slice(0, 80);
            return `${i + 1}. [${source}] ${insight}`;
          })
        : [];
      updateBusinessProfile({
        researchStatus: "completed",
        researchFindings: findings,
        valueProposition: businessProfile.productDescription,
        scrapedUrls: records.filter((r: any) => r.url || r.sourceUrl).map((r: any) => r.url || r.sourceUrl),
      });
    } catch {
      setBusinessResearchStatus("error");
    }
  }, [getCampaignId, fetchAll, businessProfile, updateBusinessProfile, setBusinessResearchStatus]);

  const discoverMarkets = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const cid = getCampaignId();
    try {
      await dataService.runAutomation(cid);
      const startTime = Date.now();
      let realTargets: any[] = [];
      while (Date.now() - startTime < AUTO_TIMEOUT && !controller.signal.aborted) {
        await new Promise(r => setTimeout(r, AUTO_POLL));
        if (controller.signal.aborted) break;
        try { realTargets = await dataService.getTargets(cid); } catch { /* silent */ }
        if (realTargets.length > 0) break;
      }
      if (controller.signal.aborted) return;
      await fetchAll(true);
      if (realTargets.length > 0) {
        const newMarkets: TargetMarket[] = realTargets.slice(0, 6).map((t: any, i: number) => ({
          id: t.id || t.targetId || `market-${Date.now()}-${i}`,
          segment: t.segment || t.company || "",
          description: t.description || t.summary || "",
          estimatedReach: t.estimatedReach || t.reach || t.audienceSize || 0,
          fitScore: t.fitScore || t.score || 0,
          channels: Array.isArray(t.channels) ? t.channels : (t.recommendedChannel ? [t.recommendedChannel] : []),
          painPoints: Array.isArray(t.painPoints) ? t.painPoints : (t.pains || []),
          status: "discovered" as const,
        }));
        setTargetMarkets(prev => [...newMarkets, ...prev].slice(0, 12));
      }
    } catch (e: any) { setErrorGuarded(e.message || "Failed to discover markets"); }
  }, [getCampaignId, fetchAll, businessProfile]);

  const generatePitches = useCallback(async () => {
    const cid = getCampaignId();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    let newPitches: PitchOption[] = [];

    try {
      // Step 1: Try backend content generation via LM Studio
      // Wrap in race with 30s timeout so a hung backend doesn't freeze the UI
      const generatePromise = dataService.generateContent(cid);
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Content generation timed out after 30s")), 30000)
      );
      const result = await Promise.race([generatePromise, timeoutPromise]).catch(() => null);

      if (controller.signal.aborted) return;

      // Step 2: Poll for content pack
      const startTime = Date.now();
      let contentPack = null;
      while (Date.now() - startTime < AUTO_TIMEOUT && !controller.signal.aborted) {
        await new Promise(r => setTimeout(r, AUTO_POLL));
        if (controller.signal.aborted) break;
        try { const camp = await dataService.getCampaign(cid); contentPack = camp?.latestContentPack; } catch { /* silent */ }
        if (contentPack) break;
      }

      if (controller.signal.aborted) return;
      await fetchAll(true);

      // Step 3: Build pitches from backend response (real LM Studio output)
      if (result?.pitches && Array.isArray(result.pitches) && result.pitches.length > 0) {
        newPitches = result.pitches.map((p: any, i: number) => ({
          id: p.id || `pitch-${Date.now()}-${i}`,
          title: p.title || `Pitch Option ${i + 1}`,
          subject: p.subject || p.subjectLine || `Subject for ${businessProfile.businessName || "your campaign"}`,
          body: p.body || p.message || p.content || "",
          cta: p.cta || p.callToAction || "Learn more",
          angle: p.angle || p.framework || "Value Proposition",
          tone: p.tone || "Professional",
          targetSegment: p.targetSegment || p.segment || businessProfile.targetCustomer || "Decision Makers",
          status: "draft" as const,
        }));
      } else if (contentPack?.variants && contentPack.variants.length > 0) {
        newPitches = contentPack.variants.slice(0, 3).map((v: any, i: number) => ({
          id: v.id || `pitch-${Date.now()}-${i}`,
          title: v.title || `Pitch ${i + 1} (${v.locale || "en"})`,
          subject: v.subject || v.headline || "Subject line",
          body: v.body || v.preheader || v.message || "",
          cta: v.cta || "Get started",
          angle: v.angle || "Direct",
          tone: v.tone || "Professional",
          targetSegment: v.targetSegment || businessProfile.targetCustomer || "All segments",
          status: "draft" as const,
        }));
      }
    } catch (err: any) {
      // Backend failed (no campaign, LM Studio error, etc) — mark but don't stop
      setErrorGuarded(`Backend: ${err.message}. Using local fallback.`);
    } finally {
      // Always clear loading and reset abort controller — prevents stuck spinner
      setPitches(prev => [...newPitches, ...prev].slice(0, 10));
      setIsLoading(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [getCampaignId, fetchAll, businessProfile]);

  // New backend data funnel methods
  const generateProspects = useCallback(async () => {
    setIsLoading(true);
    try { await dataService.generateProspects(getCampaignId()); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
    finally { setIsLoading(false); }
  }, [getCampaignId, fetchAll]);

  const enrichProspects = useCallback(async () => {
    setIsLoading(true);
    try { await dataService.enrichProspects(getCampaignId()); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
    finally { setIsLoading(false); }
  }, [getCampaignId, fetchAll]);

  const sequenceProspects = useCallback(async () => {
    setIsLoading(true);
    try { await dataService.sequenceProspects(getCampaignId()); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
    finally { setIsLoading(false); }
  }, [getCampaignId, fetchAll]);

  const runFunding = useCallback(async () => {
    setIsLoading(true);
    try { await dataService.runFunding(getCampaignId()); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
    finally { setIsLoading(false); }
  }, [getCampaignId, fetchAll]);

  const updateConnector = useCallback(async (connector: string, baseUrl: string, token: string) => {
    try { await dataService.updateConnectorConfig(connector, { baseUrl, token, probe: true }); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
  }, [fetchAll]);

  const runPromptAutopilot = useCallback(async (prompt: string) => {
    setIsLoading(true);
    try { await dataService.runPromptAutopilot(prompt, { campaignId: getCampaignId() }); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
    finally { setIsLoading(false); }
  }, [getCampaignId, fetchAll]);

  const ingestOutcomes = useCallback(async (payload: any) => {
    try { await dataService.ingestOutcomes({ campaignId: getCampaignId(), ...payload }); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
  }, [getCampaignId, fetchAll]);

  const addResearchRecord = useCallback(async (record: any) => {
    try { await dataService.addResearchRecord({ campaignId: getCampaignId(), ...record }); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
  }, [getCampaignId, fetchAll]);

  const getTargetDecision = useCallback(async () => {
    try { await dataService.getTargetDecision(getCampaignId()); await fetchAll(true); }
    catch (err: any) { setErrorGuarded(err.message || String(err)); }
  }, [getCampaignId, fetchAll]);

  const stages = useMemo(
    () => computeStages(campaign, stageData, approvals, businessProfile, targetMarkets, pitches),
    [campaign, stageData, approvals, businessProfile, targetMarkets, pitches]
  );

  const value: AppContextValue = {
    state: {
      campaigns, campaign, campaignId, stages, activeStage, isLoading, error, health, lastRefresh, isPolling,
      approvals, pendingSafetyCount, businessProfile, targetMarkets, pitches,
      brainState, connectorStatuses, prospectPipeline, prospectingRuns,
      fundingPipeline, fundingInvestors, fundingRuns, reengagement,
      setupRequirements, openClawDiagnostics, scheduler, connectorDrafts, researchDossiers,
    },
    setActiveStage: setActiveStagePersisted, setCampaignId, refresh, runAutomation, generateContent, clearError,
    toggleApproval, approveVariant, rejectVariant,
    updateBusinessProfile, setBusinessResearchStatus,
    approveTargetMarket, rejectTargetMarket,
    approvePitch, rejectPitch, generatePitches,
    runResearch, discoverMarkets,
    generateProspects, enrichProspects, sequenceProspects, runFunding,
    updateConnector, runPromptAutopilot, ingestOutcomes, addResearchRecord, getTargetDecision,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}

// helpers
