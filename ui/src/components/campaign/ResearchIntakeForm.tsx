import React from 'react';
import { Upload, Database, Search } from 'lucide-react';
import { ResearchRecord } from '../../services/dataService';
import { formatPercent, formatDate } from '../../lib/format';
import {
  AUDIENCE_OPTIONS, MARKET_OPTIONS, CHANNEL_OPTIONS, REGION_OPTIONS, SOURCE_OPTIONS,
  PresetSingleSelectField, PresetMultiSelectField, splitList, splitChannelList,
} from './shared';

const REGION_OPTIONS_LOCAL = ['US', 'DACH', 'France', 'UK', 'EMEA', 'APAC', 'NA', 'LATAM'];

type ResearchDraft = {
  source: string; targetId: string; company: string; contactName: string; title: string;
  segment: string; region: string; preferredChannel: string; channels: string;
  fitScore: string; intentScore: string; recencyScore: string; estimatedReach: string;
  sourceUrl: string; evidence: string; notes: string;
};

interface ResearchIntakeFormProps {
  researchRecords: ResearchRecord[];
  researchDraft: ResearchDraft;
  onDraftChange: (updates: Partial<ResearchDraft>) => void;
  onAdd: () => void;
  onRefresh: () => void;
  saving: boolean;
  uniqueTargets: number;
  objectivesCount: number;
  marketsCount: number;
}

export function ResearchIntakeForm({
  researchRecords, researchDraft, onDraftChange, onAdd, onRefresh, saving,
  uniqueTargets, objectivesCount, marketsCount,
}: ResearchIntakeFormProps) {
  const topResearch = researchRecords
    .slice()
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      {/* Intake form */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <Upload className="h-3.5 w-3.5 text-amber-400" />
              Research Intake
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Feed the brain structured evidence</h3>
          </div>
          <button
            onClick={onAdd}
            disabled={saving}
            className="rounded-xl bg-amber-500 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {saving ? 'Ingesting...' : 'Ingest Record'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <PresetSingleSelectField label="SOURCE" value={researchDraft.source} options={SOURCE_OPTIONS} placeholder="Select source" onChange={v => onDraftChange({ source: v })} />
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">TARGET ID</span>
            <input value={researchDraft.targetId} onChange={e => onDraftChange({ targetId: e.target.value })} placeholder="segment-dach-revops-001" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">COMPANY</span>
            <input value={researchDraft.company} onChange={e => onDraftChange({ company: e.target.value })} placeholder="Acme GmbH" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">CONTACT NAME</span>
            <input value={researchDraft.contactName} onChange={e => onDraftChange({ contactName: e.target.value })} placeholder="Morgan Lee" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
          <PresetSingleSelectField label="TITLE" value={researchDraft.title} options={AUDIENCE_OPTIONS} placeholder="Select job title" onChange={v => onDraftChange({ title: v })} />
          <PresetSingleSelectField label="SEGMENT" value={researchDraft.segment} options={MARKET_OPTIONS} placeholder="Select segment" onChange={v => onDraftChange({ segment: v })} />
          <PresetSingleSelectField label="REGION" value={researchDraft.region} options={REGION_OPTIONS_LOCAL} placeholder="Select region" onChange={v => onDraftChange({ region: v })} />
          <PresetSingleSelectField label="PREFERRED CHANNEL" value={researchDraft.preferredChannel} options={CHANNEL_OPTIONS} placeholder="Select primary channel" onChange={v => onDraftChange({ preferredChannel: v })} />
          <PresetMultiSelectField label="ALL CHANNELS" value={researchDraft.channels} options={CHANNEL_OPTIONS} placeholder="Select channels" splitter={splitChannelList} joiner={(vals: string[]) => vals.join(', ')} onChange={v => onDraftChange({ channels: v })} />
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">ESTIMATED REACH</span>
            <input type="number" min="0" value={researchDraft.estimatedReach} onChange={e => onDraftChange({ estimatedReach: e.target.value })} placeholder="5400" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
          {(['fitScore', 'intentScore', 'recencyScore'] as const).map(key => (
            <label key={key} className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
              <input type="number" min="0" max="1" step="0.05" value={researchDraft[key]} onChange={e => onDraftChange({ [key]: e.target.value })} placeholder="0.0 – 1.0" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
            </label>
          ))}
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">SOURCE URL</span>
            <input type="url" value={researchDraft.sourceUrl} onChange={e => onDraftChange({ sourceUrl: e.target.value })} placeholder="https://..." className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Evidence bullets</span>
            <textarea rows={4} value={researchDraft.evidence} onChange={e => onDraftChange({ evidence: e.target.value })} placeholder={'One evidence point per line.\nRecent funding event\nNew regional expansion\nHiring SDR leadership'} className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Notes for the brain</span>
            <textarea rows={4} value={researchDraft.notes} onChange={e => onDraftChange({ notes: e.target.value })} placeholder="Why this target matters, what pain was observed, what message angle is likely to land." className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
        </div>
      </section>

      {/* Live research feed */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Live Research Feed
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Recent target intelligence</h3>
          </div>
          <button onClick={onRefresh} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]">
            Refresh
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { label: 'Records', value: researchRecords.length },
            { label: 'Targets', value: uniqueTargets },
            { label: 'Objectives', value: objectivesCount },
            { label: 'Markets', value: marketsCount },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {topResearch.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-[#0b1526] px-6 text-center">
              <Search className="h-8 w-8 text-slate-600" />
              <p className="mt-4 text-sm text-slate-400">No research has been ingested yet.</p>
            </div>
          ) : (
            topResearch.map(record => (
              <div key={record.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{record.company || record.targetId}</div>
                    <div className="mt-1 text-xs text-slate-500">{record.title || 'Unknown role'} · {record.segment || 'Unclassified'} · {record.region || 'Unknown'}</div>
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    <div>{record.source}</div>
                    <div className="mt-1">{formatDate(record.capturedAt)}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Fit {formatPercent(record.fitScore)}</span>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Intent {formatPercent(record.intentScore)}</span>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">Recency {formatPercent(record.recencyScore)}</span>
                  {record.preferredChannel && <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-200">{record.preferredChannel}</span>}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">{record.notes || 'No notes captured.'}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// Re-export SOURCE_OPTIONS for use in the parent
export const SOURCE_OPTIONS = [
  'manual-ingest', 'G2', 'LinkedIn', 'analyst-note', 'CRM-export',
  'apollo', 'zoominfo', 'web-scrape', 'referral',
];

export type { ResearchDraft };
