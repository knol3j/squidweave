import { config } from "./config.mjs";
import { createApp } from "./server.mjs";
import { closeQueue, enqueue, subscribe } from "./lib/queue.mjs";

const QUEUE_NAMES = {
  AUTOMATION_RUN: "squidweave:automation:run",
  FUNDING_RUN: "squidweave:funding:run",
  CONTENT_GENERATE: "squidweave:content:generate",
  PROMPT_AUTOPILOT: "squidweave:automation:prompt-run",
};

async function main() {
  if (!config.databaseUrl) {
    console.error("Worker requires DATABASE_URL");
    process.exit(1);
  }

  const { engines } = await createApp();
  const { store, automationEngine, fundingEngine, decisionEngine, planner, memoryEngine, agentOrchestrator, targetingEngine } = engines;

  await subscribe(QUEUE_NAMES.AUTOMATION_RUN, async (job) => {
    const { campaignId, reason } = job.data;
    const result = await automationEngine.run({ campaignId, reason });
    return result;
  });

  await subscribe(QUEUE_NAMES.FUNDING_RUN, async (job) => {
    const { campaignId, options } = job.data;
    const result = await fundingEngine.runSequence(campaignId, options);
    return result;
  });

  await subscribe(QUEUE_NAMES.CONTENT_GENERATE, async (job) => {
    const { campaignId, locales, reason } = job.data;
    const campaign = store.getCampaign(campaignId);
    const context = await agentOrchestrator.buildContext(campaignId);
    const result = await planner.generateLocalizedContent({
      campaign,
      locales,
      reason,
      context,
    });
    return result;
  });

  await subscribe(QUEUE_NAMES.PROMPT_AUTOPILOT, async (job) => {
    const { prompt, options } = job.data;
    const result = await agentOrchestrator.runPrompt(prompt, options);
    return result;
  });

  console.log("[worker] Subscribed to queues:", Object.values(QUEUE_NAMES).join(", "));
}

main().catch((err) => {
  console.error("[worker] fatal error:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("[worker] shutting down");
  await closeQueue();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[worker] shutting down");
  await closeQueue();
  process.exit(0);
});
