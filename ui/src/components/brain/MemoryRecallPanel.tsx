import React from 'react';
import { MemoryStick } from 'lucide-react';
import { MemoryPlaybook, TargetProfile } from '../../services/dataService';
import { formatPercent } from '../../lib/format';

interface MemoryRecallPanelProps {
  playbooks: MemoryPlaybook[];
  targetProfiles: TargetProfile[];
  episodicEventsCount: number;
}

export default function MemoryRecallPanel({
  playbooks,
  targetProfiles,
  episodicEventsCount,
}: MemoryRecallPanelProps) {
  return (
    <>
      {/* Main memory recall list (used in tab content) */}
      <div className="space-y-3">
        {playbooks.length === 0 ? (
          <div className="flex min-h-[430px] items-center justify-center rounded-[24px] bg-white/[0.04] text-sm text-slate-400">
            No procedural memory has been promoted yet.
          </div>
        ) : (
          playbooks.map(playbook => (
            <div key={playbook.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">{playbook.segment} · {playbook.region}</div>
                <div className="text-xs font-semibold text-violet-400">{formatPercent(playbook.confidence)}</div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {playbook.recommendedChannel} every {playbook.cadenceDays} days · win rate {formatPercent(playbook.winRate)} · risk {formatPercent(playbook.riskRate)}
              </div>
              <div className="mt-2 text-sm text-slate-400">{playbook.rationale}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

interface MemoryRecallSidebarProps {
  playbooks: MemoryPlaybook[];
  targetProfiles: TargetProfile[];
  episodicEventsCount: number;
}

export function MemoryRecallSidebar({ playbooks, targetProfiles, episodicEventsCount }: MemoryRecallSidebarProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <MemoryStick className="h-4 w-4 text-violet-500" />
        Memory Recall
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        <div className="flex justify-between">
          <span>Playbooks</span>
          <span>{playbooks.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Target Profiles</span>
          <span>{targetProfiles.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Episodic Events</span>
          <span>{episodicEventsCount}</span>
        </div>
      </div>
    </div>
  );
}
