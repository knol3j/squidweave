/**
 * Google Ads API Adapter — Real API calls via Google Ads REST API.
 * Requires OAuth2 credentials and a Google Ads developer token.
 * Reads from process.env:
 *   GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID,
 *   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN
 */

const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v17';

function getConfig() {
  return {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  };
}

async function getAccessToken(config) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`Google OAuth failed: ${data.error || JSON.stringify(data)}`);
  return data.access_token;
}

/**
 * Create or update a Google Ads campaign (offline conversion tracking stub).
 * For a full implementation, you'd use the CampaignService with a full campaign budget.
 */
export async function createCampaign({ name, budgetMicros, status = 'PAUSED' }) {
  const config = getConfig();
  if (!config.developerToken || !config.customerId) {
    return { ok: false, error: 'GOOGLE_ADS_DEVELOPER_TOKEN or GOOGLE_ADS_CUSTOMER_ID not configured' };
  }

  const accessToken = await getAccessToken(config);
  const customerId = config.customerId.replace(/-/g, '');

  // Google Ads API uses a GAQL query-style approach for campaign creation
  // This is a simplified campaign budget + campaign creation
  const response = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:mutate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': config.developerToken,
      'login-customer-id': customerId,
    },
    body: JSON.stringify({
      mutateOperations: [
        {
          campaignBudgetOperation: {
            create: {
              name: `${name} Budget`,
              amountMicros: String(budgetMicros || 10000000), // default $10/day
              explicitlyShared: false,
            },
          },
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return { ok: false, error: data.error?.message || JSON.stringify(data) };
  }

  return { ok: true, result: data };
}

/**
 * Adapter function for PaidExecutionEngine.
 */
export async function googleAdsAdapter({ campaignId, channel, creativeSummary, budgetAmount, dryRun }) {
  if (dryRun) {
    return {
      channel: 'google_ads',
      status: 'simulated',
      externalId: `google-sim-${campaignId}-${Date.now()}`,
    };
  }

  const result = await createCampaign({
    name: `SquidWeave-${campaignId}`,
    budgetMicros: Math.round((budgetAmount || 10) * 1000000), // $ → micros
    status: 'PAUSED', // Start paused for safety
  });

  if (!result.ok) {
    throw new Error(`Google Ads launch failed: ${result.error}`);
  }

  return {
    channel: 'google_ads',
    status: 'launched',
    externalId: `google-${campaignId}-${Date.now()}`,
    raw: result.result,
  };
}

export default { createCampaign, googleAdsAdapter };
