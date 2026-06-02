import React from 'react';
import { Cable } from 'lucide-react';
import { ConnectorStatus, OpenClawDiagnostic } from '../../services/dataService';

interface ConnectorConfigFormProps {
  connectorStatuses: ConnectorStatus[];
  connectorDrafts: Record<string, { baseUrl: string; token: string }>;
  connectorSaving: string | null;
  connectorMessage: string | null;
  openClawDiagnostics: OpenClawDiagnostic[];
  onDraftChange: (connector: string, updates: { baseUrl?: string; token?: string }) => void;
  onSave: (connector: string) => void;
}

export function ConnectorConfigForm({
  connectorStatuses, connectorDrafts, connectorSaving, connectorMessage,
  openClawDiagnostics, onDraftChange, onSave,
}: ConnectorConfigFormProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Cable className="h-4 w-4 text-violet-500" />
        Connector Rails
      </div>
      <div className="mt-4 space-y-2">
        {connectorStatuses.map(status => (
          <div key={status.connector} className="rounded-xl bg-white/[0.06] px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200">{status.connector}</div>
              <div className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${
                status.mode === 'live' || status.mode === 'ready' ? 'text-emerald-400'
                : status.mode === 'dry-run' ? 'text-amber-400'
                : status.mode === 'auth-error' ? 'text-rose-400'
                : 'text-slate-400'
              }`}>
                {status.mode}
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {status.configured ? status.baseUrl || 'Configured' : 'Missing base URL or token'}
            </div>
            {status.tokenLikelyRotated && (
              <div className="mt-1 text-[11px] text-rose-500">Token rejected by connector. Replace it below.</div>
            )}
            {status.error && <div className="mt-1 text-[11px] text-rose-500">{status.error}</div>}
            <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <input
                value={connectorDrafts[status.connector]?.baseUrl || ''}
                onChange={event => onDraftChange(status.connector, { baseUrl: event.target.value })}
                placeholder={`${status.connector} base URL`}
                className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-400"
              />
              <input
                type="password"
                value={connectorDrafts[status.connector]?.token || ''}
                onChange={event => onDraftChange(status.connector, { token: event.target.value })}
                placeholder={`New ${status.connector} token`}
                className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-400"
              />
              <button
                onClick={() => onSave(status.connector)}
                disabled={connectorSaving === status.connector}
                className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectorSaving === status.connector ? 'Saving...' : `Update ${status.connector}`}
              </button>
            </div>
          </div>
        ))}
        {connectorStatuses.length === 0 && (
          <div className="text-xs text-slate-400">No connector rails discovered.</div>
        )}
        {openClawDiagnostics.some(item => !item.ready) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-300">
            {openClawDiagnostics.filter(item => !item.ready).map(item => (
              <div key={`diagnostic-${item.connector}`} className="mb-2 last:mb-0">
                <div className="font-semibold">{item.connector}: {item.summary}</div>
                {item.recommendations[0] ? <div className="mt-1">{item.recommendations[0]}</div> : null}
              </div>
            ))}
          </div>
        )}
        {connectorMessage && (
          <div className="text-xs text-slate-500">{connectorMessage}</div>
        )}
      </div>
    </div>
  );
}
