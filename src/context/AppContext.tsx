import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type {
  Stage,
  Campaign,
  Connector,
  ResearchRecord,
  AnalyticsEvent,
  OutreachEvent,
  Target,
  Investor,
  ContentVariant,
  ABTest,
  ExecutionReceipt,
  DLQEntry,
  Playbook,
} from '@/types';
import {
  initialStages,
  campaign as initialCampaign,
  connectors as initialConnectors,
  researchRecords as initialResearchRecords,
  analyticsEvents as initialAnalyticsEvents,
  outreachEvents as initialOutreachEvents,
  targets as initialTargets,
  investors as initialInvestors,
  contentVariants as initialContentVariants,
  abTests as initialABTests,
  executionReceipts as initialExecutionReceipts,
  dlqEntries as initialDLQEntries,
  playbooks as initialPlaybooks,
} from '@/data/mockData';

export interface AppState {
  stages: Stage[];
  campaign: Campaign;
  connectors: Connector[];
  researchRecords: ResearchRecord[];
  analyticsEvents: AnalyticsEvent[];
  outreachEvents: OutreachEvent[];
  targets: Target[];
  investors: Investor[];
  contentVariants: ContentVariant[];
  abTests: ABTest[];
  executionReceipts: ExecutionReceipt[];
  dlqEntries: DLQEntry[];
  playbooks: Playbook[];
  isRunningBrain: boolean;
  activeStage: number;
  dryRunMode: boolean;
}

export type AppAction =
  | { type: 'SET_STAGE_STATUS'; stageId: number; status: Stage['status'] }
  | { type: 'UPDATE_CAMPAIGN'; campaign: Partial<Campaign> }
  | { type: 'RUN_BRAIN_START' }
  | { type: 'RUN_BRAIN_END' }
  | { type: 'EXPAND_STAGE'; stageId: number }
  | { type: 'TOGGLE_AUTOMATION'; stageId: number }
  | { type: 'TOGGLE_DRY_RUN' }
  | { type: 'ADD_RESEARCH_RECORD'; record: ResearchRecord }
  | { type: 'UPDATE_CONNECTOR'; connectorId: string; updates: Partial<Connector> }
  | { type: 'ADD_OUTREACH_EVENT'; event: OutreachEvent }
  | { type: 'APPROVE_RECEIPT'; receiptId: string }
  | { type: 'DENY_RECEIPT'; receiptId: string }
  | { type: 'RETRY_DLQ'; entryId: string }
  | { type: 'DELETE_DLQ'; entryId: string };

function computeStageStatuses(state: AppState): Stage[] {
  const stages = [...state.stages];

  // Stage 0 (Setup): always unlocked — check if ready
  const stage0Ready =
    state.campaign.name.trim().length > 0 &&
    state.campaign.objective.trim().length > 0 &&
    state.campaign.locales.length > 0;

  if (stages[0].status === 'locked') stages[0] = { ...stages[0], status: 'configuring' };
  if (stages[0].status === 'configuring' && stage0Ready) stages[0] = { ...stages[0], status: 'ready' };

  // Stage 1 (Ingest): unlocks when campaign has name + objective + >=1 locale
  const stage1Unlocked = stage0Ready;
  const stage1Ready =
    stage1Unlocked &&
    (state.connectors.some(c => c.status !== 'error') ||
      state.researchRecords.length >= 3 ||
      state.analyticsEvents.length + state.outreachEvents.length >= 5);

  if (stages[1].status === 'locked' && stage1Unlocked) stages[1] = { ...stages[1], status: 'configuring' };
  if (stages[1].status === 'configuring' && stage1Ready) stages[1] = { ...stages[1], status: 'ready' };
  if (stages[1].status === 'locked' && stage1Ready) stages[1] = { ...stages[1], status: 'ready' };

  // Stage 2 (Decide): unlocks when Stage 1 ready AND (>=1 connector configured OR >=3 research OR >=5 events)
  const stage2Unlocked = stage1Ready;
  const stage2Ready =
    stage2Unlocked &&
    (state.targets.length >= 3 || state.investors.length >= 5);

  if (stages[2].status === 'locked' && stage2Unlocked) stages[2] = { ...stages[2], status: 'configuring' };
  if (stages[2].status === 'configuring' && stage2Ready) stages[2] = { ...stages[2], status: 'ready' };

  // Stage 3 (Create): unlocks when Stage 2 ready AND (>=1 decision run OR >=3 targets OR >=5 investors)
  const stage3Unlocked = stage2Ready;
  const stage3Ready =
    stage3Unlocked &&
    (state.contentVariants.some(v => v.status === 'approved') ||
      state.abTests.length >= 1);

  if (stages[3].status === 'locked' && stage3Unlocked) stages[3] = { ...stages[3], status: 'configuring' };
  if (stages[3].status === 'configuring' && stage3Ready) stages[3] = { ...stages[3], status: 'ready' };

  // Stage 4 (Send): unlocks when Stage 3 ready AND (>=1 approved variant OR >=1 ab test OR >=1 funnel)
  const stage4Unlocked = stage3Ready;
  const stage4Ready =
    stage4Unlocked &&
    (state.outreachEvents.length >= 5 || state.executionReceipts.length >= 1);

  if (stages[4].status === 'locked' && stage4Unlocked) stages[4] = { ...stages[4], status: 'configuring' };
  if (stages[4].status === 'configuring' && stage4Ready) stages[4] = { ...stages[4], status: 'ready' };

  // Stage 5 (Learn): unlocks when Stage 4 ready AND (>=5 outreach events OR >=1 execution receipt)
  const stage5Unlocked = stage4Ready;
  if (stages[5].status === 'locked' && stage5Unlocked) stages[5] = { ...stages[5], status: 'configuring' };
  if (stages[5].status === 'configuring' && state.playbooks.length >= 1) stages[5] = { ...stages[5], status: 'ready' };

  return stages;
}

