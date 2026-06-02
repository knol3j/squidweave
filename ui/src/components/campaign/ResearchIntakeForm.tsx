import React from 'react';
import { Upload, Database, Search } from 'lucide-react';
import { ResearchRecord } from '../../services/dataService';
import { formatPercent, formatDate } from '../../lib/format';
import {
  AUDIENCE_OPTIONS,
  MARKET_OPTIONS,
  REGION_OPTIONS,
  CHANNEL_OPTIONS,
  SOURCE_OPTIONS,
  splitChannelList,
  PresetSingleSelectField,
  PresetMultiSelectField,
} from './formHelpers';
import type { ResearchDraft } from './types';

interface ResearchIntakeFormProps {
  researchDraft: ResearchDraft;
  setResearchDraft: React.Dispatch<React.SetStateAction<ResearchDraft>>;
  researchSaving: boolean;
  onSubmit: () => void;
  researchRecords: ResearchRecord[];
  uniqueTargets: number;
  campaignResearchObjectives: string[];
  campaignMarkets: string[];
  prospectingLoading: boolean;
  onRefresh: () => void;
}

export default function ResearchIntakeForm({
  researchDraft,
  setResearchDraft,
  researchSaving,
  onSubmit,
  researchRecords,
  uniqueTargets,
  campaignResearchObjectives,
  campaignMarkets,
  prospectingLoading,
  onRefresh,
}: ResearchIntakeFormProps) {
  const topResearch = researchRecords
    .slice()
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, 6);

  const set = (key: keyof ResearchDraft) => (value: string) =>
    setResearchDraft(current => ({ ...current, [key]: value }));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
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
            onClick={onSubmit}
            disabled={researchSaving}
            className="rounded-xl bg-amber-500 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {researchSaving ? 'Ingesting...' : 'Ingest Record'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <PresetSingleSelectField label="SOURCE" value={researchDraft.source} options={SOURCE_OPTIONS} placeholder="Select source" onChange={set('source')} />

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">TARGET ID</span>
            <input value={researchDraft.targetId} onChange={e => set('targetId')(e.target.value)} placeholder="segment-dach-revops-001" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">COMPANY</span>
            <input value={researchDraft.company} onChange={e => set('company')(e.target.value)} placeholder="Acme GmbH" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">CONTACT NAME</span>
            <input value={researchDraft.contactName} onChange={e => set('contactName')(e.target.value)} placeholder="Morgan Lee" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <PresetSingleSelectField label="TITLE" value={researchDraft.title} options={AUDIENCE_OPTIONS} placeholder="Select job title" onChange={set('title')} />
          <PresetSingleSelectField label="SEGMENT" value={researchDraft.segment} options={MARKET_OPTIONS} placeholder="Select segment" onChange={set('segment')} />
          <PresetSingleSelectField label="REGION" value={researchDraft.region} options={REGION_OPTIONS} placeholder="Select region" onChange={set('region')} />
          <PresetSingleSelectField label="PREFERRED CHANNEL" value={researchDraft.preferredChannel} options={CHANNEL_OPTIONS} placeholder="Select primary channel" onChange={set('preferredChannel')} />

          <PresetMultiSelectField label="ALL CHANNELS" value={researchDraft.channels} options={CHANNEL_OPTIONS} placeholder="Select channels" splitter={splitChannelList} joiner={(vals: string[]) => vals.join(', ')} onChange={set('channels')} />

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">ESTIMATED REACH</span>
            <input type="number" min="0" value={researchDraft.estimatedReach} onChange={e => set('estimatedReach')(e.target.value)} placeholder="5400" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">FIT SCORE</span>
            <input type="number" min="0" max="1" step="0.05" value={researchDraft.fitScore} onChange={e => set('fitScore')(e.target.value)} placeholder="0.0 – 1.0" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">INTENT SCORE</span>
            <input type="number" min="0" max="1" step="0.05" value={researchDraft.intentScore} onChange={e => set('intentScore')(e.target.value)} placeholder="0.0 – 1.0" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">RECENCY SCORE</span>
            <input type="number" min="0" max="1" step="0.05" value={researchDraft.recencyScore} onChange={e => set('recencyScore')(e.target.value)} placeholder="0.0 – 1.0" className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">SOURCE URL</span>
            <input type="url" value={researchDraft.sourceUrl} onChange={e => set('sourceUrl')(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Evidence bullets</span>
            <textarea rows={4} value={researchDraft.evidence} onChange={e => set('evidence')(e.target.value)} placeholder={'One evidence point per line.\nRecent funding event\nNew regional expansion\nHiring SDR leadership'} className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Notes for the brain</span>
            <textarea rows={4} value={researchDraft.notes} onChange={e => set('notes')(e.target.value)} placeholder="Why this target matters, what pain was observed, what message angle is likely to land." className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Live Research Feed
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Recent target intelligence</h3>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { label: 'Records', value: researchRecords.length },
            { label: 'Targets', value: uniqueTargets },
            { label: 'Objectives', value: campaignResearchObjectives.length },
            { label: 'Markets', value: campaignMarkets.length },
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
              <p className="mt-4 text-sm text-slate-400">No research has been ingested yet. The brain needs structured evidence before it can rank targets with confidence.</p>
            </div>
          ) : (
            topResearch.map(record => (
              <div key={record.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{record.company || record.targetId}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {record.title || 'Unknown role'} · {record.segment || 'Unclassified segment'} · {record.region || 'Unknown region'}
                    </div>
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

                <p className="mt-4 text-sm leading-6 text-slate-400">{record.notes || 'No notes captured for this target yet.'}</p>

                {!!record.metadata?.evidence?.length && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Evidence</div>
                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      {record.metadata.evidence.slice(0, 3).map(item => (
                        <div key={item}>{item}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
