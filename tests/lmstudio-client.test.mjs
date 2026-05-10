import test from "node:test";
import assert from "node:assert/strict";
import { LocalPlanner } from "../src/lib/lmstudio-client.mjs";

test("LocalPlanner builds localized content from a compact campaign brief", async () => {
  let capturedPrompt = "";
  const planner = new LocalPlanner("google/gemma-3n-e4b", {
    defaultLocale: "en-US",
    defaultBrandVoice: "direct, credible, concise, and conversion-focused",
    defaultOffer: "Localized AI marketing orchestration",
  });

  planner.getClient = async () => ({
    llm: {
      model() {
        return {
          async respond(prompt) {
            capturedPrompt = prompt;
            return {
              content: JSON.stringify({
                variants: [
                  {
                    locale: "en-US",
                    language: "en",
                    audience: "Revenue leaders",
                    channel: "linkedin",
                    subject: "LinkedIn outreach for B2B revenue teams",
                    preheader: "Localized AI marketing orchestration for trust-first campaigns.",
                    headline: "Launch localized AI outreach with more confidence",
                    body: "Localized AI marketing orchestration helps B2B revenue teams run trust-first LinkedIn campaigns with clearer positioning.",
                    cta: "Review the LinkedIn plan",
                    complianceNotes: [],
                  },
                  {
                    locale: "de-DE",
                    language: "de",
                    audience: "Revenue leaders",
                    channel: "linkedin",
                    subject: "LinkedIn-Outreach fuer B2B-Revenue-Teams",
                    preheader: "Localized AI marketing orchestration fuer trust-first Kampagnen.",
                    headline: "Mehr Kontrolle ueber lokalisierte AI-Outreach-Kampagnen",
                    body: "Localized AI marketing orchestration helps B2B revenue teams run trust-first LinkedIn campaigns with clearer positioning.",
                    cta: "LinkedIn-Plan pruefen",
                    complianceNotes: [],
                  },
                  {
                    locale: "pt-BR",
                    language: "pt",
                    audience: "Revenue leaders",
                    channel: "linkedin",
                    subject: "Outreach no LinkedIn para times B2B de receita",
                    preheader: "Localized AI marketing orchestration para campanhas trust-first.",
                    headline: "Mais controle sobre outreach localizado com IA",
                    body: "Localized AI marketing orchestration helps B2B revenue teams run trust-first LinkedIn campaigns with clearer positioning.",
                    cta: "Revisar plano do LinkedIn",
                    complianceNotes: [],
                  },
                ],
                globalNotes: ["note"],
              }),
            };
          },
        };
      },
    },
  });

  const result = await planner.buildLocalizedContentPack(
    {
      id: "main-campaign",
      name: "LocaleWeave Market Intelligence",
      objective: "Research, rank, and reengage high-intent B2B marketing and revenue teams with localized trust-first outreach.",
      audience: "B2B marketing, revenue, and GTM leaders evaluating AI, localization, and workflow automation.",
      offer: "Localized AI marketing orchestration",
      brandVoice: "direct, credible, evidence-led",
      channel: "linkedin",
      sourceLocale: "en-US",
      locales: ["en-US", "de-DE", "pt-BR"],
      activePrompt: "Outline a brand identity refresh strategy for a boutique coffee roastery targeting urban professionals.",
    },
    {
      eventCount: 0,
      derived: { ctr: 0, roas: 0 },
      lastEventAt: null,
    },
  );

  assert.equal(result.source, "lmstudio");
  assert.match(capturedPrompt, /CampaignBrief:/);
  assert.match(capturedPrompt, /SourceCopy:/);
  assert.match(capturedPrompt, /PerformanceBrief:/);
  assert.match(capturedPrompt, /Do not introduce generic themes like global expansion, translation, localization, or international growth unless they are explicit in the campaign brief\./);
  assert.match(capturedPrompt, /"objective":"Research, rank, and reengage high-intent B2B marketing and revenue teams with localized trust-first outreach\."/);
  assert.match(capturedPrompt, /"channel":"linkedin"/);
  assert.doesNotMatch(capturedPrompt, /^Campaign: /m);
  assert.doesNotMatch(capturedPrompt, /^PerformanceSummary: /m);
});

