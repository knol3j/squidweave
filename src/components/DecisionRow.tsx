import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain, TrendingUp, TrendingDown, Minus, Target, Users, Upload } from 'lucide-react';
import type { Target as TargetType, Investor, TacticScore } from '@/types';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface Props {
  targets: TargetType[];
  investors: Investor[];
  tacticScores: TacticScore[];
  expanded: boolean;
}

const channelColors: Record<string, string> = {
  Email: '#6366f1',
  LinkedIn: '#06b6d4',
  Reddit: '#f59e0b',
  Twitter: '#8b5cf6',
};

const trendIcons = {
  up: <TrendingUp className="w-3 h-3 text-[#10b981]" />,
  down: <TrendingDown className="w-3 h-3 text-[#f43f5e]" />,
  flat: <Minus className="w-3 h-3 text-[#64748b]" />,
};

export default function DecisionRow({ targets, investors, tacticScores, expanded }: Props) {
  const { dispatch } = useApp();
  const [targetSort, setTargetSort] = useState<'score' | 'name'>('score');
  const [investorSort, setInvestorSort] = useState<'overallScore' | 'thesisMatch'>('overallScore');

  const sortedTargets = [...targets].sort((a, b) =>
    targetSort === 'score' ? b.score - a.score : a.company.localeCompare(b.company)
  );

  const sortedInvestors = [...investors].sort((a, b) =>
    investorSort === 'overallScore' ? b.overallScore - a.overallScore : b.thesisMatch - a.thesisMatch
  );

  const scoreColor = (s: number) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:border-[rgba(255,255,255,0.12)]',
          expanded && 'rounded-b-none border-b-0'
        )}
        style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#f59e0b' }}
        onClick={() => !expanded && dispatch({ type: 'EXPAND_STAGE', stageId: 2 })}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Brain className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">DECISION CORE</h3>
            <p className="text-xs text-[#64748b]">{targets.length} ranked targets · {investors.length} investors</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3">
            {tacticScores.slice(0, 3).map(t => (
              <div key={t.channel} className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-[#1e293b]"><div className="h-full rounded-full" style={{ width: `${t.score}%`, backgroundColor: scoreColor(t.score) }} /></div>
                <span className="text-[0.65rem] text-[#64748b]">{t.channel}</span>
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
            <div className="p-5 rounded-b-2xl border border-t-0 border-[rgba(255,255,255,0.08)] space-y-5" style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#f59e0b' }}>
              {/* Tactic Score Panel */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#111c2b' }}>
                <h4 className="text-xs font-semibold text-[#94a3b8] mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Tactic Scores</h4>
                <div className="grid grid-cols-2 gap-3">
                  {tacticScores.map(t => (
                    <div key={t.channel} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#e2e8f0] font-medium">{t.channel}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#94a3b8]">{t.score}%</span>
                          {trendIcons[t.trend]}
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1e293b]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${t.score}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: scoreColor(t.score) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two-column layout: Targets + Investors */}
              <div className="grid grid-cols-2 gap-4">
                {/* Target Ranking */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#94a3b8] flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Target Ranking</h4>
                    <div className="flex gap-1">
                      <button onClick={() => setTargetSort('score')} className={cn('px-2 py-0.5 rounded text-[0.6rem]', targetSort === 'score' ? 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]' : 'text-[#64748b]')}>Score</button>
                      <button onClick={() => setTargetSort('name')} className={cn('px-2 py-0.5 rounded text-[0.6rem]', targetSort === 'name' ? 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]' : 'text-[#64748b]')}>Name</button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {sortedTargets.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors">
                        <span className="text-[0.65rem] text-[#64748b] w-4 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#e2e8f0] font-medium truncate">{t.company}</span>
                            <span className="text-[0.65rem] text-[#64748b]">{t.score}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="flex-1 h-1 rounded-full bg-[#1e293b]"><div className="h-full rounded-full" style={{ width: `${t.score}%`, backgroundColor: scoreColor(t.score) }} /></div>
                            <span className="px-1.5 py-0.5 rounded text-[0.55rem]" style={{ backgroundColor: `${channelColors[t.recommendedChannel] || '#475569'}20`, color: channelColors[t.recommendedChannel] || '#94a3b8' }}>{t.recommendedChannel}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Investor Dashboard */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#94a3b8] flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Funding Pipeline</h4>
                    <div className="flex items-center gap-1.5 text-[0.6rem] text-[#64748b]">
                      <Upload className="w-3 h-3" />
                      <span>CSV import</span>
                    </div>
                  </div>

                  {/* Scoring Rings Summary */}
                  <div className="flex items-center justify-center gap-4 py-2">
                    {[
                      { label: 'Thesis', weight: 35, key: 'thesisMatch' as const },
                      { label: 'Stage', weight: 25, key: 'stageMatch' as const },
                      { label: 'Check', weight: 20, key: 'checkSizeMatch' as const },
                      { label: 'Warmth', weight: 20, key: 'warmPath' as const },
                    ].map(ring => {
                      const avg = Math.round(investors.reduce((s, inv) => s + (inv[ring.key] || 0), 0) / investors.length);
                      return (
                        <div key={ring.label} className="flex flex-col items-center gap-1">
                          <svg width="36" height="36" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
                            <circle cx="18" cy="18" r="14" fill="none" stroke={scoreColor(avg)} strokeWidth="3" strokeDasharray={`${(avg / 100) * 88} 88`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                          </svg>
                          <span className="text-[0.55rem] text-[#64748b]">{ring.label}</span>
                          <span className="text-[0.55rem] text-[#94a3b8]">{ring.weight}%</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1 max-h-[160px] overflow-y-auto">
                    {sortedInvestors.slice(0, 6).map(inv => (
                      <div key={inv.id} className="flex items-center gap-2 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-bold" style={{ backgroundColor: `${scoreColor(inv.overallScore)}20`, color: scoreColor(inv.overallScore) }}>
                          {inv.overallScore}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[#e2e8f0] font-medium truncate">{inv.name}</div>
                          <div className="text-[0.6rem] text-[#64748b]">{inv.firm}</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[0.55rem] capitalize" style={{ backgroundColor: inv.status === 'meeting' ? 'rgba(16,185,129,0.15)' : inv.status === 'responded' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: inv.status === 'meeting' ? '#34d399' : inv.status === 'responded' ? '#60a5fa' : '#fbbf24' }}>
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
