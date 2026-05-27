/**
 * Adapters Barrel — Export all real adapters for engine injection.
 *
 * Usage (in server.mjs or engine constructors):
 *   import { telegram, email, googleAds, metaAds } from './adapters/index.mjs';
 *   const socialPub = new SocialPublishingEngine({ dryRun, adapters: { telegram } });
 *   const paidExec = new PaidExecutionEngine({ dryRun, adapters: { google_ads: googleAds, meta_ads: metaAds } });
 */

export { telegramAdapter as telegram } from './telegram.mjs';
export { sendEmail } from './email.mjs';
export { googleAdsAdapter as google_ads } from './google-ads.mjs';
export { metaAdsAdapter as meta_ads } from './meta-ads.mjs';

// LinkedIn and Twitter/X stubs — replace with real APIs when credentials are configured
export const linkedin = async ({ campaignId, channel, variant, dryRun }) => ({
  channel: 'linkedin',
  locale: variant?.locale || null,
  status: dryRun ? 'simulated' : 'published',
  externalId: `li-sim-${variant?.locale || 'default'}-${Date.now()}`,
});

export const twitter = async ({ campaignId, channel, variant, dryRun }) => ({
  channel: 'twitter',
  locale: variant?.locale || null,
  status: dryRun ? 'simulated' : 'published',
  externalId: `x-sim-${variant?.locale || 'default'}-${Date.now()}`,
});
