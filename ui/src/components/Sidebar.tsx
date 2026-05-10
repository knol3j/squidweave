import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  Columns,
  Eye,
  Globe2,
  MemoryStick,
  Network,
  Palette,
  Rocket,
  Save,
  Sparkles,
  Target,
  Workflow,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollaboration } from './CollaborationProvider';
import { dataService, SetupRequirements } from '../services/dataService';

interface SidebarProps {
  onSelectTemplate?: (prompt: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const MODULES = [
  { id: 'AdSync', label: 'AdSync', description: 'deployment routes' },
  { id: 'EmailFlow', label: 'EmailFlow', description: 'crm automations' },
  { id: 'SocialPilot', label: 'SocialPilot', description: 'social scheduling' },
  { id: 'SearchInsight', label: 'SearchInsight', description: 'trend ingestion' },
  { id: 'CopySentinel', label: 'CopySentinel', description: 'brand guardrails' },
];

const TEMPLATES = [
  { icon: Rocket, label: 'Product Launch', prompt: 'Create a comprehensive 30-day product launch strategy for a new eco-friendly consumer tech product.' },
  { icon: Workflow, label: 'SaaS Expansion', prompt: 'Develop a localized B2B SaaS expansion plan focused on lead generation and conversion efficiency in multiple regions.' },
  { icon: Palette, label: 'Brand Refresh', prompt: 'Outline a brand identity refresh strategy for a boutique coffee roastery targeting urban professionals.' },
];

export default function Sidebar({ onSelectTemplate, activeTab, onSelectTab }: SidebarProps) {
  const { campaignState, toggleModule, updateCampaignState } = useCollaboration();
  const enabledModules = campaignState.enabledModules || [];
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [setupRequirements, setSetupRequirements] = useState<SetupRequirements | null>(null);

  React.useEffect(() => {
    let active = true;
    dataService.getSetupRequirements()
      .then(data => {
        if (active) {
          setSetupRequirements(data);
        }
      })
      .catch(error => console.error(error));
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    await updateCampaignState({ updatedAt: new Date().toISOString() as any });
    setSaveStatus('saved');
    window.setTimeout(() => setSaveStatus('idle'), 1800);
  };

  const menuItems = [
    { id: 'engine', icon: Bot, label: 'Brain' },
    { id: 'campaigns', icon: Eye, label: 'Overview' },
    { id: 'ab-test', icon: Columns, label: 'Experiments' },
    { id: 'audience', icon: Target, label: 'Segments' },
    { id: 'performance', icon: BarChart3, label: 'Performance' },
  ];

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5 custom-scrollbar">
      <button
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
        className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition hover:bg-violet-100"
      >
        <AnimatePresence mode="wait">
          {saveStatus === 'saved' ? (
            <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </motion.span>
          ) : saveStatus === 'saving' ? (
            <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <Activity className="h-4 w-4 animate-pulse" />
              Syncing
            </motion.span>
          ) : (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save State
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <div className="space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
              activeTab === item.id
                ? 'bg-violet-50 text-violet-700 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.35)]'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <item.icon className={`h-4 w-4 ${activeTab === item.id ? 'text-violet-500' : 'text-slate-400'}`} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_6px_24px_rgba(99,102,241,0.05)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          Agent Studio
        </div>
        <div className="mt-3 space-y-2">
          {TEMPLATES.map(template => (
            <button
              key={template.label}
              onClick={() => onSelectTemplate?.(template.prompt)}
              className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
            >
              <template.icon className="h-4 w-4 text-violet-500" />
              <span>{template.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_6px_24px_rgba(99,102,241,0.05)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Network className="h-3.5 w-3.5 text-violet-500" />
          Translation Layer
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <span className="text-slate-500">Locales</span>
            <span className="font-medium text-slate-800">{campaignState.locales?.join(', ') || 'en-US'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <span className="text-slate-500">Audience</span>
            <span className="max-w-[110px] truncate font-medium text-slate-800">{campaignState.audience || 'Prospects'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <span className="text-slate-500">Voice</span>
            <span className="max-w-[110px] truncate font-medium text-slate-800">{campaignState.brandVoice || 'Default'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_6px_24px_rgba(99,102,241,0.05)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <MemoryStick className="h-3.5 w-3.5 text-violet-500" />
          Memory
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <span className="text-slate-500">Automation</span>
            <span className="font-medium text-slate-800">{campaignState.automationEnabled ? 'enabled' : 'disabled'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <span className="text-slate-500">Prompt</span>
            <span className="max-w-[110px] truncate font-medium text-slate-800">{campaignState.activePrompt || 'No prompt'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <span className="text-slate-500">Channel</span>
            <span className="max-w-[110px] truncate font-medium text-slate-800">{campaignState.channel || 'Unconfigured'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_6px_24px_rgba(99,102,241,0.05)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Globe2 className="h-3.5 w-3.5 text-violet-500" />
          Automation Modules
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <div className="text-slate-500">Active rails</div>
            <div className="mt-1 text-xs text-slate-700">{campaignState.connectors?.join(', ') || campaignState.connector || 'openclaw, clawdbot'}</div>
          </div>
          {MODULES.map(module => {
            const active = enabledModules.includes(module.id);
            return (
              <button
                key={module.id}
                onClick={() => toggleModule(module.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                  active ? 'bg-violet-50 text-violet-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{module.label}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{module.description}</div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_6px_24px_rgba(99,102,241,0.05)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Activity className="h-3.5 w-3.5 text-violet-500" />
          Live Setup
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <div className="text-slate-500">Connector env vars</div>
            <div className="mt-1 text-xs text-slate-700">
              {(setupRequirements?.environment.requiredForLiveConnectors || []).join(', ') || 'Loading requirements'}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <div className="text-slate-500">Outreach signals</div>
            <div className="mt-1 text-xs text-slate-700">
              {(setupRequirements?.outreachEventTypes || []).slice(0, 4).join(', ')}
              {(setupRequirements?.outreachEventTypes?.length || 0) > 4 ? '...' : ''}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm">
            <div className="text-slate-500">Analytics signals</div>
            <div className="mt-1 text-xs text-slate-700">
              {(setupRequirements?.analyticsEventTypes || []).slice(0, 4).join(', ')}
              {(setupRequirements?.analyticsEventTypes?.length || 0) > 4 ? '...' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
