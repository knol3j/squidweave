import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Store, Contact, Pipeline, Opportunity } from '../src/lib/store.mjs';

describe('Store', () => {
  let store;

  beforeEach(async () => {
    store = await new Store('file:///tmp/test-store-' + Date.now() + '.json').init();
  });

  it('creates and retrieves a campaign', async () => {
    const campaign = await store.upsertCampaign({
      id: 'test-1',
      name: 'Test Campaign',
      channel: 'linkedin',
      automationEnabled: true,
    });
    assert.equal(campaign.id, 'test-1');
    assert.equal(campaign.name, 'Test Campaign');
    assert.ok(campaign.createdAt);

    const retrieved = store.getCampaign('test-1');
    assert.equal(retrieved.name, 'Test Campaign');
  });

  it('lists campaigns', async () => {
    await store.upsertCampaign({ id: 'c1', name: 'C1' });
    await store.upsertCampaign({ id: 'c2', name: 'C2' });
    const list = store.listCampaigns();
    assert.ok(list.length >= 2);
  });

  it('upserts campaign (update existing)', async () => {
    await store.upsertCampaign({ id: 'u1', name: 'Original' });
    await store.upsertCampaign({ id: 'u1', name: 'Updated' });
    const campaign = store.getCampaign('u1');
    assert.equal(campaign.name, 'Updated');
  });

  it('adds and lists events', async () => {
    const event = {
      id: 'e1',
      campaignId: 'test-1',
      type: 'open',
      channel: 'email',
      timestamp: new Date().toISOString(),
    };
    await store.addEvent(event);
    const events = store.listEvents('test-1');
    assert.ok(events.length >= 1);
    assert.equal(events[0].type, 'open');
  });

  it('adds and lists research records', async () => {
    const record = {
      id: 'r1',
      campaignId: 'test-1',
      targetId: 't1',
      fitScore: 0.8,
      intentScore: 0.6,
    };
    await store.addResearchRecord(record);
    const records = store.listResearchRecords('test-1');
    assert.ok(records.length >= 1);
    assert.equal(records[0].targetId, 't1');
  });

  it('adds and lists outreach events', async () => {
    const event = {
      id: 'o1',
      campaignId: 'test-1',
      targetId: 't1',
      type: 'sent',
      channel: 'email',
      timestamp: new Date().toISOString(),
    };
    await store.addOutreachEvent(event);
    const events = store.listOutreachEvents('test-1');
    assert.ok(events.length >= 1);
  });

  it('adds and retrieves decisions', async () => {
    const decision = {
      id: 'd1',
      campaignId: 'test-1',
      createdAt: new Date().toISOString(),
      plan: { recommendedAction: 'test' },
    };
    await store.addDecision(decision);
    const decisions = store.listDecisions('test-1');
    assert.ok(decisions.length >= 1);
  });

  it('adds and retrieves content packs', async () => {
    const pack = {
      id: 'cp1',
      campaignId: 'test-1',
      variants: [{ text: 'Hello', locale: 'en-US' }],
      createdAt: new Date().toISOString(),
    };
    await store.addContentPack(pack);
    const packs = store.listContentPacks('test-1');
    assert.ok(packs.length >= 1);
    assert.equal(packs[0].id, 'cp1');
  });

  it('getLatestContentPack returns most recent', async () => {
    await store.addContentPack({ id: 'cp-old', campaignId: 'c1', createdAt: '2024-01-01T00:00:00Z' });
    await store.addContentPack({ id: 'cp-new', campaignId: 'c1', createdAt: '2024-06-01T00:00:00Z' });
    const latest = store.getLatestContentPack('c1');
    assert.equal(latest.id, 'cp-new');
  });

  it('adds and lists automation runs', async () => {
    const run = {
      id: 'ar1',
      campaignId: 'test-1',
      startedAt: new Date().toISOString(),
      status: 'completed',
    };
    await store.addAutomationRun(run);
    const runs = store.listAutomationRuns('test-1');
    assert.ok(runs.length >= 1);
  });

  it('adds and lists investor records', async () => {
    const investor = {
      id: 'inv1',
      campaignId: 'test-1',
      fundName: 'Test VC',
      partnerName: 'John Doe',
      email: 'john@testvc.com',
    };
    await store.addInvestorRecords([investor]);
    const list = store.listInvestorRecords('test-1');
    assert.ok(list.length >= 1);
    assert.equal(list[0].fundName, 'Test VC');
  });

  it('updates investor record', async () => {
    await store.addInvestorRecords([{ id: 'inv2', campaignId: 'test-1', fundName: 'Old Name' }]);
    await store.updateInvestorRecord('test-1', 'inv2', { fundName: 'New Name' });
    const list = store.listInvestorRecords('test-1');
    const inv = list.find(i => i.id === 'inv2');
    assert.equal(inv.fundName, 'New Name');
  });

  it('adds and lists funding runs', async () => {
    const run = {
      id: 'fr1',
      campaignId: 'test-1',
      startedAt: new Date().toISOString(),
    };
    await store.addFundingRun(run);
    const runs = store.listFundingRuns('test-1');
    assert.ok(runs.length >= 1);
  });

  it('adds and lists funding outreach events', async () => {
    const event = {
      id: 'fo1',
      campaignId: 'test-1',
      investorId: 'inv1',
      type: 'sent',
    };
    await store.addFundingOutreachEvents([event]);
    const events = store.listFundingOutreachEvents('test-1');
    assert.ok(events.length >= 1);
  });

  it('adds and lists execution receipts', async () => {
    const receipt = {
      id: 'exec1',
      campaignId: 'test-1',
      executionType: 'funding_run',
      status: 'running',
      createdAt: new Date().toISOString(),
    };
    await store.addExecutionReceipt(receipt);
    const receipts = store.listExecutionReceipts();
    assert.ok(receipts.length >= 1);
  });

  it('updates execution receipt', async () => {
    await store.addExecutionReceipt({ id: 'exec2', status: 'running', createdAt: new Date().toISOString() });
    await store.updateExecutionReceipt('exec2', { status: 'completed' });
    const receipts = store.listExecutionReceipts();
    const r = receipts.find(x => x.id === 'exec2');
    assert.equal(r.status, 'completed');
  });

  it('adds and retrieves DLQ entries', async () => {
    const entry = {
      id: 'dlq1',
      campaignId: 'test-1',
      step: 'email-send',
      error: 'SMTP timeout',
      createdAt: new Date().toISOString(),
    };
    await store.addDlqEntry(entry);
    const entries = store.listDlqEntries({ campaignId: 'test-1' });
    assert.ok(entries.length >= 1);
  });

  it('pops DLQ entry', async () => {
    await store.addDlqEntry({ id: 'dlq2', campaignId: 'test-1', step: 'test' });
    const popped = await store.popDlqEntry('dlq2');
    assert.ok(popped);
    assert.equal(popped.id, 'dlq2');
  });

  it('subscribe notifies on changes', async () => {
    let notified = false;
    store.subscribe(() => { notified = true; });
    await store.upsertCampaign({ id: 'sub-test', name: 'Sub Test' });
    assert.ok(notified);
  });
});

describe('Entity classes', () => {
  it('Contact sets defaults', () => {
    const c = new Contact({ fullName: 'Jane Doe' });
    assert.ok(c.id);
    assert.equal(c.fullName, 'Jane Doe');
    assert.equal(c.email, '');
    assert.equal(c.dnd, false);
  });

  it('Pipeline adds stages', () => {
    const p = new Pipeline({ name: 'Sales' });
    p.addStage({ name: 'Lead' });
    p.addStage({ name: 'Qualified' });
    assert.equal(p.stages.length, 2);
    assert.equal(p.stages[0].name, 'Lead');
    assert.ok(p.stages[0].id);
  });

  it('Opportunity sets defaults', () => {
    const o = new Opportunity({ name: 'Deal 1' });
    assert.ok(o.id);
    assert.equal(o.status, 'open');
    assert.equal(o.monetaryValue, 0);
    assert.equal(o.currency, 'USD');
  });
});
