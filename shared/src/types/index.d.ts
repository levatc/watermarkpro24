export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
        requestId: string;
    };
    message?: string;
}
export interface FileMetadata {
    width?: number;
    height?: number;
    duration?: number;
    format: string;
    colorSpace?: string;
    hasAlpha?: boolean;
}
export interface UploadedFile {
    id: string;
    originalName: string;
    filename: string;
    mimetype: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    metadata: FileMetadata;
    uploadedAt: string;
}
export interface WatermarkSettings {
    opacity: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
    customPosition?: {
        x: number;
        y: number;
    };
    scale: number;
    blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    tiled?: boolean;
    spacing?: {
        x: number;
        y: number;
    };
}
export interface Watermark {
    id: string;
    name: string;
    type: 'image' | 'text';
    settings: WatermarkSettings;
    previewUrl?: string;
    fileUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export declare enum JobStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum JobPriority {
    LOW = "low",
    NORMAL = "normal",
    HIGH = "high",
    URGENT = "urgent"
}
export interface OutputSettings {
    format?: 'original' | 'jpg' | 'png' | 'webp' | 'mp4';
    quality?: number;
    compression?: 'none' | 'low' | 'medium' | 'high';
    resize?: {
        width?: number;
        height?: number;
        maintainAspectRatio?: boolean;
    };
}
export interface JobFile {
    fileId: string;
    status: JobStatus;
    progress: number;
    resultUrl?: string;
    error?: string;
}
export interface Job {
    id: string;
    status: JobStatus;
    priority: JobPriority;
    progress: number;
    files: JobFile[];
    watermarkId: string;
    outputSettings: OutputSettings;
    estimatedDuration?: number;
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    error?: string;
    createdAt: string;
}
export interface WSJobUpdate {
    type: 'job_update';
    data: {
        jobId: string;
        status: JobStatus;
        progress: number;
        fileUpdates?: {
            fileId: string;
            status: JobStatus;
            progress: number;
            resultUrl?: string;
            error?: string;
        }[];
    };
}
export interface WSQueueUpdate {
    type: 'queue_update';
    data: {
        queueLength: number;
        activeJobs: number;
        estimatedWaitTime: number;
    };
}
export interface WSSystemStatus {
    type: 'system_status';
    data: {
        status: 'online' | 'maintenance' | 'degraded';
        activeWorkers: number;
        throughput: number;
        message?: string;
    };
}
export type WSMessage = WSJobUpdate | WSQueueUpdate | WSSystemStatus;
export declare enum ErrorCodes {
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    INVALID_INPUT = "INVALID_INPUT",
    FILE_TOO_LARGE = "FILE_TOO_LARGE",
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    PROCESSING_FAILED = "PROCESSING_FAILED",
    WATERMARK_NOT_FOUND = "WATERMARK_NOT_FOUND",
    JOB_NOT_FOUND = "JOB_NOT_FOUND",
    QUEUE_FULL = "QUEUE_FULL",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
}
//# sourceMappingURL=index.d.ts.map