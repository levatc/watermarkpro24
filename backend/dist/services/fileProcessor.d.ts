interface WatermarkSettings {
    text: string;
    fontSize: number;
    color: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
}
interface ProcessFileResult {
    success: boolean;
    outputPath?: string;
    processingTime?: number;
    error?: string;
}
export declare class FileProcessor {
    private readonly uploadsDir;
    private readonly outputDir;
    constructor();
    private ensureDirectories;
    private hexToRgb;
    private getPositionCoordinates;
    processImage(inputPath: string, settings: WatermarkSettings, onProgress?: (progress: number) => void): Promise<ProcessFileResult>;
    processPDF(inputPath: string, settings: WatermarkSettings, onProgress?: (progress: number) => void): Promise<ProcessFileResult>;
    processFile(inputPath: string, fileType: 'image' | 'pdf', settings: WatermarkSettings, onProgress?: (progress: number) => void): Promise<ProcessFileResult>;
    saveUploadedFile(fileBuffer: Buffer, originalName: string): Promise<string>;
    cleanup(filePath: string): Promise<void>;
    getOutputUrl(outputPath: string): string;
    getFileType(mimetype: string): 'image' | 'pdf' | 'unsupported';
}
export declare const fileProcessor: FileProcessor;
export {};
//# sourceMappingURL=fileProcessor.d.ts.map