import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  FileText,
  Calendar,
  Save,
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  Target,
  Layers,
  Zap,
  Globe,
  Clock,
  Check,
  Trash2,
  Eye,
  ArrowLeft,
  FileSpreadsheet,
  FileIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultMetrics: string[];
}

interface DateRange {
  label: string;
  days: number;
}

interface SavedReport {
  id: string;
  name: string;
  templateId: string;
  dateRange: string;
  metrics: string[];
  createdAt: string;
}

interface ReportMetric {
  id: string;
  label: string;
  category: string;
  value: string | number;
  change?: string;
}

interface ChartBar {
  label: string;
  value: number;
  height: number;
  color?: string;
}

interface ReportTableRow {
  [key: string]: string | number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const LS_KEY = "sw_custom_reports";

function loadData<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch { /* silent */ }
  return fallback;
}
function saveData(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* silent */ }
}

const TEMPLATES: ReportTemplate[] = [
  { id: "pipeline", name: "Pipeline Summary", description: "Full pipeline overview with stage breakdown", icon: BarChart3, color: "#6366f1", defaultMetrics: ["pipeline-value", "deals-count", "avg-deal-size", "win-rate", "conversion-rate"] },
  { id: "email", name: "Email Performance", description: "Open rates, clicks, bounces, replies", icon: Mail, color: "#0ea5e9", defaultMetrics: ["emails-sent", "open-rate", "click-rate", "reply-rate", "bounce-rate"] },
  { id: "prospect", name: "Prospect Quality", description: "Lead scoring and qualification metrics", icon: Users, color: "#10b981", defaultMetrics: ["total-prospects", "qualified-leads", "mql-count", "sql-count", "qualification-rate"] },
  { id: "revenue", name: "Revenue Forecast", description: "Weighted forecast and revenue trends", icon: TrendingUp, color: "#f59e0b", defaultMetrics: ["forecast-value", "closed-won", "closed-lost", "avg-sales-cycle", "pipeline-coverage"] },
  { id: "engagement", name: "Engagement Analytics", description: "Touchpoint and interaction analysis", icon: Zap, color: "#ec4899", defaultMetrics: ["total-touchpoints", "calls-made", "emails-opened", "meetings-booked", "response-time"] },
  { id: "conversion", name: "Conversion Funnel", description: "Stage-to-stage conversion analysis", icon: Layers, color: "#8b5cf6", defaultMetrics: ["funnel-mql", "funnel-sql", "funnel-opp", "funnel-won", "stage-conversion"] },
  { id: "territory", name: "Territory Performance", description: "Geographic and segment breakdown", icon: Globe, color: "#06b6d4", defaultMetrics: ["deals-by-region", "revenue-by-territory", "top-territories", "territory-penetration"] },
  { id: "activity", name: "Activity Report", description: "Team activity and productivity metrics", icon: Clock, color: "#f43f5e", defaultMetrics: ["activities-logged", "calls-per-rep", "emails-per-rep", "meetings-held", "follow-up-rate"] },
  { id: "campaign", name: "Campaign Performance", description: "Campaign ROI and effectiveness", icon: Target, color: "#84cc16", defaultMetrics: ["campaigns-run", "campaign-roi", "cost-per-lead", "cost-per-opp", "attributed-revenue"] },
  { id: "custom", name: "Custom Report", description: "Build your own report from scratch", icon: FileText, color: "#64748b", defaultMetrics: [] },
];

const DATE_RANGES: DateRange[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
];

