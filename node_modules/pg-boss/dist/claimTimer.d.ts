import type { Clock } from './types.ts';
/**
 * The timer behind an interval claim, anchored to the claim instead of to a fixed grid.
 *
 * An interval claim is a conditional UPDATE that only goes through when the row it stamps is at
 * least `seconds` old by the server's clock, so exactly one instance in a deployment runs the pass
 * per interval (see plans.trySetTimestamp). Every instance tries on a timer of its own.
 *
 * setInterval schedules the next tick from a grid fixed before the callback runs, while the row is
 * stamped when the UPDATE reaches the server - a moment later by however long the pool wait, the
 * round trip and the plan took. The two do not move together. When a tick's statement lands faster
 * than the previous tick's did, the two stamps come out closer together than the period, the claim
 * is refused, and the pass after it is a whole interval late. Measured on an idle Linux box that is
 * 4 of 19 ticks at a 45-second period, all of them between 44.990 and 44.998 seconds old, and a
 * quarter of the queue monitor's passes at its defaults. For the cron pass a lost claim is a
 * 90-second gap against a 60-second due window, and the occurrences inside it are never sent.
 *
 * Anchoring removes the mismatch rather than tolerating it: the next attempt is scheduled once the
 * claim has been stamped, so the gap between two stamps is the period plus one round trip rather
 * than the period minus the difference between two of them. It can only ever come out long, never
 * short, which is the direction that costs nothing - a pass never runs before its interval is up.
 *
 * Note what does not appear here: a clock. The claim compares two timestamps that the server wrote,
 * so the client's clock is already absent from it and skew between the two cancels exactly. There
 * is nothing for a skew correction to correct, which is why the fix is in when the attempt is made
 * rather than in what it is measured against.
 *
 * `anchor()` is what a pass calls once its claim has been stamped, and it takes a wait of its own
 * for the pass that knows when the row it was refused by comes due. A pass that returns without ever
 * reaching its claim - stopped, already working, an error on the way in - is re-armed from the end
 * of the callback instead, so the chain cannot die on a path that never anchored it.
 */
export declare class ClaimTimer {
    #private;
    constructor(clock: Clock, seconds: number, fn: () => Promise<void>);
    start(): void;
    stop(): void;
    /**
     * Re-anchors the next attempt to now, because the claim this timer drives has just been stamped.
     *
     * Called whether the claim was won or lost. A winner needs its next attempt to fall an interval
     * after its own stamp. A loser has two phases it could take, and which one it takes is not a
     * matter of taste: measured from its own failure it comes back an interval later, which is up to
     * a whole interval after the row is next due, and that is the deployment's spacing the moment the
     * instance holding the claim stops. A caller that knows when the row comes due passes that wait
     * in `ms` instead. See Timekeeper.onCron(), which is the one claim where the difference costs
     * work rather than latency.
     */
    anchor(ms?: number): void;
}
//# sourceMappingURL=claimTimer.d.ts.map