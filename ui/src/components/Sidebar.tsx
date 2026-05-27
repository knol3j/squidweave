import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
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
  Wallet,
  Workflow,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollaboration } from './CollaborationProvider';
import { dataService, SetupRequirements } from '../services/dataService';
import { AGENT_STAGES, AGENT_SYSTEM, getAllAgentIds } from '../lib/agentSystem';

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
    { id: 'engine', icon: Workflow, label: 'Brain' },
    { id: 'campaigns', icon: Eye, label: 'Intake' },
    { id: 'funding', icon: Wallet, label: 'Funding' },
    { id: 'ab-test', icon: Columns, label: 'Experiments' },
    { id: 'audience', icon: Target, label: 'Segments' },
    { id: 'performance', icon: BarChart3, label: 'Performance' },
  ];

  const activeAgents = enabledModules.length;
  const totalAgents = AGENT_SYSTEM.length;
  const agentsByStage = AGENT_STAGES.map(stage => ({
    stage,
    count: AGENT_SYSTEM.filter(agent => agent.stage === stage && enabledModules.includes(agent.id)).length,
    total: AGENT_SYSTEM.filter(agent => agent.stage === stage).length,
  }));

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5 custom-scrollbar">
      <button
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
        className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200 transition hover:bg-indigo-500/15"
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
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon className={`h-4 w-4 ${activeTab === item.id ? 'text-indigo-300' : 'text-slate-500'}`} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Agent Studio
        </div>
        <div className="mt-3 space-y-2">
          {TEMPLATES.map(template => (
            <button
              key={template.label}
              onClick={() => onSelectTemplate?.(template.prompt)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-indigo-500/10 hover:text-white"
            >
              <template.icon className="h-4 w-4 text-indigo-400" />
              <span>{template.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <Network className="h-3.5 w-3.5 text-indigo-400" />
          Mission Brief
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Markets</span>
            <span className="font-medium text-slate-100">{campaignState.markets?.join(', ') || campaignState.locales?.join(', ') || 'unscoped'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Audience</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{campaignState.audience || 'Prospects'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Success</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{campaignState.successDefinition || 'Not defined'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <MemoryStick className="h-3.5 w-3.5 text-indigo-400" />
          Autonomous Stack
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Automation</span>
            <span className="font-medium text-slate-100">{campaignState.automationEnabled ? 'enabled' : 'disabled'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Agents online</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{activeAgents}/{totalAgents}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <span className="text-slate-500">Intake</span>
            <span className="max-w-[110px] truncate font-medium text-slate-100">{campaignState.intakeStatus || 'draft'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <Globe2 className="h-3.5 w-3.5 text-indigo-400" />
          Agent Coverage
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <div className="text-slate-500">Active rails</div>
            <div className="mt-1 text-xs text-slate-200">{campaignState.connectors?.join(', ') || campaignState.connector || 'openclaw, clawdbot'}</div>
          </div>
          <button
            onClick={() => updateCampaignState({ enabledModules: getAllAgentIds() })}
            className="w-full rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200 transition hover:bg-indigo-500/15"
          >
            Enable Full Marketing Stack
          </button>
          {agentsByStage.map(stage => {
            const active = stage.count === stage.total;
            return (
              <div
                key={stage.stage}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                  active ? 'bg-emerald-500/10 text-emerald-100' : 'bg-white/[0.04] text-slate-300'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{stage.stage}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{stage.count}/{stage.total} agents enabled</div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <Activity className="h-3.5 w-3.5 text-indigo-400" />
          Live Setup
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <div className="text-slate-500">Connector env vars</div>
            <div className="mt-1 text-xs text-slate-200">
              {(setupRequirements?.environment.requiredForLiveConnectors || []).join(', ') || 'Loading requirements'}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
            <div className="text-slate-500">Outreach signals</div>
            <div className="mt-1 text-xs text-slate-200">
              {(setupRequirements?.outreachEventTypes || []).slice(0, 4).join(', ')}
              {(setupRequirements?.outreachEventTypes?.length || 0) > 4 ? '...' : ''}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] px-3 py-3 text-sm">
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
