/**
 * Calendly Integration Adapter
 *
 * Integrates with Calendly's public REST API v2 to:
 *   1. List available event types (meeting types)
 *   2. Create scheduled events (book meetings)
 *   3. Cancel/delete scheduled events
 *   4. List upcoming events
 *
 * Uses CALENDLY_API_KEY and CALENDLY_USER_URI from process.env.
 * When not configured, runs in SIMULATED mode with mock event types
 * so the funding automation flow works end-to-end without external dependencies.
 *
 * Calendly personal access tokens: https://calendly.com/integrations/api_webhooks
 * User URI format: https://api.calendly.com/users/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY || "";
const CALENDLY_USER_URI = process.env.CALENDLY_USER_URI || "";

const API_BASE = "https://api.calendly.com";

/** Generate a fake UUID for simulated resources. */
function fakeId() {
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${hex()}-${hex().slice(0, 4)}-${hex().slice(0, 4)}-${hex().slice(0, 4)}-${hex()}${hex().slice(0, 4)}`;
}

const SIMULATED_EVENT_TYPES = [
  {
    uri: `https://api.calendly.com/event_types/${fakeId()}`,
    name: "30-Minute Investor Call",
    slug: "30min-investor",
    duration: 30,
    active: true,
    description: "Quick introductory call for VC investors to learn about SquidWeave.",
    kind: "solo",
    schedulingUrl: "https://calendly.com/squidweave/30min-investor",
  },
  {
    uri: `https://api.calendly.com/event_types/${fakeId()}`,
    name: "60-Minute Deep Dive",
    slug: "60min-deepdive",
    duration: 60,
    active: true,
    description: "Extended meeting to demo the platform, walk through traction, and discuss terms.",
    kind: "solo",
    schedulingUrl: "https://calendly.com/squidweave/60min-deepdive",
  },
  {
    uri: `https://api.calendly.com/event_types/${fakeId()}`,
    name: "Partner Onboarding",
    slug: "partner-onboarding",
    duration: 45,
    active: true,
    description: "Onboarding session for new partners and strategic collaborators.",
    kind: "solo",
    schedulingUrl: "https://calendly.com/squidweave/partner-onboarding",
  },
];

const SIMULATED_EVENTS = [];

/**
 * Internal fetch helper with auth + retry.
 * Falls back to simulated mode when CALENDLY_API_KEY is not set.
 */
