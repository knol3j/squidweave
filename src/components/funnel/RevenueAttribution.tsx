import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  Table,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface RevenueSource {
  id: string;
  name: string;
  category: string;
  amount: number;
  previousAmount: number;
  attribution: "direct" | "outbound" | "inbound" | "organic" | "partnership" | "other";
  campaignId?: string;
  date: string;
}

interface MonthlyForecast {
  month: string;
  revenue: number;
  expenses: number;
  pipeline: number;
  probability: number;
}

interface CohortData {
  cohort: string;
  month0: number;
  month1: number;
  month3: number;
  month6: number;
  month12: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function pctChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

const ATTRIBUTION_COLORS: Record<string, string> = {
  direct: "#6366f1",
  outbound: "#f43f5e",
  inbound: "#10b981",
  organic: "#f59e0b",
  partnership: "#8b5cf6",
  other: "#475569",
};

const ATTRIBUTION_LABELS: Record<string, string> = {
  direct: "Direct",
  outbound: "Outbound",
  inbound: "Inbound",
  organic: "Organic",
  partnership: "Partnership",
  other: "Other",
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export default function RevenueAttribution() {
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [attributionFilter, setAttributionFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"sources" | "forecast" | "cohorts">("sources");

  /* All data arrays are empty — no hardcoded fake data.
     In production, these would be populated from real API responses.  */
  const sources: RevenueSource[] = [];
  const monthlyForecast: MonthlyForecast[] = [];
  const cohorts: CohortData[] = [];

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (attributionFilter !== "all" && s.attribution !== attributionFilter) return false;
      return true;
    });
  }, [sources, categoryFilter, attributionFilter]);

  const totalRevenue = useMemo(
    () => filteredSources.reduce((acc, s) => acc + s.amount, 0),
    [filteredSources]
  );
  const totalPrevious = useMemo(
    () => filteredSources.reduce((acc, s) => acc + s.previousAmount, 0),
    [filteredSources]
  );
  const totalChange = pctChange(totalRevenue, totalPrevious);

  const attributionBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of filteredSources) {
      map[s.attribution] = (map[s.attribution] || 0) + s.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredSources]);

  const categories = useMemo(
    () => Array.from(new Set(sources.map((s) => s.category))).sort(),
    [sources]
  );

  /* Export */
  const handleExport = () => {
    const csv = [
      "Name,Category,Attribution,Amount,Previous Amount,Date",
      ...filteredSources.map(
        (s) =>
          `"${s.name}","${s.category}","${s.attribution}",${s.amount},${s.previousAmount},${s.date}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-attribution-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Revenue Attribution</h2>
            <p className="text-[11px] text-slate-500">
              {sources.length === 0
                ? "No revenue data connected"
                : `${filteredSources.length} sources &middot; ${formatCurrency(totalRevenue)} total`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg border border-white/[0.06] p-0.5">
            {[
              { key: "sources", label: "Sources", icon: PieChart },
              { key: "forecast", label: "Forecast", icon: BarChart3 },
              { key: "cohorts", label: "Cohorts", icon: Table },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key as any)}
                className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  viewMode === v.key
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <v.icon className="w-3 h-3" />
                {v.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={filteredSources.length === 0}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors disabled:opacity-30"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-3 h-3 text-slate-600" />
        {["7d", "30d", "90d", "1y", "all"].map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`text-[10px] px-2.5 py-1 rounded-md font-medium border transition-all ${
              timeRange === r
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
            }`}
          >
            {r === "all" ? "All Time" : r}
          </button>
        ))}

        <div className="w-px h-4 bg-white/[0.06] mx-1" />

        <Filter className="w-3 h-3 text-slate-600" />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-[10px] px-2 py-1 rounded-md border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-emerald-500/30"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={attributionFilter}
          onChange={(e) => setAttributionFilter(e.target.value)}
          className="text-[10px] px-2 py-1 rounded-md border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-emerald-500/30"
        >
          <option value="all">All Attribution</option>
          {Object.entries(ATTRIBUTION_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Empty State — no hardcoded data */}
      {sources.length === 0 && (
        <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
          <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-xs text-slate-500 mb-2 font-medium">
            No revenue attribution data available.
          </p>
          <p className="text-[11px] text-slate-600 max-w-md mx-auto mb-4">
            Connect your CRM, payment processor, or accounting system to track
            revenue by source. Supported integrations include Stripe, HubSpot,
            Salesforce, and QuickBooks.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Stripe", "HubSpot", "Salesforce", "QuickBooks", "Chargebee"].map(
              (name) => (
                <span
                  key={name}
                  className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  {name}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* ====== SOURCES VIEW ====== */}
      {viewMode === "sources" && sources.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Total Revenue
                </span>
                <TrendIcon value={totalChange} />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {formatCurrency(totalRevenue)}
              </div>
              <div
                className={`text-[10px] font-medium mt-0.5 ${
                  totalChange >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {totalChange >= 0 ? "+" : ""}
                {totalChange.toFixed(1)}% vs previous period
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Avg Deal Size
                </span>
                <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {formatCurrency(
                  filteredSources.length
                    ? totalRevenue / filteredSources.length
                    : 0
                )}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {filteredSources.length} sources
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Top Channel
                </span>
                <PieChart className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {attributionBreakdown.length
                  ? ATTRIBUTION_LABELS[attributionBreakdown[0][0]] || "—"
                  : "—"}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {attributionBreakdown.length
                  ? formatCurrency(attributionBreakdown[0][1])
                  : "$0"}
              </div>
            </div>
          </div>

          {/* Attribution Breakdown */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-xs font-semibold text-slate-200 mb-3">
              Attribution Breakdown
            </h3>
            {attributionBreakdown.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-600">
                No attribution data for current filters.
              </div>
            ) : (
              <div className="space-y-2">
                {attributionBreakdown.map(([attr, amount]) => {
                  const pct =
                    totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                  return (
                    <div key={attr}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">
                          {ATTRIBUTION_LABELS[attr] || attr}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatCurrency(amount)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background:
                              ATTRIBUTION_COLORS[attr] || "#475569",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sources Table */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Attribution
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-xs text-slate-600"
                    >
                      No sources match your filters.
                    </td>
                  </tr>
                )}
                {filteredSources.map((s) => {
                  const change = pctChange(s.amount, s.previousAmount);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium text-slate-200">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {s.date}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                          {s.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: `${ATTRIBUTION_COLORS[s.attribution]}18`,
                            color: ATTRIBUTION_COLORS[s.attribution],
                          }}
                        >
                          {ATTRIBUTION_LABELS[s.attribution]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-200">
                        {formatCurrency(s.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={`text-[10px] font-medium ${
                            change >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== FORECAST VIEW ====== */}
      {viewMode === "forecast" && sources.length > 0 && (
        <>
          {monthlyForecast.length === 0 ? (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 mb-2 font-medium">
                No forecast data available.
              </p>
              <p className="text-[11px] text-slate-600 max-w-md mx-auto">
                Forecast data requires a connected CRM with pipeline tracking.
                Connect Salesforce or HubSpot to generate revenue forecasts.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Revenue
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Expenses
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Net
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Pipeline
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Win %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyForecast.map((m) => (
                    <tr
                      key={m.month}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-200">
                        {m.month}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-emerald-400 text-right font-medium">
                        {formatCurrency(m.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-rose-400 text-right">
                        {formatCurrency(m.expenses)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-200 text-right font-medium">
                        {formatCurrency(m.revenue - m.expenses)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-sky-400 text-right">
                        {formatCurrency(m.pipeline)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                          {m.probability}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ====== COHORTS VIEW ====== */}
      {viewMode === "cohorts" && sources.length > 0 && (
        <>
          {cohorts.length === 0 ? (
            <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 mb-2 font-medium">
                No cohort data available.
              </p>
              <p className="text-[11px] text-slate-600 max-w-md mx-auto">
                Cohort analysis requires subscription/payment data. Connect
                Stripe or Chargebee to analyze customer retention by cohort.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Cohort
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      M0
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      M1
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      M3
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      M6
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                      M12
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr
                      key={c.cohort}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-200 font-medium">
                        {c.cohort}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 text-right">
                        {c.month0}%
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 text-right">
                        {c.month1}%
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 text-right">
                        {c.month3}%
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 text-right">
                        {c.month6}%
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 text-right">
                        {c.month12}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
