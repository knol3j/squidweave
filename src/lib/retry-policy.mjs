function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
}

export async function withRetryPolicy(operation, options = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 250,
    backoffMultiplier = 2,
    jitterMs = 50,
    shouldRetry = error => !error?.nonRetryable,
    operationName = "operation",
  } = options;

  const startedAt = new Date().toISOString();
  const errors = [];

  for (let attempt = 1; attempt <= Math.max(1, Number(maxAttempts) || 1); attempt += 1) {
    try {
      const result = await operation({ attempt });
      return {
        status: "success",
        attempts: attempt,
        operationName,
        startedAt,
        finishedAt: new Date().toISOString(),
        errors,
        result,
      };
    } catch (error) {
      const message = error?.message || String(error);
      errors.push({ attempt, message, at: new Date().toISOString() });
      const retryable = attempt < maxAttempts && shouldRetry(error);
      if (!retryable) {
        return {
          status: "failed",
          attempts: attempt,
          operationName,
          startedAt,
          finishedAt: new Date().toISOString(),
          errors,
          error: message,
          result: null,
        };
      }
      const baseDelay = Number(initialDelayMs) * Math.pow(Number(backoffMultiplier), attempt - 1);
      const jitter = jitterMs ? Math.floor(Math.random() * Number(jitterMs)) : 0;
      await sleep(baseDelay + jitter);
    }
  }

  return {
    status: "failed",
    attempts: maxAttempts,
    operationName,
    startedAt,
    finishedAt: new Date().toISOString(),
    errors,
    error: `${operationName} exhausted retries`,
    result: null,
  };
}