async function calFetch(path, options = {}) {
  if (!CALENDLY_API_KEY) {
    return { ok: false, error: "not configured — use simulated mode", simulated: true };
  }

  const url = `${API_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${CALENDLY_API_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": "squidweave/0.1",
  };

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = body?.message || body?.title || `${res.status} ${res.statusText}`;
        if (res.status === 429 && attempt < 2) {
          const retryAfter = parseInt(res.headers.get("retry-after") || "1", 10);
          await new Promise(r => setTimeout(r, retryAfter * 1000 + 500));
          continue;
        }
        return { ok: false, error: msg, status: res.status, simulated: false };
      }

      return { ok: true, data: body, simulated: false };
    } catch (err) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return { ok: false, error: err.message, simulated: false };
    }
  }

  return { ok: false, error: "Max retries exceeded", simulated: false };
}

/**
 * List available event types (meeting templates) for the configured user.
 * Returns [{ uri, name, slug, duration, active, ... }]
 * Falls back to simulated types when not configured.
 */
export async function listEventTypes() {
  if (!CALENDLY_USER_URI) {
    // Simulated mode — return built-in event types
    return { ok: true, eventTypes: SIMULATED_EVENT_TYPES, simulated: true };
  }

  const result = await calFetch(`/event_types?user=${encodeURIComponent(CALENDLY_USER_URI)}&count=50`);
  if (!result.ok) return result;

  const types = (result.data?.collection || []).map(et => ({
    uri: et.uri,
    name: et.name,
    slug: et.slug,
    duration: et.duration,
    active: et.active,
    description: et.description_plain || et.description_html?.replace(/<[^>]*>/g, "") || "",
    kind: et.kind || "solo",
    schedulingUrl: et.scheduling_url || null,
  }));

  return { ok: true, eventTypes: types, simulated: false };
}

/**
 * Create a scheduled Calendly event (book a meeting).
 * Falls back to simulated event when not configured.
 *
 * @param {object} opts
 * @param {string} opts.eventTypeUri
 * @param {string} opts.inviteeEmail
 * @param {string} opts.inviteeName
 * @param {string} opts.startTime - ISO 8601
 * @param {string} opts.timezone
 * @param {string} opts.location
 * @param {string} opts.notes
 */
export async function scheduleEvent({
  eventTypeUri,
  inviteeEmail,
  inviteeName = "Investor",
  startTime,
  timezone = "America/New_York",
  location,
  notes,
}) {
  if (!eventTypeUri) return { ok: false, error: "eventTypeUri is required" };
  if (!inviteeEmail) return { ok: false, error: "inviteeEmail is required" };
  if (!startTime) return { ok: false, error: "startTime is required" };

  if (!CALENDLY_API_KEY) {
    // Simulated mode — create a fake event record
    const simulatedEvent = {
      uri: `https://api.calendly.com/scheduled_events/${fakeId()}`,
      name: `${inviteeName} — ${eventTypeUri.split("/").pop() || "Investor Call"}`,
      status: "active",
      start_time: startTime,
      end_time: new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
      event_type: eventTypeUri,
      location: location ? { location, type: "custom" } : null,
      invitees: [{ email: inviteeEmail, name: inviteeName, status: "pending" }],
      created_at: new Date().toISOString(),
    };
    SIMULATED_EVENTS.push(simulatedEvent);
    return { ok: true, data: simulatedEvent, simulated: true };
  }

  const body = {
    event_type: eventTypeUri,
    start_time: startTime,
    invitee: {
      email: inviteeEmail,
      name: inviteeName,
      ...(notes ? { notes } : {}),
    },
    ...(location ? { location: { type: "custom", location } } : {}),
  };

  return await calFetch("/scheduled_events", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * List scheduled events for the configured user.
 * Falls back to simulated events when not configured.
 */
export async function listScheduledEvents({ minStartTime, maxStartTime, status = "active", count = 20 } = {}) {
  if (!CALENDLY_USER_URI) {
    // Simulated mode — filter from SIMULATED_EVENTS
    let events = SIMULATED_EVENTS
      .filter(e => status === "all" || e.status === status)
      .map(e => ({
        uri: e.uri,
        name: e.name,
        status: e.status,
        startTime: e.start_time,
        endTime: e.end_time,
        eventType: e.event_type,
        location: e.location?.location || null,
        invitees: e.invitees?.length || 0,
        createdAt: e.created_at,
      }))
      .slice(0, count);

    if (minStartTime) events = events.filter(e => e.startTime >= minStartTime);
    if (maxStartTime) events = events.filter(e => e.startTime <= maxStartTime);

    return { ok: true, events, simulated: true };
  }

  const params = new URLSearchParams({
    user: CALENDLY_USER_URI,
    status,
    count: String(Math.min(count, 100)),
  });
  if (minStartTime) params.set("min_start_time", minStartTime);
  if (maxStartTime) params.set("max_start_time", maxStartTime);

  const result = await calFetch(`/scheduled_events?${params.toString()}`);
  if (!result.ok) return result;

  const events = (result.data?.collection || []).map(ev => ({
    uri: ev.uri,
    name: ev.name,
    status: ev.status,
    startTime: ev.start_time,
    endTime: ev.end_time,
    eventType: ev.event_type,
    location: ev.location?.location || null,
    invitees: ev.invitees?.total_count || 0,
    createdAt: ev.created_at,
  }));

  return { ok: true, events };
}

/**
 * Cancel a scheduled event by URI.
 */
export async function cancelEvent(eventUri) {
  if (!eventUri) return { ok: false, error: "eventUri is required" };

  // Simulated mode — remove from local array
  const idx = SIMULATED_EVENTS.findIndex(e => e.uri === eventUri);
  if (idx !== -1) {
    SIMULATED_EVENTS[idx].status = "canceled";
    return { ok: true, data: { uri: eventUri, status: "canceled" }, simulated: true };
  }

  return await calFetch(`/scheduled_events/${eventUri.split("/").pop()}`, {
    method: "DELETE",
  });
}

/**
 * Get Calendly configuration status — for health checks / diagnostics.
 */
export function getCalendlyStatus() {
  const configured = !!(CALENDLY_API_KEY && CALENDLY_USER_URI);
  return {
    ok: true,
    configured,
    simulated: !configured,
    configuredKey: !!CALENDLY_API_KEY,
    configuredUser: !!CALENDLY_USER_URI,
    userUri: CALENDLY_USER_URI ? CALENDLY_USER_URI.slice(0, 40) + "..." : null,
    apiEndpoint: API_BASE,
    simulatedEventTypes: SIMULATED_EVENT_TYPES.length,
    note: configured
      ? "Calendly API configured and ready"
      : "Not configured — running in SIMULATED mode. Set CALENDLY_API_KEY and CALENDLY_USER_URI in .env.local for real booking.",
  };
}

/**
 * Get the first active event type URI (for quick booking).
 */
export async function getFirstEventTypeUri() {
  const result = await listEventTypes();
  if (!result.ok) return null;
  const active = result.eventTypes.find(et => et.active !== false);
  return active?.uri || null;
}

export default {
  listEventTypes,
  scheduleEvent,
  listScheduledEvents,
  cancelEvent,
  getCalendlyStatus,
  getFirstEventTypeUri,
};
