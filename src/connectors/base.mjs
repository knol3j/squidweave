export class BaseConnector {
  constructor(name, options) {
    this.name = name;
    this.baseUrl = options.baseUrl;
    this.token = options.token;
    this.dryRun = options.dryRun;
    this.lastAuthErrorAt = null;
    this.lastAuthError = null;
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.token);
  }

  setCredentials({ baseUrl, token, dryRun }) {
    if (baseUrl !== undefined) {
      this.baseUrl = baseUrl;
    }
    if (token !== undefined) {
      this.token = token;
    }
    if (dryRun !== undefined) {
      this.dryRun = dryRun;
    }
    this.lastAuthErrorAt = null;
    this.lastAuthError = null;
  }

  buildAuthHeaders(extraHeaders = {}) {
    return {
      ...extraHeaders,
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
    };
  }

  markAuthError(status, bodyText = "") {
    this.lastAuthErrorAt = new Date().toISOString();
    this.lastAuthError = {
      status,
      message: bodyText || `HTTP ${status}`,
    };
  }

  clearAuthError() {
    this.lastAuthErrorAt = null;
    this.lastAuthError = null;
  }

  async getStatus(options = {}) {
    const status = {
      connector: this.name,
      configured: this.isConfigured(),
      dryRun: this.dryRun,
      baseUrl: this.baseUrl || null,
      tokenConfigured: Boolean(this.token),
      mode: this.dryRun ? "dry-run" : this.isConfigured() ? "ready" : "not-configured",
      reachable: null,
      checkedAt: new Date().toISOString(),
      error: null,
      tokenLikelyRotated: Boolean(this.lastAuthError && [401, 403].includes(this.lastAuthError.status)),
      lastAuthErrorAt: this.lastAuthErrorAt,
    };

    if (!options.probe || this.dryRun || !this.isConfigured()) {
      if (status.tokenLikelyRotated && this.lastAuthError) {
        status.mode = "auth-error";
        status.error = this.lastAuthError.message;
      }
      return status;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs || 4000);

    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: this.buildAuthHeaders(),
        signal: controller.signal,
      });
      const bodyText = response.ok ? "" : await response.text();
      if ([401, 403].includes(response.status)) {
        this.markAuthError(response.status, bodyText || "Authentication rejected by connector.");
      } else if (response.ok) {
        this.clearAuthError();
      }
      status.reachable = response.ok;
      status.mode = response.ok ? "live" : [401, 403].includes(response.status) ? "auth-error" : "error";
      status.error = response.ok ? null : bodyText || `HTTP ${response.status}`;
      status.tokenLikelyRotated = [401, 403].includes(response.status);
      status.lastAuthErrorAt = this.lastAuthErrorAt;
      return status;
    } catch (error) {
      status.reachable = false;
      status.mode = "error";
      status.error = error.message;
      return status;
    } finally {
      clearTimeout(timer);
    }
  }

  async execute(action, context) {
    const payload = {
      action,
      context,
      metadata: {
        connector: this.name,
        sentAt: new Date().toISOString(),
      },
    };

    if (this.dryRun || !this.isConfigured()) {
      return {
        connector: this.name,
        mode: this.dryRun ? "dry-run-disabled" : "not-configured",
        accepted: false,
        payload,
      };
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.buildAuthHeaders({
        "content-type": "application/json",
      }),
      body: JSON.stringify(payload),
    });

    const body = await response.text();
    if ([401, 403].includes(response.status)) {
      this.markAuthError(response.status, body || "Authentication rejected by connector.");
    } else if (response.ok) {
      this.clearAuthError();
    }
    return {
      connector: this.name,
      mode: "live",
      accepted: response.ok,
      status: response.status,
      payload: body,
      tokenLikelyRotated: [401, 403].includes(response.status),
    };
  }
}
