import { MessageTemplate, MessageSequence } from "./message-template.mjs";

const MESSAGING_COLLECTIONS = ["messageTemplates", "messageSequences"];

export function getMessagingCollections() {
  return MESSAGING_COLLECTIONS;
}

export function registerMessagingRoutes({ store, workflowEngine }) {
  return {
    // ─── Message Templates ─────────────────────────────────────────────
    async handleTemplates(method, params, req, res, sendJson, readBody) {
      if (method === "GET") {
        const { campaignId } = params;
        const templates = store.listDocuments("messageTemplates", t =>
          !campaignId || t.campaignId === campaignId
        );
        return sendJson(req, res, 200, { templates });
      }

      if (method === "POST") {
        const body = await readBody(req);
        const tmpl = new MessageTemplate(body);
        const saved = await store.upsertDocument("messageTemplates", tmpl.id, tmpl.toJSON());
        return sendJson(req, res, 201, { template: saved });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    async handleTemplateById(method, params, req, res, sendJson, readBody) {
      const { id } = params;
      if (method === "GET") {
        const tmpl = store.getDocument("messageTemplates", id);
        if (!tmpl) return sendJson(req, res, 404, { error: "Template not found" });
        return sendJson(req, res, 200, { template: tmpl });
      }

      if (method === "PUT") {
        const existing = store.getDocument("messageTemplates", id);
        if (!existing) return sendJson(req, res, 404, { error: "Template not found" });
        const body = await readBody(req);
        const saved = await store.upsertDocument("messageTemplates", id, body);
        return sendJson(req, res, 200, { template: saved });
      }

      if (method === "DELETE") {
        const deleted = await store.deleteDocument("messageTemplates", id);
        if (!deleted) return sendJson(req, res, 404, { error: "Template not found" });
        return sendJson(req, res, 200, { deleted: true });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    // ─── Message Sequences ─────────────────────────────────────────────
    async handleSequences(method, params, req, res, sendJson, readBody) {
      if (method === "GET") {
        const { campaignId } = params;
        const sequences = store.listDocuments("messageSequences", s =>
          !campaignId || s.campaignId === campaignId
        );
        return sendJson(req, res, 200, { sequences });
      }

      if (method === "POST") {
        const body = await readBody(req);
        const seq = new MessageSequence(body);
        const saved = await store.upsertDocument("messageSequences", seq.id, seq.toJSON());
        return sendJson(req, res, 201, { sequence: saved });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    async handleSequenceById(method, params, req, res, sendJson, readBody) {
      const { id } = params;
      if (method === "GET") {
        const seq = store.getDocument("messageSequences", id);
        if (!seq) return sendJson(req, res, 404, { error: "Sequence not found" });
        return sendJson(req, res, 200, { sequence: seq });
      }

      if (method === "PUT") {
        const existing = store.getDocument("messageSequences", id);
        if (!existing) return sendJson(req, res, 404, { error: "Sequence not found" });
        const body = await readBody(req);
        const saved = await store.upsertDocument("messageSequences", id, body);
        return sendJson(req, res, 200, { sequence: saved });
      }

      if (method === "DELETE") {
        const deleted = await store.deleteDocument("messageSequences", id);
        if (!deleted) return sendJson(req, res, 404, { error: "Sequence not found" });
        return sendJson(req, res, 200, { deleted: true });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    // ─── Render Template ───────────────────────────────────────────────
    async handleTemplateRender(method, params, req, res, sendJson, readBody) {
      if (method !== "POST") return sendJson(req, res, 405, { error: "Method not allowed" });

      const { id } = params;
      const tmpl = store.getDocument("messageTemplates", id);
      if (!tmpl) return sendJson(req, res, 404, { error: "Template not found" });

      const body = await readBody(req);
      const variables = body.variables || {};

      let renderedSubject = tmpl.subject || "";
      let renderedBody = tmpl.body || "";

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        renderedSubject = renderedSubject.replace(regex, value);
        renderedBody = renderedBody.replace(regex, value);
      }

      return sendJson(req, res, 200, {
        rendered: {
          subject: renderedSubject,
          body: renderedBody,
        },
      });
    },
  };
}
