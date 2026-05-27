/**
 * LocalPlanner — Marketing content generation and action planning.
 *
 * Supports two LLM backends:
 *   1. LM Studio SDK (WebSocket, local) — when llmProvider is not provided
 *   2. OpenAI-compatible HTTP API (OpenAI, OpenRouter, DeepSeek, etc.) — when llmProvider is provided
 *
 * If neither is configured, falls back to policy-driven decisions.
 */

const sdkUrl = new URL(
  "../../../../extensions/plugins/lmstudio/rag-v1/node_modules/@lmstudio/sdk/dist/index.mjs",
  import.meta.url,
);

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function truncateText(value, maxLength = 320) {
  if (!value) {
    return "";
  }
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1)}…`;
}

function lowerFirst(value) {
  if (!value) {
    return "";
  }
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function compactCampaignBrief(campaign, defaults) {
  return {
    id: campaign.id,
    name: campaign.name || "",
    objective: truncateText(campaign.objective || defaults.defaultOffer || ""),
    audience: truncateText(campaign.audience || ""),
    offer: truncateText(campaign.offer || defaults.defaultOffer || ""),
    brandVoice: truncateText(campaign.brandVoice || defaults.defaultBrandVoice),
    channel: campaign.channel || "",
    sourceLocale: campaign.sourceLocale || defaults.defaultLocale,
    locales: Array.isArray(campaign.locales) ? campaign.locales : [],
    activePrompt: truncateText(campaign.activePrompt || "", 220),
    valueProps: [
      truncateText(campaign.baseHeadline || "", 120),
      truncateText(campaign.baseBody || "", 180),
      truncateText(campaign.baseCta || "", 80),
    ].filter(Boolean),
  };
}

function compactPerformanceSummary(summary) {
  return {
    eventCount: summary?.eventCount ?? 0,
    derived: summary?.derived || {},
    lastEventAt: summary?.lastEventAt || null,
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildAnchorTerms(campaignBrief) {
  const terms = [
    campaignBrief.offer,
    campaignBrief.channel,
  ].filter(Boolean);

  const objectiveHints = String(campaignBrief.objective || "")
    .toLowerCase()
    .match(/\b(ai|localized|trust|outreach|marketing|revenue|gtm|b2b|campaign)\b/g) || [];

  return [...new Set([...terms, ...objectiveHints])];
}

function validateVariant(variant, campaignBrief) {
  const text = [
    variant.subject,
    variant.preheader,
    variant.headline,
    variant.body,
    variant.cta,
  ].join(" ").toLowerCase();

  const bannedPatterns = [
    /\bglobal growth\b/i,
    /\bexpand globally\b/i,
    /\bglobal audiences\b/i,
    /\bnew territories\b/i,
    /\bculturally relevant\b/i,
    /\btranslation\b/i,
  ];

  const issues = [];
  for (const pattern of bannedPatterns) {
    if (pattern.test(text)) {
      issues.push(`contains banned generic phrase matching ${pattern}`);
    }
  }

  const anchorTerms = buildAnchorTerms(campaignBrief);
  const hasAnchorTerm = anchorTerms.some(term => {
    if (!term) {
      return false;
    }
    return new RegExp(`\\b${escapeRegex(String(term).toLowerCase())}\\b`, "i").test(text);
  });

  if (!hasAnchorTerm) {
    issues.push("does not mention the actual offer, channel, or campaign objective keywords");
  }

  if (!variant.channel || String(variant.channel).toLowerCase() !== String(campaignBrief.channel || "").toLowerCase()) {
    issues.push(`channel must stay aligned to ${campaignBrief.channel}`);
  }

  return issues;
}

function validateLocalizedPack(parsed, campaignBrief, locales) {
  if (!parsed || !Array.isArray(parsed.variants) || parsed.variants.length === 0) {
    return ["response did not include any variants"];
  }

  const requestedLocales = new Set(locales);
  const returnedLocales = new Set(parsed.variants.map(variant => variant.locale));
  const issues = [];

  for (const locale of requestedLocales) {
    if (!returnedLocales.has(locale)) {
      issues.push(`missing variant for locale ${locale}`);
    }
  }

  for (const variant of parsed.variants) {
    const variantIssues = validateVariant(variant, campaignBrief);
    for (const issue of variantIssues) {
      issues.push(`${variant.locale || "unknown-locale"}: ${issue}`);
    }
  }

  return issues;
}

export class LocalPlanner {
  constructor(modelName, options = {}) {
    this.modelName = modelName;
    this.defaultLocale = options.defaultLocale || "en-US";
    this.defaultBrandVoice = options.defaultBrandVoice || "direct, credible, concise, and conversion-focused";
    this.defaultOffer = options.defaultOffer || "";
    this.lmStudioBaseUrl = options.lmStudioBaseUrl || process.env.LMSTUDIO_BASE_URL || "http://127.0.0.1:1234";
    this.llmProvider = options.llmProvider || null; // LlmProvider instance
    this.clientPromise = null;
  }

  /**
   * Returns true if we have an LLM backend (provider or LM Studio).
   */
  isLlmAvailable() {
    return Boolean(this.llmProvider?.isConfigured?.());
  }

  async ensureServerAvailable() {
    const response = await fetch(`${this.lmStudioBaseUrl.replace(/\/$/, "")}/v1/models`, {
      method: "GET",
    }).catch(error => {
      throw new Error(`LM Studio server unavailable at ${this.lmStudioBaseUrl}. ${error.message}`);
    });

    if (!response.ok) {
      throw new Error(`LM Studio server check failed at ${this.lmStudioBaseUrl} with HTTP ${response.status}.`);
    }
  }

  async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        await this.ensureServerAvailable();
        const module = await import(sdkUrl.href);
        return new module.LMStudioClient({
          baseUrl: this.lmStudioBaseUrl.replace(/^http/i, "ws"),
        });
      })().catch(error => {
        this.clientPromise = null;
        throw error;
      });
    }
    return this.clientPromise;
  }

  /**
   * Generate LLM response using the configured backend.
   * Tries: llmProvider → LM Studio → fallback to null.
   */
  async generateLlmResponse(prompt, options = {}) {
    // Path 1: Use the OpenAI-compatible provider (preferred)
    if (this.llmProvider?.isConfigured?.()) {
      const result = await this.llmProvider.generate(prompt, {
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 2048,
        schema: true,
      });
      if (result.ok && result.parsed) {
        return result.parsed;
      }
      if (result.ok && result.text) {
        try {
          return extractJson(result.text);
        } catch {
          // fall through to LM Studio
        }
      }
      // Provider failed — fall through to LM Studio if available
    }

    // Path 2: LM Studio SDK (fallback)
    try {
      const client = await this.getClient();
      const model = await client.llm.model(this.modelName);
      const result = await model.respond(prompt);
      return extractJson(result.content);
    } catch (error) {
      throw new Error(`All LLM backends unavailable. Provider: ${this.llmProvider?.isConfigured?.() ? 'configured' : 'not-configured'}, LM Studio: ${error.message}`);
    }
  }

  /**
   * Generate structured LLM response with retry logic.
   */
  async generateLlmResponseWithRetry(promptBuilder, maxAttempts = 2) {
    let retryInstruction = "";
    let parsed = null;
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prompt = attempt === 0 ? promptBuilder() : `${promptBuilder()}\nRetryInstructions: ${retryInstruction}`;
      try {
        // Path 1: OpenAI-compatible provider
        if (this.llmProvider?.isConfigured?.()) {
          const result = await this.llmProvider.generateStructured(prompt, {}, { maxRetries: 1 });
          if (result.ok && result.parsed) {
            return { parsed: result.parsed, source: "provider" };
          }
          lastError = result.error || "Unknown error";
          retryInstruction = `The previous response failed. ${lastError}`;
          continue;
        }

        // Path 2: LM Studio
        const client = await this.getClient();
        const model = await client.llm.model(this.modelName);
        const result = await model.respond(prompt);
        parsed = extractJson(result.content);
        return { parsed, source: "lmstudio" };
      } catch (error) {
        lastError = error.message;
        retryInstruction = `The previous response failed. ${lastError}`;
      }
    }

    throw new Error(`LLM generation failed after ${maxAttempts} attempts. Last error: ${lastError}`);
  }

  async buildActionPlan(campaign, summary, policyResult, memoryContext = {}) {
    if (policyResult.status !== "ready") {
      return {
        source: "policy",
        confidence: 0.6,
        recommendedAction: null,
        rationale: policyResult.reasons[0] || "No action recommended yet.",
      };
    }

    const prompt = [
      "You are a local marketing operations planner.",
      "Return JSON only.",
      "Pick exactly one action from allowedActions.",
      "Prefer the safest action when uncertainty is high.",
      'JSON schema: {"recommendedAction":{"type":"string","reason":"string","delta":"number|null","newDailyBudget":"number|null"},"confidence":"number","rationale":"string"}',
      `Campaign: ${JSON.stringify(campaign)}`,
      `Summary: ${JSON.stringify(summary)}`,
      `MemoryContext: ${JSON.stringify(memoryContext)}`,
      `AllowedActions: ${JSON.stringify(policyResult.allowedActions)}`,
    ].join("\n");

    try {
      const plan = await this.generateLlmResponse(prompt);
      return {
        source: this.llmProvider?.isConfigured?.() ? "llm-provider" : "lmstudio",
        ...plan,
      };
    } catch (error) {
      return {
        source: "policy-fallback",
        confidence: 0.55,
        recommendedAction: policyResult.allowedActions[0] || null,
        rationale: `LLM unavailable, using first policy-approved action. ${error.message}`,
      };
    }
  }

  async buildLocalizedContentPack(campaign, summary, options = {}) {
    const locales = Array.isArray(options.locales) && options.locales.length > 0
      ? options.locales
      : (campaign.locales?.length ? campaign.locales : [campaign.sourceLocale || this.defaultLocale]);
    const sourceLocale = campaign.sourceLocale || this.defaultLocale;
    const campaignBrief = compactCampaignBrief(campaign, {
      defaultLocale: this.defaultLocale,
      defaultBrandVoice: this.defaultBrandVoice,
      defaultOffer: this.defaultOffer,
    });
    const sourceCopy = {
      subject: truncateText(campaign.baseSubject || "", 100),
      preheader: truncateText(campaign.basePreheader || "", 140),
      headline: truncateText(campaign.baseHeadline || "", 140),
      body: truncateText(campaign.baseBody || "", 280),
      cta: truncateText(campaign.baseCta || "", 80),
    };
    const performanceBrief = compactPerformanceSummary(summary);
    const prompt = [
      "You are a localization-focused lifecycle marketer.",
      "Return JSON only.",
      'JSON schema: {"variants":[{"locale":"string","language":"string","audience":"string","channel":"string","subject":"string","preheader":"string","headline":"string","body":"string","cta":"string","complianceNotes":["string"]}],"globalNotes":["string"]}',
      "Write like a campaign operator, not a generic localization vendor.",
      "Keep product names unchanged unless explicitly localized in the input.",
      "Anchor every variant to the actual campaign objective, audience, offer, and channel.",
      "Do not introduce generic themes like global expansion, translation, localization, or international growth unless they are explicit in the campaign brief.",
      "If source copy fields are blank, synthesize copy from the campaign brief rather than inventing a different product story.",
      "Adapt idioms and CTA phrasing for each locale while preserving the same offer and positioning.",
      "Keep copy concrete, specific, and usable as campaign-ready marketing text.",
      `CampaignBrief: ${JSON.stringify(campaignBrief)}`,
      `SourceCopy: ${JSON.stringify(sourceCopy)}`,
      `PerformanceBrief: ${JSON.stringify(performanceBrief)}`,
      `RequestedLocales: ${JSON.stringify(locales)}`,
      `SourceLocale: ${JSON.stringify(sourceLocale)}`,
    ].join("\n");

    try {
      let parsed = null;
      let validationIssues = [];
      let retryInstruction = "";

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await this.generateLlmResponse(
          attempt === 0 ? prompt : `${prompt}\nRetryInstructions: ${retryInstruction}`
        );
        parsed = result;
        validationIssues = validateLocalizedPack(parsed, campaignBrief, locales);
        if (validationIssues.length === 0) {
          break;
        }
        retryInstruction = [
          "The previous response failed validation.",
          "Rewrite every variant and fix each issue.",
          `ValidationIssues: ${JSON.stringify(validationIssues)}`,
        ].join("\n");
      }

      if (validationIssues.length > 0) {
        throw new Error(`Content validation failed. ${validationIssues.join("; ")}`);
      }

      return {
        source: this.llmProvider?.isConfigured?.() ? "llm-provider" : "lmstudio",
        generatedAt: new Date().toISOString(),
        campaignId: campaign.id,
        sourceLocale,
        objective: campaign.objective || this.defaultOffer,
        variants: parsed.variants,
        globalNotes: parsed.globalNotes || [],
      };
    } catch (error) {
      const backendLabel = this.llmProvider?.isConfigured?.() ? "LLM provider" : "LM Studio";
      return {
        source: "unavailable",
        generatedAt: new Date().toISOString(),
        campaignId: campaign.id,
        sourceLocale,
        objective: campaign.objective || this.defaultOffer,
        variants: [],
        globalNotes: [`${backendLabel} unavailable for localization. ${backendLabel} ${lowerFirst(error.message)}`],
      };
    }
  }
}
