/**
 * X (Twitter) API Adapter — Posts tweets via the X API v2.
 *
 * Credentials (set in .env.local):
 *   TWITTER_BEARER_TOKEN=<OAuth 2.0 Bearer Token with tweet.write scope>
 *   TWITTER_API_KEY=<API Key (only needed for OAuth 1.0a)>
 *   TWITTER_API_SECRET=<API Secret>
 *   TWITTER_ACCESS_TOKEN=<Access Token>
 *   TWITTER_ACCESS_SECRET=<Access Token Secret>
 *
 * The adapter primarily uses OAuth 2.0 Bearer Token for posting.
 * Falls back to simulation when no credentials are configured.
 */

const TWITTER_API_BASE = "https://api.twitter.com";

/**
 * Post a tweet to X/Twitter via API v2.
 *
 * @param {object} opts
 * @param {string} opts.campaignId
 * @param {string} opts.channel
 * @param {object} opts.variant - { text, locale, title, imageUrl, mediaUrl }
 * @param {boolean} opts.dryRun
 * @returns {Promise<{ channel: string, locale: string|null, status: string, externalId: string|null }>}
 */
export async function twitterAdapter({ campaignId, channel, variant, dryRun }) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN || "";

  const locale = variant?.locale || null;
  const text = variant?.text || variant?.content || "";

  // No credentials — simulate
  if (!bearerToken) {
    return {
      channel: "twitter",
      locale,
      status: dryRun ? "simulated" : "simulated",
      externalId: null,
      reason: "no-credentials",
    };
  }

  if (dryRun) {
    return {
      channel: "twitter",
      locale,
      status: "simulated",
      externalId: `x-sim-${locale || "default"}-${Date.now()}`,
    };
  }

  // Build tweet body
  const tweetBody = { text };

  // If we have media to attach, we need a two-step process:
  // 1. Upload media to https://upload.twitter.com/1.1/media/upload.json (v1.1 API)
  // 2. Reference media_ids in the tweet
  if (variant.imageUrl) {
    try {
      const mediaId = await uploadMedia(bearerToken, variant.imageUrl);
      if (mediaId) {
        tweetBody.media = { media_ids: [mediaId] };
      }
    } catch (mediaErr) {
      // Continue without media if upload fails — post text-only
      console.warn(`[twitter] Media upload failed, posting text-only: ${mediaErr.message}`);
    }
  }

  try {
    const response = await fetch(`${TWITTER_API_BASE}/2/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown error");
      const statusText = `${response.status}: ${errText}`;

      // Check for common errors
      if (response.status === 403 && errText.includes("duplicate")) {
        return {
          channel: "twitter",
          locale,
          status: "published",
          externalId: `x-duplicate-${Date.now()}`,
          error: "duplicate-content",
        };
      }

      return {
        channel: "twitter",
        locale,
        status: "failed",
        externalId: null,
        error: statusText,
      };
    }

    const result = await response.json();
    const tweetId = result?.data?.id || null;

    return {
      channel: "twitter",
      locale,
      status: "published",
      externalId: `x-${tweetId || locale || "default"}-${Date.now()}`,
    };
  } catch (err) {
    return {
      channel: "twitter",
      locale,
      status: "failed",
      externalId: null,
      error: err.message,
    };
  }
}

/**
 * Upload an image to X/Twitter via the v1.1 media upload API.
 *
 * @param {string} bearerToken
 * @param {string} imageUrl - URL of the image to upload
 * @returns {Promise<string|null>} media_id_string or null
 */
async function uploadMedia(bearerToken, imageUrl) {
  // Step 1: Download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image from ${imageUrl}: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");

  // Step 2: INIT — tell Twitter we're uploading
  const initResponse = await fetch(`${TWITTER_API_BASE}/1.1/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "INIT",
      media_type: imageResponse.headers.get("content-type") || "image/png",
      total_bytes: String(imageBuffer.byteLength),
    }),
  });

  if (!initResponse.ok) {
    const errText = await initResponse.text().catch(() => "unknown error");
    throw new Error(`INIT failed: ${initResponse.status}: ${errText}`);
  }

  const initResult = await initResponse.json();
  const mediaId = initResult?.media_id_string;

  if (!mediaId) {
    throw new Error("No media_id_string in INIT response");
  }

  // Step 3: APPEND — upload the image data in chunks (one chunk for simplicity)
  const appendResponse = await fetch(`${TWITTER_API_BASE}/1.1/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "APPEND",
      media_id: mediaId,
      segment_index: "0",
      media_data: base64Image,
    }),
  });

  if (!appendResponse.ok) {
    const errText = await appendResponse.text().catch(() => "unknown error");
    throw new Error(`APPEND failed: ${appendResponse.status}: ${errText}`);
  }

  // Step 4: FINALIZE
  const finalizeResponse = await fetch(`${TWITTER_API_BASE}/1.1/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "FINALIZE",
      media_id: mediaId,
    }),
  });

  if (!finalizeResponse.ok) {
    const errText = await finalizeResponse.text().catch(() => "unknown error");
    throw new Error(`FINALIZE failed: ${finalizeResponse.status}: ${errText}`);
  }

  return mediaId;
}