const ALL_METRICS: ReportMetric[] = [
  { id: "pipeline-value", label: "Pipeline Value", category: "Pipeline", value: "$1,380,800", change: "+12%" },
  { id: "deals-count", label: "Total Deals", category: "Pipeline", value: 324, change: "+8%" },
  { id: "avg-deal-size", label: "Avg Deal Size", category: "Pipeline", value: "$42,500", change: "+5%" },
  { id: "win-rate", label: "Win Rate", category: "Pipeline", value: "34%", change: "+2%" },
  { id: "conversion-rate", label: "Conversion Rate", category: "Pipeline", value: "18.5%", change: "+1.2%" },
  { id: "emails-sent", label: "Emails Sent", category: "Email", value: 12540, change: "+22%" },
  { id: "open-rate", label: "Open Rate", category: "Email", value: "42.3%", change: "+3.1%" },
  { id: "click-rate", label: "Click Rate", category: "Email", value: "12.8%", change: "+1.5%" },
  { id: "reply-rate", label: "Reply Rate", category: "Email", value: "8.4%", change: "+0.8%" },
  { id: "bounce-rate", label: "Bounce Rate", category: "Email", value: "3.2%", change: "-0.5%" },
  { id: "total-prospects", label: "Total Prospects", category: "Prospect", value: 8750, change: "+15%" },
  { id: "qualified-leads", label: "Qualified Leads", category: "Prospect", value: 2180, change: "+10%" },
  { id: "mql-count", label: "MQLs", category: "Prospect", value: 1245, change: "+7%" },
  { id: "sql-count", label: "SQLs", category: "Prospect", value: 420, change: "+5%" },
  { id: "qualification-rate", label: "Qualification Rate", category: "Prospect", value: "24.9%", change: "+1.8%" },
  { id: "forecast-value", label: "Forecast Value", category: "Revenue", value: "$896,520", change: "+8%" },
  { id: "closed-won", label: "Closed Won", category: "Revenue", value: "$485,200", change: "+14%" },
  { id: "closed-lost", label: "Closed Lost", category: "Revenue", value: "$207,100", change: "-2%" },
  { id: "avg-sales-cycle", label: "Avg Sales Cycle", category: "Revenue", value: "42 days", change: "-3" },
  { id: "pipeline-coverage", label: "Pipeline Coverage", category: "Revenue", value: "2.8x", change: "+0.2x" },
  { id: "total-touchpoints", label: "Total Touchpoints", category: "Engagement", value: 45200, change: "+18%" },
  { id: "calls-made", label: "Calls Made", category: "Engagement", value: 3840, change: "+12%" },
  { id: "emails-opened", label: "Emails Opened", category: "Engagement", value: 5300, change: "+16%" },
  { id: "meetings-booked", label: "Meetings Booked", category: "Engagement", value: 486, change: "+9%" },
  { id: "response-time", label: "Avg Response Time", category: "Engagement", value: "4.2 hrs", change: "-0.8hrs" },
  { id: "funnel-mql", label: "MQL Volume", category: "Conversion", value: 1245, change: "+7%" },
  { id: "funnel-sql", label: "SQL Volume", category: "Conversion", value: 420, change: "+5%" },
  { id: "funnel-opp", label: "Opportunities", category: "Conversion", value: 198, change: "+4%" },
  { id: "funnel-won", label: "Closed Won", category: "Conversion", value: 67, change: "+6%" },
  { id: "stage-conversion", label: "Stage Conversion", category: "Conversion", value: "5.4%", change: "+0.3%" },
  { id: "deals-by-region", label: "Deals by Region", category: "Territory", value: "NA: 45%", change: "" },
  { id: "revenue-by-territory", label: "Revenue by Territory", category: "Territory", value: "$621k NA", change: "+15%" },
  { id: "top-territories", label: "Top Territory", category: "Territory", value: "West Coast", change: "" },
  { id: "territory-penetration", label: "Territory Penetration", category: "Territory", value: "23%", change: "+4%" },
  { id: "activities-logged", label: "Activities Logged", category: "Activity", value: 12480, change: "+20%" },
  { id: "calls-per-rep", label: "Calls per Rep", category: "Activity", value: 128, change: "+12%" },
  { id: "emails-per-rep", label: "Emails per Rep", category: "Activity", value: 420, change: "+8%" },
  { id: "meetings-held", label: "Meetings Held", category: "Activity", value: 342, change: "+6%" },
  { id: "follow-up-rate", label: "Follow-up Rate", category: "Activity", value: "78%", change: "+5%" },
  { id: "campaigns-run", label: "Campaigns Run", category: "Campaign", value: 24, change: "+4" },
  { id: "campaign-roi", label: "Campaign ROI", category: "Campaign", value: "312%", change: "+18%" },
  { id: "cost-per-lead", label: "Cost per Lead", category: "Campaign", value: "$42", change: "-8%" },
  { id: "cost-per-opp", label: "Cost per Opp", category: "Campaign", value: "$285", change: "-12%" },
  { id: "attributed-revenue", label: "Attributed Revenue", category: "Campaign", value: "$648k", change: "+22%" },
];

/* ------------------------------------------------------------------ */
/* Generate chart data for reports                                     */
/* ------------------------------------------------------------------ */

