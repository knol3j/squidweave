/**
 * B2B database + scoring + compliance API routes.
 *
 * These are the endpoints the frontend needs to show the B2B work as a real
 * product rather than a library: browse the company/person database, see account
 * scores and rankings, and drive the compliance gate.
 *
 * Deliberately thin. Each handler validates its input, delegates to the engines,
 * and shapes the response. No business logic lives here, so the same behaviour is
 * testable through the modules directly.
 *
 * One convention carried over from the rest of this server: `campaignId` is not
 * required here. The B2B tables are global (companies and people are not scoped
 * to a campaign), so requiring one would be a fiction.
 */

import { scoreAllCompanies, rankCompanies, bandForScore } from "./account-scoring-engine.mjs";
import { checkOutreachAllowed, recordSuppression } from "./compliance-gate.mjs";
import { EmailVerificationQueue } from "./email-verifier.mjs";
import { candidatesFor } from "./email-candidates.mjs";
import { enrichWithFallbacks } from "./enrichment/index.mjs";
import { sendTelegramMessage } from "../adapters/telegram.mjs";
import {
  queueTelegramMessage,
  sendNextPendingMessages,
  handleTelegramUpdate,
  listTelegramSequences,
} from "./telegram-outreach-engine.mjs";

const DRY_RUN = process.env.DRY_RUN !== "false";

/** Clamp a numeric query param to a safe range. */
function intParam(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

/**
 * Map a `people` row from the store's snake_case columns to the camelCase shape the
 * UI types declare. Doing this at the HTTP boundary keeps the store's convention
 * (raw column names, matching relational-store) intact while the frontend gets one
 * consistent shape.
 */
function toApiPerson(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name || null,
    firstName: row.first_name || null,
    lastName: row.last_name || null,
    title: row.title || null,
    seniority: row.seniority || null,
    department: row.department || null,
    email: row.email || null,
    emailStatus: row.email_status || "unknown",
    confidence: Number(row.confidence) || 0,
    sourceType: row.source_type || null,
  };
}

/** Same boundary mapping for a `companies` row. */
function toApiCompany(row) {
  return {
    id: row.id,
    domain: row.domain,
    name: row.name || null,
    industry: row.industry || null,
    employeeRange: row.employee_range || null,
    location: row.location || null,
    description: row.description || null,
    linkedinUrl: row.linkedin_url || null,
    techStack: row.tech_stack || [],
    confidence: Number(row.confidence) || 0,
    firstSeenAt: row.first_seen_at || null,
    lastSeenAt: row.last_seen_at || null,
  };
}

/**
 * Register the B2B routes on the request handler.
 *
 * @param {object} deps
 * @param {Function} deps.match predicate (request, url) => boolean already applied by caller
 * @param {import("./b2b-store.mjs").B2BStore} deps.b2b
 * @param {Function} deps.sendJson (request, response, status, payload)
 * @param {Function} deps.readJsonBody (request) => Promise<object>
 * @param {Function} deps.log optional logger
 */
