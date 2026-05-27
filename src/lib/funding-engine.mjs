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
  constructor({ store, fundingDeckEngine }) {
    this.store = store;
    this.fundingDeckEngine = fundingDeckEngine || null;
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
    }));
  }

  buildPipeline(campaignId) {
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
      .slice(0, 25);

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

  async sequenceOutreach(campaignId, { limit = 20 } = {}) {
    const pipeline = this.buildPipeline(campaignId);
    const candidates = pipeline.prioritized
      .filter(item => ["sourced", "ready", "follow_up"].includes(item.status))
      .slice(0, Math.max(1, Number(limit) || 20));

    const ts = nowIso();
    const events = candidates.map(investor => ({
      id: crypto.randomUUID(),
      campaignId,
      investorId: investor.id,
      type: investor.sequenceStep > 0 ? "follow_up_queued" : "intro_queued",
      channel: "email",
      timestamp: ts,
      sequenceStep: (investor.sequenceStep || 0) + 1,
      metadata: {
        score: investor.score,
        reasons: investor.reasons,
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

    // ── Wire FundingDeckEngine: send actual email decks to qualified investors ──
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
    const pipeline = this.buildPipeline(campaignId);
    const sequence = await this.sequenceOutreach(campaignId, { limit: options.limit || 20 });
    return {
      campaignId,
      pipeline,
      sequence,
    };
  }
}
