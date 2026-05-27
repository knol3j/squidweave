function isoNow() {
  return new Date().toISOString();
}

function ageSeconds(timestamp) {
  return Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 1000);
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
  }) {
    if (liveSideEffect && !this.config.dryRun && this.config.safety.requireLiveApproval && approvalToken !== "approved") {
      throw new UnsafeExecutionError(
        "Live side effects require explicit approvalToken=approved while DRY_RUN=false.",
        { campaignId, executionType, liveSideEffect },
      );
    }

    const running = this.store.listExecutionReceipts({ status: "running" });
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
  }) {
    await this.assertSafeToRun({
      campaignId,
      executionType,
      idempotencyKey,
      liveSideEffect,
      approvalToken,
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
      const result = await operation(receipt);
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