function generateChartData(templateId: string): ChartBar[] {
  switch (templateId) {
    case "pipeline":
      return [
        { label: "Prospect", value: 8750, height: 100, color: "#6366f1" },
        { label: "MQL", value: 1245, height: 70, color: "#8b5cf6" },
        { label: "SQL", value: 420, height: 50, color: "#0ea5e9" },
        { label: "Opp", value: 198, height: 35, color: "#10b981" },
        { label: "Won", value: 67, height: 20, color: "#f59e0b" },
      ];
    case "email":
      return [
        { label: "Sent", value: 12540, height: 100, color: "#0ea5e9" },
        { label: "Deliv", value: 12140, height: 95, color: "#6366f1" },
        { label: "Open", value: 5300, height: 65, color: "#8b5cf6" },
        { label: "Click", value: 1605, height: 40, color: "#10b981" },
        { label: "Reply", value: 1053, height: 30, color: "#f59e0b" },
      ];
    case "revenue":
      return [
        { label: "Q1", value: 320000, height: 55, color: "#f59e0b" },
        { label: "Q2", value: 485000, height: 75, color: "#f59e0b" },
        { label: "Q3", value: 610000, height: 90, color: "#f59e0b" },
        { label: "Q4", value: 896520, height: 100, color: "#f59e0b" },
      ];
    case "engagement":
      return [
        { label: "Email", value: 12540, height: 100, color: "#ec4899" },
        { label: "Call", value: 3840, height: 45, color: "#ec4899" },
        { label: "LI", value: 2100, height: 30, color: "#ec4899" },
        { label: "Meet", value: 486, height: 15, color: "#ec4899" },
        { label: "SMS", value: 120, height: 8, color: "#ec4899" },
      ];
    default:
      return [
        { label: "W1", value: 85, height: 65, color: "#6366f1" },
        { label: "W2", value: 92, height: 72, color: "#6366f1" },
        { label: "W3", value: 78, height: 58, color: "#6366f1" },
        { label: "W4", value: 105, height: 85, color: "#6366f1" },
        { label: "W5", value: 88, height: 68, color: "#6366f1" },
        { label: "W6", value: 95, height: 78, color: "#6366f1" },
      ];
  }
}

function generateTableData(templateId: string): ReportTableRow[] {
  switch (templateId) {
    case "pipeline":
      return [
        { stage: "Prospect", count: 8750, value: "$0", probability: "0%" },
        { stage: "MQL", count: 1245, value: "$0", probability: "10%" },
        { stage: "SQL", count: 420, value: "$890,000", probability: "25%" },
        { stage: "Opportunity", count: 198, value: "$1,380,800", probability: "35%" },
        { stage: "Proposal", count: 89, value: "$925,000", probability: "65%" },
        { stage: "Negotiation", count: 45, value: "$485,200", probability: "85%" },
        { stage: "Closed Won", count: 67, value: "$485,200", probability: "100%" },
      ];
    case "email":
      return [
        { template: "Intro v1", sent: 4200, open: "44.2%", click: "14.1%", reply: "9.8%" },
        { template: "Intro v2", sent: 3800, open: "41.5%", click: "12.8%", reply: "8.2%" },
        { template: "Follow-up", sent: 2100, open: "38.9%", click: "10.5%", reply: "6.4%" },
        { template: "Case Study", sent: 1240, open: "52.1%", click: "18.3%", reply: "12.1%" },
        { template: "Breakup", sent: 1200, open: "35.2%", click: "8.9%", reply: "5.1%" },
      ];
    case "territory":
      return [
        { territory: "North America", deals: 142, revenue: "$621,000", penetration: "28%", growth: "+15%" },
        { territory: "EMEA", deals: 68, revenue: "$285,400", penetration: "18%", growth: "+8%" },
        { territory: "APAC", deals: 34, revenue: "$148,200", penetration: "12%", growth: "+22%" },
        { territory: "LATAM", deals: 18, revenue: "$72,800", penetration: "8%", growth: "+5%" },
      ];
    default:
      return [
        { metric: "Activity", current: "1,248", previous: "1,040", change: "+20%" },
        { metric: "Engagement", current: "42.3%", previous: "39.2%", change: "+3.1%" },
        { metric: "Conversion", current: "18.5%", previous: "17.3%", change: "+1.2%" },
        { metric: "Velocity", current: "42 days", previous: "45 days", change: "-3 days" },
        { metric: "Win Rate", current: "34%", previous: "32%", change: "+2%" },
      ];
  }
}

/* ------------------------------------------------------------------ */
/* Export helpers                                                      */
/* ------------------------------------------------------------------ */

