export declare class QueueManager {
    private watermarkQueue;
    private redis;
    constructor();
    private setupWorkers;
    private setupEventHandlers;
    addJob(type: string, data: any, options?: any): Promise<any>;
    getJobStats(): Promise<{
        waiting: any;
        active: any;
        completed: any;
        failed: any;
    }>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=QueueManager.d.ts.map