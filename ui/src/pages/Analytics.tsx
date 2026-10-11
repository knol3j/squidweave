import { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  MousePointer,
  Target,
  Loader2,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dataService,
  type Campaign,
  type Contact,
  type Opportunity,
} from "@/services/dataService";

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}

// Aggregate a numeric metric across every campaign that reports it.
function sumMetric(campaigns: Campaign[], key: string): number {
  return campaigns.reduce((sum, c) => sum + (Number(c.metrics?.[key]) || 0), 0);
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, ct, o] = await Promise.all([
          dataService.getCampaigns(),
          dataService.getContacts(),
          dataService.getOpportunities(),
        ]);
        if (!alive) return;
        setCampaigns(Array.isArray(c) ? c : []);
        setContacts(Array.isArray(ct) ? ct : []);
        setOpportunities(Array.isArray(o) ? o : []);
      } catch (e: unknown) {
        if (!alive) return;
        const status = (e as { status?: number })?.status;
        setError(
          status === 401 || status === 503
            ? "The backend rejected the request (missing or invalid credentials). Sign in again and reload."
            : "Could not reach the SquidWeave backend. Check that it is running and reachable."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Everything below is derived from real campaign/contact/opportunity data.
  const sent = sumMetric(campaigns, "sent");
  const opened = sumMetric(campaigns, "opened");
  const clicked = sumMetric(campaigns, "clicks");
  const replied = sumMetric(campaigns, "replied");
  const conversions = sumMetric(campaigns, "conversions");
  const impressions = sumMetric(campaigns, "impressions");

  const openOpps = opportunities.filter(
    (o) => (o.status || "").toLowerCase() === "open"
  );
  const wonOpps = opportunities.filter(
    (o) => (o.status || "").toLowerCase() === "won"
  );
  const pipelineValue = openOpps.reduce(
    (sum, o) => sum + (Number(o.monetaryValue) || 0),
    0
  );
  const wonValue = wonOpps.reduce(
    (sum, o) => sum + (Number(o.monetaryValue) || 0),
    0
  );

  // Rates are only meaningful when there's activity to divide by.
  const openRate = sent ? Math.round((opened / sent) * 1000) / 10 : null;
  const replyRate = sent ? Math.round((replied / sent) * 1000) / 10 : null;
  const clickRate = impressions
    ? Math.round((clicked / impressions) * 1000) / 10
    : null;

  const hasAnyData =
    campaigns.length > 0 || contacts.length > 0 || opportunities.length > 0;

  const stats: Stat[] = [
    { label: "Contacts", value: loading ? "…" : String(contacts.length), icon: <Users className="w-5 h-5" /> },
    { label: "Campaigns", value: loading ? "…" : String(campaigns.length), icon: <BarChart3 className="w-5 h-5" /> },
    { label: "Messages sent", value: loading ? "…" : sent.toLocaleString(), icon: <BarChart3 className="w-5 h-5" />, hint: "Across all campaigns" },
    { label: "Impressions", value: loading ? "…" : impressions.toLocaleString(), icon: <MousePointer className="w-5 h-5" /> },
    { label: "Clicks", value: loading ? "…" : clicked.toLocaleString(), icon: <MousePointer className="w-5 h-5" /> },
    { label: "Replies", value: loading ? "…" : replied.toLocaleString(), icon: <MousePointer className="w-5 h-5" /> },
    { label: "Conversions", value: loading ? "…" : conversions.toLocaleString(), icon: <Target className="w-5 h-5" /> },
    { label: "Open pipeline", value: loading ? "…" : `$${pipelineValue.toLocaleString()}`, icon: <Target className="w-5 h-5" />, hint: `${openOpps.length} open` },
    { label: "Won revenue", value: loading ? "…" : `$${wonValue.toLocaleString()}`, icon: <Target className="w-5 h-5" />, hint: `${wonOpps.length} won` },
  ];

  const rates = [
    { label: "Open rate", value: openRate, base: "of messages sent" },
    { label: "Reply rate", value: replyRate, base: "of messages sent" },
    { label: "Click-through", value: clickRate, base: "of impressions" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Performance derived from your campaigns, contacts, and pipeline.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">Backend unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !hasAnyData && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Analytics populate as you create campaigns and contacts. There's
              nothing to report yet — start a campaign to see real numbers here.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{stat.icon}</span>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
                {stat.hint && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.hint}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement rates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : rates.every((r) => r.value === null) ? (
            <p className="text-sm text-muted-foreground py-4">
              Rates appear once campaigns record sends, opens, or impressions.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rates.map((r) => (
                <div key={r.label} className="p-4 rounded-lg border">
                  <p className="text-2xl font-semibold tabular-nums">
                    {r.value === null ? "—" : `${r.value}%`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.base}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
