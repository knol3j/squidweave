import { EventEmitter } from "node:events";

export class JobManager {
  constructor() {
    this.jobs = new Map();
    this.events = new EventEmitter();
  }

  createJob(type, metadata = {}) {
    const job = {
      id: crypto.randomUUID(),
      type,
      status: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
      result: null,
      error: null,
      events: [],
    };
    this.jobs.set(job.id, job);
    this.push(job.id, "queued", `${type} job created.`, metadata);
    return job;
  }

  push(jobId, status, message, payload = {}) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Unknown job: ${jobId}`);
    }
    const event = {
      id: crypto.randomUUID(),
      jobId,
      status,
      message,
      payload,
      createdAt: new Date().toISOString(),
    };
    job.status = status;
    job.updatedAt = event.createdAt;
    job.events.push(event);
    this.events.emit(jobId, event);
    return event;
  }

  complete(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Unknown job: ${jobId}`);
    }
    job.result = result;
    this.push(jobId, "completed", "Job completed.", {
      resultType: Array.isArray(result) ? "array" : typeof result,
    });
    return job;
  }

  fail(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Unknown job: ${jobId}`);
    }
    job.error = {
      message: error.message,
      stack: error.stack,
    };
    this.push(jobId, "failed", error.message || "Job failed.");
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  subscribe(jobId, listener) {
    this.events.on(jobId, listener);
    return () => this.events.off(jobId, listener);
  }
}

