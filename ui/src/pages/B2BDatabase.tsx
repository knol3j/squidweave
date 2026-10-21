import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Inbox, Building2, Users, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import {
  dataService,
  type B2BCompany,
  type B2BPerson,
  type B2BRanking,
  type B2BStats,
  type B2BComplianceVerdict,
} from "@/services/dataService";

/** Email verification verdicts get their own colour, because they mean different
 *  things: `blocked` is our probe being refused, not a bad address. */
const EMAIL_STATUS_STYLE: Record<string, string> = {
  verified: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  risky: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  blocked: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  invalid: "bg-red-500/15 text-red-400 border-red-500/30",
  permuted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

const BAND_STYLE: Record<string, string> = {
  hot: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  warm: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  cold: "bg-muted text-muted-foreground border-border",
};

function pct(value: number): string {
  return `${Math.round((value || 0) * 100)}%`;
}

function personName(person: B2BPerson): string {
  return person.fullName || `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unnamed";
}

export default function B2BDatabase() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<B2BStats | null>(null);
  const [companies, setCompanies] = useState<B2BCompany[]>([]);
  const [rankings, setRankings] = useState<B2BRanking[]>([]);
  const [selected, setSelected] = useState<B2BCompany | null>(null);
  const [people, setPeople] = useState<B2BPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [rescoring, setRescoring] = useState(false);

  // Compliance tester state.
  const [probeEmail, setProbeEmail] = useState("");
  const [probeBasis, setProbeBasis] = useState("");
  const [verdict, setVerdict] = useState<B2BComplianceVerdict | null>(null);
  const [probing, setProbing] = useState(false);

  const loadAll = useCallback(async () => {
    let alive = true;
    setLoading(true);
    setError(null);
    try {
      const [s, c, r] = await Promise.all([
        dataService.getB2BStats(),
        dataService.getB2BCompanies({ limit: 200 }),
        dataService.getB2BRankings({ limit: 200 }),
      ]);
      if (!alive) return;
      setStats(s);
      setCompanies(Array.isArray(c) ? c : []);
      setRankings(Array.isArray(r) ? r : []);
    } catch (e: unknown) {
      if (!alive) return;
      const status = (e as { status?: number })?.status;
      const message = (e as Error)?.message || "Unknown error";
      setError(
        status === 401 || status === 503
          ? "The backend rejected the request (missing or invalid credentials). Sign in again and reload."
          : `Could not load the B2B database: ${message}`,
      );
    } finally {
      if (alive) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadAll();
    })();
    return () => {
      alive = false;
    };
  }, [loadAll]);

  const openCompany = useCallback(async (company: B2BCompany) => {
    setSelected(company);
    setPeopleLoading(true);
    try {
      const detail = await dataService.getB2BCompany(company.domain);
      setPeople(Array.isArray(detail.people) ? detail.people : []);
    } catch (e: unknown) {
      setPeople([]);
      setError((e as Error)?.message || "Could not load this company's people");
    } finally {
      setPeopleLoading(false);
    }
  }, []);

  const runComplianceCheck = useCallback(async () => {
    if (!probeEmail.trim()) return;
    setProbing(true);
    setVerdict(null);
    try {
      const result = await dataService.checkB2BCompliance({
        email: probeEmail.trim(),
        consentBasis: probeBasis.trim() || null,
      });
      setVerdict(result);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Compliance check failed");
    } finally {
      setProbing(false);
    }
  }, [probeEmail, probeBasis]);

  const rescore = useCallback(async () => {
    setRescoring(true);
    try {
      const result = await dataService.recomputeB2BScores();
      setRankings(result.top || []);
      setStats(await dataService.getB2BStats());
    } catch (e: unknown) {
      setError((e as Error)?.message || "Could not recompute scores");
    } finally {
      setRescoring(false);
    }
  }, []);

  const scoreByDomain = useMemo(() => {
    const map = new Map<string, B2BRanking>();
    for (const r of rankings) map.set(r.domain, r);
    return map;
  }, [rankings]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter(c =>
      (c.domain || "").toLowerCase().includes(needle) ||
      (c.name || "").toLowerCase().includes(needle),
    );
  }, [companies, search]);

  const seniorPeople = useMemo(
    () => people.filter(p => p.seniority === "owner" || p.seniority === "c_level" || p.seniority === "vp"),
    [people],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading the B2B database…
      </div>
    );
  }

  if (error && companies.length === 0) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <p className="font-medium">Could not load the B2B database</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <button onClick={loadAll} className="mt-3 text-sm underline">Retry</button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Building2 className="w-4 h-4" /> Companies
            </div>
            <p className="text-2xl font-semibold mt-1">{stats?.companies ?? companies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" /> People
            </div>
            <p className="text-2xl font-semibold mt-1">{stats?.people ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Verified emails</div>
            <p className="text-2xl font-semibold mt-1">{stats?.byEmailStatus?.verified ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Sources</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(stats?.bySource || {}).map(([source, n]) => (
                <Badge key={source} variant="outline" className="text-xs">{source}: {n}</Badge>
              ))}
              {Object.keys(stats?.bySource || {}).length === 0 && (
                <span className="text-sm text-muted-foreground">none yet</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Companies ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Companies</CardTitle>
            <Input
              placeholder="Filter by domain or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-56 h-8"
            />
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Inbox className="w-8 h-8 mb-2" />
                <p className="text-sm">
                  {companies.length === 0
                    ? "No companies yet. Run node scripts/seed-b2b.mjs to populate from public sources."
                    : "No companies match that filter."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
                {filtered.map(company => {
                  const score = scoreByDomain.get(company.domain);
                  return (
                    <button
                      key={company.id}
                      onClick={() => openCompany(company)}
                      className={`w-full text-left py-2.5 px-1 hover:bg-muted/50 transition-colors ${
                        selected?.id === company.id ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{company.name || company.domain}</p>
                          <p className="text-xs text-muted-foreground truncate">{company.domain}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {company.peopleCount ?? "?"} people
                          </span>
                          {score && (
                            <Badge variant="outline" className={`text-xs ${BAND_STYLE[score.band] || ""}`}>
                              {pct(score.score)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── People at the selected company ──────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `People at ${selected.name || selected.domain}` : "People"}
              {selected && seniorPeople.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {seniorPeople.length} senior
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Users className="w-8 h-8 mb-2" />
                <p className="text-sm">Select a company to see its people.</p>
              </div>
            ) : peopleLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading people…
              </div>
            ) : people.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Inbox className="w-8 h-8 mb-2" />
                <p className="text-sm">No people recorded for this company yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
                {people.map(person => (
                  <div key={person.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{personName(person)}</p>
                      <p className="text-xs text-muted-foreground truncate">{person.title || "—"}</p>
                      {person.email && (
                        <p className="text-xs text-muted-foreground truncate font-mono">{person.email}</p>
                      )}
                    </div>
                    {person.email && (
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${EMAIL_STATUS_STYLE[person.emailStatus] || EMAIL_STATUS_STYLE.unknown}`}
                      >
                        {person.emailStatus}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Rankings ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Account rankings</CardTitle>
          <button
            onClick={rescore}
            disabled={rescoring}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${rescoring ? "animate-spin" : ""}`} />
            {rescoring ? "Recomputing…" : "Recompute"}
          </button>
        </CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="w-6 h-6 mb-2" />
              <p className="text-sm">No scores yet. Recompute to generate them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 font-medium">Company</th>
                    <th className="py-2 font-medium">Band</th>
                    <th className="py-2 font-medium">Score</th>
                    <th className="py-2 font-medium">Contactability</th>
                    <th className="py-2 font-medium">Decision maker</th>
                    <th className="py-2 font-medium">Hiring</th>
                    <th className="py-2 font-medium">Data quality</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map(r => (
                    <tr key={r.companyId} className="border-b border-border/50">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{r.name || r.domain}</span>
                        <span className="block text-xs text-muted-foreground">{r.domain}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={`text-xs ${BAND_STYLE[r.band] || ""}`}>{r.band}</Badge>
                      </td>
                      <td className="py-2 pr-3 font-medium">{pct(r.score)}</td>
                      <td className="py-2 pr-3">{pct(r.components?.contactability?.value)}</td>
                      <td className="py-2 pr-3">{pct(r.components?.decisionMakerReach?.value)}</td>
                      <td className="py-2 pr-3">{pct(r.components?.hiringSignal?.value)}</td>
                      <td className="py-2 pr-3">{pct(r.components?.dataQuality?.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Compliance tester ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance gate</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask whether an address may be contacted. A block is a normal answer, not an error.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="name@company.com"
              value={probeEmail}
              onChange={e => setProbeEmail(e.target.value)}
              className="sm:max-w-72"
            />
            <select
              value={probeBasis}
              onChange={e => setProbeBasis(e.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— consent basis —</option>
              <option value="legitimate_interest">Legitimate interest</option>
              <option value="consent">Explicit consent</option>
              <option value="contract">Contract</option>
              <option value="legal_obligation">Legal obligation</option>
            </select>
            <button
              onClick={runComplianceCheck}
              disabled={probing || !probeEmail.trim()}
              className="flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
            >
              {probing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Check
            </button>
          </div>

          {verdict && (
            <div
              className={`rounded-md border p-4 ${
                verdict.allowed ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {verdict.allowed ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                )}
                {verdict.allowed ? "Allowed" : "Blocked"}
                <code className="text-xs ml-2 text-muted-foreground">{verdict.reason}</code>
              </div>
              {verdict.detail && (
                <p className="text-sm text-muted-foreground mt-1">{verdict.detail}</p>
              )}
              <ul className="mt-3 space-y-1">
                {(verdict.checks || []).map((check, i) => (
                  <li key={`${check.check}-${i}`} className="text-xs flex items-center gap-2">
                    <span className={check.passed ? "text-emerald-500" : "text-red-400"}>
                      {check.passed ? "✓" : "✗"}
                    </span>
                    <span className="font-mono">{check.check}</span>
                    {check.detail && <span className="text-muted-foreground">— {check.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
