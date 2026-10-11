import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2, AlertCircle, Inbox } from "lucide-react";
import {
  dataService,
  type Pipeline,
  type Opportunity,
} from "@/services/dataService";

interface StageRow {
  name: string;
  count: number;
}

export default function Funnels() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pipelines = await dataService.getPipelines();
        if (!alive) return;
        const list = Array.isArray(pipelines) ? pipelines : [];
        if (list.length === 0) {
          setPipeline(null);
          setStages([]);
          return;
        }
        // Show the first pipeline's stages with real opportunity counts.
        const first = list[0];
        setPipeline(first);
        const stageList = (first.stages || [])
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        let opps: Opportunity[] = [];
        try {
          opps = await dataService.getPipelineOpportunities(first.id);
        } catch {
          opps = []; // stage counts stay 0 if opportunities can't load
        }
        if (!alive) return;
        const oppList = Array.isArray(opps) ? opps : [];

        setStages(
          stageList.map((stage) => ({
            name: stage.name,
            count: oppList.filter(
              (o) =>
                (o.stage || (o as { stageId?: string }).stageId || "") ===
                stage.id
            ).length,
          }))
        );
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

  const hasData = stages.length > 0;
  const topCount = stages.length ? stages[0].count : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Funnels</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {pipeline
            ? `Stage counts for “${pipeline.name}”.`
            : "Conversion stages from your pipelines."}
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

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && !error && !hasData && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground" />
            <p className="font-medium">No funnel yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Create a pipeline with stages to see how opportunities move
              through your funnel. Nothing to show yet.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && hasData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stages.map((stage, i) => (
              <Card key={stage.name}>
                <CardContent className="p-6 text-center">
                  <p className="text-2xl font-semibold tabular-nums">
                    {stage.count.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stage.name}</p>
                  {i < stages.length - 1 && (
                    <ArrowRight className="w-5 h-5 mx-auto mt-3 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stages.map((stage, i) => {
                  const pct =
                    topCount > 0
                      ? Math.round((stage.count / topCount) * 1000) / 10
                      : 0;
                  return (
                    <div key={stage.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{stage.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {stage.count} · {i === 0 ? "100%" : `${pct}%`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${i === 0 ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
