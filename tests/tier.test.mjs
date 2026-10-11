import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { TierGuard } from '../src/lib/tier.mjs';

function runAdRoute(handlerName, body, env) {
  return new Promise((resolve, reject) => {
    const script = `
      import { ${handlerName} } from './api/ad-routes.mjs';
      const req = { body: ${JSON.stringify(JSON.stringify(body))} };
      const res = {
        statusCode: null,
        headers: {},
        writeHead(code, headers = {}) {
          this.statusCode = code;
          if (typeof headers === 'object') Object.assign(this.headers, headers);
        },
        end(data) {
          console.log(JSON.stringify({ statusCode: this.statusCode, body: String(data ?? '') }));
          process.exit(0);
        }
      };
      await ${handlerName}(req, res);
    `;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.on('close', () => {
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Invalid child output: ${stdout}`));
      }
    });
  });
}

describe('TierGuard', () => {
  it('free tier allows marketing and investment features by default', () => {
    const guard = new TierGuard({ mode: 'free', freeLlmCallsPerHour: 10, freeOutreachBatchMax: 10 });
    assert.equal(guard.canUseBulkOutreach(10), true);
    assert.equal(guard.canUseLlm(), true);
  });

  it('free tier blocks paid ads by default', () => {
    const guard = new TierGuard({ mode: 'free', freeAdsConnectorsEnabled: false });
    assert.equal(guard.canUsePaidAds(), false);
    assert.throws(() => guard.assertFeature('paid-ads'), (err) => err.statusCode === 402);
  });

  it('free tier allows paid ads when env override is set', () => {
    const guard = new TierGuard({ mode: 'free', freeAdsConnectorsEnabled: true });
    assert.equal(guard.canUsePaidAds(), true);
    guard.assertFeature('paid-ads');
  });

  it('paid tier removes all gates', () => {
    const guard = new TierGuard({ mode: 'paid' });
    assert.equal(guard.canUsePaidAds(), true);
    assert.equal(guard.canUseBulkOutreach(1000), true);
    assert.equal(guard.canUseLlm(), true);
  });

  it('unlimited tier bypasses limits', () => {
    const guard = new TierGuard({ mode: 'unlimited' });
    assert.equal(guard.canUsePaidAds(), true);
    assert.equal(guard.canUseBulkOutreach(99999), true);
    assert.equal(guard.canUseLlm(), true);
  });

  it('bulk outreach limited on free tier', () => {
    const guard = new TierGuard({ mode: 'free', freeOutreachBatchMax: 5 });
    assert.equal(guard.canUseBulkOutreach(5), true);
    assert.equal(guard.canUseBulkOutreach(6), false);
    assert.throws(() => guard.assertFeature('bulk-outreach', { batchSize: 6 }), (err) => err.statusCode === 402);
  });

  it('LLM calls limited on free tier', () => {
    const guard = new TierGuard({ mode: 'free', freeLlmCallsPerHour: 3 });
    guard.recordLlmCall('test');
    guard.recordLlmCall('test');
    assert.equal(guard.canUseLlm('test'), true);
    guard.recordLlmCall('test');
    assert.equal(guard.canUseLlm('test'), false);
    assert.throws(() => guard.assertFeature('llm-generation', { key: 'test' }), (err) => err.statusCode === 402);
  });

  it('LLM call keys are tracked independently', () => {
    const guard = new TierGuard({ mode: 'free', freeLlmCallsPerHour: 2 });
    guard.recordLlmCall('a');
    guard.recordLlmCall('a');
    guard.recordLlmCall('b');
    assert.equal(guard.canUseLlm('a'), false);
    assert.equal(guard.canUseLlm('b'), true);
  });

  it('assertFeature includes upgrade code and feature name', () => {
    const guard = new TierGuard({ mode: 'free' });
    try {
      guard.assertFeature('paid-ads');
      assert.fail('expected assertFeature to throw');
    } catch (err) {
      assert.equal(err.statusCode, 402);
      assert.equal(err.code, 'UPGRADE_REQUIRED');
      assert.equal(err.feature, 'paid-ads');
    }
  });
});

describe('ad-routes tier gating', () => {
  const credentials = { clientId: 'x', clientSecret: 'y', developerToken: 'z', accountId: '123' };

  it('connectGoogleAds returns 402 on free tier', async () => {
    const result = await runAdRoute('connectGoogleAds', credentials, {
      TIER_MODE: 'free',
      FREE_ADS_CONNECTORS_ENABLED: 'false',
    });
    assert.equal(result.statusCode, 402);
    assert.match(result.body, /UPGRADE_REQUIRED/);
    assert.match(result.body, /paid ad/i);
  });

  it('connectMetaAds returns 402 on free tier', async () => {
    const result = await runAdRoute('connectMetaAds', { appId: 'x', appSecret: 'y', accessToken: 'z', adAccountId: '123' }, {
      TIER_MODE: 'free',
      FREE_ADS_CONNECTORS_ENABLED: 'false',
    });
    assert.equal(result.statusCode, 402);
    assert.match(result.body, /UPGRADE_REQUIRED/);
  });

  it('connectLinkedInAds returns 402 on free tier', async () => {
    const result = await runAdRoute('connectLinkedInAds', { clientId: 'x', clientSecret: 'y', accessToken: 'z', accountId: '123' }, {
      TIER_MODE: 'free',
      FREE_ADS_CONNECTORS_ENABLED: 'false',
    });
    assert.equal(result.statusCode, 402);
    assert.match(result.body, /UPGRADE_REQUIRED/);
  });

  it('createAdCampaign returns 402 on free tier', async () => {
    const result = await runAdRoute('createAdCampaign', { name: 'Test', platform: 'google', budget: 50 }, {
      TIER_MODE: 'free',
      FREE_ADS_CONNECTORS_ENABLED: 'false',
    });
    assert.equal(result.statusCode, 402);
    assert.match(result.body, /UPGRADE_REQUIRED/);
  });

  it('connectGoogleAds succeeds on paid tier', async () => {
    const result = await runAdRoute('connectGoogleAds', credentials, {
      TIER_MODE: 'paid',
      FREE_ADS_CONNECTORS_ENABLED: 'false',
    });
    assert.equal(result.statusCode, 200);
    assert.match(result.body, /Google Ads connected/);
  });

  it('createAdCampaign succeeds on paid tier', async () => {
    const result = await runAdRoute('createAdCampaign', { name: 'Test', platform: 'google', budget: 50 }, {
      TIER_MODE: 'paid',
      FREE_ADS_CONNECTORS_ENABLED: 'false',
    });
    assert.equal(result.statusCode, 200);
    assert.match(result.body, /success/);
  });
});
