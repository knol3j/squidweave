import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  MousePointerClick,
  MessageSquare,
  Calendar,
  DollarSign,
  Loader2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function AnalyticsCommand() {
  const state = useApp();
  const { outreach, analyticsEvents, campaigns } = state;

  const stats = useMemo(() => {
    const allOutreach = outreach || [];
    const allEvents = analyticsEvents || [];

    const sent = allOutreach.filter((e: any) => e.type === "sent").length;
    const opened = allOutreach.filter((e: any) => e.type === "opened").length;
    const replied = allOutreach.filter((e: any) => e.type === "replied").length;
    const bounced = allOutreach.filter((e: any) => e.type === "bounced").length;
    const meetings = allOutreach.filter((e: any) => e.type === "meeting").length;
    const totalCount = allOutreach.length;

    const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "—";
    const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "—";
    const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "—";

    return {
      sent,
      opened,
      replied,
      bounced,
      meetings,
      totalCount,
      openRate,
      replyRate,
      bounceRate,
    };
  }, [outreach, analyticsEvents]);

  const kpiCards = useMemo(() => {
    return [
      {
        label: "Open Rate",
        value: `${stats.openRate}%`,
        icon: Mail,
        color: "#6366f1",
      },
      {
        label: "Reply Rate",
        value: `${stats.replyRate}%`,
        icon: MessageSquare,
        color: "#8b5cf6",
      },
      {
        label: "Meetings Booked",
        value: stats.meetings,
        icon: Calendar,
        color: "#10b981",
      },
      {
        label: "Total Outreach",
        value: stats.totalCount,
        icon: BarChart3,
        color: "#f59e0b",
      },
    ];
  }, [stats]);

  const campaignsList = campaigns || [];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="p-3 rounded-xl border border-white/[0.06] bg-[#0f172a]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.color}15` }}
              >
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              </div>
              <span className="text-[10px] text-slate-600">{kpi.label}</span>
            </div>
            <div className="text-lg font-semibold text-slate-100">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign Breakdown */}
      {campaignsList.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0f172a]">
          <h4 className="text-xs font-semibold text-slate-200 mb-3">
            Campaign Performance
          </h4>
          <div className="space-y-2">
            {campaignsList.map((c: any) => (
              <div
                key={c.id || c.name}
                className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-xs text-slate-200">
                    {c.name || "Unnamed"}
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] text-slate-600">
                  <span>
                    Sent: <span className="text-slate-400">{c.sent || 0}</span>
                  </span>
                  <span>
                    Opened:{" "}
                    <span className="text-slate-400">{c.opened || 0}</span>
                  </span>
                  <span>
                    Replied:{" "}
                    <span className="text-slate-400">{c.replied || 0}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events */}
      {outreach.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0f172a]">
          <h4 className="text-xs font-semibold text-slate-200 mb-3">
            Recent Outreach Events
          </h4>
          <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
            {outreach.slice(0, 30).map((e: any, i: number) => (
              <div
                key={e.id || i}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/[0.02]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background:
                      e.type === "sent"
                        ? "#6366f1"
                        : e.type === "opened"
                          ? "#10b981"
                          : e.type === "replied"
                            ? "#8b5cf6"
                            : e.type === "bounced"
                              ? "#f43f5e"
                              : "#475569",
                  }}
                />
                <span className="text-[10px] capitalize text-slate-400 min-w-[50px]">
                  {e.type}
                </span>
                <span className="text-[10px] flex-1 truncate text-slate-500">
                  {e.targetId || "—"}
                </span>
                <span className="text-[10px] text-slate-700">
                  {e.timestamp
                    ? new Date(e.timestamp).toLocaleTimeString()
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalCount === 0 && campaignsList.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-[#0a121f]">
          <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No analytics data yet.</p>
          <p className="text-[10px] text-slate-600 mt-1">
            Run outreach campaigns to generate real performance metrics.
          </p>
        </div>
      )}
    </div>
  );
}
