/**
 * LLM Provider — OpenAI-compatible chat completions client.
 *
 * Uses a standard /v1/chat/completions endpoint (OpenAI, OpenRouter, DeepSeek, etc.)
 * with configurable model, base URL, and API key.
 *
 * Two modes:
 *   1. Direct mode: LLM_BASE_URL + LLM_API_KEY + LLM_MODEL
 *   2. OpenClaw gateway: OPENCLAW_BASE_URL + OPENCLAW_TOKEN (fallback)
 *
 * Usage:
 *   import { createLlmProvider } from './llm-provider.mjs';
 *   const llm = createLlmProvider(config);
 *   const result = await llm.generate("Write a poem", { schema: {...} });
 */

// ── Response parsing ──────────────────────────────────────────────

function extractChatMessage(payload = {}) {
  if (typeof payload.output_text === 'string' && payload.output_text) {
    return payload.output_text;
  }

  if (Array.isArray(payload.output)) {
    const text = payload.output
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
      .map((item) => item?.text || item?.content || '')
      .filter(Boolean)
      .join('\n');
    if (text) return text;
  }

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';

  const message = choices[0]?.message?.content;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    return message
      .map((item) => (typeof item === 'string' ? item : item?.text || item?.content || ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function parseJsonBlock(text) {
  if (!text) return null;
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ── Main client ───────────────────────────────────────────────────

export class LlmProvider {
  /**
   * @param {Object} opts
   * @param {string} opts.baseUrl   — e.g. "https://api.openai.com/v1" or "http://127.0.0.1:1234/v1"
   * @param {string} opts.apiKey    — Bearer token / API key
   * @param {string} opts.model     — model name, e.g. "gpt-4o-mini" or "deepseek-chat"
   * @param {number} opts.timeoutMs — request timeout (default 30s)
   */
  constructor(opts = {}) {
    this.baseUrl = (opts.baseUrl || '').replace(/\/$/, '');
    this.apiKey = opts.apiKey || '';
    this.model = opts.model || 'gpt-4o-mini';
    this.timeoutMs = opts.timeoutMs || 60000;
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async generate(prompt, options = {}) {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error: 'LLM provider not configured. Set LLM_BASE_URL and LLM_API_KEY.',
        text: '',
        parsed: null,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        return {
          ok: false,
          error: `LLM API error ${response.status}: ${bodyText.slice(0, 200)}`,
          text: '',
          parsed: null,
        };
      }

      const payload = await response.json();
      const text = extractChatMessage(payload);

      let parsed = null;
      if (options.schema) {
        parsed = parseJsonBlock(text);
        if (!parsed) {
          return {
            ok: false,
            error: 'Model response did not contain valid JSON matching the requested schema',
            text,
            parsed: null,
          };
        }
      }

      return {
        ok: true,
        text,
        parsed,
        model: payload.model || this.model,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ok: false, error: `LLM request timed out after ${this.timeoutMs}ms`, text: '', parsed: null };
      }
      return { ok: false, error: err.message, text: '', parsed: null };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Generate structured JSON output with retries and schema validation.
   */
  async generateStructured(prompt, schema, options = {}) {
    const maxRetries = options.maxRetries ?? 2;
    let lastError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.generate(
        attempt === 0
          ? prompt
          : `${prompt}\n\nRetryInstruction: The previous response failed to produce valid JSON matching the schema. ${lastError}\nReturn ONLY valid JSON.`,
        { ...options, schema: true }
      );

      if (!result.ok) {
        lastError = result.error;
        continue;
      }

      if (result.parsed) {
        return result;
      }

      lastError = 'Response was not valid JSON';
    }

    return {
      ok: false,
      error: `Failed to generate valid structured output after ${maxRetries + 1} attempts. Last error: ${lastError}`,
      text: '',
      parsed: null,
    };
  }
}

/**
 * Factory — creates an LlmProvider from app config.
 */
export function createLlmProvider(config) {
  // 1. Direct OpenAI-compatible provider
  if (config.llm?.baseUrl && config.llm?.apiKey) {
    return new LlmProvider({
      baseUrl: config.llm.baseUrl,
      apiKey: config.llm.apiKey,
      model: config.llm.model || 'gpt-4o-mini',
      timeoutMs: config.llm.timeoutMs,
    });
  }

  // 2. OpenClaw gateway (OpenAI-compatible fallback)
  if (config.connectors?.openclaw?.baseUrl && config.connectors?.openclaw?.token) {
    return new LlmProvider({
      baseUrl: config.connectors.openclaw.baseUrl,
      apiKey: config.connectors.openclaw.token,
      model: config.llm?.model || 'gpt-4o-mini',
      timeoutMs: config.llm?.timeoutMs,
    });
  }

  // 3. Not configured — return a no-op provider
  return new LlmProvider({});
}
