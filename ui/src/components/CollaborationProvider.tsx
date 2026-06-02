import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, Campaign, dataService } from '../services/dataService';
import { getAllAgentIds } from '../lib/agentSystem';

type LocalUser = {
  uid: string;
  displayName: string;
  photoURL?: string | null;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
  createdAt: string;
};

interface CollaborationContextType {
  user: LocalUser | null;
  loading: boolean;
  campaignState: Campaign & { id: string };
  messages: ChatMessage[];
  updateCampaignState: (updates: Partial<Campaign>) => Promise<void>;
  sendMessage: (role: 'user' | 'assistant', content: string, image?: string) => Promise<void>;
  toggleModule: (moduleId: string) => Promise<void>;
  replaceMessages: (messages: ChatMessage[]) => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);
const CAMPAIGN_ID = 'main-campaign';
const STORAGE_KEY = 'squidweave-local-messages';
const LEGACY_STORAGE_KEY = 'localeweave-local-messages';

const DEFAULT_CAMPAIGN: Campaign = {
  id: CAMPAIGN_ID,
  name: 'Main Campaign',
  connector: 'openclaw',
  connectors: ['openclaw', 'clawdbot'],
  activePrompt: 'Build a localized outbound campaign that turns market intelligence into qualified pipeline.',
  activeTab: 'engine',
  locales: ['en-US'],
  objective: 'Generate qualified meetings from localized outbound campaigns.',
  audience: 'Revenue leaders at growth-stage B2B companies',
  offer: 'A focused campaign strategy and outbound execution plan',
  brandVoice: 'Direct, credible, and operationally sharp',
  channel: 'multichannel',
  clientName: 'SquidWeave',
  clientNeed: 'Operationalize campaign planning, targeting, and automation from one control surface.',
  intakeStatus: 'ready',
  successDefinition: 'Produce a campaign that can be launched and measured without manual state stitching.',
  constraints: '',
  differentiators: 'Persistent memory, localized content orchestration, live operator visibility',
  researchNotes: '',
  markets: ['United States'],
  researchObjectives: ['Prioritize the highest-conviction targets', 'Adapt messaging by market'],
  successMetrics: ['Meetings booked', 'Reply rate', 'Pipeline generated'],
  automationEnabled: false,
  enabledModules: getAllAgentIds(),
};

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

function readStoredMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<LocalUser | null>({
    uid: 'squidweave-operator',
    displayName: 'SquidWeave Operator',
    photoURL: null,
  });
  const [loading, setLoading] = useState(true);
  const [campaignState, setCampaignState] = useState<Campaign>({
    ...DEFAULT_CAMPAIGN,
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const existing = await dataService.getCampaign(CAMPAIGN_ID);
        if (existing) {
          if (active) {
            setCampaignState(prev => ({
              ...prev,
              ...existing,
              connector: existing.connector || prev.connector,
              connectors: existing.connectors?.length ? existing.connectors : prev.connectors,
              id: CAMPAIGN_ID,
            }));
          }
        } else {
          const created = await dataService.updateCampaign(CAMPAIGN_ID, DEFAULT_CAMPAIGN);
          if (active) {
            setCampaignState(prev => ({
              ...prev,
              ...created,
              id: CAMPAIGN_ID,
            }));
          }
        }
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('Failed to bootstrap collaboration state', error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const updateCampaignState = useCallback(async (updates: Partial<Campaign>) => {
    let merged: Campaign & { id: string };
    setCampaignState(prev => {
      merged = {
        ...prev,
        ...updates,
        connector: updates.connector || prev.connector || 'openclaw',
        connectors: updates.connectors?.length ? updates.connectors : prev.connectors || ['openclaw', 'clawdbot'],
        id: CAMPAIGN_ID,
      } as Campaign & { id: string };
      return merged;
    });
    // merged is synchronously assigned inside the setState updater
    const persisted = await dataService.updateCampaign(CAMPAIGN_ID, merged!);
    setCampaignState(prev => ({
      ...prev,
      ...persisted,
      connector: persisted.connector || merged!.connector,
      connectors: persisted.connectors?.length ? persisted.connectors : merged!.connectors,
      id: CAMPAIGN_ID,
    }));
  }, []);

  const sendMessage = useCallback(async (role: 'user' | 'assistant', content: string, image?: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content,
        image: image || null,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const toggleModule = useCallback(async (moduleId: string) => {
    setCampaignState(prev => {
      const currentModules = prev.enabledModules || [];
      const newModules = currentModules.includes(moduleId)
        ? currentModules.filter(id => id !== moduleId)
        : [...currentModules, moduleId];
      // fire-and-forget the async update
      void updateCampaignState({ enabledModules: newModules });
      return prev;
    });
  }, [updateCampaignState]);

  const value = useMemo(() => ({
    user,
    loading,
    campaignState: { ...campaignState, id: CAMPAIGN_ID },
    messages,
    updateCampaignState,
    sendMessage,
    toggleModule,
    replaceMessages: setMessages,
  }), [user, loading, campaignState, messages, updateCampaignState, sendMessage, toggleModule]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
