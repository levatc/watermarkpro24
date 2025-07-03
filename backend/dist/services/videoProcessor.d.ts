interface WatermarkSettings {
    type: 'text' | 'image';
    text?: string;
    fontSize?: number;
    color?: string;
    imagePath?: string;
    imageOpacity?: number;
    imageScale?: number;
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
    private readonly watermarkDir;
    constructor();
    private ensureDirectories;
    private getPositionFilter;
    private getImagePositionFilter;
    private createTextFilter;
    private createImageFilter;
    processVideo(inputPath: string, settings: WatermarkSettings, onProgress?: (progress: number) => void): Promise<ProcessVideoResult>;
    private processVideoWithTextWatermark;
    private processVideoWithImageWatermark;
    private processVideoSimple;
    saveUploadedFile(fileBuffer: Buffer, originalName: string): Promise<string>;
    saveWatermarkImage(fileBuffer: Buffer, originalName: string): Promise<string>;
    cleanup(filePath: string): Promise<void>;
    getOutputUrl(outputPath: string): string;
}
export declare const videoProcessor: VideoProcessor;
export {};
//# sourceMappingURL=videoProcessor.d.ts.map