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

export class LocalPlanner {
  constructor(modelName, options = {}) {
    this.modelName = modelName;
    this.defaultLocale = options.defaultLocale || "en-US";
    this.defaultBrandVoice = options.defaultBrandVoice || "direct, credible, concise, and conversion-focused";
    this.defaultOffer = options.defaultOffer || "";
    this.clientPromise = null;
  }

  async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import(sdkUrl.href).then(module => new module.LMStudioClient());
    }
    return this.clientPromise;
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
      const client = await this.getClient();
      const model = await client.llm.model(this.modelName);
      const result = await model.respond(prompt);
      const plan = extractJson(result.content);
      return {
        source: "lmstudio",
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
    const prompt = [
      "You are a localization-focused lifecycle marketer.",
      "Return JSON only.",
      'JSON schema: {"variants":[{"locale":"string","language":"string","audience":"string","channel":"string","subject":"string","preheader":"string","headline":"string","body":"string","cta":"string","complianceNotes":["string"]}],"globalNotes":["string"]}',
      "Keep product names unchanged unless explicitly localized in the input.",
      "Adapt idioms and CTA phrasing for each locale.",
      `Campaign: ${JSON.stringify(campaign)}`,
      `PerformanceSummary: ${JSON.stringify(summary)}`,
      `RequestedLocales: ${JSON.stringify(locales)}`,
      `SourceLocale: ${JSON.stringify(sourceLocale)}`,
    ].join("\n");

    try {
      const client = await this.getClient();
      const model = await client.llm.model(this.modelName);
      const result = await model.respond(prompt);
      const parsed = extractJson(result.content);
      return {
        source: "lmstudio",
        generatedAt: new Date().toISOString(),
        campaignId: campaign.id,
        sourceLocale,
        objective: campaign.objective || this.defaultOffer,
        variants: parsed.variants,
        globalNotes: parsed.globalNotes || [],
      };
    } catch (error) {
      return {
        source: "unavailable",
        generatedAt: new Date().toISOString(),
        campaignId: campaign.id,
        sourceLocale,
        objective: campaign.objective || this.defaultOffer,
        variants: [],
        globalNotes: [`LM Studio unavailable for localization. ${error.message}`],
      };
    }
  }
}