test("LocalPlanner retries localized content when generic drift is detected", async () => {
  const prompts = [];
  const planner = new LocalPlanner("google/gemma-3n-e4b", {
    defaultLocale: "en-US",
    defaultBrandVoice: "direct, credible, concise, and conversion-focused",
    defaultOffer: "Localized AI marketing orchestration",
  });

  let callCount = 0;
  planner.getClient = async () => ({
    llm: {
      model() {
        return {
          async respond(prompt) {
            prompts.push(prompt);
            callCount += 1;
            if (callCount === 1) {
              return {
                content: JSON.stringify({
                  variants: [
                    {
                      locale: "en-US",
                      language: "en",
                      audience: "Revenue leaders",
                      channel: "linkedin",
                      subject: "Unlock Global Growth with Localized AI Marketing",
                      preheader: "Reach global audiences with culturally relevant messaging.",
                      headline: "Localized AI Marketing for Global Audiences",
                      body: "Expand globally and connect with global audiences through culturally relevant outreach.",
                      cta: "Learn More",
                      complianceNotes: [],
                    },
                  ],
                  globalNotes: ["generic"],
                }),
              };
            }
            return {
              content: JSON.stringify({
                variants: [
                  {
                    locale: "en-US",
                    language: "en",
                    audience: "Revenue leaders",
                    channel: "linkedin",
                    subject: "Trust-first AI outreach for B2B revenue teams",
                    preheader: "Give GTM leaders a clearer path to localized campaign execution.",
                    headline: "AI marketing orchestration built for B2B revenue teams",
                    body: "Help B2B marketing and revenue teams launch trust-first outreach with localized AI marketing orchestration tailored to LinkedIn campaigns.",
                    cta: "Review the outreach plan",
                    complianceNotes: [],
                  },
                ],
                globalNotes: ["Rewritten to stay aligned to the campaign brief."],
              }),
            };
          },
        };
      },
    },
  });

  const result = await planner.buildLocalizedContentPack(
    {
      id: "main-campaign",
      name: "LocaleWeave Market Intelligence",
      objective: "Research, rank, and reengage high-intent B2B marketing and revenue teams with localized trust-first outreach.",
      audience: "B2B marketing, revenue, and GTM leaders evaluating AI, localization, and workflow automation.",
      offer: "Localized AI marketing orchestration",
      brandVoice: "direct, credible, evidence-led",
      channel: "linkedin",
      sourceLocale: "en-US",
      locales: ["en-US"],
    },
    {
      eventCount: 0,
      derived: { ctr: 0, roas: 0 },
      lastEventAt: null,
    },
  );

  assert.equal(result.source, "lmstudio");
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /RetryInstructions:/);
  assert.match(prompts[1], /ValidationIssues:/);
  assert.equal(result.variants[0].subject, "Trust-first AI outreach for B2B revenue teams");
});

test("LocalPlanner returns unavailable when localized content fails validation twice", async () => {
  const planner = new LocalPlanner("google/gemma-3n-e4b", {
    defaultLocale: "en-US",
    defaultBrandVoice: "direct, credible, concise, and conversion-focused",
    defaultOffer: "Localized AI marketing orchestration",
  });

  planner.getClient = async () => ({
    llm: {
      model() {
        return {
          async respond() {
            return {
              content: JSON.stringify({
                variants: [
                  {
                    locale: "en-US",
                    language: "en",
                    audience: "Revenue leaders",
                    channel: "linkedin",
                    subject: "Unlock Global Growth",
                    preheader: "Culturally relevant messaging for global audiences.",
                    headline: "Expand globally",
                    body: "Translation and global growth support for new territories.",
                    cta: "Learn More",
                    complianceNotes: [],
                  },
                ],
                globalNotes: ["generic"],
              }),
            };
          },
        };
      },
    },
  });

  const result = await planner.buildLocalizedContentPack(
    {
      id: "main-campaign",
      name: "LocaleWeave Market Intelligence",
      objective: "Research, rank, and reengage high-intent B2B marketing and revenue teams with localized trust-first outreach.",
      audience: "B2B marketing, revenue, and GTM leaders evaluating AI, localization, and workflow automation.",
      offer: "Localized AI marketing orchestration",
      brandVoice: "direct, credible, evidence-led",
      channel: "linkedin",
      sourceLocale: "en-US",
      locales: ["en-US"],
    },
    {
      eventCount: 0,
      derived: { ctr: 0, roas: 0 },
      lastEventAt: null,
    },
  );

  assert.equal(result.source, "unavailable");
  assert.equal(result.variants.length, 0);
  assert.match(result.globalNotes[0], /LM Studio unavailable for localization\. LM Studio content validation failed\./);
});
