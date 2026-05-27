/**
 * Cal.com Integration Adapter
 *
 * Integrates with Cal.com's public REST API v2 to:
 *   1. List available event types (meeting types)
 *   2. Create scheduled events (book meetings)
 *   3. Cancel/delete scheduled events
 *   4. List upcoming events
 *
 * Uses CALCOM_API_KEY, CALCOM_USERNAME, and CALCOM_EVENT_TYPE_SLUG from process.env.
 * When not configured, runs in SIMULATED mode with mock event types
 * so the funding automation flow works end-to-end without external dependencies.
 *
 * Cal.com v2 API: https://cal.com/docs/api-reference/v2/introduction
 * Free hosted: https://app.cal.com
 * API keys: https://app.cal.com/settings/organizations/api-keys
 */

const CALCOM_API_KEY = process.env.CALCOM_API_KEY || "";
const CALCOM_USERNAME = process.env.CALCOM_USERNAME || "";
const CALCOM_EVENT_TYPE_SLUG = process.env.CALCOM_EVENT_TYPE_SLUG || "30-min";

const API_BASE = "https://api.cal.com/v2";

/** Generate a fake UUID for simulated resources. */
function fakeId() {
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${hex()}-${hex().slice(0, 4)}-${hex().slice(0, 4)}-${hex().slice(0, 4)}-${hex()}${hex().slice(0, 4)}`;
}

/** Generate a fake numeric ID for simulated Cal.com resources. */
function fakeNumericId() {
  return Math.floor(Math.random() * 90000) + 10000;
}

const SIMULATED_EVENT_TYPES = [
  {
    uri: String(fakeNumericId()),
    name: "30-Minute Investor Call",
    slug: "30-min",
    duration: 30,
    active: true,
    description: "Quick introductory call for VC investors to learn about SquidWeave.",
    schedulingUrl: `https://app.cal.com/${CALCOM_USERNAME || "squidweave"}/30-min`,
  },
  {
    uri: String(fakeNumericId()),
    name: "60-Minute Deep Dive",
    slug: "60-min",
    duration: 60,
    active: true,
    description: "Extended meeting to demo the platform, walk through traction, and discuss terms.",
    schedulingUrl: `https://app.cal.com/${CALCOM_USERNAME || "squidweave"}/60-min`,
  },
  {
    uri: String(fakeNumericId()),
    name: "Partner Onboarding",
    slug: "partner-onboarding",
    duration: 45,
    active: true,
    description: "Onboarding session for new partners and strategic collaborators.",
    schedulingUrl: `https://app.cal.com/${CALCOM_USERNAME || "squidweave"}/partner-onboarding`,
  },
];

const SIMULATED_EVENTS = [];

/**
 * Internal fetch helper with Bearer token auth + retry.
 * Falls back to simulated mode when CALCOM_API_KEY is not set.
 *
 * Cal.com v2 API uses:
 *   - Authorization: Bearer <api_key> header
 *   - cal-api-version header (e.g. 2024-06-14 for event-types, 2024-08-13 for bookings)
 */
