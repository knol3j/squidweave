import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, TrendingUp, DollarSign, MousePointer2, 
  Target, Filter, ArrowUpRight, 
  ArrowDownRight, Activity, Zap, AlertTriangle, Inbox
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { dataService, Metric } from '../services/dataService';
import { useCollaboration } from './CollaborationProvider';
import { formatPercent, formatCurrency, formatShortDate, formatDate } from '../lib/format';

export default function Performance() {
  const { campaignState } = useCollaboration();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [filterOpen, setFilterOpen] = useState(false);
  const [metricFilter, setMetricFilter] = useState<string>('all');

  useEffect(() => {
    if (!campaignState.id) {
      setLoading(false);
      return;
    }
    const unsubscribe = dataService.subscribeToMetrics(campaignState.id, (data) => {
      setMetrics(data);
      setLoadError(null);
      setLoading(false);
    });
    // If no data arrives within a timeout, mark loading as done
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [campaignState.id]);

  const now = new Date();
  const filteredMetrics = metrics.filter(m => {
    const d = m.timestamp?.toDate?.() || new Date(0);
    const hoursMs = now.getTime() - d.getTime();
    if (timeRange === '24h') return hoursMs <= 24 * 60 * 60 * 1000;
    if (timeRange === '7d') return hoursMs <= 7 * 24 * 60 * 60 * 1000;
    if (timeRange === '30d') return hoursMs <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const displayData = filteredMetrics.length > 0 ? filteredMetrics.map(m => ({
    name: formatShortDate(m.timestamp?.toDate?.() || Date.now()),
    ctr: metricFilter === 'all' || metricFilter === 'CTR' ? m.ctr : undefined,
    conv: metricFilter === 'all' || metricFilter === 'Conversion' ? m.conv : undefined,
    spend: metricFilter === 'all' || metricFilter === 'Spend' ? m.spend : undefined
  })) : [];

  const avgCtr = filteredMetrics.length > 0 ? formatPercent(filteredMetrics.reduce((acc, m) => acc + m.ctr, 0) / filteredMetrics.length) : '0%';
  const totalSpend = filteredMetrics.length > 0 ? formatCurrency(filteredMetrics.reduce((acc, m) => acc + m.spend, 0)) : '$0.00';
  const avgConv = filteredMetrics.length > 0 ? formatPercent(filteredMetrics.reduce((acc, m) => acc + m.conv, 0) / filteredMetrics.length) : '0%';
  const latestMetric = filteredMetrics.at(-1);
  const previousMetric = filteredMetrics.at(-2);
  const ctrDelta = latestMetric && previousMetric ? { raw: latestMetric.ctr - previousMetric.ctr, display: formatPercent(latestMetric.ctr - previousMetric.ctr) } : null;
  const convDelta = latestMetric && previousMetric ? { raw: latestMetric.conv - previousMetric.conv, display: formatPercent(latestMetric.conv - previousMetric.conv) } : null;
  const spendDelta = latestMetric && previousMetric ? { raw: latestMetric.spend - previousMetric.spend, display: formatCurrency(Math.abs(latestMetric.spend - previousMetric.spend)) } : null;
  const latestDate = latestMetric ? formatDate(new Date(latestMetric.timestamp.toDate())) : '—';

  if (loading) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 glass-panel">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-pulse space-y-3 p-6 glass-card">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-8 bg-white/10 rounded w-1/2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="animate-pulse glass-card space-y-3 p-4">
                <div className="h-10 w-10 bg-white/10 rounded-xl" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-6 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="animate-pulse glass-panel p-8 h-72 rounded-2xl">
            <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
            <div className="h-full bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center glass-panel">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-red-400 text-sm font-medium">Failed to load metrics</p>
          <p className="text-slate-500 text-xs">{loadError}</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15">
            Retry
          </button>
        </div>
      </div>
    );
  }

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
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 transition-all ${timeRange === range ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setFilterOpen(!filterOpen)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                <Filter className="w-4 h-4" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#08111f] shadow-2xl">
                  <div className="p-1 space-y-0.5">
                    {['all', 'CTR', 'Conversion', 'Spend'].map(type => (
                      <button
                        key={type}
                        onClick={() => { setMetricFilter(type); setFilterOpen(false); }}
                        className={`flex w-full items-center px-3 py-2 rounded-lg text-xs transition-all ${metricFilter === type ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        {type === 'all' ? 'All Metrics' : type}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {filteredMetrics.length === 0 ? (
          <div className="text-center py-40 space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
              <Inbox className="w-10 h-10 text-slate-600" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white">No analytics data yet</h3>
              <p className="text-sm text-slate-400 mt-2">Ingest real analytics events first. This view does not fabricate benchmark curves or market averages.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Latest Update', value: latestDate, trend: null, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Avg CTR', value: avgCtr, trend: ctrDelta, icon: MousePointer2, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
                { label: 'Cumulative Spend', value: totalSpend, trend: spendDelta, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Conv Rate', value: avgConv, trend: convDelta, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
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
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${stat.trend.raw >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stat.trend.raw >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {stat.trend.raw >= 0 ? '+' : ''}{stat.trend.display}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 leading-none">{stat.label}</div>
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
                
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10">
                  <BarChart3 className="w-16 h-16 text-indigo-500/40 mb-4" />
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    Campaign: <span className="text-white font-bold">{campaignState.name || campaignState.id}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Metrics Loaded</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">{filteredMetrics.length}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: filteredMetrics.length > 0 ? '100%' : '0%' }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-relaxed">
                    Latest spend: {formatCurrency(latestMetric?.spend ?? 0)} · latest CTR: {formatPercent(latestMetric?.ctr)} · latest conversion: {formatPercent(latestMetric?.conv)}
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
