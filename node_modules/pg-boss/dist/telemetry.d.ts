import type * as types from './types.ts';
export declare const ATTR: {
    readonly messagingSystem: "messaging.system";
    readonly operationName: "messaging.operation.name";
    readonly operationType: "messaging.operation.type";
    readonly destinationName: "messaging.destination.name";
    readonly messageId: "messaging.message.id";
    readonly batchMessageCount: "messaging.batch.message_count";
    readonly errorType: "error.type";
    readonly dbNamespace: "db.namespace";
    readonly schema: "pgboss.schema";
    readonly retryCount: "pgboss.job.retry_count";
    readonly jobState: "pgboss.job.state";
};
export declare const METRIC: {
    readonly operationDuration: "messaging.client.operation.duration";
    readonly sentMessages: "messaging.client.sent.messages";
    readonly consumedMessages: "messaging.client.consumed.messages";
    readonly processDuration: "messaging.process.duration";
    readonly queueJobs: "pgboss.queue.jobs";
};
export declare const MESSAGING_SYSTEM = "pg-boss";
export declare const INSTRUMENTATION_SCOPE = "pg-boss";
export type TraceCarrier = Record<string, string>;
interface CarrierJob {
    id: string;
    retryCount?: number;
}
type QueueSnapshot = () => Record<string, types.QueueResult> | null;
declare class Telemetry {
    #private;
    readonly enabled: boolean;
    constructor(options: types.OpenTelemetryOptions | undefined, schema: string, queues: QueueSnapshot);
    setDatabase(database: string): void;
    observeQueues(): void;
    unobserveQueues(): void;
    refreshInstruments(): void;
    /**
     * Runs a job-creating operation in a PRODUCER span and hands `fn` the trace context to store on
     * each job it inserts, or null when there is nothing to propagate. `attempted` is the number of
     * jobs it creates itself, counted whether or not they land. A function instead counts from the
     * result, and counts nothing when `fn` throws.
     */
    send<T>(operation: string, destination: string | null, attempted: number | ((result: T) => number), fn: (carrier: TraceCarrier | null) => Promise<T>, idsOf?: (result: T) => string[] | null): Promise<T>;
    /**
     * Wraps a fetch() the application made itself in a CLIENT `receive` span, linked to the send of
     * every job it returned.
     */
    receive<J extends CarrierJob>(destination: string, fn: () => Promise<J[]>, carrierOf: (job: J) => TraceCarrier | null | undefined): Promise<J[]>;
    consumed(destination: string, count: number): void;
    /**
     * Runs a worker's handler over a batch in a CONSUMER `process` span. A batch of one continues the
     * trace its send() started; a larger batch starts a trace of its own and links to every send.
     *
     * `fn` resolves with the error the batch failed with, or undefined when it completed, because the
     * worker settles a failed batch itself rather than letting the error escape.
     */
    process<J extends CarrierJob>(destination: string, jobs: J[], carrierOf: (job: J) => TraceCarrier | null | undefined, fn: () => Promise<unknown>): Promise<void>;
    /**
     * Wraps a call that settles or removes jobs (complete, fail, cancel, deleteJob) in a CLIENT span.
     */
    settle<T>(operation: string, destination: string, ids: string[], fn: () => Promise<T>): Promise<T>;
}
export default Telemetry;
//# sourceMappingURL=telemetry.d.ts.map