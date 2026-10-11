import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tags: string[];
  stage: string;
  dealValue: number;
  lastActivity: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  recipients: number;
  openRate: number;
  clickRate: number;
  lastSent: string;
  subject: string;
}

export interface Funnel {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'paused';
  visitors: number;
  leads: number;
  conversionRate: number;
  steps: string[];
}

export interface Appointment {
  id: string;
  title: string;
  contactName: string;
  type: 'call' | 'meeting' | 'demo';
  date: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface Task {
  id: string;
  title: string;
  due: string;
  contactName: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  time: string;
}

export type Tier = 'free' | 'growth' | 'pro' | 'enterprise';

export interface ScheduledPost {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook';
  content: string;
  scheduledAt: string;
  status: 'scheduled' | 'published' | 'failed';
}

export interface AdAccount {
  id: string;
  platform: 'google' | 'meta' | 'linkedin';
  name: string;
  connected: boolean;
  spend: number;
  budget: number;
  campaigns: number;
}

export interface RetargetingPixel {
  id: string;
  platform: 'google' | 'meta' | 'linkedin' | 'twitter';
  name: string;
  code: string;
  installed: boolean;
  audienceSize: number;
}

export interface AdCampaign {
  id: string;
  name: string;
  platform: 'google' | 'meta' | 'linkedin' | 'youtube';
  status: 'active' | 'paused' | 'draft';
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

interface Store {
  sidebarCollapsed: boolean;
  contacts: Contact[];
  campaigns: Campaign[];
  funnels: Funnel[];
  appointments: Appointment[];
  tasks: Task[];
  activities: Activity[];
  tier: Tier;
  scheduledPosts: ScheduledPost[];
  adAccounts: AdAccount[];
  pixels: RetargetingPixel[];
  adCampaigns: AdCampaign[];
  toggleSidebar: () => void;
  addContact: (c: Omit<Contact, 'id' | 'createdAt'>) => void;
  updateContact: (id: string, data: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  toggleTask: (id: string) => void;
  addCampaign: (c: Omit<Campaign, 'id'>) => void;
  setTier: (tier: Tier) => void;
  addScheduledPost: (p: Omit<ScheduledPost, 'id'>) => void;
  addPixel: (p: Omit<RetargetingPixel, 'id'>) => void;
  addAdCampaign: (c: Omit<AdCampaign, 'id'>) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      contacts: [],
      campaigns: [],
      funnels: [],
      appointments: [],
      tasks: [],
      activities: [],
      tier: 'free',
      scheduledPosts: [],
      adAccounts: [],
      pixels: [],
      adCampaigns: [],
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      addContact: c =>
        set(s => ({
          contacts: [...s.contacts, { ...c, id: `c${Date.now()}`, createdAt: new Date().toISOString() }],
        })),
      updateContact: (id, data) =>
        set(s => ({ contacts: s.contacts.map(c => (c.id === id ? { ...c, ...data } : c)) })),
      deleteContact: id => set(s => ({ contacts: s.contacts.filter(c => c.id !== id) })),
      toggleTask: id =>
        set(s => ({ tasks: s.tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)) })),
      addCampaign: c => set(s => ({ campaigns: [...s.campaigns, { ...c, id: `ca${Date.now()}` }] })),
      setTier: tier => set({ tier }),
      addScheduledPost: p =>
        set(s => ({ scheduledPosts: [...s.scheduledPosts, { ...p, id: `sp${Date.now()}` }] })),
      addPixel: p => set(s => ({ pixels: [...s.pixels, { ...p, id: `px${Date.now()}` }] })),
      addAdCampaign: c =>
        set(s => ({ adCampaigns: [...s.adCampaigns, { ...c, id: `adc${Date.now()}` }] })),
    }),
    { name: 'sw-marketing-os' }
  )
);
