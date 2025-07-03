"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
class QueueManager {
    watermarkQueue;
    redis;
    constructor() {
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
        });
        this.watermarkQueue = new bull_1.default('watermark processing', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 5,
                attempts: 3,
                backoff: 'exponential',
            },
        });
        this.setupWorkers();
        this.setupEventHandlers();
    }
    setupWorkers() {
        // Mock image processing worker
        this.watermarkQueue.process('image', 5, async (job) => {
            const { file, watermark, settings } = job.data;
            // Simulate processing time
            for (let i = 0; i <= 100; i += 10) {
                job.progress(i);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return {
                success: true,
                resultUrl: `/processed/${file.filename}`,
                processingTime: 1000,
            };
        });
        // Mock video processing worker
        this.watermarkQueue.process('video', 2, async (job) => {
            const { file, watermark, settings } = job.data;
            // Simulate longer processing time for videos
            for (let i = 0; i <= 100; i += 5) {
                job.progress(i);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            return {
                success: true,
                resultUrl: `/processed/${file.filename}`,
                processingTime: 4000,
            };
        });
    }
    setupEventHandlers() {
        this.watermarkQueue.on('completed', (job, result) => {
            console.log(`✅ Job ${job.id} completed:`, result);
        });
        this.watermarkQueue.on('failed', (job, error) => {
            console.error(`❌ Job ${job.id} failed:`, error);
        });
        this.watermarkQueue.on('progress', (job, progress) => {
            console.log(`📊 Job ${job.id} progress: ${progress}%`);
        });
    }
    async addJob(type, data, options) {
        return await this.watermarkQueue.add(type, data, options);
    }
    async getJobStats() {
        const waiting = await this.watermarkQueue.getWaiting();
        const active = await this.watermarkQueue.getActive();
        const completed = await this.watermarkQueue.getCompleted();
        const failed = await this.watermarkQueue.getFailed();
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
        };
    }
    async cleanup() {
        await this.watermarkQueue.close();
        await this.redis.quit();
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=QueueManager.js.map