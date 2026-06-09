import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import {
  TrendingUp,
  Scale,
  DollarSign,
  Target,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  TrendingDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface KPICardProps {
  label: string;
  value: string;
  change: string;
  icon: React.ElementType;
  color: "emerald" | "indigo" | "amber" | "sky" | "rose";
}

interface RevenueSource {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface MonthlyForecast {
  month: string;
  value: number;
  height: number;
}

interface CohortRow {
  month: string;
  retention: number[];
}

interface SavedReport {
  id: string;
  name: string;
  date: string;
}

/* ------------------------------------------------------------------ */
/* localStorage helpers                                                */
/* ------------------------------------------------------------------ */

const LS_KEY = "sw_revenue_attribution";

function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return fallback;
}

function saveData(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* silent */ }
}

/* ------------------------------------------------------------------ */
/* Default data                                                        */
/* ------------------------------------------------------------------ */

const defaultRevenueSources: RevenueSource[] = [
  { name: "Outbound", value: 482500, percentage: 35, color: "#10b981" },
  { name: "Inbound", value: 345200, percentage: 25, color: "#6366f1" },
  { name: "Referral", value: 207120, percentage: 15, color: "#f59e0b" },
  { name: "Partner", value: 138080, percentage: 10, color: "#0ea5e9" },
  { name: "Events", value: 138080, percentage: 10, color: "#ec4899" },
  { name: "Other", value: 69020, percentage: 5, color: "#64748b" },
];

const defaultMonthlyForecast: MonthlyForecast[] = [
  { month: "Jan", value: 85000, height: 60 },
  { month: "Feb", value: 92000, height: 68 },
  { month: "Mar", value: 88000, height: 64 },
  { month: "Apr", value: 105000, height: 78 },
  { month: "May", value: 112000, height: 84 },
  { month: "Jun", value: 125000, height: 92 },
  { month: "Jul", value: 118000, height: 88 },
  { month: "Aug", value: 135000, height: 100 },
  { month: "Sep", value: 142000, height: 106 },
  { month: "Oct", value: 138000, height: 102 },
  { month: "Nov", value: 155000, height: 114 },
  { month: "Dec", value: 168000, height: 122 },
];

