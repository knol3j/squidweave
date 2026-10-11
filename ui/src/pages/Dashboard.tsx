import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Users,
  Megaphone,
  Target,
  BarChart3,
  ArrowRight,
  Loader2,
  AlertCircle,
  Inbox,
} from "lucide-react";
import {
  dataService,
  type Campaign,
  type Contact,
  type Opportunity,
} from "@/services/dataService";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

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
        if (status === 401 || status === 503) {
          setError(
            "The backend rejected the request (missing or invalid credentials). Sign in again and reload."
          );
        } else {
          setError("Could not reach the SquidWeave backend. Check that it is running and reachable.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeCampaigns = campaigns.filter(
    (c) => (c.status || "").toLowerCase() === "active"
  ).length;
  const openOpps = opportunities.filter(
    (o) => (o.status || "").toLowerCase() === "open"
  );
  const pipelineValue = openOpps.reduce(
    (sum, o) => sum + (Number(o.monetaryValue) || 0),
    0
  );
  const recentCampaigns = [...campaigns]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    )
    .slice(0, 5);

  const stats: Stat[] = [
    {
      label: "Active campaigns",
      value: loading ? "…" : String(activeCampaigns),
      icon: <Megaphone className="w-5 h-5" />,
    },
    {
      label: "Contacts",
      value: loading ? "…" : String(contacts.length),
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: "Open opportunities",
      value: loading ? "…" : String(openOpps.length),
      icon: <Target className="w-5 h-5" />,
    },
    {
      label: "Pipeline value",
      value: loading ? "…" : `$${pipelineValue.toLocaleString()}`,
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  const quickActions: QuickAction[] = [
    { icon: <Megaphone className="w-5 h-5" />, label: "Campaigns", path: "/campaigns" },
    { icon: <Target className="w-5 h-5" />, label: "Prospecting", path: "/prospecting" },
    { icon: <Calendar className="w-5 h-5" />, label: "Schedule", path: "/appointments" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "Analytics", path: "/analytics" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Marketing command center</p>
        </div>
        <Button onClick={() => navigate("/campaigns")}>Campaigns</Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Go to</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-left"
              >
                <span className="text-muted-foreground">{action.icon}</span>
                <span className="font-medium text-sm">{action.label}</span>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}
            {!loading && recentCampaigns.length === 0 && (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground py-8 text-center">
                <Inbox className="w-6 h-6" />
                <p>No campaigns yet.</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/campaigns")}>
                  Create your first campaign
                </Button>
              </div>
            )}
            {!loading &&
              recentCampaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate("/campaigns")}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <span className="text-sm truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground capitalize shrink-0">
                    {c.status || "draft"}
                  </span>
                </button>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
