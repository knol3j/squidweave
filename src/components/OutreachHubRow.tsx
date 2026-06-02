import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Send, AlertTriangle, RefreshCw, Trash2, Check, X, Shield, Activity } from 'lucide-react';
import type { OutreachEvent, DLQEntry, ExecutionReceipt } from '@/types';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface Props {
  outreachEvents: OutreachEvent[];
  dlqEntries: DLQEntry[];
  executionReceipts: ExecutionReceipt[];
  dryRunMode: boolean;
  expanded: boolean;
}

const statusColors: Record<string, string> = {
  sent: '#6366f1',
  delivered: '#3b82f6',
  opened: '#06b6d4',
  clicked: '#f59e0b',
  replied: '#10b981',
  bounced: '#f43f5e',
};

const receiptStatusColors: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  denied: '#f43f5e',
};

export default function OutreachHubRow({ outreachEvents, dlqEntries, executionReceipts, dryRunMode, expanded }: Props) {
  const { dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'timeline' | 'dlq' | 'safety'>('timeline');

  const sentCount = outreachEvents.filter(e => e.type === 'sent').length;
  const openCount = outreachEvents.filter(e => e.type === 'opened').length;
  const openRate = sentCount > 0 ? Math.round((openCount / sentCount) * 100) : 0;

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:border-[rgba(255,255,255,0.12)]',
          expanded && 'rounded-b-none border-b-0'
        )}
        style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#10b981' }}
        onClick={() => !expanded && dispatch({ type: 'EXPAND_STAGE', stageId: 4 })}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
            <Send className="w-4 h-4 text-[#10b981]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">OUTREACH HUB</h3>
            <p className="text-xs text-[#64748b]">{sentCount} sent · {openRate}% open rate · {dlqEntries.length} in DLQ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dryRunMode && (
            <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-medium bg-[rgba(245,158,11,0.15)] text-[#fbbf24]">DRY_RUN</span>
          )}
          {dlqEntries.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-medium bg-[rgba(244,63,94,0.15)] text-[#fb7185]">{dlqEntries.length} DLQ</span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-[#64748b]" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-b-2xl border border-t-0 border-[rgba(255,255,255,0.08)] space-y-4" style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#10b981' }}>
              {/* Tabs */}
              <div className="flex items-center gap-1">
                {([['timeline', 'Timeline'], ['dlq', 'DLQ Manager'], ['safety', 'Safety Center']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      activeTab === key ? 'bg-[rgba(16,185,129,0.15)] text-[#34d399]' : 'text-[#64748b] hover:text-[#94a3b8]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'timeline' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative pl-4 space-y-3">
                  <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[#1e293b]" />
                  {outreachEvents.slice(0, 10).map((e, i) => (
                    <div key={e.id} className="relative flex items-start gap-3">
                      <div
                        className="absolute left-[-13px] w-2.5 h-2.5 rounded-full border-2 mt-1"
                        style={{ backgroundColor: '#0f172a', borderColor: statusColors[e.type] || '#475569' }}
                      />
                      <div className="flex-1 p-2.5 rounded-lg border border-[rgba(255,255,255,0.04)]" style={{ backgroundColor: '#111c2b' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#e2e8f0] font-medium">{e.targetName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium" style={{ backgroundColor: `${statusColors[e.type] || '#475569'}15`, color: statusColors[e.type] || '#94a3b8' }}>{e.type}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[0.65rem] text-[#64748b]">{e.channel} · {new Date(e.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'dlq' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#94a3b8]">Dead Letter Queue ({dlqEntries.length} items)</span>
                    <div className="flex gap-1.5">
                      <button className="px-2.5 py-1 rounded-md text-[0.65rem] bg-[rgba(245,158,11,0.15)] text-[#fbbf24]">Retry All</button>
                      <button className="px-2.5 py-1 rounded-md text-[0.65rem] bg-[rgba(244,63,94,0.15)] text-[#fb7185]">Clear All</button>
                    </div>
                  </div>
                  {dlqEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-[rgba(244,63,94,0.15)]" style={{ backgroundColor: '#111c2b' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#e2e8f0] font-medium truncate">{entry.target}</p>
                        <p className="text-[0.65rem] text-[#f43f5e]">{entry.error}</p>
                        <p className="text-[0.6rem] text-[#475569]">{new Date(entry.timestamp).toLocaleString()} · {entry.retries} retries</p>
                      </div>
                      <div className="flex gap-1.5 ml-2">
                        <button
                          onClick={() => dispatch({ type: 'RETRY_DLQ', entryId: entry.id })}
                          className="p-1.5 rounded-md bg-[rgba(16,185,129,0.1)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)] transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_DLQ', entryId: entry.id })}
                          className="p-1.5 rounded-md bg-[rgba(244,63,94,0.1)] text-[#f43f5e] hover:bg-[rgba(244,63,94,0.2)] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'safety' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* DRY RUN Toggle */}
                  <div className="p-4 rounded-xl border border-[rgba(245,158,11,0.2)]" style={{ backgroundColor: '#111c2b' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#f59e0b]" />
                        <div>
                          <h5 className="text-xs font-semibold text-[#e2e8f0]">DRY_RUN Mode</h5>
                          <p className="text-[0.65rem] text-[#64748b]">When enabled, no real messages are sent</p>
                        </div>
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'TOGGLE_DRY_RUN' })}
                        className={cn(
                          'w-12 h-6 rounded-full transition-colors relative',
                          dryRunMode ? 'bg-[#f59e0b]' : 'bg-[#334155]'
                        )}
                      >
                        <div className={cn(
                          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                          dryRunMode ? 'left-6' : 'left-0.5'
                        )} />
                      </button>
                    </div>
                  </div>

                  {/* Receipts */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-[#94a3b8] flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Execution Receipts</h5>
                    {executionReceipts.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-[rgba(255,255,255,0.04)]" style={{ backgroundColor: '#111c2b' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#e2e8f0] truncate">{r.action}</p>
                          <p className="text-[0.6rem] text-[#475569]">{new Date(r.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="px-2 py-0.5 rounded text-[0.6rem] font-medium capitalize" style={{ backgroundColor: `${receiptStatusColors[r.status]}15`, color: receiptStatusColors[r.status] }}>
                            {r.status}
                          </span>
                          {r.status === 'pending' && (
                            <>
                              <button onClick={() => dispatch({ type: 'APPROVE_RECEIPT', receiptId: r.id })} className="p-1 rounded bg-[rgba(16,185,129,0.1)] text-[#10b981]"><Check className="w-3 h-3" /></button>
                              <button onClick={() => dispatch({ type: 'DENY_RECEIPT', receiptId: r.id })} className="p-1 rounded bg-[rgba(244,63,94,0.1)] text-[#f43f5e]"><X className="w-3 h-3" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
