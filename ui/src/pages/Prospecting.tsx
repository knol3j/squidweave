import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Globe, Loader2, AlertCircle, Inbox } from "lucide-react";
import { dataService, type Contact } from "@/services/dataService";

function fullName(c: Contact): string {
  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
  return name || c.companyName || c.email || "Unnamed";
}

function sourceIcon(source: string) {
  const s = (source || "").toLowerCase();
  if (s.includes("linkedin")) return <Globe className="w-3 h-3 text-blue-500" />;
  if (s.includes("prospect") || s.includes("engine")) return <Globe className="w-3 h-3 text-emerald-500" />;
  return <Mail className="w-3 h-3 text-muted-foreground" />;
}

export default function Prospecting() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await dataService.getContacts();
        if (!alive) return;
        setContacts(Array.isArray(c) ? c : []);
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

  // Prospects are contacts carrying a prospect/hiring tag, or a prospecting source.
  const leads = useMemo(
    () =>
      contacts.filter((c) => {
        const tags = Array.isArray(c.tags) ? c.tags.map((t) => t.toLowerCase()) : [];
        const src = (c.source || "").toLowerCase();
        return (
          tags.some((t) => t.includes("prospect") || t.includes("hiring") || t.includes("lead")) ||
          src.includes("prospect")
        );
      }),
    [contacts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      `${fullName(l)} ${l.companyName || ""} ${l.email || ""} ${l.domain || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [leads, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prospecting</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Qualified leads from your imported prospects.
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground" />
            <p className="font-medium">No prospects yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Import prospects to see qualified leads here. Nothing to show yet.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && leads.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No leads match “{search}”.
        </p>
      )}

      <div className="grid gap-3">
        {!loading &&
          filtered.map((lead) => {
            const name = fullName(lead);
            const tags = Array.isArray(lead.tags) ? lead.tags : [];
            return (
              <Card key={lead.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                      {(lead.companyName || name).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {lead.companyName || name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {name}
                        {lead.email ? ` · ${lead.email}` : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {sourceIcon(lead.source || "")}
                        <span className="text-xs text-muted-foreground">
                          {lead.source || "prospect"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
