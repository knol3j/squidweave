import type { AttachableClock, Clock, ClockTimer, IDatabase } from './types.ts';
export declare const systemClock: Clock;
export declare function isAttachable(clock: Clock): clock is AttachableClock;
interface Target {
    db: IDatabase;
    schema: string;
    idle?: () => Promise<boolean>;
}
/**
 * A clock a test drives by hand. Time only moves through setTime() and tick(); timers only fire
 * from tick(). When attached to a schema, every pg-boss statement there reads the same time
 * through ${schema}.job_now(), so JavaScript and Postgres agree on what "now" is.
 */
export declare class TestClock implements AttachableClock {
    #private;
    constructor(start?: Date | number | string);
    now(): number;
    setTimeout(fn: () => void, ms: number): ClockTimer;
    setInterval(fn: () => void, ms: number): ClockTimer;
    clearTimeout(handle: ClockTimer): void;
    clearInterval(handle: ClockTimer): void;
    /**
     * Jumps to a time, forwards or backwards, firing nothing. Settles first, so work already in
     * flight finishes on the time it started under. Postgres sees a forward jump as elapsed time, so
     * JS timers do too: each one the jump passed fires once on the next tick, as if the process had
     * slept, and an interval then keeps its period from there instead of replaying every period it
     * skipped. A backward jump leaves timers alone, so JS deadlines still agree with the database's.
     */
    setTime(t: Date | number | string): Promise<void>;
    /**
     * Advances by ms, firing each due timer in order at its own due time. After each timer, and
     * before and after the whole advance, waits until pg-boss has no statement in flight, so a poll
     * the tick fired finishes, and anything it re-arms before the target fires in this same tick.
     * Does not wait for job handlers; observe their effects with spies or by querying.
     */
    tick(ms: number): Promise<void>;
    attach(target: Target): Promise<AsyncDisposable>;
}
export {};
//# sourceMappingURL=clock.d.ts.map