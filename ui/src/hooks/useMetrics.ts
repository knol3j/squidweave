import { useEffect, useMemo, useState } from 'react';
import { dataService, Metric } from '../services/dataService';
import { useCollaboration } from '../components/CollaborationProvider';
import { formatShortDate } from '../lib/format';

export type MetricPoint = {
  name: string;
  ctr: number;
  conv: number;
  spend: number;
};

/**
 * Shared hook that holds a single setInterval / subscription to metrics.
 * Both Performance.tsx and PerformanceChart.tsx import this instead of
 * calling dataService.subscribeToMetrics() independently.
 */
export function useMetrics(): { metrics: Metric[]; chartData: MetricPoint[] } {
  const { campaignState } = useCollaboration();
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (!campaignState.id) {
      setMetrics([]);
      return;
    }
    const unsubscribe = dataService.subscribeToMetrics(campaignState.id, (data) => {
      setMetrics(data);
    });
    return () => unsubscribe();
  }, [campaignState.id]);

  const chartData = useMemo<MetricPoint[]>(
    () =>
      metrics.map((metric) => ({
        name: formatShortDate(metric.timestamp?.toDate?.() || new Date(0)),
        ctr: metric.ctr,
        conv: metric.conv,
        spend: metric.spend,
      })),
    [metrics],
  );

  return { metrics, chartData };
}
