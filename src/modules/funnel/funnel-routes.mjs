import { Funnel, FunnelStep, FunnelSubmission } from "./funnel-model.mjs";
import { renderFunnel } from "./funnel-renderer.mjs";

const FUNNEL_COLLECTIONS = ["funnels", "funnelSteps", "funnelSubmissions"];

export function getFunnelCollections() {
  return FUNNEL_COLLECTIONS;
}

export function registerFunnelRoutes({ store, workflowEngine, pipelineEngine }) {
  return {
    // ─── Funnel CRUD ───────────────────────────────────────────────────
    async handleFunnels(method, params, req, res, sendJson, readBody) {
      if (method === "GET") {
        const funnels = store.listDocuments("funnels");
        return sendJson(req, res, 200, { funnels });
      }

      if (method === "POST") {
        const body = await readBody(req);
        const funnel = new Funnel(body);
        const saved = await store.upsertDocument("funnels", funnel.id, funnel.toJSON());
        return sendJson(req, res, 201, { funnel: saved });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    async handleFunnelById(method, params, req, res, sendJson, readBody) {
      const { id } = params;
      if (!id) return sendJson(req, res, 400, { error: "Missing funnel id" });

      if (method === "GET") {
        const funnel = store.getDocument("funnels", id);
        if (!funnel) return sendJson(req, res, 404, { error: "Funnel not found" });

        const steps = store.listDocuments("funnelSteps", s => s.funnelId === id)
          .sort((a, b) => a.order - b.order);

        return sendJson(req, res, 200, { funnel, steps });
      }

      if (method === "PUT") {
        const existing = store.getDocument("funnels", id);
        if (!existing) return sendJson(req, res, 404, { error: "Funnel not found" });

        const body = await readBody(req);
        const saved = await store.upsertDocument("funnels", id, body);
        return sendJson(req, res, 200, { funnel: saved });
      }

      if (method === "DELETE") {
        const deleted = await store.deleteDocument("funnels", id);
        if (!deleted) return sendJson(req, res, 404, { error: "Funnel not found" });

        const steps = store.listDocuments("funnelSteps", s => s.funnelId === id);
        for (const step of steps) {
          await store.deleteDocument("funnelSteps", step.id);
        }

        return sendJson(req, res, 200, { deleted: true });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    // ─── Funnel Step CRUD ───────────────────────────────────────────────
    async handleFunnelSteps(method, params, req, res, sendJson, readBody) {
      const { funnelId } = params;

      if (method === "GET") {
        const steps = store.listDocuments("funnelSteps", s => s.funnelId === funnelId)
          .sort((a, b) => a.order - b.order);
        return sendJson(req, res, 200, { steps });
      }

      if (method === "POST") {
        const body = await readBody(req);
        const step = new FunnelStep({ ...body, funnelId });
        const saved = await store.upsertDocument("funnelSteps", step.id, step.toJSON());
        return sendJson(req, res, 201, { step: saved });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    async handleFunnelStepById(method, params, req, res, sendJson, readBody) {
      const { stepId } = params;

      if (method === "GET") {
        const step = store.getDocument("funnelSteps", stepId);
        if (!step) return sendJson(req, res, 404, { error: "Step not found" });
        return sendJson(req, res, 200, { step });
      }

      if (method === "PUT") {
        const existing = store.getDocument("funnelSteps", stepId);
        if (!existing) return sendJson(req, res, 404, { error: "Step not found" });
        const body = await readBody(req);
        const saved = await store.upsertDocument("funnelSteps", stepId, body);
        return sendJson(req, res, 200, { step: saved });
      }

      if (method === "DELETE") {
        const deleted = await store.deleteDocument("funnelSteps", stepId);
        if (!deleted) return sendJson(req, res, 404, { error: "Step not found" });
        return sendJson(req, res, 200, { deleted: true });
      }

      return sendJson(req, res, 405, { error: "Method not allowed" });
    },

    // ─── Funnel Submission ──────────────────────────────────────────────
    async handleFunnelSubmit(method, params, req, res, sendJson, readBody) {
      if (method !== "POST") return sendJson(req, res, 405, { error: "Method not allowed" });

      const { id: funnelId } = params;
      const funnel = store.getDocument("funnels", funnelId);
      if (!funnel) return sendJson(req, res, 404, { error: "Funnel not found" });

      const body = await readBody(req);
      const submission = new FunnelSubmission({
        funnelId,
        answers: body.answers || [],
        contact: body.contact || {},
        source: body.source || "funnel",
        metadata: body.metadata || {},
      });

      // Create contact in store
      let contactId = submission.contactId;
      if (!contactId && (submission.contact.email || submission.contact.phone)) {
        const existingContacts = store.listDocuments("contacts", c =>
          (submission.contact.email && c.email === submission.contact.email) ||
          (submission.contact.phone && c.phone === submission.contact.phone)
        );

        if (existingContacts.length > 0) {
          contactId = existingContacts[0].id;
          const updatedContact = { ...existingContacts[0] };
          updatedContact.customFields = {
            ...(updatedContact.customFields || {}),
            ...Object.fromEntries(
              (body.answers || []).map(a => [`funnel_${a.stepId || a.label || a.question}`, a.value])
            ),
            funnelSubmittedAt: new Date().toISOString(),
            funnelId,
          };
          if (submission.contact.name && !updatedContact.name) updatedContact.name = submission.contact.name;
          if (submission.contact.email && !updatedContact.email) updatedContact.email = submission.contact.email;
          if (submission.contact.phone && !updatedContact.phone) updatedContact.phone = submission.contact.phone;
          await store.upsertDocument("contacts", contactId, updatedContact);
        } else {
          const { default: _uuid } = await import("uuid");
          contactId = _uuid();
          await store.upsertDocument("contacts", contactId, {
            name: submission.contact.name || "Funnel Lead",
            email: submission.contact.email || "",
            phone: submission.contact.phone || "",
            customFields: {
              ...Object.fromEntries(
                (body.answers || []).map(a => [`funnel_${a.stepId || a.label || a.question}`, a.value])
              ),
              funnelSubmittedAt: new Date().toISOString(),
              funnelId,
            },
            source: "funnel",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      submission.contactId = contactId;

      // Create opportunity
      let pipelineId = funnel.pipelineId || body.pipelineId || "";
      let pipelineStageId = funnel.pipelineStageId || body.pipelineStageId || "";

      if (!pipelineId) {
        const pipelines = store.listDocuments("pipelines");
        if (pipelines.length > 0) {
          pipelineId = pipelines[0].id;
          pipelineStageId = pipelines[0].stages?.[0]?.id || "";
        }
      }

      const { default: _uuid2 } = await import("uuid");
      const opportunityId = _uuid2();
      await store.upsertDocument("opportunities", opportunityId, {
        pipelineId,
        pipelineStageId,
        contactId,
        source: "funnel",
        funnelId,
        campaignId: funnel.campaignId || body.campaignId || "",
        name: `Funnel: ${funnel.name}`,
        status: "open",
        contactName: submission.contact.name || "Funnel Lead",
        contactEmail: submission.contact.email || "",
        contactPhone: submission.contact.phone || "",
        customFields: {
          ...Object.fromEntries(
            (body.answers || []).map(a => [a.stepId || a.label || a.question, a.value])
          ),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      submission.opportunityId = opportunityId;
      submission.pipelineId = pipelineId;
      submission.pipelineStageId = pipelineStageId;

      const saved = await store.upsertDocument("funnelSubmissions", submission.id, submission.toJSON());

      // Trigger workflow if configured
      if (funnel.workflowId) {
        try {
          await workflowEngine.executeWorkflow(funnel.workflowId, {
            triggerType: "funnel_submission",
            contactId,
            opportunityId,
            submissionId: submission.id,
            funnelId,
            answers: body.answers || [],
          });
        } catch (err) {
          console.error(`[funnel] Workflow execution error for ${funnel.workflowId}:`, err.message);
        }
      }

      return sendJson(req, res, 201, {
        submission: saved,
        contactId,
        opportunityId,
        redirectUrl: funnel.settings?.redirectUrl || "",
      });
    },

    // ─── Funnel Embed ──────────────────────────────────────────────────
    async handleFunnelEmbed(method, params, req, res, sendJson) {
      if (method !== "GET") return sendJson(req, res, 405, { error: "Method not allowed" });

      const { id } = params;
      const funnel = store.getDocument("funnels", id);
      if (!funnel) return sendJson(req, res, 404, { error: "Funnel not found" });
      if (!funnel.published) return sendJson(req, res, 404, { error: "Funnel not published" });

      const steps = store.listDocuments("funnelSteps", s => s.funnelId === id)
        .sort((a, b) => a.order - b.order);

      const html = renderFunnel(funnel, steps);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(html);
    },
  };
}
