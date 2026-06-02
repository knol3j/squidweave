import React from 'react';
import { Bot, Layers3 } from 'lucide-react';
import { AGENT_STAGES, AGENT_SYSTEM, getAllAgentIds } from '../../lib/agentSystem';

interface AgentModuleGridProps {
  modules: string[];
  onToggle: (agentId: string) => void;
}

export function AgentModuleGrid({ modules, onToggle }: AgentModuleGridProps) {
  const enabledSet = new Set(modules);
  const agentGroups = AGENT_STAGES.map(stage => ({
    stage,
    agents: AGENT_SYSTEM.filter(agent => agent.stage === stage),
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            <Bot className="h-3.5 w-3.5 text-fuchsia-400" />
            Autonomous Coverage
          </div>
          <h3 className="mt-2 text-xl font-semibold text-white">One agent for each marketing job</h3>
        </div>
        <button
          onClick={() => getAllAgentIds().forEach(id => { if (!enabledSet.has(id)) onToggle(id); })}
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
                    onClick={() => onToggle(agent.id)}
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
    </div>
  );
}
