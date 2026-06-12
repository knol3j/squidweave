const CALENDAR_COLLECTIONS = ["calendarEvents"];

export function getCalendarCollections() {
  return CALENDAR_COLLECTIONS;
}

function getQueryParam(req, name) {
  const url = new URL(req.url || "/", "http://localhost");
  return url.searchParams.get(name);
}

export function registerCalendarRoutes({ store }) {
  return {
    async handleCalendarEvents(method, params, req, res, sendJson, readBody) {
      if (method === "GET") {
        const contactId = params.contactId || getQueryParam(req, "contactId");
        const campaignId = params.campaignId || getQueryParam(req, "campaignId");
        const status = params.status || getQueryParam(req, "status");
        const events = store.listCalendarEvents(contactId, campaignId, status);
        return sendJson(req, res, 200, { events });
      }

      if (method === "POST") {
        const body = await readBody(req);
        const event = await store.upsertCalendarEvent(body);
        return sendJson(req, res, 201, { event });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    async handleCalendarEventById(method, params, req, res, sendJson, readBody) {
      const { id } = params;
      if (!id) return sendJson(req, res, 400, { error: "Missing calendar event id" });

      if (method === "GET") {
        const event = store.getDocument("calendarEvents", id);
        if (!event) return sendJson(req, res, 404, { error: "Calendar event not found" });
        return sendJson(req, res, 200, { event });
      }

      if (method === "PUT") {
        const existing = store.getDocument("calendarEvents", id);
        if (!existing) return sendJson(req, res, 404, { error: "Calendar event not found" });
        const body = await readBody(req);
        const event = await store.upsertCalendarEvent({ ...body, id });
        return sendJson(req, res, 200, { event });
      }

      if (method === "DELETE") {
        const deleted = await store.deleteDocument("calendarEvents", id);
        if (!deleted) return sendJson(req, res, 404, { error: "Calendar event not found" });
        return sendJson(req, res, 200, { deleted: true });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    async handleCalendarSync(method, params, req, res, sendJson) {
      if (method !== "POST") return sendJson(req, res, 405, { error: "Method not allowed" });

      return sendJson(req, res, 202, {
        accepted: false,
        synced: 0,
        reason: "Calendar sync provider is not configured for this route.",
      });
    },
  };
}
