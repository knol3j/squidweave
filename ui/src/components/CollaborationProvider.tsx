import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Campaign, dataService } from '../services/dataService';
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
    id: CAMPAIGN_ID,
    connector: 'openclaw',
    connectors: ['openclaw', 'clawdbot'],
    activePrompt: '',
    activeTab: 'engine',
    locales: [],
    objective: '',
    audience: '',
    offer: '',
    brandVoice: '',
    channel: '',
    clientName: '',
    clientNeed: '',
    intakeStatus: 'draft',
    successDefinition: '',
    constraints: '',
    differentiators: '',
    researchNotes: '',
    markets: [],
    researchObjectives: [],
    successMetrics: [],
    automationEnabled: false,
    enabledModules: getAllAgentIds(),
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
          await dataService.updateCampaign(CAMPAIGN_ID, campaignState);
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

  const updateCampaignState = async (updates: Partial<Campaign>) => {
    const merged = {
      ...campaignState,
      ...updates,
      connector: updates.connector || campaignState.connector || 'openclaw',
      connectors: updates.connectors?.length ? updates.connectors : campaignState.connectors || ['openclaw', 'clawdbot'],
      id: CAMPAIGN_ID,
    };
    setCampaignState(merged);
    const persisted = await dataService.updateCampaign(CAMPAIGN_ID, merged);
    setCampaignState(prev => ({
      ...prev,
      ...persisted,
      connector: persisted.connector || merged.connector,
      connectors: persisted.connectors?.length ? persisted.connectors : merged.connectors,
      id: CAMPAIGN_ID,
    }));
  };

  const sendMessage = async (role: 'user' | 'assistant', content: string, image?: string) => {
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
  };

  const toggleModule = async (moduleId: string) => {
    const currentModules = campaignState.enabledModules || [];
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(id => id !== moduleId)
      : [...currentModules, moduleId];
    await updateCampaignState({ enabledModules: newModules });
  };

  const value = useMemo(() => ({
    user,
    loading,
    campaignState: { ...campaignState, id: CAMPAIGN_ID },
    messages,
    updateCampaignState,
    sendMessage,
    toggleModule,
    replaceMessages: setMessages,
  }), [user, loading, campaignState, messages]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
