/**
 * Gemini Provider — Google Gemini REST API client.
 *
 * Uses the Generative Language API:
 *   https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *
 * Drop-in replacement for LlmProvider — same interface:
 *   isConfigured(), generate(prompt, options), generateStructured(prompt, schema, options)
 *
 * Auth: API key via query parameter (Google AI Studio style).
 */

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// ── Response parsing ──────────────────────────────────────────────

function extractGeminiText(payload = {}) {
  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return '';

  return parts
    .map((part) => part.text || '')
    .filter(Boolean)
    .join('\n');
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

export class GeminiProvider {
  /**
   * @param {Object} opts
   * @param {string} opts.apiKey    — Google AI Studio API key
   * @param {string} opts.model     — model name, e.g. "gemini-2.0-flash"
   * @param {number} opts.timeoutMs — request timeout (default 60s)
   * @param {string} opts.baseUrl   — API base URL (rarely needs changing)
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || '';
    this.model = opts.model || 'gemini-2.0-flash';
    this.timeoutMs = opts.timeoutMs || 60000;
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Returns a human-readable label for the active provider.
   */
  get providerName() {
    return 'gemini';
  }

  async generate(prompt, options = {}) {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error: 'Gemini provider not configured. Set GEMINI_API_KEY.',
        text: '',
        parsed: null,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const generationConfig = {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      };

      // When caller expects JSON, ask Gemini to return JSON via responseMimeType
      if (options.schema) {
        generationConfig.responseMimeType = 'application/json';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        return {
          ok: false,
          error: `Gemini API error ${response.status}: ${bodyText.slice(0, 300)}`,
          text: '',
          parsed: null,
        };
      }

      const payload = await response.json();
      const text = extractGeminiText(payload);

      // Check for safety blocks
      const finishReason = payload.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
        return {
          ok: false,
          error: `Gemini response blocked: ${finishReason}`,
          text: '',
          parsed: null,
        };
      }

      let parsed = null;
      if (options.schema) {
        parsed = parseJsonBlock(text);
        if (!parsed) {
          return {
            ok: false,
            error: 'Gemini response did not contain valid JSON matching the requested schema',
            text,
            parsed: null,
          };
        }
      }

      return {
        ok: true,
        text,
        parsed,
        model: payload.modelVersion || this.model,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ok: false, error: `Gemini request timed out after ${this.timeoutMs}ms`, text: '', parsed: null };
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