async function calFetch(path, options = {}, apiVersion) {
  if (!CALCOM_API_KEY) {
    return { ok: false, error: "not configured \u2014 use simulated mode", simulated: true };
  }

  const url = `${API_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${CALCOM_API_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": "squidweave/0.1",
    ...(apiVersion ? { "cal-api-version": apiVersion } : {}),
    ...(options.headers || {}),
  };

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = body?.error?.message || body?.message || body?.error || `${res.status} ${res.statusText}`;
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
 * Returns { ok, eventTypes: [{uri, name, slug, duration, active, ...}], error }
 * Falls back to simulated types when not configured.
 *
 * GET /v2/event-types
 * Auth: Bearer token
 * Header: cal-api-version: 2024-06-14
 */
export async function listEventTypes() {
  if (!CALCOM_API_KEY) {
    // Simulated mode — return built-in event types
    return { ok: true, eventTypes: SIMULATED_EVENT_TYPES, simulated: true };
  }

  const params = new URLSearchParams();
  if (CALCOM_USERNAME) params.set("username", CALCOM_USERNAME);

  const queryStr = params.toString();
  const result = await calFetch(`/event-types${queryStr ? `?${queryStr}` : ""}`, {}, "2024-06-14");
  if (!result.ok) return result;

  const rawData = result.data?.data || result.data || [];
  const types = (Array.isArray(rawData) ? rawData : []).map(et => ({
    uri: String(et.id),
    name: et.title || et.slug,
    slug: et.slug,
    duration: et.length,
    active: et.active !== false,
    description: et.description || "",
    schedulingUrl: et.schedulingUrl || null,
  }));

  return { ok: true, eventTypes: types, simulated: false };
}

/**
 * Create a scheduled Cal.com event (book a meeting).
 * Falls back to simulated event when not configured.
 *
 * POST /v2/bookings
 * Auth: Bearer token (optional — public bookings work without auth)
 * Header: cal-api-version: 2024-08-13
 * Body: { eventTypeId, start, attendee: { name, timeZone, email }, ... }
 *
 * @param {object} opts
 * @param {string} opts.eventTypeUri - Cal.com event type ID (numeric, as string)
 * @param {string} opts.inviteeEmail
 * @param {string} opts.inviteeName
 * @param {string} opts.startTime - ISO 8601 UTC
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

  if (!CALCOM_API_KEY) {
    // Simulated mode — create a fake event record
    const eventType = SIMULATED_EVENT_TYPES.find(et => et.uri === eventTypeUri);
    const duration = eventType?.duration || 30;
    const simulatedEvent = {
      uri: `cal_${fakeId()}`,
      id: fakeNumericId(),
      uid: fakeId(),
      title: `${inviteeName} \u2014 ${eventType?.name || "Investor Call"}`,
      status: "accepted",
      startTime,
      endTime: new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString(),
      eventTypeId: parseInt(eventTypeUri, 10) || fakeNumericId(),
      eventTypeSlug: eventType?.slug || "30-min",
      location: location || null,
      inviteeEmail,
      inviteeName,
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };
    SIMULATED_EVENTS.push(simulatedEvent);
    return {
      ok: true,
      eventUri: simulatedEvent.uri,
      event: simulatedEvent,
      simulated: true,
    };
  }

  // Calculate end time from event type duration
  const eventTypesResult = await listEventTypes();
  let duration = 30;
  if (eventTypesResult.ok) {
    const et = eventTypesResult.eventTypes.find(t => t.uri === eventTypeUri);
    if (et) duration = et.duration;
  }

  const startMs = new Date(startTime).getTime();
  const endTime = new Date(startMs + duration * 60 * 1000).toISOString();

  const body = {
    eventTypeId: parseInt(eventTypeUri, 10),
    start: startTime,
    attendee: {
      name: inviteeName,
      email: inviteeEmail,
      timeZone: timezone,
    },
    ...(location ? { location: { value: location } } : {}),
    ...(notes ? { description: notes } : {}),
  };

  const result = await calFetch("/bookings", {
    method: "POST",
    body: JSON.stringify(body),
  }, "2024-08-13");

  if (!result.ok) return result;

  const booking = result.data?.data || result.data;

  return {
    ok: true,
    eventUri: booking.uid || `cal_${booking.id}`,
    event: {
      uri: booking.uid || `cal_${booking.id}`,
      id: booking.id,
      uid: booking.uid,
      title: booking.title || `${inviteeName} call`,
      status: booking.status || "accepted",
      startTime: booking.start,
      endTime: booking.end,
      eventTypeId: parseInt(eventTypeUri, 10),
      inviteeEmail,
      inviteeName,
      location: location || null,
    },
    simulated: false,
  };
}

/**
 * List scheduled events for the configured user.
 * Falls back to simulated events when not configured.
 *
 * GET /v2/bookings
 * Auth: Bearer token
 * Header: cal-api-version: 2024-08-13
 */
export async function listScheduledEvents({ minStartTime, maxStartTime, status = "active", count = 20 } = {}) {
  if (!CALCOM_API_KEY) {
    // Simulated mode — filter from SIMULATED_EVENTS
    let events = SIMULATED_EVENTS
      .filter(e => status === "all" || e.status === status)
      .map(e => ({
        uri: e.uri,
        uid: e.uid,
        startTime: e.startTime,
        endTime: e.endTime,
        inviteeEmail: e.inviteeEmail,
        inviteeName: e.inviteeName,
        status: e.status,
        title: e.title || "",
        eventTypeId: e.eventTypeId,
        createdAt: e.createdAt,
      }))
      .slice(0, count);

    if (minStartTime) events = events.filter(e => e.startTime >= minStartTime);
    if (maxStartTime) events = events.filter(e => e.startTime <= maxStartTime);

    return { ok: true, events, simulated: true };
  }

  const params = new URLSearchParams({});
  if (status && status !== "all") params.set("status", status);
  if (minStartTime) params.set("startTime", minStartTime);
  if (maxStartTime) params.set("endTime", maxStartTime);
  params.set("limit", String(Math.min(count, 100)));

  const queryStr = params.toString();
  const result = await calFetch(`/bookings${queryStr ? `?${queryStr}` : ""}`, {}, "2024-08-13");
  if (!result.ok) return result;

  const rawBookings = result.data?.data || [];
  const events = (Array.isArray(rawBookings) ? rawBookings : []).map(b => ({
    uri: b.uid || `cal_${b.id}`,
    uid: b.uid,
    startTime: b.start,
    endTime: b.end,
    inviteeEmail: b.attendees?.[0]?.email || b.email || "",
    inviteeName: b.attendees?.[0]?.name || b.name || "",
    status: b.status || "accepted",
    title: b.title || "",
    eventTypeId: b.eventTypeId,
    createdAt: b.createdAt || b.created_at,
  }));

  return { ok: true, events, simulated: false };
}

/**
 * Cancel a scheduled event by URI (UID).
 *
 * POST /v2/bookings/:bookingUid/cancel
 * Auth: Bearer token
 * Header: cal-api-version: 2024-08-13
 */
export async function cancelEvent(eventUri) {
  if (!eventUri) return { ok: false, error: "eventUri is required" };

  // Simulated mode — find and cancel in local array
  const idx = SIMULATED_EVENTS.findIndex(e => e.uri === eventUri);
  if (idx !== -1) {
    SIMULATED_EVENTS[idx].status = "cancelled";
    return { ok: true, simulated: true };
  }

  if (!CALCOM_API_KEY) {
    return { ok: false, error: "Event not found in simulated mode" };
  }

  // eventUri is the booking UID from Cal.com
  const bookingUid = eventUri.replace(/^cal_/, "");

  const result = await calFetch(`/bookings/${encodeURIComponent(bookingUid)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancellationReason: "Cancelled via SquidWeave" }),
  }, "2024-08-13");

  if (!result.ok) return result;

  return {
    ok: true,
    simulated: false,
  };
}

