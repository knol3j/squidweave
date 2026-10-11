import crypto from "node:crypto";
import { BaseRepository } from "./base.mjs";

export class OutreachEventRepository extends BaseRepository {
  constructor() {
    super({ table: "outreach_events" });
  }

  async add(event) {
    const id = event.id || `out_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    await this.query(
      `insert into ${this.table} (id, campaign_id, target_id, type, channel, status, timestamp, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         campaign_id = excluded.campaign_id,
         target_id = excluded.target_id,
         type = excluded.type,
         channel = excluded.channel,
         status = excluded.status,
         timestamp = excluded.timestamp,
         metadata = excluded.metadata`,
      [
        id,
        event.campaignId || null,
        event.targetId || event.investorId || null,
        event.type,
        event.channel || "email",
        event.status || null,
        event.timestamp ? new Date(event.timestamp) : new Date(),
        JSON.stringify(event.metadata || {}),
      ],
    );
    return { ...event, id };
  }

  async list({ campaignId, targetId, type, limit = 1000 } = {}) {
    const conditions = [];
    const params = [];
    if (campaignId) {
      params.push(campaignId);
      conditions.push(`campaign_id = $${params.length}`);
    }
    if (targetId) {
      params.push(targetId);
      conditions.push(`target_id = $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    params.push(limit);
    const { rows } = await this.query(
      `select id, campaign_id as "campaignId", target_id as "targetId", type, channel, status, timestamp, metadata
       from ${this.table} ${where} order by timestamp desc limit $${params.length}`,
      params,
    );
    return rows.map((r) => ({
      ...r,
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
    }));
  }
}

export class AnalyticsEventRepository extends BaseRepository {
  constructor() {
    super({ table: "analytics_events" });
  }

  async add(event) {
    const id = event.id || `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    await this.query(
      `insert into ${this.table} (id, campaign_id, type, channel, value, count, timestamp, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         campaign_id = excluded.campaign_id,
         type = excluded.type,
         channel = excluded.channel,
         value = excluded.value,
         count = excluded.count,
         timestamp = excluded.timestamp,
         metadata = excluded.metadata`,
      [
        id,
        event.campaignId || null,
        event.type,
        event.channel || "email",
        event.value != null ? Number(event.value) : null,
        event.count != null ? Number(event.count) : 1,
        event.timestamp ? new Date(event.timestamp) : new Date(),
        JSON.stringify(event.metadata || {}),
      ],
    );
    return { ...event, id };
  }

  async list({ campaignId, type, limit = 1000 } = {}) {
    const conditions = [];
    const params = [];
    if (campaignId) {
      params.push(campaignId);
      conditions.push(`campaign_id = $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    params.push(limit);
    const { rows } = await this.query(
      `select id, campaign_id as "campaignId", type, channel, value, count, timestamp, metadata
       from ${this.table} ${where} order by timestamp desc limit $${params.length}`,
      params,
    );
    return rows.map((r) => ({
      ...r,
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
    }));
  }
}
