/**
 * Relational Postgres store for SquidWeave.
 *
 * Replaces the single-JSONB-blob PostgresStateBackend with proper tables.
 * Each entity type gets its own table with typed columns and indexes.
 * The Store class keeps the same interface the app already uses
 * (listCampaigns, upsertCampaign, etc.) but every read/write hits Postgres.
 */
import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool } = pg;

export class RelationalStore {
  constructor(databaseUrl, options = {}) {
    this.databaseUrl = databaseUrl;
    this.poolSize = options.poolSize || 10;
    this.pool = null;
    this._sequence = 0;
  }

  async _getPool() {
    if (this.pool) return this.pool;
    this.pool = new Pool({
      connectionString: this.databaseUrl,
      max: this.poolSize,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      keepAlive: true,
    });
    this.pool.on("error", (err) => {
      console.error("[postgres] pool error:", err.message);
    });
    return this.pool;
  }

  async init() {
    const pool = await this._getPool();
    await pool.query("select 1"); // connectivity check
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  // ─── Generic helpers ──────────────────────────────────────────

  async _query(sql, params = []) {
    const pool = await this._getPool();
    return pool.query(sql, params);
  }

  async _queryOne(sql, params = []) {
    const result = await this._query(sql, params);
    return result.rows[0] || null;
  }

  async _queryAll(sql, params = []) {
    const result = await this._query(sql, params);
    return result.rows;
  }

  // ─── Campaigns ────────────────────────────────────────────────

  async listCampaigns() {
    return this._queryAll("select * from campaigns order by created_at desc");
  }

  async getCampaign(id) {
    return this._queryOne("select * from campaigns where id = $1", [id]);
  }

  async upsertCampaign(campaign) {
    const now = new Date().toISOString();
    const existing = await this.getCampaign(campaign.id);
    const merged = {
      createdAt: existing?.created_at || now,
      ...campaign,
      updatedAt: now,
    };
    await this._query(
      `insert into campaigns (id, name, status, goal, latest_content_pack_id, metrics, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       on conflict (id) do update set
         name = excluded.name, status = excluded.status, goal = excluded.goal,
         latest_content_pack_id = excluded.latest_content_pack_id,
         metrics = excluded.metrics, updated_at = excluded.updated_at`,
      [
        merged.id, merged.name || "", merged.status || "draft", merged.goal || "",
        merged.latestContentPackId || null, JSON.stringify(merged.metrics || {}),
        merged.createdAt, now,
      ]
    );
    return this.getCampaign(campaign.id);
  }

  // ─── Content Packs ────────────────────────────────────────────

  async listContentPacks(campaignId) {
    if (!campaignId) return this._queryAll("select * from content_packs order by created_at desc");
    return this._queryAll("select * from content_packs where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addContentPack(pack) {
    await this._query(
      "insert into content_packs (id, campaign_id, variants, created_at) values ($1, $2, $3::jsonb, $4)",
      [pack.id, pack.campaignId, JSON.stringify(pack.variants || []), pack.createdAt || new Date().toISOString()]
    );
    return pack;
  }

  async getLatestContentPack(campaignId) {
    return this._queryOne(
      "select * from content_packs where campaign_id = $1 order by created_at desc limit 1",
      [campaignId]
    );
  }

  // ─── Target Profiles ──────────────────────────────────────────

  async listTargetProfiles(campaignId) {
    if (!campaignId) return this._queryAll("select * from target_profiles order by fit_score desc");
    return this._queryAll(
      "select * from target_profiles where campaign_id = $1 order by fit_score desc",
      [campaignId]
    );
  }

  async replaceTargetProfiles(campaignId, profiles) {
    const client = await (await this._getPool()).connect();
    try {
      await client.query("begin");
      await client.query("delete from target_profiles where campaign_id = $1", [campaignId]);
      for (const p of profiles) {
        await client.query(
          `insert into target_profiles (id, campaign_id, target_id, company, segment, fit_score, decision_maker, signals, enrichment, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)`,
          [p.id, campaignId, p.targetId || "", p.company || "", p.segment || "",
           p.fitScore || 0, p.decisionMaker || null,
           JSON.stringify(p.signals || []), JSON.stringify(p.enrichment || {}),
           p.createdAt || new Date().toISOString()]
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    return profiles;
  }

  // ─── Research Records ─────────────────────────────────────────

  async listResearchRecords(campaignId) {
    if (!campaignId) return this._queryAll("select * from research_records order by created_at desc");
    return this._queryAll(
      "select * from research_records where campaign_id = $1 order by created_at desc",
      [campaignId]
    );
  }

  async addResearchRecord(record) {
    const now = new Date().toISOString();
    await this._query(
      `insert into research_records (id, campaign_id, source, url, domain, title, insight, summary, finding, content, origin, source_url, metadata, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15)
       on conflict (id) do update set
         source = excluded.source, url = excluded.url, domain = excluded.domain,
         title = excluded.title, insight = excluded.insight, summary = excluded.summary,
         finding = excluded.finding, content = excluded.content, origin = excluded.origin,
         source_url = excluded.source_url, metadata = excluded.metadata, updated_at = excluded.updated_at`,
      [record.id, record.campaignId, record.source || "", record.url || null,
       record.domain || null, record.title || null, record.insight || null,
       record.summary || null, record.finding || null, record.content || null,
       record.origin || null, record.sourceUrl || null,
       JSON.stringify(record.metadata || {}), record.createdAt || now, now]
    );
    return record;
  }

  // ─── Playbooks ────────────────────────────────────────────────

  async listPlaybooks(campaignId) {
    if (!campaignId) return this._queryAll("select * from playbooks order by created_at desc");
    return this._queryAll("select * from playbooks where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async replacePlaybooks(campaignId, playbooks) {
    const client = await (await this._getPool()).connect();
    try {
      await client.query("begin");
      await client.query("delete from playbooks where campaign_id = $1", [campaignId]);
      for (const p of playbooks) {
        await client.query(
          `insert into playbooks (id, campaign_id, title, content, tactics, observations, created_at, updated_at)
           values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $7)`,
          [p.id, campaignId, p.title || "", p.content || "",
           JSON.stringify(p.tactics || []), JSON.stringify(p.observations || []),
           p.createdAt || new Date().toISOString()]
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    return playbooks;
  }

  // ─── Outreach Events ──────────────────────────────────────────

  async listOutreachEvents(campaignId, targetId) {
    let sql = "select * from outreach_events where 1=1";
    const params = [];
    if (campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(campaignId); }
    if (targetId) { sql += ` and target_id = $${params.length + 1}`; params.push(targetId); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async addOutreachEvent(event) {
    await this._query(
      `insert into outreach_events (id, campaign_id, target_id, type, channel, status, sent_at, subject, error, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
      [event.id, event.campaignId, event.targetId || null, event.type || "",
       event.channel || "", event.status || "", event.sentAt || null,
       event.subject || null, event.error || null,
       JSON.stringify(event.metadata || {}), event.createdAt || new Date().toISOString()]
    );
    return event;
  }

  // ─── Analytics Events ─────────────────────────────────────────

  async listAnalyticsEvents(campaignId) {
    if (!campaignId) return this._queryAll("select * from analytics_events order by created_at desc");
    return this._queryAll("select * from analytics_events where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addAnalyticsEvent(event) {
    await this._query(
      `insert into analytics_events (id, campaign_id, type, channel, count, date, metadata, created_at)
       values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [event.campaignId, event.type || "", event.channel || "",
       event.count || 0, event.date || null,
       JSON.stringify(event.metadata || {}), event.createdAt || new Date().toISOString()]
    );
    return event;
  }

  // ─── Automation Runs ──────────────────────────────────────────

  async listAutomationRuns(campaignId) {
    if (!campaignId) return this._queryAll("select * from automation_runs order by created_at desc");
    return this._queryAll("select * from automation_runs where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addAutomationRun(run) {
    await this._query(
      `insert into automation_runs (id, campaign_id, reason, status, result, started_at, completed_at, error, created_at)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [run.id, run.campaignId || null, run.reason || null, run.status || "pending",
       JSON.stringify(run.result || {}), run.startedAt || null, run.completedAt || null,
       run.error || null, run.createdAt || new Date().toISOString()]
    );
    return run;
  }

  // ─── Agent Runs ───────────────────────────────────────────────

  async listAgentRuns(campaignId) {
    if (!campaignId) return this._queryAll("select * from agent_runs order by created_at desc");
    return this._queryAll("select * from agent_runs where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addAgentRuns(runs) {
    const client = await (await this._getPool()).connect();
    try {
      await client.query("begin");
      for (const run of runs) {
        await client.query(
          `insert into agent_runs (id, campaign_id, agent, role, status, input, output, started_at, completed_at, error, created_at)
           values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11)`,
          [run.id, run.campaignId || null, run.agent || "", run.role || "",
           run.status || "pending", JSON.stringify(run.input || {}),
           JSON.stringify(run.output || {}), run.startedAt || null,
           run.completedAt || null, run.error || null,
           run.createdAt || new Date().toISOString()]
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    return runs;
  }

  async upsertAgentHeartbeat(heartbeat) {
    const key = heartbeat.agent || heartbeat.name || heartbeat.id;
    if (!key) throw new Error("agent is required for heartbeat");
    await this._query(
      `insert into agent_heartbeats (agent, status, last_run_at, metadata, updated_at)
       values ($1, $2, $3, $4::jsonb, now())
       on conflict (agent) do update set
         status = excluded.status, last_run_at = excluded.last_run_at,
         metadata = excluded.metadata, updated_at = now()`,
      [key, heartbeat.status || "unknown", heartbeat.lastRunAt || null,
       JSON.stringify(heartbeat.metadata || {})]
    );
    return heartbeat;
  }

  async listAgentHeartbeats() {
    return this._queryAll("select * from agent_heartbeats order by updated_at desc");
  }

  // ─── Decisions ────────────────────────────────────────────────

  async listDecisions(campaignId) {
    if (!campaignId) return this._queryAll("select * from decisions order by created_at desc");
    return this._queryAll("select * from decisions where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addDecision(decision) {
    await this._query(
      `insert into decisions (id, campaign_id, decision, reasoning, created_at)
       values (gen_random_uuid()::text, $1, $2::jsonb, $3, $4)`,
      [decision.campaignId, JSON.stringify(decision.decision || decision),
       decision.reasoning || null, decision.createdAt || new Date().toISOString()]
    );
    return decision;
  }

  // ─── Sourced Contacts ─────────────────────────────────────────

  async listSourcedContacts(campaignId) {
    if (!campaignId) return this._queryAll("select * from sourced_contacts order by created_at desc");
    return this._queryAll("select * from sourced_contacts where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addSourcedContacts(contacts) {
    const client = await (await this._getPool()).connect();
    try {
      await client.query("begin");
      for (const c of contacts) {
        await client.query(
          `insert into sourced_contacts (id, campaign_id, email, first_name, last_name, company, title, linkedin_url, source, score, status, enrichment, metadata, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $14)
           on conflict (id) do update set
             email = excluded.email, first_name = excluded.first_name,
             last_name = excluded.last_name, company = excluded.company,
             title = excluded.title, linkedin_url = excluded.linkedin_url,
             source = excluded.source, score = excluded.score,
             status = excluded.status, enrichment = excluded.enrichment,
             metadata = excluded.metadata, updated_at = excluded.updated_at`,
          [c.id, c.campaignId, c.email || "", c.firstName || null, c.lastName || null,
           c.company || null, c.title || null, c.linkedinUrl || null,
           c.source || "", c.score ?? null, c.status || "new",
           JSON.stringify(c.enrichment || {}), JSON.stringify(c.metadata || {}),
           c.createdAt || new Date().toISOString()]
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    return contacts;
  }

  async updateSourcedContacts(campaignId, updates) {
    const client = await (await this._getPool()).connect();
    try {
      await client.query("begin");
      for (const u of updates) {
        const sets = [];
        const params = [u.id, campaignId];
        let idx = 3;
        if (u.status !== undefined) { sets.push(`status = $${idx}`); params.push(u.status); idx++; }
        if (u.score !== undefined) { sets.push(`score = $${idx}`); params.push(u.score); idx++; }
        if (u.enrichment !== undefined) { sets.push(`enrichment = $${idx}::jsonb`); params.push(JSON.stringify(u.enrichment)); idx++; }
        sets.push(`updated_at = now()`);
        if (sets.length > 1) {
          await client.query(
            `update sourced_contacts set ${sets.join(", ")} where id = $1 and campaign_id = $2`,
            params
          );
        }
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    return this.listSourcedContacts(campaignId);
  }

  // ─── Prospecting Runs ─────────────────────────────────────────

  async listProspectingRuns(campaignId) {
    if (!campaignId) return this._queryAll("select * from prospecting_runs order by created_at desc");
    return this._queryAll("select * from prospecting_runs where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addProspectingRun(run) {
    await this._query(
      `insert into prospecting_runs (id, campaign_id, status, source, contacts_found, started_at, completed_at, error, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [run.id, run.campaignId, run.status || "pending", run.source || "",
       run.contactsFound || 0, run.startedAt || null, run.completedAt || null,
       run.error || null, run.createdAt || new Date().toISOString()]
    );
    return run;
  }

  // ─── Activation Runs ──────────────────────────────────────────

  async listActivationRuns(campaignId) {
    if (!campaignId) return this._queryAll("select * from activation_runs order by created_at desc");
    return this._queryAll("select * from activation_runs where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addActivationRun(run) {
    await this._query(
      `insert into activation_runs (id, campaign_id, status, channels, contacts_activated, started_at, completed_at, error, created_at)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)`,
      [run.id, run.campaignId, run.status || "pending",
       JSON.stringify(run.channels || []), run.contactsActivated || 0,
       run.startedAt || null, run.completedAt || null,
       run.error || null, run.createdAt || new Date().toISOString()]
    );
    return run;
  }

  // ─── Investors & Funding ──────────────────────────────────────

  async listInvestorRecords(campaignId) {
    if (!campaignId) return this._queryAll("select * from investor_records order by match_score desc");
    return this._queryAll(
      "select * from investor_records where campaign_id = $1 order by match_score desc",
      [campaignId]
    );
  }

  async addInvestorRecords(records) {
    const client = await (await this._getPool()).connect();
    try {
      await client.query("begin");
      for (const r of records) {
        await client.query(
          `insert into investor_records (id, campaign_id, name, firm, type, status, match_score, email, linkedin, check_size, focus, stage, location, enrichment, last_enriched_at, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14::jsonb, $15, $16, $16)
           on conflict (id) do update set
             name = excluded.name, firm = excluded.firm, type = excluded.type,
             status = excluded.status, match_score = excluded.match_score,
             email = excluded.email, linkedin = excluded.linkedin,
             check_size = excluded.check_size, focus = excluded.focus,
             stage = excluded.stage, location = excluded.location,
             enrichment = excluded.enrichment, last_enriched_at = excluded.last_enriched_at,
             updated_at = excluded.updated_at`,
          [r.id, r.campaignId, r.name || "", r.firm || "", r.type || "",
           r.status || "new", r.matchScore || 0, r.email || null, r.linkedin || null,
           r.checkSize || null, JSON.stringify(r.focus || []), r.stage || null,
           r.location || null, JSON.stringify(r.enrichment || {}),
           r.lastEnrichedAt || null, r.createdAt || new Date().toISOString()]
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    return records;
  }

  async listFundingRuns(campaignId) {
    if (!campaignId) return this._queryAll("select * from funding_runs order by created_at desc");
    return this._queryAll("select * from funding_runs where campaign_id = $1 order by created_at desc", [campaignId]);
  }

  async addFundingRun(run) {
    await this._query(
      `insert into funding_runs (id, campaign_id, status, investors_targeted, investors_reached, responses, meetings_booked, started_at, completed_at, error, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [run.id, run.campaignId, run.status || "pending",
       run.investorsTargeted || 0, run.investorsReached || 0,
       run.responses || 0, run.meetingsBooked || 0,
       run.startedAt || null, run.completedAt || null,
       run.error || null, run.createdAt || new Date().toISOString()]
    );
    return run;
  }

  async listFundingOutreachEvents(campaignId) {
    if (!campaignId) return this._queryAll("select * from funding_outreach_events order by created_at desc");
    return this._queryAll(
      "select * from funding_outreach_events where campaign_id = $1 order by created_at desc",
      [campaignId]
    );
  }

  async addFundingOutreachEvents(events) {
    const client = await (await this._getPool()).connect();
    try {
      await client.query("begin");
      for (const e of events) {
        await client.query(
          `insert into funding_outreach_events (id, campaign_id, investor_id, investor_name, type, channel, status, sent_at, responded_at, subject, body, error, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [e.id, e.campaignId, e.investorId, e.investorName || "",
           e.type || "", e.channel || "", e.status || "",
           e.sentAt || null, e.respondedAt || null, e.subject || null,
           e.body || null, e.error || null, e.createdAt || new Date().toISOString()]
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    return events;
  }

  // ─── Execution Receipts & DLQ ─────────────────────────────────

  async listExecutionReceipts(filters = {}) {
    let sql = "select * from execution_receipts where 1=1";
    const params = [];
    if (filters.campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(filters.campaignId); }
    if (filters.executionType) { sql += ` and execution_type = $${params.length + 1}`; params.push(filters.executionType); }
    if (filters.status) { sql += ` and status = $${params.length + 1}`; params.push(filters.status); }
    if (filters.idempotencyKey) { sql += ` and idempotency_key = $${params.length + 1}`; params.push(filters.idempotencyKey); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async getExecutionReceipt(id) {
    return this._queryOne("select * from execution_receipts where id = $1", [id]);
  }

  async addExecutionReceipt(receipt) {
    await this._query(
      `insert into execution_receipts (id, campaign_id, execution_type, status, idempotency_key, payload, result, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $8)
       on conflict (idempotency_key) do nothing`,
      [receipt.id, receipt.campaignId || null, receipt.executionType || "",
       receipt.status || "pending", receipt.idempotencyKey || null,
       JSON.stringify(receipt.payload || {}), JSON.stringify(receipt.result || {}),
       receipt.createdAt || new Date().toISOString()]
    );
    return receipt;
  }

  async updateExecutionReceipt(id, patch) {
    const sets = [];
    const params = [id];
    let idx = 2;
    if (patch.status !== undefined) { sets.push(`status = $${idx}`); params.push(patch.status); idx++; }
    if (patch.result !== undefined) { sets.push(`result = $${idx}::jsonb`); params.push(JSON.stringify(patch.result)); idx++; }
    sets.push("updated_at = now()");
    await this._query(`update execution_receipts set ${sets.join(", ")} where id = $1`, params);
    return this.getExecutionReceipt(id);
  }

  async addDlqEntry(entry) {
    await this._query(
      "insert into dead_letter_queue (id, campaign_id, run_id, error, payload, failed_at) values ($1, $2, $3, $4, $5::jsonb, $6)",
      [entry.id, entry.campaignId || null, entry.runId || null,
       entry.error || "", JSON.stringify(entry.payload || {}),
       entry.failedAt || new Date().toISOString()]
    );
    return entry;
  }

  async listDlqEntries(filters = {}) {
    let sql = "select * from dead_letter_queue where 1=1";
    const params = [];
    if (filters.campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(filters.campaignId); }
    if (filters.runId) { sql += ` and run_id = $${params.length + 1}`; params.push(filters.runId); }
    if (filters.since) { sql += ` and failed_at >= $${params.length + 1}`; params.push(filters.since); }
    sql += " order by failed_at desc";
    return this._queryAll(sql, params);
  }

  async popDlqEntry(id) {
    const entry = await this._queryOne("select * from dead_letter_queue where id = $1", [id]);
    if (entry) {
      await this._query("delete from dead_letter_queue where id = $1", [id]);
    }
    return entry;
  }

  // ─── CRM: Contacts ────────────────────────────────────────────

  async listContacts(locationId, campaignId) {
    let sql = "select * from contacts where 1=1";
    const params = [];
    if (locationId) { sql += ` and location_id = $${params.length + 1}`; params.push(locationId); }
    if (campaignId) { sql += ` and campaign_ids @> $${params.length + 1}::jsonb`; params.push(JSON.stringify([campaignId])); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async getContact(id) {
    return this._queryOne("select * from contacts where id = $1", [id]);
  }

  async upsertContact(data) {
    const now = new Date().toISOString();
    const existing = await this.getContact(data.id);
    await this._query(
      `insert into contacts (id, location_id, campaign_ids, company_name, full_name, first_name, last_name, email, phone, website, linkedin_url, city, state, country, tags, custom_fields, dnd, enrichment_status, verification_status, sequence_status, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb, $17, $18, $19, $20, $21, $22)
       on conflict (id) do update set
         location_id = excluded.location_id, campaign_ids = excluded.campaign_ids,
         company_name = excluded.company_name, full_name = excluded.full_name,
         first_name = excluded.first_name, last_name = excluded.last_name,
         email = excluded.email, phone = excluded.phone, website = excluded.website,
         linkedin_url = excluded.linkedin_url, city = excluded.city, state = excluded.state,
         country = excluded.country, tags = excluded.tags, custom_fields = excluded.custom_fields,
         dnd = excluded.dnd, enrichment_status = excluded.enrichment_status,
         verification_status = excluded.verification_status, sequence_status = excluded.sequence_status,
         updated_at = excluded.updated_at`,
      [data.id, data.locationId || null, JSON.stringify(data.campaignIds || []),
       data.companyName || null, data.fullName || null, data.firstName || null,
       data.lastName || null, data.email || null, data.phone || null,
       data.website || null, data.linkedinUrl || null, data.city || null,
       data.state || null, data.country || null, JSON.stringify(data.tags || []),
       JSON.stringify(data.customFields || {}), data.dnd || false,
       data.enrichmentStatus || "pending", data.verificationStatus || "pending",
       data.sequenceStatus || "unplanned", existing?.created_at || now, now]
    );
    return this.getContact(data.id);
  }

  async deleteContact(id) {
    await this._query("delete from contacts where id = $1", [id]);
    return true;
  }

  // ─── CRM: Pipelines ───────────────────────────────────────────

  async listPipelines(locationId) {
    if (!locationId) return this._queryAll("select * from pipelines order by created_at desc");
    return this._queryAll("select * from pipelines where location_id = $1 order by created_at desc", [locationId]);
  }

  async upsertPipeline(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from pipelines where id = $1", [data.id]);
    await this._query(
      `insert into pipelines (id, location_id, name, stages, show_in_funnel, created_at, updated_at)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7)
       on conflict (id) do update set
         location_id = excluded.location_id, name = excluded.name,
         stages = excluded.stages, show_in_funnel = excluded.show_in_funnel,
         updated_at = excluded.updated_at`,
      [data.id, data.locationId || null, data.name || "",
       JSON.stringify(data.stages || []), data.showInFunnel !== false,
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from pipelines where id = $1", [data.id]);
  }

  async deletePipeline(id) {
    await this._query("delete from pipelines where id = $1", [id]);
    return true;
  }

  // ─── CRM: Opportunities ───────────────────────────────────────

  async listOpportunities(campaignId, pipelineId) {
    let sql = "select * from opportunities where 1=1";
    const params = [];
    if (campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(campaignId); }
    if (pipelineId) { sql += ` and pipeline_id = $${params.length + 1}`; params.push(pipelineId); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async upsertOpportunity(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from opportunities where id = $1", [data.id]);
    await this._query(
      `insert into opportunities (id, location_id, pipeline_id, pipeline_stage_id, contact_id, campaign_id, name, status, monetary_value, currency, source, custom_fields, assigned_to, notes, lost_reason, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17)
       on conflict (id) do update set
         location_id = excluded.location_id, pipeline_id = excluded.pipeline_id,
         pipeline_stage_id = excluded.pipeline_stage_id, contact_id = excluded.contact_id,
         campaign_id = excluded.campaign_id, name = excluded.name,
         status = excluded.status, monetary_value = excluded.monetary_value,
         currency = excluded.currency, source = excluded.source,
         custom_fields = excluded.custom_fields, assigned_to = excluded.assigned_to,
         notes = excluded.notes, lost_reason = excluded.lost_reason,
         updated_at = excluded.updated_at`,
      [data.id, data.locationId || null, data.pipelineId || null,
       data.pipelineStageId || null, data.contactId || null, data.campaignId || null,
       data.name || "", data.status || "open", data.monetaryValue || 0,
       data.currency || "USD", data.source || null,
       JSON.stringify(data.customFields || {}), data.assignedTo || null,
       data.notes || null, data.lostReason || null,
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from opportunities where id = $1", [data.id]);
  }

  async deleteOpportunity(id) {
    await this._query("delete from opportunities where id = $1", [id]);
    return true;
  }

  async getContactOpportunities(contactId) {
    return this._queryAll("select * from opportunities where contact_id = $1 order by created_at desc", [contactId]);
  }

  async getPipelineOpportunities(pipelineId) {
    return this._queryAll("select * from opportunities where pipeline_id = $1 order by created_at desc", [pipelineId]);
  }

  // ─── CRM: Workflows ───────────────────────────────────────────

  async listWorkflows(locationId, campaignId) {
    let sql = "select * from workflows where 1=1";
    const params = [];
    if (locationId) { sql += ` and location_id = $${params.length + 1}`; params.push(locationId); }
    if (campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(campaignId); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async upsertWorkflow(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from workflows where id = $1", [data.id]);
    await this._query(
      `insert into workflows (id, location_id, campaign_id, name, description, status, trigger_type, trigger_config, step_ids, published_version, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12)
       on conflict (id) do update set
         location_id = excluded.location_id, campaign_id = excluded.campaign_id,
         name = excluded.name, description = excluded.description,
         status = excluded.status, trigger_type = excluded.trigger_type,
         trigger_config = excluded.trigger_config, step_ids = excluded.step_ids,
         published_version = excluded.published_version, updated_at = excluded.updated_at`,
      [data.id, data.locationId || null, data.campaignId || null,
       data.name || "", data.description || null, data.status || "draft",
       data.triggerType || "manual", JSON.stringify(data.triggerConfig || {}),
       JSON.stringify(data.stepIds || []), data.publishedVersion || null,
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from workflows where id = $1", [data.id]);
  }

  async deleteWorkflow(id) {
    await this._query("delete from workflows where id = $1", [id]);
    return true;
  }

  async listWorkflowSteps(workflowId) {
    return this._queryAll(
      'select * from workflow_steps where workflow_id = $1 order by "order"',
      [workflowId]
    );
  }

  async upsertWorkflowStep(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from workflow_steps where id = $1", [data.id]);
    await this._query(
      `insert into workflow_steps (id, workflow_id, type, "order", config, branches, parent_step_id, created_at, updated_at)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
       on conflict (id) do update set
         workflow_id = excluded.workflow_id, type = excluded.type,
         "order" = excluded."order", config = excluded.config,
         branches = excluded.branches, parent_step_id = excluded.parent_step_id,
         updated_at = excluded.updated_at`,
      [data.id, data.workflowId, data.type || "delay", data.order || 0,
       JSON.stringify(data.config || {}), JSON.stringify(data.branches || []),
       data.parentStepId || null, existing?.created_at || now, now]
    );
    return this._queryOne("select * from workflow_steps where id = $1", [data.id]);
  }

  async deleteWorkflowStep(id) {
    await this._query("delete from workflow_steps where id = $1", [id]);
    return true;
  }

  // ─── CRM: Notes, Tasks, Calendar, Tags ────────────────────────

  async listNotes(contactId, campaignId) {
    let sql = "select * from notes where 1=1";
    const params = [];
    if (contactId) { sql += ` and contact_id = $${params.length + 1}`; params.push(contactId); }
    if (campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(campaignId); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async upsertNote(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from notes where id = $1", [data.id]);
    await this._query(
      `insert into notes (id, contact_id, campaign_id, body, author, pinned, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         contact_id = excluded.contact_id, campaign_id = excluded.campaign_id,
         body = excluded.body, author = excluded.author,
         pinned = excluded.pinned, updated_at = excluded.updated_at`,
      [data.id, data.contactId || null, data.campaignId || null,
       data.body || "", data.author || null, data.pinned || false,
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from notes where id = $1", [data.id]);
  }

  async deleteNote(id) {
    await this._query("delete from notes where id = $1", [id]);
    return true;
  }

  async listTasks(contactId, campaignId, status) {
    let sql = "select * from tasks where 1=1";
    const params = [];
    if (contactId) { sql += ` and contact_id = $${params.length + 1}`; params.push(contactId); }
    if (campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(campaignId); }
    if (status) { sql += ` and status = $${params.length + 1}`; params.push(status); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async upsertTask(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from tasks where id = $1", [data.id]);
    await this._query(
      `insert into tasks (id, contact_id, campaign_id, title, body, status, priority, due_date, assigned_to, completed_at, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update set
         contact_id = excluded.contact_id, campaign_id = excluded.campaign_id,
         title = excluded.title, body = excluded.body, status = excluded.status,
         priority = excluded.priority, due_date = excluded.due_date,
         assigned_to = excluded.assigned_to, completed_at = excluded.completed_at,
         updated_at = excluded.updated_at`,
      [data.id, data.contactId || null, data.campaignId || null,
       data.title || "", data.body || null, data.status || "pending",
       data.priority || "medium", data.dueDate || null, data.assignedTo || null,
       data.completedAt || null, existing?.created_at || now, now]
    );
    return this._queryOne("select * from tasks where id = $1", [data.id]);
  }

  async deleteTask(id) {
    await this._query("delete from tasks where id = $1", [id]);
    return true;
  }

  async listCalendarEvents(contactId, campaignId, status) {
    let sql = "select * from calendar_events where 1=1";
    const params = [];
    if (contactId) { sql += ` and contact_id = $${params.length + 1}`; params.push(contactId); }
    if (campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(campaignId); }
    if (status) { sql += ` and status = $${params.length + 1}`; params.push(status); }
    sql += " order by start_time asc";
    return this._queryAll(sql, params);
  }

  async upsertCalendarEvent(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from calendar_events where id = $1", [data.id]);
    await this._query(
      `insert into calendar_events (id, contact_id, campaign_id, title, description, start_time, end_time, status, location, meeting_link, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update set
         contact_id = excluded.contact_id, campaign_id = excluded.campaign_id,
         title = excluded.title, description = excluded.description,
         start_time = excluded.start_time, end_time = excluded.end_time,
         status = excluded.status, location = excluded.location,
         meeting_link = excluded.meeting_link, updated_at = excluded.updated_at`,
      [data.id, data.contactId || null, data.campaignId || null,
       data.title || "", data.description || null, data.startTime, data.endTime,
       data.status || "scheduled", data.location || null, data.meetingLink || null,
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from calendar_events where id = $1", [data.id]);
  }

  async deleteCalendarEvent(id) {
    await this._query("delete from calendar_events where id = $1", [id]);
    return true;
  }

  async listTags(locationId) {
    if (!locationId) return this._queryAll("select * from tags order by name");
    return this._queryAll("select * from tags where location_id = $1 order by name", [locationId]);
  }

  async upsertTag(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from tags where id = $1", [data.id]);
    await this._query(
      `insert into tags (id, location_id, name, color, contact_count, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         location_id = excluded.location_id, name = excluded.name,
         color = excluded.color, contact_count = excluded.contact_count,
         updated_at = excluded.updated_at`,
      [data.id, data.locationId || null, data.name || "",
       data.color || "#6366f1", data.contactCount || 0,
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from tags where id = $1", [data.id]);
  }

  async deleteTag(id) {
    await this._query("delete from tags where id = $1", [id]);
    return true;
  }

  // ─── Funnels ──────────────────────────────────────────────────

  async listFunnels(locationId, campaignId) {
    let sql = "select * from funnels where 1=1";
    const params = [];
    if (locationId) { sql += ` and location_id = $${params.length + 1}`; params.push(locationId); }
    if (campaignId) { sql += ` and campaign_id = $${params.length + 1}`; params.push(campaignId); }
    sql += " order by created_at desc";
    return this._queryAll(sql, params);
  }

  async getFunnel(id) {
    return this._queryOne("select * from funnels where id = $1", [id]);
  }

  async upsertFunnel(data) {
    const now = new Date().toISOString();
    const existing = await this.getFunnel(data.id);
    await this._query(
      `insert into funnels (id, location_id, campaign_id, workflow_id, name, description, settings, published, tags, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11)
       on conflict (id) do update set
         location_id = excluded.location_id, campaign_id = excluded.campaign_id,
         workflow_id = excluded.workflow_id, name = excluded.name,
         description = excluded.description, settings = excluded.settings,
         published = excluded.published, tags = excluded.tags,
         updated_at = excluded.updated_at`,
      [data.id, data.locationId || null, data.campaignId || null,
       data.workflowId || null, data.name || "", data.description || null,
       JSON.stringify(data.settings || {}), data.published || false,
       JSON.stringify(data.tags || []), existing?.created_at || now, now]
    );
    return this.getFunnel(data.id);
  }

  async deleteFunnel(id) {
    await this._query("delete from funnel_steps where funnel_id = $1", [id]);
    await this._query("delete from funnels where id = $1", [id]);
    return true;
  }

  async listFunnelSteps(funnelId) {
    return this._queryAll(
      'select * from funnel_steps where funnel_id = $1 order by "order"',
      [funnelId]
    );
  }

  async upsertFunnelStep(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from funnel_steps where id = $1", [data.id]);
    await this._query(
      `insert into funnel_steps (id, funnel_id, type, "order", title, description, required, placeholder, fields, choices, next_step_map, image_url, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14)
       on conflict (id) do update set
         funnel_id = excluded.funnel_id, type = excluded.type,
         "order" = excluded."order", title = excluded.title,
         description = excluded.description, required = excluded.required,
         placeholder = excluded.placeholder, fields = excluded.fields,
         choices = excluded.choices, next_step_map = excluded.next_step_map,
         image_url = excluded.image_url, updated_at = excluded.updated_at`,
      [data.id, data.funnelId, data.type || "question", data.order || 0,
       data.title || "", data.description || null, data.required !== false,
       data.placeholder || null, JSON.stringify(data.fields || []),
       JSON.stringify(data.choices || []), JSON.stringify(data.nextStepMap || {}),
       data.imageUrl || null, existing?.created_at || now, now]
    );
    return this._queryOne("select * from funnel_steps where id = $1", [data.id]);
  }

  async deleteFunnelStep(id) {
    await this._query("delete from funnel_steps where id = $1", [id]);
    return true;
  }

  async addFunnelSubmission(data) {
    await this._query(
      `insert into funnel_submissions (id, funnel_id, contact_id, opportunity_id, pipeline_id, pipeline_stage_id, answers, contact_info, source, metadata, completed_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10::jsonb, $11, $11)`,
      [data.id, data.funnelId, data.contactId || null, data.opportunityId || null,
       data.pipelineId || null, data.pipelineStageId || null,
       JSON.stringify(data.answers || []), JSON.stringify(data.contact || {}),
       data.source || "funnel", JSON.stringify(data.metadata || {}),
       data.completedAt || new Date().toISOString()]
    );
    return data;
  }

  async listFunnelSubmissions(funnelId) {
    if (!funnelId) return this._queryAll("select * from funnel_submissions order by created_at desc");
    return this._queryAll(
      "select * from funnel_submissions where funnel_id = $1 order by created_at desc",
      [funnelId]
    );
  }

  // ─── Messaging ────────────────────────────────────────────────

  async listMessageTemplates() {
    return this._queryAll("select * from message_templates order by created_at desc");
  }

  async upsertMessageTemplate(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from message_templates where id = $1", [data.id]);
    await this._query(
      `insert into message_templates (id, name, channel, subject, body, trigger_on, variables, active, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
       on conflict (id) do update set
         name = excluded.name, channel = excluded.channel,
         subject = excluded.subject, body = excluded.body,
         trigger_on = excluded.trigger_on, variables = excluded.variables,
         active = excluded.active, updated_at = excluded.updated_at`,
      [data.id, data.name || "", data.channel || "", data.subject || null,
       data.body || "", data.triggerOn || "funnel_submission",
       JSON.stringify(data.variables || []), data.active !== false,
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from message_templates where id = $1", [data.id]);
  }

  async listMessageSequences() {
    return this._queryAll("select * from message_sequences order by created_at desc");
  }

  async upsertMessageSequence(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from message_sequences where id = $1", [data.id]);
    await this._query(
      `insert into message_sequences (id, name, steps, active, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5, $6)
       on conflict (id) do update set
         name = excluded.name, steps = excluded.steps,
         active = excluded.active, updated_at = excluded.updated_at`,
      [data.id, data.name || "", JSON.stringify(data.steps || []),
       data.active !== false, existing?.created_at || now, now]
    );
    return this._queryOne("select * from message_sequences where id = $1", [data.id]);
  }

  // ─── Connector Configs ────────────────────────────────────────

  async listConnectorConfigs() {
    return this._queryAll("select * from connector_configs order by connector");
  }

  async getConnectorConfig(connector) {
    return this._queryOne("select * from connector_configs where connector = $1", [connector]);
  }

  async upsertConnectorConfig(connector, config) {
    await this._query(
      `insert into connector_configs (connector, settings, enabled, configured, last_sync, error, updated_at)
       values ($1, $2::jsonb, $3, $4, $5, $6, now())
       on conflict (connector) do update set
         settings = excluded.settings, enabled = excluded.enabled,
         configured = excluded.configured, last_sync = excluded.last_sync,
         error = excluded.error, updated_at = now()`,
      [connector, JSON.stringify(config.settings || {}),
       config.enabled || false, config.configured || false,
       config.lastSync || null, config.error || null]
    );
    return this.getConnectorConfig(connector);
  }

  // ─── Ad Engine ────────────────────────────────────────────────

  async getAdCredentials(platform) {
    return this._queryOne("select * from ad_platform_credentials where platform = $1", [platform]);
  }

  async upsertAdCredentials(platform, creds) {
    await this._query(
      `insert into ad_platform_credentials (platform, credentials, connected, verified, connected_at, updated_at)
       values ($1, $2::jsonb, $3, $4, $5, now())
       on conflict (platform) do update set
         credentials = excluded.credentials, connected = excluded.connected,
         verified = excluded.verified, connected_at = excluded.connected_at,
         updated_at = now()`,
      [platform, JSON.stringify(creds), creds.connected || false,
       creds.verified || false, creds.connectedAt || new Date().toISOString()]
    );
    return this.getAdCredentials(platform);
  }

  async listAdCredentials() {
    return this._queryAll("select * from ad_platform_credentials order by platform");
  }

  async listAdCampaigns() {
    return this._queryAll("select * from ad_campaigns order by created_at desc");
  }

  async upsertAdCampaign(data) {
    const now = new Date().toISOString();
    const existing = await this._queryOne("select * from ad_campaigns where id = $1", [data.id]);
    await this._query(
      `insert into ad_campaigns (id, platform, name, status, budget, spend, impressions, clicks, conversions, ctr, cpc, roas, metadata, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15)
       on conflict (id) do update set
         platform = excluded.platform, name = excluded.name,
         status = excluded.status, budget = excluded.budget,
         spend = excluded.spend, impressions = excluded.impressions,
         clicks = excluded.clicks, conversions = excluded.conversions,
         ctr = excluded.ctr, cpc = excluded.cpc, roas = excluded.roas,
         metadata = excluded.metadata, updated_at = excluded.updated_at`,
      [data.id, data.platform || "", data.name || "", data.status || "draft",
       data.budget ?? null, data.spend || 0, data.impressions || 0,
       data.clicks || 0, data.conversions || 0, data.ctr ?? null,
       data.cpc ?? null, data.roas ?? null, JSON.stringify(data.metadata || {}),
       existing?.created_at || now, now]
    );
    return this._queryOne("select * from ad_campaigns where id = $1", [data.id]);
  }

  async listPixels() {
    return this._queryAll("select * from retargeting_pixels order by created_at desc");
  }

  async upsertPixel(data) {
    const now = new Date().toISOString();
    await this._query(
      `insert into retargeting_pixels (id, platform, name, code, active, metadata, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
       on conflict (id) do update set
         platform = excluded.platform, name = excluded.name,
         code = excluded.code, active = excluded.active,
         metadata = excluded.metadata, updated_at = excluded.updated_at`,
      [data.id, data.platform || "", data.name || "", data.code || "",
       data.active !== false, JSON.stringify(data.metadata || {}), now]
    );
    return this._queryOne("select * from retargeting_pixels where id = $1", [data.id]);
  }

  async listScheduledPosts() {
    return this._queryAll("select * from scheduled_posts order by scheduled_for asc");
  }

  async upsertScheduledPost(data) {
    const now = new Date().toISOString();
    await this._query(
      `insert into scheduled_posts (id, platform, content, scheduled_for, status, metadata, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
       on conflict (id) do update set
         platform = excluded.platform, content = excluded.content,
         scheduled_for = excluded.scheduled_for, status = excluded.status,
         metadata = excluded.metadata, updated_at = excluded.updated_at`,
      [data.id, data.platform || "", data.content || "",
       data.scheduledFor || null, data.status || "scheduled",
       JSON.stringify(data.metadata || {}), now]
    );
    return this._queryOne("select * from scheduled_posts where id = $1", [data.id]);
  }

  async getSmtpConfig() {
    return this._queryOne("select * from smtp_config where id = 'default'");
  }

  async upsertSmtpConfig(config) {
    await this._query(
      `insert into smtp_config (id, host, port, user, pass, from_address, from_name, secure, updated_at)
       values ('default', $1, $2, $3, $4, $5, $6, $7, now())
       on conflict (id) do update set
         host = excluded.host, port = excluded.port, user = excluded.user,
         pass = excluded.pass, from_address = excluded.from_address,
         from_name = excluded.from_name, secure = excluded.secure,
         updated_at = now()`,
      [config.host || "", config.port || 587, config.user || "",
       config.pass || "", config.from || config.fromAddress || "",
       config.fromName || null, config.secure || false]
    );
    return this.getSmtpConfig();
  }

  async addSeoAnalysis(analysis) {
    await this._query(
      `insert into seo_analyses (url, score, issues, suggestions, word_count, meta, checks)
       values ($1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7::jsonb)`,
      [analysis.url, analysis.score || 0, JSON.stringify(analysis.issues || []),
       JSON.stringify(analysis.suggestions || []), analysis.wordCount || 0,
       JSON.stringify(analysis.meta || {}), JSON.stringify(analysis.checks || {})]
    );
    return analysis;
  }

  // ─── Connector status ─────────────────────────────────────────

  async getConnectorStatuses(probe = false) {
    const configs = await this.listConnectorConfigs();
    return configs.map(c => ({
      connector: c.connector,
      enabled: c.enabled,
      configured: c.configured,
      lastSync: c.last_sync,
      error: c.error,
      settings: c.settings,
    }));
  }

  async getSetupRequirements() {
    const configs = await this.listConnectorConfigs();
    const required = ["brevo", "smtp"];
    const missing = [];
    const optional = [];
    for (const conn of required) {
      const c = configs.find(c => c.connector === conn);
      if (!c || !c.configured) missing.push(conn);
    }
    for (const conn of ["ghl", "linkedin", "meta", "google"]) {
      const c = configs.find(c => c.connector === conn);
      if (!c || !c.configured) optional.push(conn);
    }
    return { ready: missing.length === 0, missing, optional };
  }
}


// ─── Bulk state load/save (JSONB-blob replacement) ───────────────────────────

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function rowToCamel(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[toCamel(key)] = value;
  }
  return out;
}

function keysToSnake(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = value;
  }
  return out;
}

function arrayToObject(rows, keyField = "id") {
  const out = {};
  for (const row of rows) {
    const key = row[keyField];
    if (key) out[key] = rowToCamel(row);
  }
  return out;
}

function objectToArray(obj) {
  return Object.values(obj || {}).map(rowToCamel);
}

const TABLE_MAPPINGS = [
  { table: "campaigns", stateKey: "campaigns", isObject: true, jsonb: ["metrics"] },
  { table: "content_packs", stateKey: "contentPacks", isObject: false, jsonb: ["variants"] },
  { table: "target_profiles", stateKey: "targetProfiles", isObject: false, jsonb: ["signals", "enrichment"] },
  { table: "research_records", stateKey: "researchRecords", isObject: false, jsonb: ["metadata"] },
  { table: "playbooks", stateKey: "playbooks", isObject: false, jsonb: ["tactics", "observations"] },
  { table: "tactic_observations", stateKey: "tacticObservations", isObject: false, jsonb: ["metadata"] },
  { table: "memory_consolidations", stateKey: "memoryConsolidations", isObject: false, jsonb: ["snapshot"] },
  { table: "outreach_events", stateKey: "outreachEvents", isObject: false, jsonb: ["metadata"] },
  { table: "analytics_events", stateKey: "analyticsEvents", isObject: false, jsonb: ["metadata"] },
  { table: "automation_runs", stateKey: "automationRuns", isObject: false, jsonb: ["result"] },
  { table: "agent_runs", stateKey: "agentRuns", isObject: false, jsonb: ["input", "output"] },
  { table: "agent_heartbeats", stateKey: "agentHeartbeats", isObject: true, keyField: "agent", jsonb: ["metadata"] },
  { table: "decisions", stateKey: "decisions", isObject: false, jsonb: ["decision"] },
  { table: "sourced_contacts", stateKey: "sourcedContacts", isObject: false, jsonb: ["enrichment", "metadata"] },
  { table: "prospecting_runs", stateKey: "prospectingRuns", isObject: false, jsonb: [] },
  { table: "activation_runs", stateKey: "activationRuns", isObject: false, jsonb: ["channels"] },
  { table: "investor_records", stateKey: "investorRecords", isObject: false, jsonb: ["focus", "enrichment"] },
  { table: "funding_outreach_events", stateKey: "fundingOutreachEvents", isObject: false, jsonb: [] },
  { table: "funding_runs", stateKey: "fundingRuns", isObject: false, jsonb: [] },
  { table: "execution_receipts", stateKey: "executionReceipts", isObject: false, jsonb: ["payload", "result"] },
  { table: "dead_letter_queue", stateKey: "deadLetterQueue", isObject: false, jsonb: ["payload"] },
  { table: "connector_configs", stateKey: "connectorConfigs", isObject: true, keyField: "connector", jsonb: ["settings"] },
];

const COLLECTION_MAPPINGS = [
  { table: "contacts", collection: "contacts", jsonb: ["campaign_ids", "tags", "custom_fields"] },
  { table: "pipelines", collection: "pipelines", jsonb: ["stages"] },
  { table: "opportunities", collection: "opportunities", jsonb: ["custom_fields"] },
  { table: "workflows", collection: "workflows", jsonb: ["trigger_config", "step_ids"] },
  { table: "workflow_steps", collection: "workflowSteps", jsonb: ["config", "branches"] },
  { table: "notes", collection: "notes", jsonb: [] },
  { table: "tasks", collection: "tasks", jsonb: [] },
  { table: "calendar_events", collection: "calendarEvents", jsonb: [] },
  { table: "tags", collection: "tags", jsonb: [] },
  { table: "funnels", collection: "funnels", jsonb: ["settings", "tags"] },
  { table: "funnel_steps", collection: "funnelSteps", jsonb: ["fields", "choices", "next_step_map"] },
  { table: "funnel_submissions", collection: "funnelSubmissions", jsonb: ["answers", "contact_info", "metadata"] },
  { table: "message_templates", collection: "messageTemplates", jsonb: ["variables"] },
  { table: "message_sequences", collection: "messageSequences", jsonb: ["steps"] },
];

function stringifyJsonb(obj, fields) {
  const out = { ...obj };
  for (const field of fields) {
    if (out[field] !== undefined && out[field] !== null && typeof out[field] !== "string") {
      out[field] = JSON.stringify(out[field]);
    }
  }
  return out;
}

function parseJsonb(row, fields) {
  if (!row) return row;
  const out = { ...row };
  for (const field of fields) {
    if (out[field] !== undefined && out[field] !== null && typeof out[field] === "string") {
      try {
        out[field] = JSON.parse(out[field]);
      } catch {
        // leave as string
      }
    }
  }
  return out;
}

function prepareRow(obj, jsonbFields) {
  const snaked = keysToSnake(obj);
  return stringifyJsonb(snaked, jsonbFields);
}

function prepareRows(arr, jsonbFields) {
  return (arr || []).map(item => prepareRow(item, jsonbFields));
}

function buildInsertSql(table, row, allowedColumns, columnInfo) {
  const columns = Object.keys(row).filter((c) => {
    if (!allowedColumns.has(c)) return false;
    const info = columnInfo?.get(c);
    if (info && info.isNullable === false && (row[c] === null || row[c] === undefined)) {
      return false; // let the column default apply
    }
    return true;
  });
  const quotedColumns = columns.map(c => `"${c}"`);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  return {
    sql: `insert into ${table} (${quotedColumns.join(", ")}) values (${placeholders.join(", ")}) on conflict do nothing`,
    values: columns.map(c => row[c]),
  };
}

RelationalStore.prototype._getTableColumns = async function _getTableColumns(client, table) {
  const cacheKey = `columns:${table}`;
  if (this._columnCache?.has(cacheKey)) return this._columnCache.get(cacheKey);
  const result = await client.query(
    `select column_name, is_nullable, column_default from information_schema.columns where table_schema = current_schema() and table_name = $1`,
    [table]
  );
  const columns = new Set(result.rows.map(r => r.column_name));
  const info = new Map(result.rows.map(r => [r.column_name, {
    isNullable: r.is_nullable === "YES",
    default: r.column_default,
  }]));
  this._columnCache ||= new Map();
  this._columnCache.set(cacheKey, { columns, info });
  return this._columnCache.get(cacheKey);
};

RelationalStore.prototype.loadState = async function loadState() {
  const state = {
    campaigns: {},
    connectorConfigs: {},
    analyticsEvents: [],
    researchRecords: [],
    outreachEvents: [],
    targetProfiles: [],
    tacticObservations: [],
    playbooks: [],
    memoryConsolidations: [],
    decisions: [],
    contentPacks: [],
    automationRuns: [],
    agentRuns: [],
    prospectingRuns: [],
    sourcedContacts: [],
    activationRuns: [],
    investorRecords: [],
    fundingOutreachEvents: [],
    fundingRuns: [],
    agentHeartbeats: {},
    executionReceipts: [],
    deadLetterQueue: [],
    collections: {
      contacts: {},
      pipelines: {},
      opportunities: {},
      workflows: {},
      workflowSteps: {},
      workflowVersions: {},
      workflowExecutions: {},
      triggers: {},
      triggerStatus: {},
      notes: {},
      tasks: {},
      calendarEvents: {},
      tags: {},
      funnels: {},
      funnelSteps: {},
      funnelSubmissions: {},
      messageTemplates: {},
      messageSequences: {},
    },
  };

  for (const mapping of TABLE_MAPPINGS) {
    const rows = await this._queryAll(`select * from ${mapping.table}`);
    const parsed = rows.map(r => {
      const typed = parseJsonb(rowToCamel(r), mapping.jsonb);
      delete typed.fullRecord;
      const fullRecordRaw = r.full_record && typeof r.full_record === "string" ? JSON.parse(r.full_record) : r.full_record || {};
      delete fullRecordRaw.fullRecord;
      return { ...fullRecordRaw, ...typed };
    });
    if (mapping.isObject) {
      state[mapping.stateKey] = arrayToObject(parsed, mapping.keyField || "id");
    } else {
      state[mapping.stateKey] = parsed;
    }
  }

  for (const mapping of COLLECTION_MAPPINGS) {
    const rows = await this._queryAll(`select * from ${mapping.table}`);
    const parsed = rows.map(r => {
      const typed = parseJsonb(rowToCamel(r), mapping.jsonb);
      delete typed.fullRecord;
      const fullRecordRaw = r.full_record && typeof r.full_record === "string" ? JSON.parse(r.full_record) : r.full_record || {};
      delete fullRecordRaw.fullRecord;
      return { ...fullRecordRaw, ...typed };
    });
    state.collections[mapping.collection] = arrayToObject(parsed, "id");
  }

  return state;
};

RelationalStore.prototype.saveState = async function saveState(state) {
  const client = await (await this._getPool()).connect();
  try {
    await client.query("begin");

    for (const mapping of TABLE_MAPPINGS) {
      await client.query(`truncate table ${mapping.table} cascade`);
      const { columns: allowedColumns, info: columnInfo } = await this._getTableColumns(client, mapping.table);
      let source = state[mapping.stateKey];
      if (mapping.isObject) source = objectToArray(source);
      let originals = (source || []).map(rowToCamel);
      originals = originals.map(o => { const c = { ...o }; delete c.fullRecord; return c; });
      const rows = prepareRows(originals, mapping.jsonb);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const keyField = mapping.keyField || "id";
        if (!row[keyField]) {
          if (keyField === "id") {
            row.id = randomUUID();
            originals[i].id = row.id;
          } else {
            continue;
          }
        }
        if (allowedColumns.has("full_record")) {
          row.full_record = JSON.stringify(originals[i]);
        }
        const { sql, values } = buildInsertSql(mapping.table, row, allowedColumns, columnInfo);
        await client.query(sql, values);
      }
    }

    for (const mapping of COLLECTION_MAPPINGS) {
      await client.query(`truncate table ${mapping.table} cascade`);
      const { columns: allowedColumns, info: columnInfo } = await this._getTableColumns(client, mapping.table);
      const source = state.collections?.[mapping.collection] || {};
      let originals = Object.values(source).map(rowToCamel);
      originals = originals.map(o => { const c = { ...o }; delete c.fullRecord; return c; });
      const rows = prepareRows(originals, mapping.jsonb);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.id) {
          row.id = randomUUID();
          originals[i].id = row.id;
        }
        if (allowedColumns.has("full_record")) {
          row.full_record = JSON.stringify(originals[i]);
        }
        const { sql, values } = buildInsertSql(mapping.table, row, allowedColumns, columnInfo);
        await client.query(sql, values);
      }
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
};
