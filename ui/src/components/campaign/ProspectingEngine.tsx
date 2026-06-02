import React from 'react';
import { BriefcaseBusiness, MailPlus, CheckCircle2, Search } from 'lucide-react';
import { SourcedContact, ProspectingPlan, ProspectPipeline, ActivationRun } from '../../services/dataService';
import { formatPercent, formatDate } from '../../lib/format';

interface ProspectingEngineProps {
  contacts: SourcedContact[];
  prospectingPlan: ProspectingPlan | null;
  prospectPipeline: ProspectPipeline | null;
  activationRuns: ActivationRun[];
  prospectingRuns: any[];
  contactImportDraft: { source: string; rows: string };
  onImportDraftChange: (updates: { source?: string; rows?: string }) => void;
  onImport: () => void;
  onEnrich: () => void;
  onSource: () => void;
  onSequence: () => void;
  onRefresh: () => void;
  running: boolean;
  importing: boolean;
  enriching: boolean;
  sequencing: boolean;
  prospectingLoading: boolean;
}

export function ProspectingEngine({
  contacts, prospectingPlan, prospectPipeline, activationRuns, prospectingRuns,
  contactImportDraft, onImportDraftChange, onImport, onEnrich, onSource, onSequence, onRefresh,
  running, importing, enriching, sequencing, prospectingLoading,
}: ProspectingEngineProps) {
  const recentProspects = contacts.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
  const latestRun = prospectingRuns.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-400" />
              Contact Sourcing Engine
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Automate account selection and buyer discovery</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]">
              Refresh
            </button>
            <button onClick={onSource} disabled={running} className="rounded-xl bg-cyan-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
              {running ? 'Generating...' : 'Generate Queue'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Top Accounts', value: prospectingPlan?.topAccounts.length || 0 },
            { label: 'Stored Contacts', value: contacts.length },
            { label: 'Runs', value: prospectingRuns.length },
            { label: 'Actionable Targets', value: prospectingPlan?.targetSummary.actionableTargets || 0 },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Priority accounts</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{prospectingLoading ? 'Loading' : 'Live plan'}</div>
            </div>
            <div className="mt-4 space-y-3">
              {prospectingPlan?.topAccounts.length ? (
                prospectingPlan.topAccounts.map(account => (
                  <div key={`${account.targetId}-${account.company}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-sm font-semibold text-white">{account.company}</div>
                    <div className="mt-1 text-xs text-slate-500">{account.segment || 'Unclassified'} · {account.region || 'Unknown'}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 px-5 py-8 text-sm text-slate-400">
                  Add research records first.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <MailPlus className="h-3.5 w-3.5 text-emerald-400" />
              Prospect Queue
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Generated buyers and imported contacts</h3>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-slate-400">
            {latestRun ? `${latestRun.generatedCandidates} last generated` : 'No run yet'}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1526] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Manual or vendor-enriched import</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">company | full name | title | email | LinkedIn URL | region | segment</p>
            </div>
            <button onClick={onImport} disabled={importing} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-60">
              {importing ? 'Importing...' : 'Import Contacts'}
            </button>
          </div>
          <div className="mt-4 space-y-4">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Import source</span>
              <input value={contactImportDraft.source} onChange={e => onImportDraftChange({ source: e.target.value })} placeholder="apollo, crm-export, manual-import" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Contact rows</span>
              <textarea rows={6} value={contactImportDraft.rows} onChange={e => onImportDraftChange({ rows: e.target.value })} placeholder="Acme | Morgan Lee | VP Revenue Operations | morgan@acme.com | https://linkedin.com/in/morgan | DACH | Mid-market SaaS" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50" />
            </label>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { label: 'Ready for Enrichment', value: prospectPipeline?.counts.readyForEnrichment || 0 },
            { label: 'Ready for Sequencing', value: prospectPipeline?.counts.readyForSequencing || 0 },
            { label: 'Sequenced', value: prospectPipeline?.counts.sequenced || 0 },
            { label: 'Suppressed', value: prospectPipeline?.counts.suppressed || 0 },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1526] p-4">
          <div className="flex flex-wrap gap-3">
            <button onClick={onEnrich} disabled={enriching} className="rounded-xl bg-emerald-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60">
              {enriching ? 'Enriching...' : 'Run Enrichment'}
            </button>
            <button onClick={onSequence} disabled={sequencing} className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-100 transition hover:bg-cyan-500/15 disabled:opacity-60">
              {sequencing ? 'Planning...' : 'Build Sequences'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {(activationRuns.slice(0, 3) || []).map(run => (
              <div key={run.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-sm font-semibold text-white">{run.action}</div>
                <div className="mt-1 text-xs text-slate-500">{run.processedContacts} contacts processed</div>
              </div>
            ))}
            {!activationRuns.length && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">No activation runs yet.</div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {recentProspects.length ? (
            recentProspects.map(contact => (
              <div key={contact.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                <div className="text-sm font-semibold text-white">{contact.fullName || contact.company}</div>
                <div className="mt-1 text-xs text-slate-500">{contact.company} · {contact.title || 'Role pending'}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contact.preferredChannel && <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">{contact.preferredChannel}</span>}
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">{contact.complianceStatus}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-[#0b1526] px-6 text-center">
              <Search className="h-8 w-8 text-slate-600" />
              <p className="mt-4 text-sm text-slate-400">No prospect queue yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
