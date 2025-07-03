export declare const formatFileSize: (bytes: number) => string;
export declare const getFileExtension: (filename: string) => string;
export declare const isImageFile: (mimetype: string) => boolean;
export declare const isVideoFile: (mimetype: string) => boolean;
export declare const isArchiveFile: (mimetype: string) => boolean;
export declare const validateEmail: (email: string) => boolean;
export declare const validateFileSize: (size: number, maxSize?: number) => boolean;
export declare const formatDuration: (seconds: number) => string;
export declare const estimateProcessingTime: (fileSize: number, fileType: "image" | "video") => number;
export declare const calculateProgress: (completed: number, total: number) => number;
export declare const generateId: () => string;
export declare const createError: (code: string, message: string, details?: any) => {
    code: string;
    message: string;
    details: any;
    timestamp: string;
    requestId: string;
};
//# sourceMappingURL=index.d.ts.map