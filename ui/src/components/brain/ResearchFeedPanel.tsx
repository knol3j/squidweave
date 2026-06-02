import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ResearchRecord } from '../../services/dataService';
import { formatPercent } from '../../lib/format';

interface ResearchFeedPanelProps {
  researchRecords: ResearchRecord[];
}

export default function ResearchFeedPanel({ researchRecords }: ResearchFeedPanelProps) {
  const sorted = researchRecords
    .slice()
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <div className="flex min-h-[430px] items-center justify-center rounded-[24px] bg-white/[0.04] text-sm text-slate-400">
          No sourced research records have been ingested yet.
        </div>
      ) : (
        sorted.map(record => (
          <div key={record.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">{record.company || record.targetId}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {record.segment || 'No segment'} · {record.region || 'No region'} · {record.preferredChannel || 'No preferred channel'}
                </div>
              </div>
              {record.metadata?.sourceUrl && (
                <a
                  href={record.metadata.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  Source
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="mt-3 text-sm text-slate-400">{record.notes || 'No analyst note recorded.'}</div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-400">Fit {formatPercent(record.fitScore)}</div>
              <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-400">Intent {formatPercent(record.intentScore)}</div>
              <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-400">Recency {formatPercent(record.recencyScore)}</div>
            </div>
            {!!record.metadata?.evidence?.length && (
              <div className="mt-3 space-y-1">
                {record.metadata.evidence.slice(0, 3).map((item, index) => (
                  <div key={`${record.id}-evidence-${index}`} className="text-xs text-slate-500">{item}</div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
