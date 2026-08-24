import React from 'react';
import { BriefcaseBusiness, CheckCircle2, Search } from 'lucide-react';
import {
  type ActivationRun,
  type ProspectingPlan,
  type ProspectingRun,
  type ProspectPipeline,
  type SourcedContact,
} from '../../services/dataService';
import { formatPercent, formatDate } from '../../lib/format';

interface ProspectingEngineProps {
  prospectingPlan: ProspectingPlan | null;
  prospects: SourcedContact[];
  prospectingRuns: ProspectingRun[];
  prospectPipeline: ProspectPipeline | null;
  activationRuns: ActivationRun[];
  contactImportSource: string;
  contactImportRows: string;
  onContactImportSourceChange: (value: string) => void;
  onContactImportRowsChange: (value: string) => void;
  prospectingLoading: boolean;
  prospectingRunning: boolean;
  contactImporting: boolean;
  enrichingProspects: boolean;
  sequencingProspects: boolean;
  onRefresh: () => void;
  onGenerateQueue: () => void;
  onImportContacts: () => void;
  onEnrich: () => void;
  onBuildSequences: () => void;
}

export default function ProspectingEngine({
  prospectingPlan,
  prospects,
  prospectingRuns,
  prospectPipeline,
  activationRuns,
  contactImportSource,
  contactImportRows,
  onContactImportSourceChange,
  onContactImportRowsChange,
  prospectingLoading,
  prospectingRunning,
  contactImporting,
  enrichingProspects,
  sequencingProspects,
  onRefresh,
  onGenerateQueue,
  onImportContacts,
  onEnrich,
  onBuildSequences,
}: ProspectingEngineProps) {
  const recentProspects = prospects
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8);

  const latestProspectingRun = prospectingRuns
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      {/* Contact Sourcing Engine */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-amber-400" />
              Prospecting Engine
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Candidate sourcing & activation</h3>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              onClick={onGenerateQueue}
              disabled={prospectingRunning}
              className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {prospectingRunning ? 'Generating...' : 'Generate Prospects'}
            </button>

            <button
              onClick={onEnrich}
              disabled={enrichingProspects || prospects.length === 0}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05] disabled:opacity-60"
            >
              {enrichingProspects ? 'Enriching...' : 'Enrich Contacts'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              onClick={onBuildSequences}
              disabled={sequencingProspects || prospects.length === 0}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05] disabled:opacity-60"
            >
              {sequencingProspects ? 'Building...' : 'Build Sequences'}
            </button>
          </div>

          {/* Import Panel */}
          <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
            <div className="text-sm font-semibold text-white">Import Contacts</div>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={contactImportSource}
                onChange={e => onContactImportSourceChange(e.target.value)}
                placeholder="Source (e.g. Apollo, LinkedIn, Manual)"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
              />
              <textarea
                value={contactImportRows}
                onChange={e => onContactImportRowsChange(e.target.value)}
                placeholder={`company|fullName|title|email|linkedinUrl|region|segment
Acme Corp|John Doe|CEO|john@acme.com|https://linkedin.com/in/john|US|Enterprise`}
                rows={6}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-mono leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
              />
              <button
                onClick={onImportContacts}
                disabled={contactImporting}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
              >
                {contactImporting ? 'Importing...' : 'Import Contacts'}
              </button>
            </div>
          </div>
        </div>

        {/* Pipeline Summary */}
        {prospectPipeline && (
          <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1526] p-4">
            <div className="text-sm font-semibold text-white">Pipeline</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>Stage: <span className="text-slate-200">{prospectPipeline.stage}</span></div>
              <div>Contacts: <span className="text-slate-200">{prospectPipeline.contactCount}</span></div>
              <div>Updated: <span className="text-slate-200">{formatDate(prospectPipeline.updatedAt)}</span></div>
            </div>
          </div>
        )}

        {/* Latest Run */}
        {latestProspectingRun && (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0b1526] p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Latest Run</div>
              <div className="text-xs text-slate-500">{formatDate(latestProspectingRun.createdAt)}</div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {latestProspectingRun.type} · {latestProspectingRun.status} · {latestProspectingRun.processedContacts} contacts
            </div>
          </div>
        )}
      </section>

      {/* Prospects List */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <Search className="h-3.5 w-3.5 text-emerald-400" />
              Sourced Contacts
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Top candidates</h3>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-slate-400">
            {prospects.length} total
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {recentProspects.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-[#0b1526] px-6 text-center">
              <Search className="h-8 w-8 text-slate-600" />
              <p className="mt-4 text-sm text-slate-400">No prospects generated yet. Run the prospecting engine to source candidates.</p>
            </div>
          ) : (
            recentProspects.map(contact => (
              <div key={contact.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{contact.fullName || 'Unnamed'}</div>
                    <div className="mt-1 text-xs text-slate-500">{contact.title || 'Unknown role'} · {contact.company || 'Unknown company'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-amber-400">{formatPercent(contact.score)}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Match</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {contact.email && <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">{contact.email}</span>}
                  {contact.linkedinUrl && <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-200">LinkedIn</span>}
                  {contact.segment && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">{contact.segment}</span>}
                </div>

                {contact.notes && <p className="mt-3 text-sm text-slate-400">{contact.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
