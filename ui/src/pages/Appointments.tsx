import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Video, MapPin, Loader2, AlertCircle, Inbox } from "lucide-react";
import { dataService, type CalendarEvent } from "@/services/dataService";

function formatWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: iso, time: "" };
  return {
    date: d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export default function Appointments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const e = await dataService.getCalendarEvents();
        if (!alive) return;
        const list = Array.isArray(e) ? e : [];
        // Upcoming first, soonest at the top.
        list.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setEvents(list);
      } catch (err: unknown) {
        if (!alive) return;
        const status = (err as { status?: number })?.status;
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your scheduled meetings and calls.
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

      {!loading && !error && events.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground" />
            <p className="font-medium">No appointments scheduled</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Meetings booked with your contacts will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {!loading &&
          events.map((evt) => {
            const { date, time } = formatWhen(evt.startTime);
            const isVideo = /video|zoom|meet|http/i.test(evt.location || "");
            return (
              <Card key={evt.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{evt.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {time}
                        </span>
                        <span className="flex items-center gap-1">
                          {isVideo ? (
                            <Video className="w-3 h-3" />
                          ) : (
                            <MapPin className="w-3 h-3" />
                          )}
                          {isVideo ? "Video call" : evt.location || "In person"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">{date}</span>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
