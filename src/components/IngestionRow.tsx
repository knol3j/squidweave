import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Database, Activity, Download, FileText, Zap } from 'lucide-react';
import type { Connector, ResearchRecord, AnalyticsEvent, OutreachEvent } from '@/types';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface Props {
  connectors: Connector[];
  researchRecords: ResearchRecord[];
  analyticsEvents: AnalyticsEvent[];
  outreachEvents: OutreachEvent[];
  expanded: boolean;
}

type EventTab = 'analytics' | 'outreach';

const statusColors: Record<string, string> = {
  ready: '#10b981',
  'dry-run': '#f59e0b',
  live: '#3b82f6',
  error: '#f43f5e',
};

export default function IngestionRow({ connectors, researchRecords, analyticsEvents, outreachEvents, expanded }: Props) {
  const { dispatch } = useApp();
  const [eventTab, setEventTab] = useState<EventTab>('analytics');
  const [search, setSearch] = useState('');

  const filteredResearch = researchRecords.filter(r =>
    r.company.toLowerCase().includes(search.toLowerCase()) ||
    r.segment.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:border-[rgba(255,255,255,0.12)]',
          expanded && 'rounded-b-none border-b-0'
        )}
        style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#06b6d4' }}
        onClick={() => !expanded && dispatch({ type: 'EXPAND_STAGE', stageId: 1 })}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(6,182,212,0.15)' }}>
            <Database className="w-4 h-4 text-[#06b6d4]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">INGESTION LAYER</h3>
            <p className="text-xs text-[#64748b]">{connectors.length} connectors · {researchRecords.length} research records · {analyticsEvents.length + outreachEvents.length} events</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {connectors.map(c => (
              <div key={c.id} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[c.status] || '#475569' }} />
                <span className="text-[0.65rem] text-[#64748b]">{c.name}</span>
              </div>
            ))}
          </div>
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
            <div className="p-5 rounded-b-2xl border border-t-0 border-[rgba(255,255,255,0.08)] space-y-5" style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#06b6d4' }}>
              {/* Connector Cards */}
              <div className="grid grid-cols-3 gap-3">
                {connectors.map(c => (
                  <div key={c.id} className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: '#111c2b' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-[#06b6d4]" />
                        <span className="text-xs font-semibold text-[#e2e8f0]">{c.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-medium" style={{ backgroundColor: `${statusColors[c.status]}20`, color: statusColors[c.status] }}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[0.65rem] text-[#64748b] mb-2">{c.mode}</p>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full"
                          style={{ backgroundColor: i < c.health ? (c.health >= 4 ? '#10b981' : c.health >= 3 ? '#f59e0b' : '#f43f5e') : '#1e293b' }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.6rem] text-[#475569]">Last: {new Date(c.lastPull).toLocaleDateString()}</span>
                      <button className="px-2.5 py-1 rounded-md text-[0.65rem] font-medium bg-[rgba(6,182,212,0.15)] text-[#22d3ee] hover:bg-[rgba(6,182,212,0.25)] transition-colors">
                        Pull
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Research Feed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#94a3b8] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Research Feed</h4>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-7 px-3 rounded-md text-[0.7rem] bg-[#111c2b] border border-[rgba(255,255,255,0.06)] text-[#e2e8f0] focus:outline-none focus:border-[#06b6d4] w-48"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[0.6rem] uppercase tracking-wider text-[#64748b]">
                        <th className="text-left py-2 px-2">Company</th>
                        <th className="text-left py-2 px-2">Segment</th>
                        <th className="text-left py-2 px-2">Region</th>
                        <th className="text-left py-2 px-2">Fit</th>
                        <th className="text-left py-2 px-2">Intent</th>
                        <th className="text-left py-2 px-2">Recency</th>
                        <th className="text-left py-2 px-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResearch.slice(0, 8).map(r => (
                        <tr key={r.id} className="table-row-hover border-t border-[rgba(255,255,255,0.04)] transition-colors">
                          <td className="py-2 px-2 text-xs text-[#e2e8f0] font-medium">{r.company}</td>
                          <td className="py-2 px-2 text-xs text-[#94a3b8]">{r.segment}</td>
                          <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded text-[0.6rem] bg-[rgba(6,182,212,0.1)] text-[#22d3ee]">{r.region}</span></td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full bg-[#1e293b]"><div className="h-full rounded-full bg-[#10b981]" style={{ width: `${r.fitScore}%` }} /></div>
                              <span className="text-[0.6rem] text-[#94a3b8]">{r.fitScore}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full bg-[#1e293b]"><div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${r.intentScore}%` }} /></div>
                              <span className="text-[0.6rem] text-[#94a3b8]">{r.intentScore}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full bg-[#1e293b]"><div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${r.recencyScore}%` }} /></div>
                              <span className="text-[0.6rem] text-[#94a3b8]">{r.recencyScore}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[0.6rem] text-[#6366f1] hover:underline">Link</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Events Tabs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#06b6d4]" />
                  <button onClick={() => setEventTab('analytics')} className={cn('px-3 py-1 rounded-md text-xs transition-colors', eventTab === 'analytics' ? 'bg-[rgba(6,182,212,0.15)] text-[#22d3ee]' : 'text-[#64748b] hover:text-[#94a3b8]')}>Analytics Events</button>
                  <button onClick={() => setEventTab('outreach')} className={cn('px-3 py-1 rounded-md text-xs transition-colors', eventTab === 'outreach' ? 'bg-[rgba(6,182,212,0.15)] text-[#22d3ee]' : 'text-[#64748b] hover:text-[#94a3b8]')}>Outreach Events</button>
                </div>
                <div className="overflow-x-auto">
                  {eventTab === 'analytics' ? (
                    <table className="w-full">
                      <thead><tr className="text-[0.6rem] uppercase tracking-wider text-[#64748b]"><th className="text-left py-1.5 px-2">Type</th><th className="text-left py-1.5 px-2">Value</th><th className="text-left py-1.5 px-2">Time</th></tr></thead>
                      <tbody>{analyticsEvents.slice(0, 6).map(e => (
                        <tr key={e.id} className="border-t border-[rgba(255,255,255,0.04)] table-row-hover">
                          <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded text-[0.6rem]" style={{ backgroundColor: e.type === 'impression' ? 'rgba(59,130,246,0.1)' : e.type === 'click' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: e.type === 'impression' ? '#60a5fa' : e.type === 'click' ? '#fbbf24' : '#34d399' }}>{e.type}</span></td>
                          <td className="py-1.5 px-2 text-xs text-[#e2e8f0]">{e.value}</td>
                          <td className="py-1.5 px-2 text-[0.65rem] text-[#64748b]">{new Date(e.timestamp).toLocaleDateString()}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  ) : (
                    <table className="w-full">
                      <thead><tr className="text-[0.6rem] uppercase tracking-wider text-[#64748b]"><th className="text-left py-1.5 px-2">Target</th><th className="text-left py-1.5 px-2">Type</th><th className="text-left py-1.5 px-2">Channel</th><th className="text-left py-1.5 px-2">Time</th></tr></thead>
                      <tbody>{outreachEvents.slice(0, 6).map(e => (
                        <tr key={e.id} className="border-t border-[rgba(255,255,255,0.04)] table-row-hover">
                          <td className="py-1.5 px-2 text-xs text-[#e2e8f0]">{e.targetName}</td>
                          <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded text-[0.6rem] bg-[rgba(6,182,212,0.1)] text-[#22d3ee]">{e.type}</span></td>
                          <td className="py-1.5 px-2 text-[0.65rem] text-[#94a3b8]">{e.channel}</td>
                          <td className="py-1.5 px-2 text-[0.65rem] text-[#64748b]">{new Date(e.timestamp).toLocaleDateString()}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
