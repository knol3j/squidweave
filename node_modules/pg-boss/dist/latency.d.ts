type Bins = number[] | null | undefined;
/**
 * Combines two wait or run histograms into one by adding their counts bin by bin, as if all their
 * jobs had been recorded together. A null histogram counts as empty; null only when both are.
 * @see https://pgboss.io/api/utils#addbins-a-b
 */
export declare function addBins(a: Bins, b: Bins): number[] | null;
/**
 * The time in seconds below which `p` percent (1 to 100) of a wait or run histogram's jobs fall,
 * estimated within its bin, so `percentile(bins, 95)` is the p95. Null for an empty histogram.
 * @see https://pgboss.io/api/utils#percentile-bins-p
 */
export declare function percentile(bins: Bins, p: number): number | null;
export {};
//# sourceMappingURL=latency.d.ts.map