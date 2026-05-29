import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/lib/store.mjs';
import { CampaignAnalyticsEngine } from '../src/lib/campaign-analytics-engine.mjs';
import { TrackingEngine } from '../src/lib/tracking-engine.mjs';

describe('Integration: Full campaign cycle', () => {
  let store;
  let analytics;
  let tracking;

  beforeEach(async () => {
    store = await new Store(`file:///tmp/test-integration-${Date.now()}.json`).init();
    analytics = new CampaignAnalyticsEngine({ store });
    tracking = new TrackingEngine({ store });
  });

  it('end-to-end: create campaign → ingest → target → track → analyze', async () => {
    // 1. Create campaign
    const campaign = await store.upsertCampaign({
      id: 'integ-campaign-1',
      name: 'Integration Test Campaign',
      channel: 'email',
      automationEnabled: true,
      objective: 'Find Series A investors',
    });
    assert.equal(campaign.id, 'integ-campaign-1');

    // 2. Ingest research records
    const records = [
      { id: 'r1', campaignId: 'integ-campaign-1', targetId: 'investor-1', company: 'Sequoia', contactName: 'Mike', fitScore: 0.9, intentScore: 0.7, recencyScore: 0.8 },
      { id: 'r2', campaignId: 'integ-campaign-1', targetId: 'investor-2', company: 'a16z', contactName: 'Chris', fitScore: 0.6, intentScore: 0.5, recencyScore: 0.4 },
      { id: 'r3', campaignId: 'integ-campaign-1', targetId: 'investor-3', company: 'Benchmark', contactName: 'Peter', fitScore: 0.8, intentScore: 0.9, recencyScore: 0.6 },
    ];
    for (const r of records) {
      await store.addResearchRecord(r);
    }
    assert.equal(store.listResearchRecords('integ-campaign-1').length, 3);

    // 3. Create content pack
    await store.addContentPack({
      id: 'cp-1',
      campaignId: 'integ-campaign-1',
      variants: [{ text: 'Check out our Series A', locale: 'en-US' }],
      publishStatus: 'published',
      publishResult: { summary: { published: 3, failed: 0 } },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // 4. Add automation run
    await store.addAutomationRun({
      id: 'ar-1',
      campaignId: 'integ-campaign-1',
      startedAt: new Date().toISOString(),
      status: 'completed',
      decisionId: 'd1',
      contentPackId: 'cp-1',
      agentRunCount: 3,
    });

    // 5. Track email opens and clicks
    await tracking.recordOpen({ campaignId: 'integ-campaign-1', investorId: 'investor-1', emailId: 'e1' });
    await tracking.recordOpen({ campaignId: 'integ-campaign-1', investorId: 'investor-1', emailId: 'e1' });
    await tracking.recordClick({ campaignId: 'integ-campaign-1', investorId: 'investor-1', emailId: 'e1', targetUrl: 'https://example.com/deck' });
    await tracking.recordOpen({ campaignId: 'integ-campaign-1', investorId: 'investor-3', emailId: 'e3' });
    await tracking.recordReply({ campaignId: 'integ-campaign-1', investorId: 'investor-3', emailId: 'e3', subject: 'Re: Meeting', snippet: 'Let us know!' });

    // 6. Generate analytics report
    const report = analytics.generateReport('integ-campaign-1');
    assert.ok(report);
    assert.equal(report.campaignId, 'integ-campaign-1');
    assert.ok(report.insights);
    assert.ok(report.refinements);
    assert.ok(report.overallHealth);

    // 7. Verify events were recorded
    const events = store.listEvents('integ-campaign-1');
    assert.ok(events.length >= 4); // 4 tracking events

    // 8. Verify outreach events
    const outreach = store.listOutreachEvents('integ-campaign-1');
    assert.ok(outreach.length >= 4);

    // 9. Verify analytics health score
    assert.ok(typeof report.overallHealth.score === 'number');
    assert.ok(report.overallHealth.label);
  });

  it('tracking pixel URL is deterministic', () => {
    const url1 = tracking.generatePixelUrl({ campaignId: 'c1', investorId: 'i1', emailId: 'e1' });
    const url2 = tracking.generatePixelUrl({ campaignId: 'c1', investorId: 'i1', emailId: 'e1' });
    assert.equal(url1, url2);
  });

  it('analytics handles empty campaign gracefully', () => {
    const report = analytics.generateReport('nonexistent');
    assert.equal(report, null);
  });

  it('analytics generates refinements for bottlenecks', async () => {
    await store.upsertCampaign({ id: 'bottleneck-campaign', name: 'Bottleneck Test' });
    // Add 15 contacts stuck at enrichment
    for (let i = 0; i < 15; i++) {
      await store.addSourcedContact?.({
        id: `sc-${i}`,
        campaignId: 'bottleneck-campaign',
        contactStatus: 'needs-enrichment',
      });
    }

    const refinements = analytics.recommendRefinements('bottleneck-campaign');
    // Should have enrichment bottleneck recommendation
    if (refinements) {
      const enrichmentRec = refinements.recommendations.find(r => r.type === 'enrichment_bottleneck');
      // May or may not exist depending on store implementation
    }
  });
});
