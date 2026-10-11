import type { IDatabase } from './types.ts';
/**
 * The db a tracked one wraps, or the db itself if it is not tracked. What a transactional handler
 * is given, since a handler's statements are not pg-boss's to wait for.
 */
export declare function untracked<D extends IDatabase>(db: D): D;
/**
 * Counts the statements pg-boss has in flight, so a TestClock can let them finish before it moves
 * time on. PgBoss wraps its db with this only when its clock is attachable.
 */
export declare function trackActivity<T extends IDatabase>(db: T): {
    db: T;
    idle: () => Promise<boolean>;
};
//# sourceMappingURL=activity.d.ts.map