/**
 * Get Cal.com configuration status — for health checks / diagnostics.
 */
export function getCalComStatus() {
  const configured = !!(CALCOM_API_KEY && CALCOM_USERNAME);
  return {
    configured,
    mode: configured ? "real" : "simulated",
    apiEndpoint: API_BASE,
    username: CALCOM_USERNAME || null,
    eventTypeSlug: CALCOM_EVENT_TYPE_SLUG,
    note: configured
      ? "Cal.com API configured and ready"
      : "Not configured \u2014 running in SIMULATED mode. Set CALCOM_API_KEY and CALCOM_USERNAME in .env.local for real booking.",
  };
}

/**
 * Get the first active event type URI and name (for quick booking).
 * Returns { uri, name } where uri is the event type ID as string.
 * Prefers the event type matching CALCOM_EVENT_TYPE_SLUG if available.
 */
export async function getFirstEventTypeUri() {
  const result = await listEventTypes();
  if (!result.ok) return { uri: null, name: null };

  // Prefer the configured slug event type
  const preferred = result.eventTypes.find(
    et => et.slug === CALCOM_EVENT_TYPE_SLUG && et.active !== false
  );
  if (preferred) return { uri: preferred.uri, name: preferred.name };

  // Fall back to first active
  const active = result.eventTypes.find(et => et.active !== false);
  if (active) return { uri: active.uri, name: active.name };

  // Last resort: first available
  const first = result.eventTypes[0];
  if (first) return { uri: first.uri, name: first.name };

  return { uri: null, name: null };
}

export default {
  listEventTypes,
  scheduleEvent,
  listScheduledEvents,
  cancelEvent,
  getCalComStatus,
  getFirstEventTypeUri,
};
