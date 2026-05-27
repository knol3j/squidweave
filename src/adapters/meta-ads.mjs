/**
 * Meta (Facebook) Ads API Adapter — Real API calls via Facebook Graph API.
 * Reads from process.env:
 *   META_ADS_ACCESS_TOKEN, META_ADS_AD_ACCOUNT_ID
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

function getConfig() {
  return {
    accessToken: process.env.META_ADS_ACCESS_TOKEN || '',
    adAccountId: process.env.META_ADS_AD_ACCOUNT_ID || '',
  };
}

/**
 * Create a draft campaign in Meta Ads Manager.
 * Campaign starts in PAUSED status for safety.
 */
export async function createCampaign({ name, objective = 'OUTCOME_TRAFFIC', status = 'PAUSED' }) {
  const config = getConfig();
  if (!config.accessToken || !config.adAccountId) {
    return { ok: false, error: 'META_ADS_ACCESS_TOKEN or META_ADS_AD_ACCOUNT_ID not configured' };
  }

  const accountId = config.adAccountId.startsWith('act_') ? config.adAccountId : `act_${config.adAccountId}`;
  const url = `${GRAPH_API}/${accountId}/campaigns`;

  const params = new URLSearchParams({
    name,
    objective,
    status,
    access_token: config.accessToken,
    special_ad_categories: [], // mark empty for standard ads
  });

  try {
    const response = await fetch(url, { method: 'POST', body: params });
    const data = await response.json();

    if (data.error) {
      return { ok: false, error: data.error.message };
    }

    return { ok: true, campaignId: data.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Adapter function for PaidExecutionEngine.
 */
export async function metaAdsAdapter({ campaignId, channel, creativeSummary, budgetAmount, dryRun }) {
  if (dryRun) {
    return {
      channel: 'meta_ads',
      status: 'simulated',
      externalId: `meta-sim-${campaignId}-${Date.now()}`,
    };
  }

  const result = await createCampaign({
    name: `LocaleWeave-${campaignId}-${Date.now()}`,
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
  });

  if (!result.ok) {
    throw new Error(`Meta Ads launch failed: ${result.error}`);
  }

  return {
    channel: 'meta_ads',
    status: 'launched',
    externalId: `meta-${result.campaignId}`,
    raw: result,
  };
}

export default { createCampaign, metaAdsAdapter };
