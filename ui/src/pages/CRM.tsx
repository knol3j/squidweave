import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Loader2, AlertCircle, Inbox } from "lucide-react";
import { dataService, type Contact } from "@/services/dataService";

function fullName(c: Contact): string {
  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
  return name || c.companyName || c.email || "Unnamed contact";
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function CRM() {
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const hay = `${fullName(c)} ${c.email || ""} ${c.companyName || ""} ${c.phone || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your contacts and leads.
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
          placeholder="Search contacts..."
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

      {!loading && !error && contacts.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground" />
            <p className="font-medium">No contacts yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Contacts you import or create will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && contacts.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No contacts match “{search}”.
        </p>
      )}

      <div className="grid gap-3">
        {!loading &&
          filtered.map((c) => {
            const name = fullName(c);
            const tags = Array.isArray(c.tags) ? c.tags : [];
            return (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </span>
                        )}
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
