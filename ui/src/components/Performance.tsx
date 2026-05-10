import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, TrendingUp, DollarSign, MousePointer2, 
  Target, Filter, ArrowUpRight, 
  ArrowDownRight, Activity, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { dataService, Metric } from '../services/dataService';
import { useCollaboration } from './CollaborationProvider';

export default function Performance() {
  const { campaignState } = useCollaboration();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    if (!campaignState.id) return;
    const unsubscribe = dataService.subscribeToMetrics(campaignState.id, (data) => {
      setMetrics(data);
    });
    return () => unsubscribe();
  }, [campaignState.id]);

  const displayData = metrics.length > 0 ? metrics.map(m => ({
    name: new Date(m.timestamp?.toDate() || Date.now()).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
    ctr: m.ctr,
    conv: m.conv,
    spend: m.spend
  })) : [];

  const avgCtr = metrics.length > 0 ? (metrics.reduce((acc, m) => acc + m.ctr, 0) / metrics.length).toFixed(2) : '0.00';
  const totalSpend = metrics.length > 0 ? metrics.reduce((acc, m) => acc + m.spend, 0).toLocaleString() : '0.00';
  const avgConv = metrics.length > 0 ? (metrics.reduce((acc, m) => acc + m.conv, 0) / metrics.length).toFixed(2) : '0.00';
  const latestMetric = metrics.at(-1);
  const previousMetric = metrics.at(-2);
  const ctrDelta = latestMetric && previousMetric ? (latestMetric.ctr - previousMetric.ctr).toFixed(2) : null;
  const convDelta = latestMetric && previousMetric ? (latestMetric.conv - previousMetric.conv).toFixed(2) : null;
  const spendDelta = latestMetric && previousMetric ? (latestMetric.spend - previousMetric.spend).toFixed(2) : null;
  const latestDate = latestMetric ? new Date(latestMetric.timestamp.toDate()).toLocaleString() : 'No live update received';

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 glass-panel">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
              <BarChart3 className="w-6 h-6 text-fuchsia-400" />
              Live Performance Benchmarks
            </h2>
            <p className="text-slate-400 text-sm mt-1">Only persisted analytics events and decision summaries are shown here.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              {['24h', '7d', '30d'].map(range => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === range ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {metrics.length === 0 ? (
          <div className="text-center py-40 space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10">
              <Activity className="w-10 h-10 text-slate-600 animate-pulse" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white">No Live Benchmarks Generated</h3>
              <p className="text-sm text-slate-500 mt-2">Ingest real analytics events first. This view does not fabricate benchmark curves or market averages.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Latest Update', value: latestDate, trend: null, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Avg CTR', value: `${avgCtr}%`, trend: ctrDelta, icon: MousePointer2, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
                { label: 'Cumulative Spend', value: `$${totalSpend}`, trend: spendDelta, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Conv Rate', value: `${avgConv}%`, trend: convDelta, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    {stat.trend !== null && (
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${Number(stat.trend) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {Number(stat.trend) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Number(stat.trend) >= 0 ? '+' : ''}{stat.trend}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{stat.label}</div>
                    <div className={`${stat.label === 'Latest Update' ? 'text-sm' : 'text-2xl'} font-bold text-white mt-1 font-mono`}>{stat.value}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-panel p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Market Performance Curve
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">CTR</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayData}>
                      <defs>
                        <linearGradient id="pColorCtr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Area type="monotone" dataKey="ctr" stroke="#6366f1" fillOpacity={1} fill="url(#pColorCtr)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel p-8 space-y-8 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
                  Live Feed Status
                </h3>
                
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-white/10">
                  <BarChart3 className="w-16 h-16 text-indigo-500/40 mb-4" />
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    Campaign: <span className="text-white font-bold">{campaignState.name || campaignState.id}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metrics Loaded</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">{metrics.length}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: metrics.length > 0 ? '100%' : '0%' }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-relaxed">
                    Latest spend: ${latestMetric?.spend?.toFixed(2) || '0.00'} · latest CTR: {latestMetric?.ctr?.toFixed(2) || '0.00'}% · latest conversion: {latestMetric?.conv?.toFixed(2) || '0.00'}%
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
