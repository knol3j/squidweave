/**
 * Adapters Barrel — Export all real adapters for engine injection.
 *
 * Usage (in server.mjs or engine constructors):
 *   import { telegram, email, googleAds, metaAds, linkedin, twitter } from './adapters/index.mjs';
 *   const socialPub = new SocialPublishingEngine({ dryRun, adapters: { telegram, linkedin, twitter } });
 *   const paidExec = new PaidExecutionEngine({ dryRun, adapters: { google_ads: googleAds, meta_ads: metaAds } });
 */

export { telegramAdapter as telegram } from './telegram.mjs';
export { sendEmail } from './email.mjs';
export { googleAdsAdapter as google_ads } from './google-ads.mjs';
export { metaAdsAdapter as meta_ads } from './meta-ads.mjs';
export { linkedinAdapter as linkedin } from './linkedin.mjs';
export { twitterAdapter as twitter } from './twitter.mjs';
export { listEventTypes as listCalComEvents, scheduleEvent as scheduleCalComEvent, listScheduledEvents as listCalComScheduledEvents, cancelEvent as cancelCalComEvent, getCalComStatus, getFirstEventTypeUri as getFirstCalComEventTypeUri } from './cal-com.mjs';
