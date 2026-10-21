function isoNow() {
  return new Date().toISOString();
}

function ageSeconds(timestamp) {
  return Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 1000);
}

function withTimeout(promise, ms, context = "operation") {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${context} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export class UnsafeExecutionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "UnsafeExecutionError";
    this.statusCode = 409;
    this.details = details;
  }
}

export class ExecutionGuard {
  constructor({ store, config }) {
    this.store = store;
    this.config = config;
  }

  buildIdempotencyKey({ campaignId, executionType, reason = "", keyParts = [] }) {
    const normalizedParts = [campaignId, executionType, reason, ...keyParts]
      .map(value => String(value || "").trim())
      .filter(Boolean);
    return normalizedParts.join("::");
  }

  assertBatchWithinLimit(requestedBatch, maxAllowed, details = {}) {
    if (requestedBatch > maxAllowed) {
      throw new UnsafeExecutionError(
        `Requested batch ${requestedBatch} exceeds the configured safety limit ${maxAllowed}.`,
        { requestedBatch, maxAllowed, ...details },
      );
    }
  }

  async assertSafeToRun({
    campaignId,
    executionType,
    idempotencyKey,
    liveSideEffect = false,
    approvalToken = "",
    timeoutMs = null,
  }) {
    if (liveSideEffect && !this.config.dryRun && this.config.safety.requireLiveApproval && approvalToken !== "approved") {
      throw new UnsafeExecutionError(
        "Live side effects require explicit approvalToken=approved while DRY_RUN=false.",
        { campaignId, executionType, liveSideEffect },
      );
    }

    const staleThresholdMs = timeoutMs || 300_000; // 5 minutes default
    const allRunning = this.store.listExecutionReceipts({ status: "running" });
    const staleUpdates = [];
    const running = allRunning.filter((receipt) => {
      const ageMs = ageSeconds(receipt.createdAt) * 1000;
      if (ageMs > staleThresholdMs) {
        staleUpdates.push(
          this.store.updateExecutionReceipt(receipt.id, {
            status: "failed",
            failedAt: isoNow(),
            error: `Stale running receipt exceeded ${staleThresholdMs}ms timeout`,
          }).catch(() => {}),
        );
        return false;
      }
      return true;
    });
    if (staleUpdates.length) await Promise.all(staleUpdates);
    if (running.length >= this.config.safety.maxConcurrentExecutions) {
      throw new UnsafeExecutionError(
        "Concurrent execution safety limit reached.",
        { running: running.length, maxConcurrentExecutions: this.config.safety.maxConcurrentExecutions },
      );
    }

    const recentReceipts = this.store
      .listExecutionReceipts({ campaignId, executionType, idempotencyKey })
      .filter(receipt => ageSeconds(receipt.createdAt) <= this.config.safety.executionDedupeWindowSeconds)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const recent = recentReceipts[0] || null;
    if (recent && ["running", "completed"].includes(recent.status)) {
      throw new UnsafeExecutionError(
        "Duplicate execution blocked by idempotency window.",
        {
          campaignId,
          executionType,
          idempotencyKey,
          duplicateReceiptId: recent.id,
          duplicateStatus: recent.status,
          duplicateCreatedAt: recent.createdAt,
        },
      );
    }
  }

  async run({
    campaignId,
    executionType,
    reason = "manual",
    idempotencyKey,
    approvalToken = "",
    liveSideEffect = false,
    metadata = {},
    operation,
    timeoutMs = null,
  }) {
    await this.assertSafeToRun({
      campaignId,
      executionType,
      idempotencyKey,
      liveSideEffect,
      approvalToken,
      timeoutMs,
    });

    const receipt = await this.store.addExecutionReceipt({
      id: crypto.randomUUID(),
      campaignId,
      executionType,
      idempotencyKey,
      reason,
      liveSideEffect,
      status: "running",
      createdAt: isoNow(),
      updatedAt: isoNow(),
      metadata,
    });

    try {
      const op = operation(receipt);
      const result = timeoutMs ? await withTimeout(op, timeoutMs, `${executionType}:${campaignId}`) : await op;
      await this.store.updateExecutionReceipt(receipt.id, {
        status: "completed",
        completedAt: isoNow(),
        resultSummary: metadata.resultSummaryBuilder
          ? metadata.resultSummaryBuilder(result)
          : null,
      });
      return { receiptId: receipt.id, result };
    } catch (error) {
      await this.store.updateExecutionReceipt(receipt.id, {
        status: "failed",
        failedAt: isoNow(),
        error: error.message,
      });
      throw error;
    }
  }
}
