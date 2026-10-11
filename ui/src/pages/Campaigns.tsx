import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Loader2, AlertCircle, Inbox } from "lucide-react";
import {
  dataService,
  type Campaign,
} from "@/services/dataService";

function statusTone(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-emerald-500/10 text-emerald-600";
  if (s === "paused") return "bg-amber-500/10 text-amber-600";
  return "bg-muted text-muted-foreground";
}

export default function Campaigns() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await dataService.getCampaigns();
        if (!alive) return;
        setCampaigns(Array.isArray(c) ? c : []);
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

  const activeCount = campaigns.filter(
    (c) => (c.status || "").toLowerCase() === "active"
  ).length;
  const totalImpressions = campaigns.reduce(
    (sum, c) => sum + (Number(c.metrics?.impressions) || 0),
    0
  );
  const totalClicks = campaigns.reduce(
    (sum, c) => sum + (Number(c.metrics?.clicks) || 0),
    0
  );
  const ctr = totalImpressions
    ? Math.round((totalClicks / totalImpressions) * 1000) / 10
    : null;

  const stats = [
    { label: "Campaigns", value: loading ? "…" : String(campaigns.length), icon: <Megaphone className="w-5 h-5" /> },
    { label: "Active", value: loading ? "…" : String(activeCount), icon: <Megaphone className="w-5 h-5" /> },
    { label: "Impressions", value: loading ? "…" : totalImpressions.toLocaleString(), icon: <Megaphone className="w-5 h-5" /> },
    { label: "CTR", value: loading ? "…" : ctr === null ? "—" : `${ctr}%`, icon: <Megaphone className="w-5 h-5" /> },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your campaigns and their live performance.
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{stat.icon}</span>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && !error && campaigns.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Campaigns you create will appear here with their real impressions,
              clicks, and conversions.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {!loading &&
          campaigns.map((c) => {
            const m = c.metrics || {};
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="text-lg font-semibold truncate">{c.name}</h3>
                      <Badge className={statusTone(c.status)}>
                        {c.status || "draft"}
                      </Badge>
                    </div>
                  </div>
                  {c.goal && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {c.goal}
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xl font-semibold tabular-nums">
                        {(Number(m.impressions) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Impressions</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold tabular-nums">
                        {(Number(m.clicks) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold tabular-nums">
                        {(Number(m.conversions) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold tabular-nums">
                        {(Number(m.sent) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
