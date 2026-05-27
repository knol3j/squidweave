function unique(values = []) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
}

function scoreInvestor(record, campaign) {
  const checks = [
    { key: "thesisMatch", value: Number(record.thesisMatch || 0), weight: 0.35 },
    { key: "stageMatch", value: Number(record.stageMatch || 0), weight: 0.25 },
    { key: "checkSizeMatch", value: Number(record.checkSizeMatch || 0), weight: 0.2 },
    { key: "warmPath", value: Number(record.warmPath || 0), weight: 0.2 },
  ];
  const total = checks.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value * item.weight : 0), 0);
  const clamped = Math.max(0, Math.min(1, total));
  return {
    score: Number(clamped.toFixed(4)),
    reasons: checks
      .filter(item => Number.isFinite(item.value) && item.value >= 0.7)
      .map(item => `${item.key}:${Math.round(item.value * 100)}%`),
    campaignStage: campaign?.fundingStage || campaign?.stage || null,
  };
}

function nowIso() {
  return new Date().toISOString();
}

export class FundingEngine {
  constructor({ store, fundingDeckEngine, sourceIngestionEngine }) {
    this.store = store;
    this.fundingDeckEngine = fundingDeckEngine || null;
    this.sourceIngestionEngine = sourceIngestionEngine || null;
  }

  importInvestors(campaignId, records = []) {
    return records.map((record, index) => ({
      id: record.id || crypto.randomUUID(),
      campaignId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      fundName: record.fundName || record.name || `investor-${index + 1}`,
      partnerName: record.partnerName || null,
      stageFocus: unique(record.stageFocus || []),
      geoFocus: unique(record.geoFocus || []),
      sectors: unique(record.sectors || []),
      checkSize: record.checkSize || null,
      thesis: record.thesis || "",
      email: record.email || "",
      domain: record.domain || null,
      website: record.website || null,
      warmIntroPath: record.warmIntroPath || "",
      thesisMatch: Number.isFinite(Number(record.thesisMatch)) ? Number(record.thesisMatch) : 0.5,
      stageMatch: Number.isFinite(Number(record.stageMatch)) ? Number(record.stageMatch) : 0.5,
      checkSizeMatch: Number.isFinite(Number(record.checkSizeMatch)) ? Number(record.checkSizeMatch) : 0.5,
      warmPath: Number.isFinite(Number(record.warmPath)) ? Number(record.warmPath) : (record.warmIntroPath ? 0.8 : 0.3),
      status: record.status || "sourced",
      notes: record.notes || "",
      lastContactAt: record.lastContactAt || null,
      nextActionAt: record.nextActionAt || null,
      sequenceStep: Number.isFinite(Number(record.sequenceStep)) ? Number(record.sequenceStep) : 0,
      enrichmentSource: record.enrichmentSource || null,
      enrichmentConfidence: record.enrichmentConfidence || null,
      enrichedAt: record.enrichedAt || null,
      deckUrl: record.deckUrl || null,
    }));
  }

  /**
   * Dynamically source VC investors using the source-ingestion-engine.
   * Delegates to ingestCampaign which handles connector dispatch + storage.
   */
  async sourceVcInvestors(campaignId, options = {}) {
    const { query, limit = 50 } = options;
    if (!this.sourceIngestionEngine) {
      return { imported: 0, records: [], error: "sourceIngestionEngine not configured" };
    }

    try {
      const result = await this.sourceIngestionEngine.ingestCampaign(campaignId, {
        query: query || `venture capital investors`,
        limit,
      });
      return {
        imported: result.investorRecords?.length || 0,
        records: result.investorRecords || [],
        sourceRuns: result.sourceRuns || [],
      };
    } catch (err) {
      return { imported: 0, records: [], errors: [{ phase: "sourceVc", error: err.message }] };
    }
  }

  buildPipeline(campaignId, options = {}) {
    const { prioritizedLimit = 200 } = options;
    const campaign = this.store.getCampaign(campaignId);
    const investors = this.store.listInvestorRecords(campaignId);
    const withScores = investors.map(investor => {
      const scored = scoreInvestor(investor, campaign);
      return { ...investor, ...scored };
    });

    const byStatus = new Map();
    for (const investor of withScores) {
      byStatus.set(investor.status || "unknown", (byStatus.get(investor.status || "unknown") || 0) + 1);
    }

    const prioritized = [...withScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, prioritizedLimit)); // configurable — no hardcoded 25

    return {
      campaignId,
      generatedAt: nowIso(),
      counts: {
        total: withScores.length,
        byStatus: Object.fromEntries(byStatus.entries()),
      },
      prioritized,
    };
  }

  async sequenceOutreach(campaignId, { limit = 50, maxPerRun = 20 } = {}) {
    const pipeline = this.buildPipeline(campaignId, { prioritizedLimit: limit || 50 });
    const candidates = pipeline.prioritized
      .filter(item => ["sourced", "enriched", "ready", "follow_up"].includes(item.status))
      .slice(0, Math.max(1, Number(maxPerRun) || 20));

    const ts = nowIso();
    const events = candidates.map(investor => ({
      id: crypto.randomUUID(),
      campaignId,
      investorId: investor.id,
      type: investor.sequenceStep > 0 ? "follow_up_queued" : "intro_queued",
      channel: investor.email ? "email" : "api",
      timestamp: ts,
      sequenceStep: (investor.sequenceStep || 0) + 1,
      metadata: {
        score: investor.score,
        reasons: investor.reasons,
        email: investor.email || null,
      },
    }));

    await this.store.addFundingOutreachEvents(events);

    const run = {
      id: crypto.randomUUID(),
      campaignId,
      createdAt: ts,
      type: "funding-sequence",
      processedInvestors: events.length,
      status: "completed",
      deckOutreach: null,
    };

    // Wire FundingDeckEngine: send actual email decks to qualified investors
    if (this.fundingDeckEngine && candidates.length > 0) {
      const campaign = this.store.getCampaign(campaignId);
      const deckResult = await this.fundingDeckEngine.prepareAndSend({
        campaign,
        investors: candidates,
      });
      run.deckOutreach = deckResult.outreach;
      run.deckId = deckResult.deck?.id || null;
    }

    await this.store.addFundingRun(run);

    return { run, events, pipeline };
  }

  async runCampaign(campaignId, options = {}) {
    // Step 1: Source VCs if source-ingestion-engine is available and no investors exist
    const existing = this.store.listInvestorRecords(campaignId);
    if (existing.length === 0 && this.sourceIngestionEngine) {
      await this.sourceVcInvestors(campaignId, {
        query: options.sourceQuery,
        limit: options.sourceLimit || 50,
      });
    }

    // Step 2: Build pipeline (no hardcoded limit — use options)
    const pipeline = this.buildPipeline(campaignId, { prioritizedLimit: options.prioritizedLimit || 200 });

    // Step 3: Run outreach sequence
    const sequence = await this.sequenceOutreach(campaignId, {
      limit: options.prioritizedLimit || 200,
      maxPerRun: options.maxPerRun || 20,
    });

    return {
      campaignId,
      pipeline,
      sequence,
    };
  }
}