const defaultCohorts: CohortRow[] = [
  { month: "2024-06", retention: [100, 72, 58, 45, 38] },
  { month: "2024-07", retention: [100, 75, 61, 48, 41] },
  { month: "2024-08", retention: [100, 70, 55, 42, 35] },
  { month: "2024-09", retention: [100, 78, 65, 52, 44] },
  { month: "2024-10", retention: [100, 74, 60, 47, 40] },
  { month: "2024-11", retention: [100, 80, 68, 55, 48] },
  { month: "2024-12", retention: [100, 76, 62, 50, 43] },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function KPICard({ label, value, change, icon: Icon, color }: KPICardProps) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  const isPositive = change.startsWith("+");
  const isNegative = change.startsWith("-");

  return (
    <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`p-1 rounded-md ${colorMap[color]}`}>
          <Icon size={12} />
        </div>
      </div>
      <div className="text-lg font-bold text-slate-100">{value}</div>
      <div className="flex items-center gap-1">
        {isPositive && <ArrowUpRight size={10} className="text-emerald-400" />}
        {isNegative && !change.startsWith("-") && <ArrowDownRight size={10} className="text-rose-400" />}
        {isNegative && change.startsWith("-") && <TrendingDown size={10} className="text-emerald-400" />}
        <span className={`text-[10px] font-medium ${isPositive ? "text-emerald-400" : isNegative && change.startsWith("-") ? "text-emerald-400" : "text-rose-400"}`}>
          {change}
        </span>
        <span className="text-[10px] text-slate-600">vs last mo</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function RevenueAttribution() {
  const { state } = useApp();

  /* Derived KPI values */
  const [pipelineValue] = useState(1380800);
  const [weightedForecast] = useState(896520);
  const [avgDealSize] = useState(42500);
  const [winRate] = useState(34);
  const [salesCycle] = useState(42);

  /* Data sections */
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>(() =>
    loadData<RevenueSource[]>(`${LS_KEY}_sources`, defaultRevenueSources)
  );
  const [monthlyForecast] = useState<MonthlyForecast[]>(() =>
    loadData<MonthlyForecast[]>(`${LS_KEY}_forecast`, defaultMonthlyForecast)
  );
  const [cohorts] = useState<CohortRow[]>(() =>
    loadData<CohortRow[]>(`${LS_KEY}_cohorts`, defaultCohorts)
  );
  const [savedReports, setSavedReports] = useState<SavedReport[]>(() =>
    loadData<SavedReport[]>(`${LS_KEY}_reports`, [])
  );

  /* Persist on change */
  useEffect(() => { saveData(`${LS_KEY}_sources`, revenueSources); }, [revenueSources]);
  useEffect(() => { saveData(`${LS_KEY}_forecast`, monthlyForecast); }, [monthlyForecast]);
  useEffect(() => { saveData(`${LS_KEY}_cohorts`, cohorts); }, [cohorts]);
  useEffect(() => { saveData(`${LS_KEY}_reports`, savedReports); }, [savedReports]);

  /* Recalculate from business profile if available */
  useEffect(() => {
    if (state.businessProfile?.businessName) {
      const base = state.businessProfile.businessName.length * 15000;
      const multiplier = state.targetMarkets.length > 0 ? 1 + state.targetMarkets.length * 0.1 : 1;
      const adjusted = Math.round(base * multiplier);
      if (adjusted > 100000) {
        setRevenueSources(prev =>
          prev.map((s, i) => ({
            ...s,
            value: Math.round(adjusted * (s.percentage / 100) * (1 + i * 0.05)),
          }))
        );
      }
    }
  }, [state.businessProfile, state.targetMarkets]);

  const handleSaveReport = () => {
    const report: SavedReport = {
      id: `report-${Date.now()}`,
      name: `Revenue Attribution ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString(),
    };
    setSavedReports(prev => [report, ...prev].slice(0, 20));
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100">Revenue Attribution</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveReport}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
          >
            Save Report
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-2">
        <KPICard label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} change="+12%" icon={TrendingUp} color="emerald" />
        <KPICard label="Weighted Forecast" value={`$${weightedForecast.toLocaleString()}`} change="+8%" icon={Scale} color="indigo" />
        <KPICard label="Avg Deal Size" value={`$${avgDealSize.toLocaleString()}`} change="+5%" icon={DollarSign} color="amber" />
        <KPICard label="Win Rate" value={`${winRate}%`} change="+2%" icon={Target} color="sky" />
        <KPICard label="Sales Cycle" value={`${salesCycle} days`} change="-3" icon={Clock} color="rose" />
      </div>

      {/* Revenue by Source */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Revenue by Source
        </div>
        <div className="space-y-2">
          {revenueSources.map((src) => (
            <div key={src.name} className="flex items-center gap-3">
              <span className="w-20 text-[10px] text-slate-400 text-right">{src.name}</span>
              <div className="flex-1 h-5 rounded-md bg-white/[0.04] overflow-hidden relative">
                <div
                  className="h-full rounded-md"
                  style={{ width: `${src.percentage}%`, background: src.color }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[9px] text-slate-200">
                  ${src.value.toLocaleString()}
                </span>
              </div>
              <span className="w-10 text-[10px] text-slate-500">{src.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Forecast Chart */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Monthly Forecast
        </div>
        <div className="flex items-end gap-1 h-32">
          {monthlyForecast.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-indigo-500/30 relative"
                style={{ height: `${m.height}px` }}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 whitespace-nowrap">
                  ${(m.value / 1000).toFixed(0)}k
                </div>
              </div>
              <span className="text-[9px] text-slate-500">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attribution Funnel */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={12} className="text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Attribution Funnel
          </span>
        </div>
        <div className="space-y-3">
          {[
            { stage: "Touchpoint", leads: 12500, conv: "100%", color: "#6366f1" },
            { stage: "MQL", leads: 4200, conv: "33.6%", color: "#8b5cf6" },
            { stage: "SQL", leads: 1850, conv: "44.0%", color: "#0ea5e9" },
            { stage: "Opportunity", leads: 720, conv: "38.9%", color: "#10b981" },
            { stage: "Customer", leads: 245, conv: "34.0%", color: "#f59e0b" },
          ].map((f, _i, arr) => {
            const max = arr[0].leads;
            return (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-24 text-[10px] text-slate-400 text-right">{f.stage}</span>
                <div className="flex-1 h-6 rounded-md bg-white/[0.04] overflow-hidden relative">
                  <div
                    className="h-full rounded-md"
                    style={{ width: `${(f.leads / max) * 100}%`, background: f.color }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[9px] text-slate-200">
                    {f.leads.toLocaleString()} ({f.conv})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cohort Analysis Table */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Cohort Analysis
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-600">
                <th className="text-left py-1 pr-3">Cohort</th>
                <th className="text-center py-1 px-2">Month 0</th>
                <th className="text-center py-1 px-2">Month 1</th>
                <th className="text-center py-1 px-2">Month 2</th>
                <th className="text-center py-1 px-2">Month 3</th>
                <th className="text-center py-1 px-2">Month 4</th>
                <th className="text-center py-1 pl-2">Retention</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => {
                const finalRetention = c.retention[c.retention.length - 1];
                return (
                  <tr key={c.month} className="border-t border-white/[0.06]">
                    <td className="py-1.5 pr-3 text-slate-300 font-medium">{c.month}</td>
                    {c.retention.map((r, i) => (
                      <td
                        key={i}
                        className="py-1.5 text-center"
                        style={{ color: r > 50 ? "#10b981" : r > 20 ? "#f59e0b" : "#ef4444" }}
                      >
                        {r}%
                      </td>
                    ))}
                    <td
                      className="py-1.5 text-center font-bold"
                      style={{ color: finalRetention > 40 ? "#10b981" : finalRetention > 25 ? "#f59e0b" : "#ef4444" }}
                    >
                      {finalRetention}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Saved Reports
          </div>
          <div className="space-y-1.5">
            {savedReports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-xs text-slate-300">{r.name}</span>
                <span className="text-[10px] text-slate-600">
                  {new Date(r.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