export function registerB2BRoutes({ b2b, sendJson, readJsonBody, log = () => {} }) {
  /**
   * @returns {boolean} true when this module handled the request
   */
  return async function handleB2B(request, response, url) {
    const method = request.method;
    const path = url.pathname;

    // ── Database browsing ────────────────────────────────────────

    if (method === "GET" && path === "/b2b/stats") {
      const stats = await b2b.stats();
      sendJson(request, response, 200, stats);
      return true;
    }

    if (method === "GET" && path === "/b2b/companies") {
      const limit = intParam(url.searchParams.get("limit"), 50, 1, 500);
      const offset = intParam(url.searchParams.get("offset"), 0, 0, 100000);
      const industry = url.searchParams.get("industry");
      const companies = await b2b.listCompanies({ limit, offset, industry });
      // Attach a person count so the list is renderable without N+1 requests.
      const withCounts = await Promise.all(
        companies.map(async company => ({
          ...toApiCompany(company),
          peopleCount: (await b2b.listPeople({ companyId: company.id, limit: 500 })).length,
        })),
      );
      sendJson(request, response, 200, withCounts);
      return true;
    }

    if (method === "GET" && path.startsWith("/b2b/companies/")) {
      const idOrDomain = decodeURIComponent(path.slice("/b2b/companies/".length));
      const company = idOrDomain.includes(".")
        ? await b2b.getCompanyByDomain(idOrDomain)
        : await b2b.getCompany(idOrDomain);
      if (!company) {
        sendJson(request, response, 404, { error: "company not found" });
        return true;
      }
      const people = (await b2b.listPeople({ companyId: company.id, limit: 500 })).map(toApiPerson);
      const rawScore = await b2b.getAccountScore(company.id);
      // The store returns raw column names (this project's convention). The UI
      // should not have to know that, so map to camelCase here, at the boundary.
      const accountScore = rawScore
        ? {
            score: Number(rawScore.score),
            band: bandForScore(Number(rawScore.score)),
            components: rawScore.components || {},
            scoredAt: rawScore.scored_at,
          }
        : null;
      sendJson(request, response, 200, { ...toApiCompany(company), people, accountScore });
      return true;
    }

    if (method === "GET" && path === "/b2b/people") {
      const limit = intParam(url.searchParams.get("limit"), 50, 1, 500);
      const offset = intParam(url.searchParams.get("offset"), 0, 0, 100000);
      const companyId = url.searchParams.get("companyId");
      const emailStatus = url.searchParams.get("emailStatus");
      const seniority = url.searchParams.get("seniority");
      const people = await b2b.listPeople({ limit, offset, companyId, emailStatus, seniority });
      sendJson(request, response, 200, people.map(toApiPerson));
      return true;
    }

    // ── Account scoring and ranking ──────────────────────────────

    if (method === "POST" && path === "/b2b/scores/recompute") {
      const { scored, results } = await scoreAllCompanies(b2b);
      log(`recomputed ${scored} account scores`);
      sendJson(request, response, 200, { scored, top: results.slice(0, 20) });
      return true;
    }

    if (method === "GET" && path === "/b2b/rankings") {
      const limit = intParam(url.searchParams.get("limit"), 50, 1, 500);
      const minScore = Number(url.searchParams.get("minScore")) || 0;
      const ranked = await rankCompanies(b2b, { limit, minScore });
      sendJson(request, response, 200, ranked);
      return true;
    }

    if (method === "GET" && path === "/b2b/scores") {
      const limit = intParam(url.searchParams.get("limit"), 50, 1, 500);
      const rows = await b2b._queryAll(
        `select s.score, s.components, s.scored_at, c.id as company_id, c.domain, c.name
         from account_scores s join companies c on c.id = s.company_id
         order by s.score desc limit $1`,
        [limit],
      );
      sendJson(request, response, 200, rows);
      return true;
    }

    // ── Email candidates and verification ────────────────────────

    if (method === "POST" && path === "/b2b/permute") {
      const body = await readJsonBody(request);
      const candidates = candidatesFor({
        firstName: body.firstName,
        lastName: body.lastName,
        fullName: body.fullName,
        companyDomain: body.domain,
      });
      if (candidates.length === 0) {
        sendJson(request, response, 400, {
          error: "need a domain and a first+last name to permute an address",
        });
        return true;
      }
      sendJson(request, response, 200, { candidates });
      return true;
    }

    if (method === "GET" && path === "/b2b/verification/pending") {
      const limit = intParam(url.searchParams.get("limit"), 100, 1, 500);
      const rows = await b2b.listPeopleNeedingVerification(limit);
      sendJson(request, response, 200, rows.map(row => ({
        id: row.id,
        email: row.email,
        emailStatus: row.email_status,
        domain: row.domain,
        companyName: row.company_name || row.domain,
      })));
      return true;
    }

    if (method === "POST" && path === "/b2b/verification/run") {
      const body = await readJsonBody(request);
      const queue = new EmailVerificationQueue({
        store: b2b,
        batchSize: intParam(body.batchSize, 25, 1, 100),
        paceMs: intParam(body.paceMs, 1500, 0, 60000),
      });
      const summary = await queue.run({ maxBatches: intParam(body.maxBatches, 4, 1, 50) });
      sendJson(request, response, 200, summary);
      return true;
    }

    if (method === "POST" && path === "/b2b/enrich") {
      const body = await readJsonBody(request);
      if (!body.personId && !body.domain) {
        sendJson(request, response, 400, { error: "personId or domain is required" });
        return true;
      }

      let person = null;
      if (body.personId) {
        person = await b2b.getPerson(body.personId);
        if (!person) {
          sendJson(request, response, 404, { error: "person not found" });
          return true;
        }
      }

      const company = person?.company_id ? await b2b.getCompany(person.company_id) : null;
      const result = await enrichWithFallbacks({
        domain: body.domain || company?.domain,
        firstName: body.firstName || person?.first_name,
        lastName: body.lastName || person?.last_name,
        company: body.company || company?.name,
        email: body.email || person?.email,
        connectors: body.connectors,
      });

      if (result.status === "verified" && result.email && person) {
        await b2b.updateEmailStatus(person.id, "verified");
        await b2b.upsertPerson(
          {
            id: person.id,
            email: result.email,
            emailStatus: "verified",
          },
          { type: result.source, url: null, raw: { enrichment: result } },
        );
      }

      sendJson(request, response, 200, result);
      return true;
    }

    // ── Compliance gate ──────────────────────────────────────────

    if (method === "POST" && path === "/b2b/compliance/check") {
      const body = await readJsonBody(request);
      if (!body.email) {
        sendJson(request, response, 400, { error: "email is required" });
        return true;
      }
      const result = await checkOutreachAllowed({
        store: b2b,
        email: body.email,
        domain: body.domain,
        consentBasis: body.consentBasis,
        allowRoleAccounts: body.allowRoleAccounts === true,
        campaignId: body.campaignId || null,
      });
      // 200 either way: a block is a valid answer, not a transport error. The
      // caller reads `allowed`.
      sendJson(request, response, 200, result);
      return true;
    }

    if (method === "POST" && path === "/b2b/compliance/suppress") {
      const body = await readJsonBody(request);
      if (!body.email) {
        sendJson(request, response, 400, { error: "email is required" });
        return true;
      }
      const entry = await recordSuppression({
        store: b2b,
        email: body.email,
        reason: body.reason || "unsubscribe",
        source: body.source || null,
        detail: body.detail || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      });
      log(`suppressed ${entry.email} (${entry.reason})`);
      sendJson(request, response, 201, entry);
      return true;
    }

    if (method === "POST" && path === "/b2b/compliance/suppress-domain") {
      const body = await readJsonBody(request);
      if (!body.domain) {
        sendJson(request, response, 400, { error: "domain is required" });
        return true;
      }
      const entry = await b2b.upsertDomainSuppression({
        domain: body.domain,
        reason: body.reason || "manual",
        source: body.source || null,
        detail: body.detail || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      });
      sendJson(request, response, 201, entry);
      return true;
    }

    if (method === "GET" && path === "/b2b/compliance/events") {
      const limit = intParam(url.searchParams.get("limit"), 100, 1, 500);
      const decision = url.searchParams.get("decision");
      const events = await b2b.listComplianceEvents({ decision, limit });
      sendJson(request, response, 200, events);
      return true;
    }

    if (method === "GET" && path === "/b2b/compliance/suppressions") {
      const limit = intParam(url.searchParams.get("limit"), 100, 1, 500);
      const rows = await b2b._queryAll(
        `select * from suppression_list order by created_at desc limit $1`,
        [limit],
      );
      sendJson(request, response, 200, rows);
      return true;
    }

    // ── Telegram outreach sequences ───────────────────────────────

    if (method === "POST" && path === "/b2b/telegram/message") {
      const body = await readJsonBody(request);
      if (!body.personId || !body.chatId || !body.body) {
        sendJson(request, response, 400, { error: "personId, chatId, and body are required" });
        return true;
      }
      const seq = await queueTelegramMessage(b2b, {
        personId: body.personId,
        chatId: String(body.chatId),
        body: body.body,
      });
      sendJson(request, response, 201, seq);
      return true;
    }

    if (method === "POST" && path === "/b2b/telegram/send-pending") {
      const body = await readJsonBody(request);
      const limit = intParam(body?.limit, 10, 1, 100);
      const result = await sendNextPendingMessages(
        b2b,
        ({ chatId, body: text }) =>
          sendTelegramMessage({ chatId, body: text, simulate: DRY_RUN || !process.env.TELEGRAM_BOT_TOKEN }),
        limit,
      );
      sendJson(request, response, 200, result);
      return true;
    }

    if (method === "POST" && path === "/b2b/telegram/webhook") {
      const body = await readJsonBody(request);
      const result = await handleTelegramUpdate(b2b, body);
      if (!result) {
        sendJson(request, response, 400, { error: "unprocessable update" });
        return true;
      }
      sendJson(request, response, 200, result);
      return true;
    }

    if (method === "GET" && path === "/b2b/telegram/sequences") {
      const personId = url.searchParams.get("personId");
      const state = url.searchParams.get("state");
      const limit = intParam(url.searchParams.get("limit"), 100, 1, 500);
      const rows = await listTelegramSequences(b2b, { personId, state, limit });
      sendJson(request, response, 200, rows);
      return true;
    }

    return false;
  };
}

export { intParam };
