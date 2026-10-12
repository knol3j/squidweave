/**
 * Telegram Bot Adapter — Real API calls via Telegram Bot API.
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID from process.env.
 */
const TELEGRAM_API = 'https://api.telegram.org/bot';

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const channelId = process.env.TELEGRAM_CHANNEL_ID || '';
  return { token, channelId };
}

/**
 * Post a message to a Telegram channel.
 * @param {string} text - The message text (HTML parse mode supported)
 * @param {object} [options]
 * @param {boolean} [options.silent] - Disable notification
 * @returns {Promise<{ok: boolean, result?: object, error?: string}>}
 */
export async function sendMessage(text, options = {}) {
  const { token, channelId } = getConfig();
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }
  if (!channelId) {
    return { ok: false, error: 'TELEGRAM_CHANNEL_ID not configured' };
  }
  return sendDirectMessage(channelId, text, options);
}

/**
 * Send a direct message to any Telegram chat.
 *
 * @param {string} chatId - Target chat id or username
 * @param {string} text - Message text
 * @param {object} [options]
 * @param {boolean} [options.silent]
 * @param {boolean} [options.simulate] - When true and no token, return a simulated success
 * @returns {Promise<{ok: boolean, status: string, externalId?: string, messageId?: number, chatId?: string|number, error?: string}>}
 */
export async function sendDirectMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) {
    if (options.simulate) {
      return {
        ok: true,
        status: 'simulated',
        externalId: `tg-sim-${Date.now()}`,
        messageId: null,
        chatId,
      };
    }
    return { ok: false, status: 'error', error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const url = `${TELEGRAM_API}${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    disable_notification: !!options.silent,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.ok) {
      return { ok: false, status: 'error', error: data.description || 'Telegram API error' };
    }
    return {
      ok: true,
      status: 'published',
      externalId: `tg-${data.result?.message_id || Date.now()}`,
      messageId: data.result?.message_id,
      chatId: data.result?.chat?.id || chatId,
    };
  } catch (err) {
    return { ok: false, status: 'error', error: err.message };
  }
}

/**
 * Convenience wrapper for one-to-one outreach: defaults to simulation when no
 * bot token is configured, and passes the simulate flag through when one is.
 */
export async function sendTelegramMessage({ chatId, body, simulate = false }) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) {
    return {
      ok: true,
      status: 'simulated',
      externalId: `tg-sim-${Date.now()}`,
      messageId: null,
      chatId,
    };
  }
  return sendDirectMessage(chatId, body, { simulate });
}

/**
 * Adapter function for SocialPublishingEngine.
 * Compatible with the existing adapter signature:
 *   adapter({ campaignId, channel, variant, dryRun })
 */
export async function telegramAdapter({ campaignId, channel, variant, dryRun }) {
  if (dryRun) {
    return {
      channel: 'telegram',
      locale: variant?.locale || null,
      status: 'simulated',
      externalId: `tg-sim-${variant?.locale || 'default'}-${Date.now()}`,
    };
  }

  const message = buildMessage(variant, campaignId);
  const result = await sendMessage(message);
  if (!result.ok) {
    throw new Error(`Telegram publish failed: ${result.error}`);
  }

  return {
    channel: 'telegram',
    locale: variant?.locale || null,
    status: 'published',
    externalId: `tg-${result.result?.message_id || Date.now()}`,
    messageId: result.result?.message_id,
    chatId: result.result?.chat?.id,
  };
}

function buildMessage(variant, campaignId) {
  // Build a rich HTML message from the variant content
  const lines = [];
  if (variant?.title) lines.push(`<b>${escapeHtml(variant.title)}</b>`);
  if (variant?.body) lines.push(escapeHtml(variant.body));
  if (variant?.cta) lines.push(`\n👉 <a href="${escapeHtml(variant.ctaUrl || '#')}">${escapeHtml(variant.cta)}</a>`);
  lines.push(`\n<code>#${campaignId || 'squidweave'}</code>`);
  return lines.join('\n\n');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default { sendMessage, sendTelegramMessage, telegramAdapter };
