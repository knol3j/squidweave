import React from 'react';
import { Landmark } from 'lucide-react';
import {
  type FundingInvestor,
  type FundingPipeline,
  type FundingRun,
  type FundingOutreachEvent,
} from '../../services/dataService';
import { formatPercent, formatDate } from '../../lib/format';

interface FundingImportPanelProps {
  fundingImportRows: string;
  onFundingImportRowsChange: (value: string) => void;
  fundingImporting: boolean;
  fundingSequencing: boolean;
  fundingRunning: boolean;
  fundingInvestors: FundingInvestor[];
  fundingPipeline: FundingPipeline | null;
  fundingRuns: FundingRun[];
  fundingEvents: FundingOutreachEvent[];
  onImport: () => void;
  onSequence: () => void;
  onRun: () => void;
  onRefresh: () => void;
}

export default function FundingImportPanel({
  fundingImportRows,
  onFundingImportRowsChange,
  fundingImporting,
  fundingSequencing,
  fundingRunning,
  fundingInvestors,
  fundingPipeline,
  fundingRuns,
  fundingEvents,
  onImport,
  onSequence,
  onRun,
  onRefresh,
}: FundingImportPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            <Landmark className="h-3.5 w-3.5 text-amber-300" />
            VC Funding Automation
          </div>
          <h3 className="mt-2 text-xl font-semibold text-white">Investor pipeline, prioritization, and outreach sequencing</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]"
          >
            Refresh
          </button>
          <button
            onClick={onRun}
            disabled={fundingRunning}
            className="rounded-xl bg-amber-300 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
          >
            {fundingRunning ? 'Running...' : 'Run Funding'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Investors', value: fundingPipeline?.counts.total || fundingInvestors.length },
          { label: 'Prioritized', value: fundingPipeline?.prioritized.length || 0 },
          { label: 'Funding Runs', value: fundingRuns.length },
          { label: 'Outreach Events', value: fundingEvents.length },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
            <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Investor import</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                One line per investor: fund | partner | thesisMatch | stageMatch | checkSizeMatch | warmPath | status | thesis | warmIntroPath | sectors | stageFocus | geoFocus | notes
              </p>
            </div>
            <button
              onClick={onImport}
              disabled={fundingImporting}
              className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-60"
            >
              {fundingImporting ? 'Importing...' : 'Import Investors'}
            </button>
          </div>
          <textarea
            rows={6}
            value={fundingImportRows}
            onChange={event => onFundingImportRowsChange(event.target.value)}
            placeholder={'Alpha Ventures | Dana Smith | 0.92 | 0.88 | 0.7 | 0.65 | sourced | B2B infra thesis | Intro via portfolio CTO | b2b,infra | seed,series-a | us,eu | strong fit\nNorth Bridge | Alex Kim | 0.74 | 0.8 | 0.68 | 0.9 | follow_up | AI tooling thesis | Warm intro from advisor | ai,saas | seed | us | requested deck'}
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-300/50"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
          <div className="text-sm font-semibold text-white">Funding actions</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={onSequence}
              disabled={fundingSequencing}
              className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:opacity-60"
            >
              {fundingSequencing ? 'Queuing...' : 'Queue Outreach'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {fundingRuns.slice(0, 3).map(run => (
              <div key={run.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-sm font-semibold text-white">{run.type}</div>
                <div className="mt-1 text-xs text-slate-500">{run.processedInvestors} investors · {run.status} · {formatDate(run.createdAt)}</div>
              </div>
            ))}
            {!fundingRuns.length && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">No funding runs yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {(fundingPipeline?.prioritized || []).slice(0, 8).map(investor => (
          <div key={investor.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{investor.fundName}</div>
                <div className="mt-1 text-xs text-slate-500">{investor.partnerName || 'No partner'} · {investor.status} · step {investor.sequenceStep || 0}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Priority score</div>
                <div className="mt-1 text-xs text-amber-200">{formatPercent(investor.score)}</div>
              </div>
            </div>
            {!!investor.reasons?.length && (
              <div className="mt-3 text-xs text-slate-400">{investor.reasons.join(' · ')}</div>
            )}
          </div>
        ))}
        {!(fundingPipeline?.prioritized || []).length && (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
            No funding pipeline yet. Import investor rows, then run funding automation.
          </div>
        )}
      </div>
    </section>
  );
}
