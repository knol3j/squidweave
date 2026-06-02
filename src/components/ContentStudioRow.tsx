import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, PenTool, Check, X, FileText, Code, File } from 'lucide-react';
import type { ContentVariant, ABTest } from '@/types';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  contentVariants: ContentVariant[];
  abTests: ABTest[];
  expanded: boolean;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
  approved: { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
  sent: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
};

const localeFlags: Record<string, string> = {
  'de-DE': '🇩🇪',
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'fr-FR': '🇫🇷',
  'es-ES': '🇪🇸',
  'ja-JP': '🇯🇵',
};

export default function ContentStudioRow({ contentVariants, abTests, expanded }: Props) {
  const { dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'variants' | 'abtests' | 'approval' | 'export'>('variants');

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:border-[rgba(255,255,255,0.12)]',
          expanded && 'rounded-b-none border-b-0'
        )}
        style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#f43f5e' }}
        onClick={() => !expanded && dispatch({ type: 'EXPAND_STAGE', stageId: 3 })}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(244,63,94,0.15)' }}>
            <PenTool className="w-4 h-4 text-[#f43f5e]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">CONTENT STUDIO</h3>
            <p className="text-xs text-[#64748b]">{contentVariants.length} variants · {abTests.length} A/B tests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {contentVariants.filter(v => v.status === 'approved').map(v => (
              <span key={v.id} className="px-2 py-0.5 rounded-full text-[0.6rem] font-medium bg-[rgba(16,185,129,0.15)] text-[#34d399]">{v.locale} ✓</span>
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
            <div className="p-5 rounded-b-2xl border border-t-0 border-[rgba(255,255,255,0.08)] space-y-4" style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#f43f5e' }}>
              {/* Tabs */}
              <div className="flex items-center gap-1">
                {([['variants', 'Variants'], ['abtests', 'A/B Tests'], ['approval', 'Approval'], ['export', 'Export']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      activeTab === key ? 'bg-[rgba(244,63,94,0.15)] text-[#fb7185]' : 'text-[#64748b] hover:text-[#94a3b8]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'variants' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-3">
                  {contentVariants.map(v => (
                    <div key={v.id} className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)] space-y-2" style={{ backgroundColor: '#111c2b' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{localeFlags[v.locale] || '🌐'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-medium" style={{ backgroundColor: statusColors[v.status].bg, color: statusColors[v.status].text }}>
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#e2e8f0] font-medium truncate">{v.subject}</p>
                      <p className="text-[0.7rem] text-[#94a3b8] line-clamp-3 leading-relaxed">{v.body}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[0.65rem] text-[#6366f1] font-medium">{v.cta}</span>
                        <div className="flex gap-1">
                          {v.status === 'draft' && (
                            <button className="px-2 py-0.5 rounded text-[0.6rem] bg-[rgba(16,185,129,0.15)] text-[#34d399]">Approve</button>
                          )}
                          <button className="px-2 py-0.5 rounded text-[0.6rem] bg-[rgba(255,255,255,0.06)] text-[#94a3b8]">Edit</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'abtests' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {abTests.map(test => (
                    <div key={test.id} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: '#111c2b' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="text-xs font-semibold text-[#e2e8f0]">{test.name}</h5>
                          <p className="text-[0.65rem] text-[#64748b]">{test.variants.length} variants · {test.status}</p>
                        </div>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[0.6rem] font-medium',
                          test.status === 'running' ? 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]' : 'bg-[rgba(16,185,129,0.15)] text-[#34d399]'
                        )}>
                          {test.status === 'running' ? 'Running' : `Winner: ${test.winner || 'N/A'}`}
                        </span>
                      </div>
                      {test.results && (
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={test.results.map(r => ({
                              name: r.variantId.replace('cv', 'V'),
                              Impressions: r.impressions,
                              Clicks: r.clicks,
                              Conversions: r.conversions,
                            }))}>
                              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#111c2b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '0.7rem' }}
                                labelStyle={{ color: '#e2e8f0' }}
                              />
                              <Bar dataKey="Impressions" fill="#6366f1" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="Clicks" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="Conversions" fill="#10b981" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'approval' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  {contentVariants.filter(v => v.status === 'draft').map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-[rgba(245,158,11,0.15)]" style={{ backgroundColor: '#111c2b' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-base">{localeFlags[v.locale] || '🌐'}</span>
                        <div>
                          <p className="text-xs text-[#e2e8f0] font-medium">{v.subject}</p>
                          <p className="text-[0.65rem] text-[#64748b]">{v.locale} · Draft</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.65rem] font-medium bg-[rgba(16,185,129,0.15)] text-[#34d399] hover:bg-[rgba(16,185,129,0.25)] transition-colors">
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.65rem] font-medium bg-[rgba(244,63,94,0.15)] text-[#fb7185] hover:bg-[rgba(244,63,94,0.25)] transition-colors">
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {contentVariants.filter(v => v.status === 'draft').length === 0 && (
                    <p className="text-xs text-[#64748b] text-center py-6">No items pending approval</p>
                  )}
                </motion.div>
              )}

              {activeTab === 'export' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-4 py-6">
                  {[
                    { icon: FileText, label: 'TXT', color: '#94a3b8' },
                    { icon: Code, label: 'JSON', color: '#6366f1' },
                    { icon: File, label: 'PDF', color: '#f43f5e' },
                  ].map(fmt => (
                    <button
                      key={fmt.label}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:translate-y-[-2px] transition-all"
                      style={{ backgroundColor: '#111c2b' }}
                    >
                      <fmt.icon className="w-6 h-6" style={{ color: fmt.color }} />
                      <span className="text-xs text-[#94a3b8]">{fmt.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
