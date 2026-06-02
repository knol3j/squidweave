import React from 'react';
import { BriefcaseBusiness, CheckCircle2, Search } from 'lucide-react';
import {
  ActivationRun,
  ProspectingPlan,
  ProspectingRun,
  ProspectPipeline,
  SourcedContact,
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
              <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-400" />
              Contact Sourcing Engine
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Automate account selection and buyer discovery</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              This workflow turns campaign intake and research evidence into a compliant sourcing plan, buyer-role map, enrichment checklist, and outreach-ready contact queue.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/[0.05]"
            >
              Refresh
            </button>
            <button
              onClick={onGenerateQueue}
              disabled={prospectingRunning}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {prospectingRunning ? 'Generating...' : 'Generate Queue'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Top Accounts', value: prospectingPlan?.topAccounts.length || 0 },
            { label: 'Stored Contacts', value: prospects.length },
            { label: 'Runs', value: prospectingRuns.length },
            { label: 'Actionable Targets', value: prospectingPlan?.targetSummary.actionableTargets || 0 },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Priority accounts</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {prospectingLoading ? 'Loading' : 'Live plan'}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {prospectingPlan?.topAccounts.length ? (
                prospectingPlan.topAccounts.map(account => (
                  <div key={`${account.targetId}-${account.company}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{account.company}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {account.segment || 'Unclassified segment'} · {account.region || 'Unknown region'}
                        </div>
                      </div>
                      <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">
                        {account.preferredChannel || 'channel pending'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {account.roleClusters.slice(0, 4).map(role => (
                        <span key={role} className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">{role}</span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {account.sourceMix.map(source => (
                        <span key={source} className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100">{source}</span>
                      ))}
                    </div>
                    {!!account.evidence.length && (
                      <div className="mt-3 text-xs leading-5 text-slate-400">{account.evidence.join(' · ')}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 px-5 py-8 text-sm text-slate-400">
                  Add research records first. The sourcing engine uses those records to pick accounts and infer likely buyer roles.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
              <div className="text-sm font-semibold text-white">Sourcing workflow</div>
              <div className="mt-4 space-y-3">
                {(prospectingPlan?.sourcingWorkflow || []).map(step => (
                  <div key={step} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">{step}</div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
              <div className="text-sm font-semibold text-white">Enrichment and compliance checklist</div>
              <div className="mt-4 space-y-2">
                {(prospectingPlan?.enrichmentChecklist || []).map(item => (
                  <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
              <div className="text-sm font-semibold text-white">Procedural memory signals</div>
              <div className="mt-4 space-y-3">
                {prospectingPlan?.proceduralSignals.length ? (
                  prospectingPlan.proceduralSignals.map(signal => (
                    <div key={`${signal.segment}-${signal.region}-${signal.channel}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="text-sm text-white">{signal.segment || 'Unknown segment'}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {signal.region || 'Global'} · {signal.channel || 'No channel'} · {formatPercent(signal.confidence)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
                    No learned sourcing patterns yet. As campaigns run, Hermes-backed memory can feed this panel.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prospect Queue */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-emerald-400" />
              Prospect Queue
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Generated buyers and imported contacts</h3>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1526] px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-slate-400">
            {latestProspectingRun ? `${latestProspectingRun.generatedCandidates} last generated` : 'No run yet'}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1526] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Manual or vendor-enriched import</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Paste one contact per line in this format: company | full name | title | email | LinkedIn URL | region | segment
              </p>
            </div>
            <button
              onClick={onImportContacts}
              disabled={contactImporting}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-60"
            >
              {contactImporting ? 'Importing...' : 'Import Contacts'}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Import source</span>
              <input
                value={contactImportSource}
                onChange={e => onContactImportSourceChange(e.target.value)}
                placeholder="apollo, crm-export, manual-import"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Contact rows</span>
              <textarea
                rows={6}
                value={contactImportRows}
                onChange={e => onContactImportRowsChange(e.target.value)}
                placeholder={'Acme | Morgan Lee | VP Revenue Operations | morgan@acme.com | https://linkedin.com/in/morgan | DACH | Mid-market SaaS\nNorthwind | Jamie Fox | Head of Growth | jamie@northwind.io | https://linkedin.com/in/jamie | US | PLG SaaS'}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
              />
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
            <button
              onClick={onEnrich}
              disabled={enrichingProspects}
              className="rounded-xl bg-emerald-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {enrichingProspects ? 'Enriching...' : 'Run Enrichment'}
            </button>
            <button
              onClick={onBuildSequences}
              disabled={sequencingProspects}
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-100 transition hover:bg-cyan-500/15 disabled:opacity-60"
            >
              {sequencingProspects ? 'Planning...' : 'Build Sequences'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {(activationRuns.slice(0, 3) || []).map(run => (
              <div key={run.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{run.action}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {run.processedContacts} contacts processed
                      {run.provider ? ` via ${run.provider}` : ''}
                    </div>
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    <div>{run.status}</div>
                    <div className="mt-1">{formatDate(run.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}

            {!activationRuns.length && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
                No activation runs yet. Enrichment turns sourced contacts into sequence-ready records, then sequence planning turns them into outreach cadences.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {recentProspects.length ? (
            recentProspects.map(contact => (
              <div key={contact.id} className="rounded-xl border border-white/10 bg-[#0b1526] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{contact.fullName || contact.role || contact.company}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {contact.company} · {contact.title || contact.role || 'Role pending'} · {contact.region || 'Unknown region'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{contact.contactStatus}</div>
                    <div className="mt-1 text-xs text-emerald-300">{formatPercent(contact.score)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {contact.preferredChannel && (
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">{contact.preferredChannel}</span>
                  )}
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">{contact.complianceStatus}</span>
                  {contact.enrichmentStatus && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100">{contact.enrichmentStatus}</span>
                  )}
                  {contact.sequenceStatus && (
                    <span className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-[11px] text-fuchsia-100">{contact.sequenceStatus}</span>
                  )}
                  {(contact.sourceMix || []).slice(0, 3).map(source => (
                    <span key={source} className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-300">{source}</span>
                  ))}
                </div>

                {contact.searchQuery && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
                    Query: {contact.searchQuery}
                  </div>
                )}

                {!!contact.sequencePlan?.steps?.length && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {contact.sequencePlan.channel} sequence
                    </div>
                    <div className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                      {contact.sequencePlan.steps.slice(0, 3).map(step => (
                        <div key={step}>{step}</div>
                      ))}
                    </div>
                  </div>
                )}

                {!!contact.evidence?.length && (
                  <div className="mt-3 text-xs leading-5 text-slate-400">{contact.evidence.join(' · ')}</div>
                )}
              </div>
            ))
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-[#0b1526] px-6 text-center">
              <Search className="h-8 w-8 text-slate-600" />
              <p className="mt-4 text-sm text-slate-400">
                No prospect queue yet. Run the sourcing engine or import validated contacts from your CRM or enrichment provider.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
