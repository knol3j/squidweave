import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { dataService, Metric } from '../services/dataService';
import { useCollaboration } from './CollaborationProvider';

function useLiveMetrics() {
  const { campaignState } = useCollaboration();
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (!campaignState.id) {
      setMetrics([]);
      return;
    }

    const unsubscribe = dataService.subscribeToMetrics(campaignState.id, setMetrics);
    return () => unsubscribe();
  }, [campaignState.id]);

  return useMemo(() => metrics.map(metric => ({
    name: new Date(metric.timestamp.toDate()).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
    ctr: metric.ctr,
    conv: metric.conv,
  })), [metrics]);
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
      No live data
    </div>
  );
}

export function CTRChart() {
  const data = useLiveMetrics();

  if (data.length === 0) {
    return (
      <div className="w-full h-40">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCtr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.08)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.45)', fontFamily: 'monospace' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#0f172a' }}
            itemStyle={{ color: '#818cf8' }}
          />
          <Area
            type="monotone"
            dataKey="ctr"
            stroke="#818cf8"
            fillOpacity={1}
            fill="url(#colorCtr)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConversionChart() {
  const data = useLiveMetrics();

  if (data.length === 0) {
    return (
      <div className="w-full h-40">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.08)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.45)', fontFamily: 'monospace' }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(15,23,42,0.03)' }}
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#0f172a' }}
            itemStyle={{ color: '#d946ef' }}
          />
          <Bar dataKey="conv" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#d946ef' : '#d946ef44'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
