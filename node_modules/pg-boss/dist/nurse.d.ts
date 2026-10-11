import type * as types from './types.ts';
interface Hierarchy {
    dirs: string[];
}
export interface Cgroup {
    version: 1 | 2;
    cpu: Hierarchy | null;
    memory: Hierarchy | null;
}
export declare function findCgroup(prefix?: string): Promise<Cgroup | null>;
export declare function countCpuList(list: string): number | null;
declare class Nurse {
    #private;
    constructor(prefix?: string);
    start(): void;
    stop(): void;
    check(): Promise<types.InstanceMetrics>;
}
export default Nurse;
//# sourceMappingURL=nurse.d.ts.map