function toCSV(rows: ReportTableRow[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const lines = rows.map(row => keys.map(k => {
    const cell = String(row[k]).replace(/"/g, '""');
    return `"${cell}"`;
  }).join(","));
  return [header, ...lines].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function CustomReports() {
  useApp();

  const [savedReports, setSavedReports] = useState<SavedReport[]>(() =>
    loadData<SavedReport[]>(`${LS_KEY}_library`, [])
  );
  const [view, setView] = useState<"gallery" | "builder" | "report">("gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(DATE_RANGES[1]);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [generatedReport, setGeneratedReport] = useState<{
    template: ReportTemplate;
    dateRange: DateRange;
    metrics: ReportMetric[];
    chartData: ChartBar[];
    tableData: ReportTableRow[];
  } | null>(null);

  useEffect(() => { saveData(`${LS_KEY}_library`, savedReports); }, [savedReports]);

  const categories = ["All", ...Array.from(new Set(ALL_METRICS.map(m => m.category)))];

  const filteredMetrics = activeCategory === "All"
    ? ALL_METRICS
    : ALL_METRICS.filter(m => m.category === activeCategory);

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setSelectedMetrics(new Set(template.defaultMetrics));
    setView("builder");
  };

  const handleToggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metricId)) next.delete(metricId);
      else next.add(metricId);
      return next;
    });
  };

  const handleGenerateReport = useCallback(() => {
    if (!selectedTemplate || selectedMetrics.size === 0) return;
    const metrics = ALL_METRICS.filter(m => selectedMetrics.has(m.id));
    const chartData = generateChartData(selectedTemplate.id);
    const tableData = generateTableData(selectedTemplate.id);
    setGeneratedReport({ template: selectedTemplate, dateRange: selectedDateRange, metrics, chartData, tableData });
    setView("report");
  }, [selectedTemplate, selectedMetrics, selectedDateRange]);

  const handleExport = (format: "csv" | "pdf") => {
    if (!generatedReport) return;
    setTimeout(() => {
      const todayStr = new Date().toISOString().split("T")[0];
      const tmplName = generatedReport.template.name;
      if (format === "csv") {
        const csv = toCSV(generatedReport.tableData);
        downloadFile(csv, tmplName + "_" + todayStr + ".csv", "text/csv");
      } else {
        const metricLines = generatedReport.metrics.map(m => m.label + ": " + m.value + " " + (m.change || "")).join("\n");
        const content = tmplName + "\nGenerated: " + new Date().toLocaleString() + "\nDate Range: " + generatedReport.dateRange.label + "\n\n" + metricLines;
        downloadFile(content, tmplName + "_" + todayStr + ".txt", "text/plain");
      }
    }, 300);
  };

  const handleSaveReport = () => {
    if (!generatedReport) return;
    const report: SavedReport = {
      id: `report-${Date.now()}`,
      name: `${generatedReport.template.name} - ${generatedReport.dateRange.label}`,
      templateId: generatedReport.template.id,
      dateRange: generatedReport.dateRange.label,
      metrics: Array.from(selectedMetrics),
      createdAt: new Date().toISOString(),
    };
    setSavedReports(prev => [report, ...prev].slice(0, 50));
  };

  const handleDeleteSaved = (id: string) => {
    setSavedReports(prev => prev.filter(r => r.id !== id));
  };

  const handleLoadSaved = (report: SavedReport) => {
    const template = TEMPLATES.find(t => t.id === report.templateId) || TEMPLATES[0];
    const dr = DATE_RANGES.find(d => d.label === report.dateRange) || DATE_RANGES[1];
    setSelectedTemplate(template);
    setSelectedDateRange(dr);
    setSelectedMetrics(new Set(report.metrics));
    const metrics = ALL_METRICS.filter(m => report.metrics.includes(m.id));
    const chartData = generateChartData(template.id);
    const tableData = generateTableData(template.id);
    setGeneratedReport({ template, dateRange: dr, metrics, chartData, tableData });
    setView("report");
  };

  /* ---------- View: Generated Report ---------- */
  if (view === "report" && generatedReport) {
    const { template, dateRange, metrics, chartData, tableData } = generatedReport;
    const tableKeys = tableData.length > 0 ? Object.keys(tableData[0]) : [];

    return (
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("gallery")}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${template.color}20` }}>
              <template.icon size={16} style={{ color: template.color }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{template.name}</h2>
              <p className="text-[10px] text-slate-500">{dateRange.label} &middot; {metrics.length} metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.03] text-slate-300 border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
            >
              <FileSpreadsheet size={10} /> CSV
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.03] text-slate-300 border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
            >
              <FileIcon size={10} /> PDF
            </button>
            <button
              onClick={handleSaveReport}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
            >
              <Save size={10} /> Save
            </button>
          </div>
        </div>

        {/* Selected Metrics */}
        <div className="grid grid-cols-5 gap-2">
          {metrics.map(m => (
            <div key={m.id} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{m.label}</div>
              <div className="text-base font-bold text-slate-100">{m.value}</div>
              {m.change && (
                <span className={`text-[10px] font-medium ${m.change.startsWith("+") ? "text-emerald-400" : m.change.startsWith("-") ? "text-rose-400" : "text-slate-600"}`}>
                  {m.change}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            {template.name} Overview
          </div>
          <div className="flex items-end gap-2 h-36">
            {chartData.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-[9px] text-slate-500">{typeof bar.value === "number" && bar.value > 1000 ? `${(bar.value / 1000).toFixed(0)}k` : bar.value}</div>
                <div className="w-full flex justify-center">
                  <div
                    className="w-8 rounded-t-md"
                    style={{ height: `${bar.height}px`, backgroundColor: bar.color || "#6366f1", opacity: 0.6 }}
                  />
                </div>
                <span className="text-[9px] text-slate-500">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Detailed Data
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-600 border-b border-white/[0.06]">
                  {tableKeys.map(k => (
                    <th key={k} className="text-left py-2 px-2 capitalize">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={i} className="border-t border-white/[0.06]">
                    {tableKeys.map(k => (
                      <td key={k} className="py-2 px-2 text-slate-300">{row[k]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- View: Builder ---------- */
  if (view === "builder" && selectedTemplate) {
    return (
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("gallery")}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedTemplate.color}20` }}>
              <selectedTemplate.icon size={16} style={{ color: selectedTemplate.color }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{selectedTemplate.name}</h2>
              <p className="text-[10px] text-slate-500">{selectedTemplate.description}</p>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={12} className="text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Date Range</span>
          </div>
          <div className="flex items-center gap-2">
            {DATE_RANGES.map(dr => (
              <button
                key={dr.label}
                onClick={() => setSelectedDateRange(dr)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                  selectedDateRange.label === dr.label
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/20"
                    : "bg-white/[0.02] text-slate-500 border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-300"
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Picker */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Check size={12} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Metrics</span>
            </div>
            <span className="text-[10px] text-slate-600">{selectedMetrics.size} selected</span>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-white/[0.06] text-slate-200"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {filteredMetrics.map(m => (
              <button
                key={m.id}
                onClick={() => handleToggleMetric(m.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  selectedMetrics.has(m.id)
                    ? "bg-indigo-500/10 border-indigo-500/20"
                    : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]"
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                  selectedMetrics.has(m.id)
                    ? "bg-indigo-500 border-indigo-500"
                    : "border-slate-600"
                }`}>
                  {selectedMetrics.has(m.id) && <Check size={10} className="text-white" />}
                </div>
                <div>
                  <p className={`text-[10px] font-medium ${selectedMetrics.has(m.id) ? "text-indigo-300" : "text-slate-400"}`}>{m.label}</p>
                  <p className="text-[9px] text-slate-600">{m.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateReport}
          disabled={selectedMetrics.size === 0}
          className="w-full py-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Generate Report ({selectedMetrics.size} metrics)
        </button>
      </div>
    );
  }

  /* ---------- View: Gallery (default) ---------- */
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100">Report Builder</h2>
        </div>
      </div>

      {/* Templates */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Report Templates
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-left hover:border-white/[0.10] hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${template.color}15` }}
                >
                  <template.icon size={16} style={{ color: template.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">{template.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{template.description}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[9px] text-slate-700">{template.defaultMetrics.length} metrics</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Reports Library */}
      {savedReports.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Save size={12} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Saved Reports</span>
            </div>
            <span className="text-[10px] text-slate-600">{savedReports.length} reports</span>
          </div>
          <div className="space-y-1.5">
            {savedReports.map(report => {
              const tmpl = TEMPLATES.find(t => t.id === report.templateId);
              return (
                <div
                  key={report.id}
                  className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                >
                  {tmpl && (
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${tmpl.color}15` }}>
                      <tmpl.icon size={12} style={{ color: tmpl.color }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{report.name}</p>
                    <p className="text-[10px] text-slate-600">{report.metrics.length} metrics &middot; {new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleLoadSaved(report)}
                    className="p-1.5 rounded-md text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteSaved(report.id)}
                    className="p-1.5 rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
