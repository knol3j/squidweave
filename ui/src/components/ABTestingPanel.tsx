import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Columns, ArrowRight, Zap, TrendingUp,
  BarChart3, Rocket, Users, Smartphone, Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dataService, Variation } from '../services/dataService';
import { useCollaboration } from './CollaborationProvider';

interface ABTestingPanelProps {
  onNavigatePerformance: () => void;
  onNavigateEngine: (context: string) => void;
}

export default function ABTestingPanel({ onNavigatePerformance, onNavigateEngine }: ABTestingPanelProps) {
  const { campaignState } = useCollaboration();
  const [activeMetric, setActiveMetric] = useState<'ctr' | 'conv'>('ctr');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignState.id) return;

    const unsubscribe = dataService.subscribeToVariations(campaignState.id, (data) => {
      setVariations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [campaignState.id]);

  const chartData = variations
    .filter(variation => typeof variation[activeMetric] === 'number')
    .map(variation => ({
      name: variation.id.toUpperCase(),
      value: variation[activeMetric] as number,
      color: variation.status === 'winner' ? '#d946ef' : '#6366f1',
    }));

  return (
    <div className="flex flex-col h-full glass-panel p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            <Columns className="w-6 h-6 text-indigo-400" />
            Ad Variation Lab
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-400 text-sm">Reviewing {variations.length} generated variants from the latest live content pack.</p>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live Feed</span>
            </div>
          </div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveMetric('ctr')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeMetric === 'ctr' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            CTR %
          </button>
          <button
            onClick={() => setActiveMetric('conv')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeMetric === 'conv' ? 'bg-fuchsia-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            CONV %
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Zap className="w-12 h-12 text-indigo-500 animate-pulse" />
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Syncing live content feed...</div>
        </div>
      ) : variations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Rocket className="w-12 h-12 text-slate-600" />
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">No generated variants found. Trigger the brain first.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {variations.map((variation, index) => (
              <motion.div
                key={variation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`glass-card overflow-hidden group relative transition-all hover:scale-[1.02] flex flex-col !p-0 ${
                  variation.status === 'winner' ? 'border-fuchsia-500/50 shadow-2xl shadow-fuchsia-500/10' : 'border-white/10 shadow-lg'
                }`}
              >
                {variation.status === 'winner' && (
                  <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                    <div className="bg-fuchsia-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Zap className="w-3 h-3 fill-current" /> LIVE WINNER
                    </div>
                    <button
                      onClick={onNavigatePerformance}
                      className="bg-[#0F172A]/80 backdrop-blur-md border border-fuchsia-500/30 text-white text-[9px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-fuchsia-500 transition-all shadow-xl"
                      title="View analytics for this variation"
                    >
                      <BarChart3 className="w-3 h-3" /> DEEP DIVE
                    </button>
                  </div>
                )}

                <div className="relative h-32 overflow-hidden shrink-0">
                  {variation.image ? (
                    <img src={variation.image} alt={variation.label} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      No live asset preview
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-4 flex gap-1.5">
                    <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                      <Smartphone className="w-2.5 h-2.5 text-indigo-400" />
                      <span className="text-[8px] text-white font-bold uppercase tracking-tight">{(variation.platform || 'unknown').split('/')[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-grow flex flex-col">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{variation.label}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users className="w-2.5 h-2.5 text-slate-500" />
                      <span className="text-[8px] text-slate-500 uppercase font-medium">{variation.audience || 'No live audience tag'}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 italic text-[11px] text-slate-300 leading-relaxed min-h-[60px]">
                    "{variation.copy}"
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col items-center">
                      <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">CTR</div>
                      <div className="text-sm font-bold text-white flex items-center gap-1">
                        {typeof variation.ctr === 'number' ? `${variation.ctr}%` : 'N/A'}
                        {variation.trend === 'up' && <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />}
                        {variation.trend === 'down' && <Activity className="w-2.5 h-2.5 text-rose-400 rotate-180" />}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col items-center">
                      <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">CONV</div>
                      <div className="text-sm font-bold text-white">{typeof variation.conv === 'number' ? `${variation.conv}%` : 'N/A'}</div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 space-y-2">
                    <div className="flex items-center justify-between text-[8px] uppercase tracking-widest font-bold border-b border-white/5 pb-2">
                      <span className="text-slate-500">Telemetry</span>
                      <span className="text-emerald-400">{typeof variation.ctr === 'number' || typeof variation.conv === 'number' ? 'live' : 'not available'}</span>
                    </div>

                    <button
                      onClick={() => onNavigateEngine(`Refine and expand on ${variation.label}: ${variation.copy}`)}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                    >
                      <Rocket className="w-3 h-3 text-indigo-400 group-hover/btn:scale-110 transition-transform" />
                      Refine Strategy
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-panel p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Live Head-to-Head
              </h3>
              <button
                onClick={onNavigatePerformance}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-[0.2em] flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
              >
                Explore Performance Dashboard
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-48 w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  No per-variation live performance metrics have been ingested yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'white', fontSize: 12, fontWeight: 'bold' }} width={60} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[24px] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Decision Basis</h4>
                    <p className="text-[10px] text-emerald-400/80 font-mono">Live content pack plus ingested telemetry only</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This panel does not fabricate a winning variant. A winner only appears when real per-variation telemetry exists in the backend.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Top Variant</div>
                      <div className="text-[11px] text-white flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-indigo-400" /> {variations[0]?.label || 'No live ranking'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Measurement Basis</div>
                      <div className="text-[11px] text-white flex items-center gap-1">
                        <BarChart3 className="w-3 h-3 text-fuchsia-400" /> {chartData.length > 0 ? `${activeMetric.toUpperCase()} telemetry` : 'content generation only'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-[24px] flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Confidence Score</div>
                  <div className="text-3xl font-bold text-white font-mono">{chartData.length > 0 ? 'Live' : 'N/A'}</div>
                </div>

                <div className="space-y-3">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: chartData.length > 0 ? '100%' : '0%' }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight italic">
                    Confidence is withheld until real outcome telemetry is available.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
