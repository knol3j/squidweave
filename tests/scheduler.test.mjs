import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AutomationScheduler } from '../src/lib/scheduler.mjs';

function createMockStore(campaigns = []) {
  return {
    listCampaigns: () => campaigns,
    listExecutionReceipts: () => [],
    updateExecutionReceipt: () => {},
    state: {},
  };
}

describe('AutomationScheduler', () => {
  let scheduler;

  afterEach(() => {
    if (scheduler) scheduler.stop();
  });

  it('creates scheduler with defaults', () => {
    scheduler = new AutomationScheduler({
      store: createMockStore(),
      automationEngine: { runCampaign: async () => ({}) },
    });
    const status = scheduler.getStatus();
    assert.equal(status.running, false);
    assert.equal(status.intervalSeconds, 120);
  });

  it('creates scheduler with custom interval', () => {
    scheduler = new AutomationScheduler({
      store: createMockStore(),
      automationEngine: { runCampaign: async () => ({}) },
      intervalSeconds: 60,
    });
    assert.equal(scheduler.getStatus().intervalSeconds, 60);
  });

  it('starts and stops', () => {
    scheduler = new AutomationScheduler({
      store: createMockStore(),
      automationEngine: { runCampaign: async () => ({}) },
      intervalSeconds: 3600,
    });
    scheduler.start();
    assert.equal(scheduler.isRunning(), true);
    assert.equal(scheduler.getStatus().running, true);

    scheduler.stop();
    assert.equal(scheduler.isRunning(), false);
  });

  it('does not start twice', () => {
    scheduler = new AutomationScheduler({
      store: createMockStore(),
      automationEngine: { runCampaign: async () => ({}) },
      intervalSeconds: 3600,
    });
    scheduler.start();
    scheduler.start(); // should be no-op
    assert.equal(scheduler.isRunning(), true);
    scheduler.stop();
  });

  it('pruneState removes old entries', () => {
    const localScheduler = new AutomationScheduler({
      store: createMockStore(),
      automationEngine: { runCampaign: async () => ({}) },
    });
    localScheduler.store.state.agentRuns = new Array(600).fill({ id: 'x' });
    localScheduler.store.state.decisions = new Array(300).fill({ id: 'x' });
    localScheduler.store.state.researchRecords = new Array(100).fill({ id: 'x' });

    const pruned = localScheduler.pruneState();
    assert.ok(pruned > 0);
    assert.ok(localScheduler.store.state.agentRuns.length <= 500);
    assert.ok(localScheduler.store.state.decisions.length <= 200);
  });

  it('cleanupOrphanedReceipts marks stale receipts as failed', () => {
    const oldTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentTime = new Date(Date.now() - 1000).toISOString();
    const receipts = [
      { id: 'r1', status: 'running', createdAt: oldTime },
      { id: 'r2', status: 'running', createdAt: recentTime },
    ];
    scheduler = new AutomationScheduler({
      store: createMockStore(),
      automationEngine: { runCampaign: async () => ({}) },
    });
    scheduler.store.listExecutionReceipts = () => receipts;
    const updated = {};
    scheduler.store.updateExecutionReceipt = (id, patch) => { updated[id] = patch; };

    const cleaned = scheduler.cleanupOrphanedReceipts({ staleThresholdMs: 30 * 60 * 1000 });
    assert.equal(cleaned, 1);
    assert.ok(updated.r1);
    assert.equal(updated.r1.status, 'failed');
    assert.ok(!updated.r2); // recent receipt should not be touched
  });

  it('tick processes enabled campaigns', async () => {
    let runCount = 0;
    const campaigns = [
      { id: 'c1', automationEnabled: true },
      { id: 'c2', automationEnabled: false },
      { id: 'c3', automationEnabled: true },
    ];
    scheduler = new AutomationScheduler({
      store: createMockStore(campaigns),
      automationEngine: {
        runCampaign: async (id) => { runCount++; return {}; },
      },
      intervalSeconds: 3600,
    });
    await scheduler.tick();
    assert.equal(runCount, 2); // Only enabled campaigns
  });

  it('tick skips if already running', async () => {
    let runCount = 0;
    scheduler = new AutomationScheduler({
      store: createMockStore([{ id: 'c1', automationEnabled: true }]),
      automationEngine: {
        runCampaign: async () => { runCount++; },
      },
      intervalSeconds: 3600,
    });
    scheduler.running = true;
    await scheduler.tick();
    assert.equal(runCount, 0);
  });

  it('tick handles errors per campaign without crashing', async () => {
    const campaigns = [
      { id: 'c1', automationEnabled: true },
      { id: 'c2', automationEnabled: true },
    ];
    let runCount = 0;
    scheduler = new AutomationScheduler({
      store: createMockStore(campaigns),
      automationEngine: {
        runCampaign: async (id) => {
          if (id === 'c1') throw new Error('Campaign c1 failed');
          runCount++;
          return {};
        },
      },
      intervalSeconds: 3600,
    });
    await scheduler.tick();
    assert.equal(runCount, 1); // c2 should still run
  });
});
