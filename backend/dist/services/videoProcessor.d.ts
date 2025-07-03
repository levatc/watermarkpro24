interface WatermarkSettings {
    text: string;
    fontSize: number;
    color: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
}
interface ProcessVideoResult {
    success: boolean;
    outputPath?: string;
    processingTime?: number;
    error?: string;
}
export declare class VideoProcessor {
    private readonly uploadsDir;
    private readonly outputDir;
    constructor();
    private ensureDirectories;
    private getPositionFilter;
    private createTextFilter;
    processVideo(inputPath: string, settings: WatermarkSettings, onProgress?: (progress: number) => void): Promise<ProcessVideoResult>;
    private processVideoWithWatermark;
    private processVideoSimple;
    saveUploadedFile(fileBuffer: Buffer, originalName: string): Promise<string>;
    cleanup(filePath: string): Promise<void>;
    getOutputUrl(outputPath: string): string;
}
export declare const videoProcessor: VideoProcessor;
export {};
//# sourceMappingURL=videoProcessor.d.ts.map