import { enrichInvestorEmail, batchEnrichInvestors, extractDomain } from "./email-enrichment-engine.mjs";
import { enrichCompanyDomain, enrichPersonEmail, isSerperConfigured } from "./serper-enrichment.mjs";

function unique(values = []) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
}

function computeSignalConfidence(record) {
  const signals = [
    record.enrichmentConfidence != null,   // 1 point: enriched email
    Boolean(record.email),                // 1 point: has direct email
    Boolean(record.partnerName),          // 1 point: has partner name
    Boolean(record.website || record.domain), // 1 point: has domain
    Boolean(record.warmIntroPath),        // 2 points: warm intro
    record.thesisMatch >= 0.7,            // 1 point: strong thesis match
    record.stageMatch >= 0.7,             // 1 point: strong stage match
    record.checkSizeMatch >= 0.7,         // 1 point: strong size match
  ];
  const raw = signals.reduce((sum, s) => sum + (s ? (typeof s === "number" ? s : 1) : 0), 0);
  return Math.min(1, raw / 8);           // normalize to 0-1, max 8 points
}

function scoreInvestor(record, campaign) {
  const checks = [
    { key: "thesisMatch", value: Number(record.thesisMatch || 0), weight: 0.35 },
    { key: "stageMatch", value: Number(record.stageMatch || 0), weight: 0.25 },
    { key: "checkSizeMatch", value: Number(record.checkSizeMatch || 0), weight: 0.2 },
    { key: "warmPath", value: Number(record.warmPath || 0), weight: 0.2 },
  ];
  const total = checks.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value * item.weight : 0), 0);
  const rawScore = Math.max(0, Math.min(1, total));

  const signalConfidence = computeSignalConfidence(record);
  const calibrationStrength = 0.6;
  const calibratedScore = rawScore * calibrationStrength + signalConfidence * (1 - calibrationStrength) * rawScore + (1 - signalConfidence) * 0.5 * (1 - calibrationStrength);

  const confidenceBand =
    signalConfidence >= 0.75 ? "high" :
    signalConfidence >= 0.45 ? "medium" : "low";

  return {
    score: Number(calibratedScore.toFixed(4)),
    rawScore: Number(rawScore.toFixed(4)),
    signalConfidence: Number(signalConfidence.toFixed(4)),
    confidenceBand,
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

  /**
   * Enrich investor records with email addresses and missing domains.
   * Uses email-enrichment-engine (Hunter.io / Apollo / pattern guess) and
   * serper-enrichment (Serper.dev Google Search) as a secondary source.
   *
   * @param {string} campaignId
   * @param {object[]} investors - Array of investor records
   * @returns {Promise<{enriched: number, errors: string[]}>}
   */
  async enrichInvestorEmails(campaignId, investors) {
    const errors = [];
    let enriched = 0;

    // Filter to investors without email
    const needEmail = investors.filter(inv => !inv.email);
    if (needEmail.length === 0) {
      return { enriched: 0, errors: [] };
    }

    const serperAvailable = isSerperConfigured();
    const batchSize = 3; // concurrency limit for API calls

    for (let i = 0; i < needEmail.length; i += batchSize) {
      const batch = needEmail.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (investor) => {
          const patch = {};
          let domain = investor.domain;

          // Step 1: Extract domain from website if missing
          if (!domain && investor.website) {
            domain = extractDomain(investor.website);
            if (domain) {
              patch.domain = domain;
            }
          }

          // Step 2: If still no domain and serper is available, try serper lookup
          if (!domain && serperAvailable && investor.fundName) {
            try {
              const serperResult = await enrichCompanyDomain(investor.fundName, investor.website);
              if (serperResult?.domain) {
                domain = serperResult.domain;
                patch.domain = domain;
              }
            } catch (err) {
              errors.push(`[${investor.fundName}] Serper domain lookup: ${err.message}`);
            }
          }

          // Step 3: Enrich email using email-enrichment-engine
          try {
            const enrichedResult = await enrichInvestorEmail({
              ...investor,
              domain: domain || investor.domain,
            });
            if (enrichedResult?.email) {
              patch.email = enrichedResult.email;
              patch.enrichmentSource = enrichedResult.source;
              patch.enrichmentConfidence = enrichedResult.confidence;
              patch.enrichedAt = new Date().toISOString();
            }
          } catch (err) {
            errors.push(`[${investor.fundName}] Email enrichment: ${err.message}`);
          }

          // Step 4: If email still not found and serper is available, try serper email search
          if (!patch.email && serperAvailable && investor.partnerName) {
            try {
              const serperEmailResult = await enrichPersonEmail(
                investor.partnerName,
                investor.fundName,
                patch.domain || domain
              ).catch(() => null);
              // enrichPersonEmail is async import from serper-enrichment
              // (already imported above)
              if (serperEmailResult?.email) {
                patch.email = serperEmailResult.email;
                patch.enrichmentSource = serperEmailResult.source;
                patch.enrichmentConfidence = serperEmailResult.confidence;
                patch.enrichedAt = new Date().toISOString();
              }
            } catch (err) {
              errors.push(`[${investor.fundName}] Serper email search: ${err.message}`);
            }
          }

          return { investorId: investor.id, patch };
        })
      );

      // Update store for all results that have changes
      for (const result of results) {
        if (Object.keys(result.patch).length > 0) {
          await this.store.updateInvestorRecord(campaignId, result.investorId, result.patch);
          enriched++;
        }
      }
    }

    return { enriched, errors };
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

    // Step 1b: Enrich investor emails + domains before building pipeline
    const currentInvestors = this.store.listInvestorRecords(campaignId);
    const enrichmentResult = await this.enrichInvestorEmails(campaignId, currentInvestors);

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
