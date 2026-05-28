import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Columns,
  Eye,
  MemoryStick,
  Network,
  Palette,
  Rocket,
  Save,
  Sparkles,
  Target,
  Wallet,
  Workflow,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollaboration } from './CollaborationProvider';
import { dataService, SetupRequirements } from '../services/dataService';
import { AGENT_SYSTEM } from '../lib/agentSystem';

interface SidebarProps {
  onSelectTemplate?: (prompt: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const TEMPLATES = [
  { icon: Rocket, label: 'Product Launch', prompt: 'Create a comprehensive autonomous launch system covering intake, segmentation, offer design, outreach, sales handoff, retention, and analytics for a new eco-friendly consumer tech product.' },
  { icon: Workflow, label: 'SaaS Expansion', prompt: 'Develop a localized B2B SaaS growth engine with dedicated research, outreach, conversion, onboarding, retention, and expansion agents across multiple regions.' },
  { icon: Palette, label: 'Brand Refresh', prompt: 'Design a full-funnel brand refresh operating system with creative direction, landing pages, audience research, social distribution, and lifecycle retention loops.' },
];

export default function Sidebar({ onSelectTemplate, activeTab, onSelectTab }: SidebarProps) {
  const { campaignState, updateCampaignState } = useCollaboration();
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
    { id: 'engine', icon: Workflow, label: 'Agent Platform' },
    { id: 'campaigns', icon: Eye, label: 'Mission Control' },
    { id: 'funding', icon: Wallet, label: 'Investor Pipeline' },
    { id: 'ab-test', icon: Columns, label: 'Experiments' },
    { id: 'audience', icon: Target, label: 'Segments' },
    { id: 'performance', icon: BarChart3, label: 'Analytics' },
  ];

  const activeAgents = enabledModules.length;
  const totalAgents = AGENT_SYSTEM.length;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5 custom-scrollbar">
      <button
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
        className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-indigo-200 transition hover:bg-indigo-500/15"
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
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
              activeTab === item.id
                ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.35)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon className={`h-4 w-4 ${activeTab === item.id ? 'text-indigo-300' : 'text-slate-500'}`} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Agent Studio
        </div>
        <div className="mt-3 space-y-2">
          {TEMPLATES.map(template => (
            <button
              key={template.label}
              onClick={() => onSelectTemplate?.(template.prompt)}
              className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-indigo-500/10 hover:text-white"
            >
              <template.icon className="h-4 w-4 text-indigo-400" />
              <span>{template.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          <Network className="h-3.5 w-3.5 text-indigo-400" />
          Mission Brief
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Markets</span>
            <span className="font-medium text-slate-100">{campaignState.markets?.join(', ') || campaignState.locales?.join(', ') || 'unscoped'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Audience</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{campaignState.audience || 'Prospects'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Success</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{campaignState.successDefinition || 'Not defined'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          <MemoryStick className="h-3.5 w-3.5 text-indigo-400" />
          Autonomous Stack
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Automation</span>
            <span className="font-medium text-slate-100">{campaignState.automationEnabled ? 'enabled' : 'disabled'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Agents online</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{activeAgents}/{totalAgents}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Intake</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{campaignState.intakeStatus || 'draft'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          <Activity className="h-3.5 w-3.5 text-indigo-400" />
          Live Setup
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <div className="text-slate-500">Connector env vars</div>
            <div className="mt-1 text-xs text-slate-200">
              {(setupRequirements?.environment.requiredForLiveConnectors || []).join(', ') || 'Loading requirements'}
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <div className="text-slate-500">Outreach signals</div>
            <div className="mt-1 text-xs text-slate-200">
              {(setupRequirements?.outreachEventTypes || []).slice(0, 4).join(', ')}
              {(setupRequirements?.outreachEventTypes?.length || 0) > 4 ? '...' : ''}
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-3 py-3 text-sm">
            <div className="text-slate-500">Analytics signals</div>
            <div className="mt-1 text-xs text-slate-200">
              {(setupRequirements?.analyticsEventTypes || []).slice(0, 4).join(', ')}
              {(setupRequirements?.analyticsEventTypes?.length || 0) > 4 ? '...' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
