export class BaseConnector {
  constructor(name, options) {
    this.name = name;
    this.baseUrl = options.baseUrl;
    this.token = options.token;
    this.dryRun = options.dryRun;
    this.healthPath = options.healthPath || "/health";
    this.executePath = options.executePath || "/execute";
    this.queryPath = options.queryPath || "/query";
    this.supportedActions = Array.isArray(options.supportedActions) ? options.supportedActions : ["*"];
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

  buildEndpoint(pathname = "") {
    if (!this.baseUrl) {
      return "";
    }
    const base = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const path = pathname ? (pathname.startsWith("/") ? pathname : `/${pathname}`) : "";
    return `${base}${path}`;
  }

  supports(actionType) {
    return this.supportedActions.includes("*") || this.supportedActions.includes(actionType);
  }

  getCapabilities() {
    return {
      connector: this.name,
      supportedActions: this.supportedActions,
      executePath: this.executePath,
      queryPath: this.queryPath,
      healthPath: this.healthPath,
      dryRun: this.dryRun,
      supportsQuery: true,
    };
  }

  async query(spec = {}) {
    if (this.dryRun || !this.isConfigured()) {
      return {
        connector: this.name,
        mode: this.dryRun ? "dry-run-disabled" : "not-configured",
        accepted: false,
        items: [],
        totalCount: 0,
        source: "connector",
      };
    }

    const response = await fetch(this.buildEndpoint(this.queryPath), {
      method: "POST",
      headers: this.buildAuthHeaders({
        "content-type": "application/json",
      }),
      body: JSON.stringify(spec),
    });

    const body = await response.text();
    if ([401, 403].includes(response.status)) {
      this.markAuthError(response.status, body || "Authentication rejected by connector.");
    } else if (response.ok) {
      this.clearAuthError();
    }

    let parsedBody = null;
    try {
      parsedBody = body ? JSON.parse(body) : null;
    } catch {
      parsedBody = { items: [], raw: body };
    }

    if (!response.ok) {
      throw new Error(parsedBody?.error || body || `Connector query failed with ${response.status}`);
    }

    return {
      connector: this.name,
      mode: "live",
      accepted: true,
      ...parsedBody,
    };
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
      capabilities: this.getCapabilities(),
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
      }).catch(async () => {
        return fetch(this.buildEndpoint(this.healthPath), {
          method: "GET",
          headers: this.buildAuthHeaders(),
          signal: controller.signal,
        });
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
    if (!action?.type) {
      throw new Error("Connector action requires a type.");
    }

    const payload = {
      executionId: crypto.randomUUID(),
      action,
      context,
      metadata: {
        connector: this.name,
        sentAt: new Date().toISOString(),
      },
    };

    if (!this.supports(action.type)) {
      return {
        connector: this.name,
        mode: "unsupported-action",
        accepted: false,
        executionId: payload.executionId,
        actionType: action.type,
        payload,
      };
    }

    if (this.dryRun || !this.isConfigured()) {
      return {
        connector: this.name,
        mode: this.dryRun ? "dry-run-disabled" : "not-configured",
        accepted: false,
        executionId: payload.executionId,
        actionType: action.type,
        payload,
      };
    }

    const response = await fetch(this.buildEndpoint(this.executePath), {
      method: "POST",
      headers: this.buildAuthHeaders({
        "content-type": "application/json",
        "x-execution-id": payload.executionId,
      }),
      body: JSON.stringify(payload),
    });

    const body = await response.text();
    if ([401, 403].includes(response.status)) {
      this.markAuthError(response.status, body || "Authentication rejected by connector.");
    } else if (response.ok) {
      this.clearAuthError();
    }

    let parsedBody = null;
    try {
      parsedBody = body ? JSON.parse(body) : null;
    } catch {
      parsedBody = body || null;
    }

    return {
      connector: this.name,
      mode: response.ok ? "live" : "error",
      accepted: response.ok,
      status: response.status,
      executionId: payload.executionId,
      actionType: action.type,
      payload: parsedBody,
      delivery: response.status === 202 ? "accepted" : response.ok ? "completed" : "rejected",
      tokenLikelyRotated: [401, 403].includes(response.status),
    };
  }
}