const initialState: AppState = {
  stages: initialStages,
  campaign: initialCampaign,
  connectors: initialConnectors,
  researchRecords: initialResearchRecords,
  analyticsEvents: initialAnalyticsEvents,
  outreachEvents: initialOutreachEvents,
  targets: initialTargets,
  investors: initialInvestors,
  contentVariants: initialContentVariants,
  abTests: initialABTests,
  executionReceipts: initialExecutionReceipts,
  dlqEntries: initialDLQEntries,
  playbooks: initialPlaybooks,
  isRunningBrain: false,
  activeStage: 0,
  dryRunMode: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STAGE_STATUS': {
      const stages = state.stages.map(s =>
        s.id === action.stageId ? { ...s, status: action.status } : s
      );
      const newState = { ...state, stages };
      return { ...newState, stages: computeStageStatuses(newState) };
    }

    case 'UPDATE_CAMPAIGN': {
      const newState = { ...state, campaign: { ...state.campaign, ...action.campaign } };
      return { ...newState, stages: computeStageStatuses(newState) };
    }

    case 'RUN_BRAIN_START':
      return { ...state, isRunningBrain: true };

    case 'RUN_BRAIN_END':
      return { ...state, isRunningBrain: false };

    case 'EXPAND_STAGE': {
      const targetStage = state.stages.find(s => s.id === action.stageId);
      if (!targetStage || targetStage.status === 'locked') return state;
      return { ...state, activeStage: action.stageId };
    }

    case 'TOGGLE_AUTOMATION': {
      const stages = state.stages.map(s =>
        s.id === action.stageId
          ? { ...s, status: s.status === 'active' ? 'ready' : 'active' as Stage['status'] }
          : s
      );
      return { ...state, stages };
    }

    case 'TOGGLE_DRY_RUN':
      return { ...state, dryRunMode: !state.dryRunMode };

    case 'ADD_RESEARCH_RECORD': {
      const newState = {
        ...state,
        researchRecords: [...state.researchRecords, action.record],
      };
      return { ...newState, stages: computeStageStatuses(newState) };
    }

    case 'UPDATE_CONNECTOR': {
      const connectors = state.connectors.map(c =>
        c.id === action.connectorId ? { ...c, ...action.updates } : c
      );
      const newState = { ...state, connectors };
      return { ...newState, stages: computeStageStatuses(newState) };
    }

    case 'ADD_OUTREACH_EVENT': {
      const newState = {
        ...state,
        outreachEvents: [...state.outreachEvents, action.event],
      };
      return { ...newState, stages: computeStageStatuses(newState) };
    }

    case 'APPROVE_RECEIPT': {
      const receipts = state.executionReceipts.map(r =>
        r.id === action.receiptId ? { ...r, status: 'approved' as const } : r
      );
      const newState = { ...state, executionReceipts: receipts };
      return { ...newState, stages: computeStageStatuses(newState) };
    }

    case 'DENY_RECEIPT': {
      const receipts = state.executionReceipts.map(r =>
        r.id === action.receiptId ? { ...r, status: 'denied' as const } : r
      );
      return { ...state, executionReceipts: receipts };
    }

    case 'RETRY_DLQ': {
      const entries = state.dlqEntries.map(e =>
        e.id === action.entryId ? { ...e, retries: e.retries + 1 } : e
      );
      return { ...state, dlqEntries: entries };
    }

    case 'DELETE_DLQ': {
      const entries = state.dlqEntries.filter(e => e.id !== action.entryId);
      return { ...state, dlqEntries: entries };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  runBrain: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const runBrain = useCallback(() => {
    dispatch({ type: 'RUN_BRAIN_START' });
    // Simulate sequential stage processing
    const stageIds = [0, 1, 2, 3, 4, 5];
    stageIds.forEach((stageId, idx) => {
      setTimeout(() => {
        dispatch({ type: 'EXPAND_STAGE', stageId });
      }, (idx + 1) * 400);
    });
    setTimeout(() => {
      dispatch({ type: 'RUN_BRAIN_END' });
    }, 3000);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, runBrain }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
