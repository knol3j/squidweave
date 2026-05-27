/**
 * LinkedIn (X) API Adapter — Posts content to LinkedIn via the LinkedIn Marketing / Share API.
 *
 * Credentials (set in .env.local):
 *   LINKEDIN_ACCESS_TOKEN=<OAuth2 token with w_member_social or w_organization_social scope>
 *   LINKEDIN_PERSON_URN=urn:li:person:<id>      (for personal posting)
 *   LINKEDIN_ORGANIZATION_URN=urn:li:organization:<id>  (for company page posting — one of person or org)
 *
 * The adapter creates a post (share) on LinkedIn.
 * Falls back to simulation when no access token is configured.
 */

const LINKEDIN_API_BASE = "https://api.linkedin.com";
const LINKEDIN_API_VERSION = "202503";

/**
 * Build the request body for a LinkedIn post (REST API /rest/posts).
 *
 * @param {object} variant - Content variant with { text, locale, ... }
 * @param {boolean} useOrganization - Whether to post as an org (vs person)
 * @param {object} authorUrns - { personUrn, organizationUrn }
 * @returns {object} Post body
 */
function buildPostBody(variant, useOrganization, authorUrns) {
  const author = useOrganization && authorUrns.organizationUrn
    ? authorUrns.organizationUrn
    : authorUrns.personUrn;

  const body = {
    author,
    commentary: variant.text || variant.content || "",
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  // Attach media if provided
  if (variant.imageUrl || variant.mediaUrl) {
    body.content = {
      media: {
        title: variant.title || "",
        id: variant.mediaId || undefined,
      },
    };
  }

  return body;
}

/**
 * Build a LinkedIn UGC Post body (v2 API — fallback if /rest/posts is unavailable).
 */
function buildUgcPostBody(variant, useOrganization, authorUrns) {
  const author = useOrganization && authorUrns.organizationUrn
    ? authorUrns.organizationUrn
    : authorUrns.personUrn;

  let shareCommentary = {
    text: variant.text || variant.content || "",
  };

  const body = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary,
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  if (variant.imageUrl) {
    body.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "IMAGE";
    body.specificContent["com.linkedin.ugc.ShareContent"].media = [
      {
        status: "READY",
        description: { text: variant.text || "" },
        media: variant.imageUrl,
        title: { text: variant.title || "" },
      },
    ];
  }

  return body;
}

/**
 * Post content to LinkedIn.
 *
 * @param {object} opts
 * @param {string} opts.campaignId
 * @param {string} opts.channel
 * @param {object} opts.variant - { text, locale, title, imageUrl, mediaUrl }
 * @param {boolean} opts.dryRun
 * @returns {Promise<{ channel: string, locale: string|null, status: string, externalId: string|null }>}
 */
export async function linkedinAdapter({ campaignId, channel, variant, dryRun }) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN || "";
  const personUrn = process.env.LINKEDIN_PERSON_URN || "";
  const organizationUrn = process.env.LINKEDIN_ORGANIZATION_URN || "";

  const locale = variant?.locale || null;
  const text = variant?.text || variant?.content || "";

  // No credentials — simulate
  if (!accessToken) {
    return {
      channel: "linkedin",
      locale,
      status: dryRun ? "simulated" : "simulated",
      externalId: null,
      reason: "no-credentials",
    };
  }

  if (dryRun) {
    return {
      channel: "linkedin",
      locale,
      status: "simulated",
      externalId: `li-sim-${locale || "default"}-${Date.now()}`,
    };
  }

  // Determine posting target
  const useOrganization = !personUrn && !!organizationUrn;
  const authorUrns = { personUrn, organizationUrn };

  // Try the new REST API first, fall back to v2 UGC
  let lastError = null;

  for (const [apiLabel, url, bodyFn] of [
    ["rest/posts", `${LINKEDIN_API_BASE}/rest/posts`, buildPostBody],
    ["v2/ugcPosts", `${LINKEDIN_API_BASE}/v2/ugcPosts`, buildUgcPostBody],
  ]) {
    try {
      const body = bodyFn(variant, useOrganization, authorUrns);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": LINKEDIN_API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown error");
        lastError = `${apiLabel} -> ${response.status}: ${errText}`;
        continue; // Try the next API version
      }

      const result = await response.json();

      // Extract post ID from response
      const externalId = result?.id || null;

      return {
        channel: "linkedin",
        locale,
        status: "published",
        externalId: `li-${externalId || locale || "default"}-${Date.now()}`,
      };
    } catch (err) {
      lastError = `${apiLabel} -> ${err.message}`;
    }
  }

  // All attempts failed
  return {
    channel: "linkedin",
    locale,
    status: "failed",
    externalId: null,
    error: lastError || "all-linkedin-api-attempts-failed",
  };
}
