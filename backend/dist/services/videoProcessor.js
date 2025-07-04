"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoProcessor = exports.VideoProcessor = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const nanoid_1 = require("nanoid");
// Set FFmpeg path
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
class VideoProcessor {
    uploadsDir;
    outputDir;
    constructor() {
        this.uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        this.outputDir = path_1.default.join(process.cwd(), 'output');
        // Ensure directories exist
        this.ensureDirectories();
    }
    async ensureDirectories() {
        await fs_extra_1.default.ensureDir(this.uploadsDir);
        await fs_extra_1.default.ensureDir(this.outputDir);
    }
    getPositionFilter(position, videoWidth, videoHeight, fontSize) {
        const padding = 20;
        switch (position) {
            case 'top-left':
                return `x=${padding}:y=${padding}`;
            case 'top-right':
                return `x=w-tw-${padding}:y=${padding}`;
            case 'bottom-left':
                return `x=${padding}:y=h-th-${padding}`;
            case 'bottom-right':
                return `x=w-tw-${padding}:y=h-th-${padding}`;
            case 'center':
                return `x=(w-tw)/2:y=(h-th)/2`;
            default:
                return `x=w-tw-${padding}:y=h-th-${padding}`;
        }
    }
    createTextFilter(settings) {
        const { text, fontSize, color, opacity, position } = settings;
        // Convert hex color to RGB
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result
                ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                }
                : { r: 255, g: 255, b: 255 };
        };
        const rgb = hexToRgb(color);
        const alpha = Math.round(opacity * 255);
        // Create RGBA color string
        const fontColor = `0x${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}${alpha.toString(16).padStart(2, '0')}`;
        // Escape special characters in text
        const escapedText = text.replace(/[\\:]/g, '\\$&').replace(/'/g, "'\\''");
        const positionFilter = this.getPositionFilter(position, 1920, 1080, fontSize);
        // Windows-compatible drawtext without font file
        return `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:${positionFilter}`;
    }
    async processVideo(inputPath, settings, onProgress) {
        const startTime = Date.now();
        const outputFilename = `watermarked_${(0, nanoid_1.nanoid)()}.mp4`;
        const outputPath = path_1.default.join(this.outputDir, outputFilename);
        // First try with watermark text
        const result = await this.processVideoWithWatermark(inputPath, outputPath, settings, onProgress, startTime);
        // If that fails, try simple copy without watermark
        if (!result.success) {
            console.log('🔄 Watermark processing failed, trying simple copy...');
            return this.processVideoSimple(inputPath, outputPath, onProgress, startTime);
        }
        return result;
    }
    async processVideoWithWatermark(inputPath, outputPath, settings, onProgress, startTime = Date.now()) {
        return new Promise((resolve) => {
            try {
                const textFilter = this.createTextFilter(settings);
                const ffmpegProcess = (0, fluent_ffmpeg_1.default)(inputPath)
                    .videoFilters(textFilter)
                    .outputOptions([
                    '-c:v libx264', // Video codec
                    '-c:a aac', // Audio codec
                    '-preset fast', // Encoding speed
                    '-crf 23', // Quality (lower = better quality)
                    '-movflags +faststart' // Web optimization
                ])
                    .on('start', (commandLine) => {
                    console.log('🎬 FFmpeg started:', commandLine);
                })
                    .on('progress', (progress) => {
                    const percent = Math.round(progress.percent || 0);
                    console.log(`📊 Processing: ${percent}% (${progress.timemark || 'N/A'})`);
                    if (onProgress) {
                        onProgress(percent);
                    }
                })
                    .on('stderr', (stderrLine) => {
                    console.log('FFmpeg stderr:', stderrLine);
                })
                    .on('end', () => {
                    const processingTime = (Date.now() - startTime) / 1000;
                    console.log(`✅ Video processing completed in ${processingTime}s`);
                    // Check if output file exists and has reasonable size
                    if (fs_extra_1.default.existsSync(outputPath)) {
                        const stats = fs_extra_1.default.statSync(outputPath);
                        console.log(`📁 Output file size: ${stats.size} bytes`);
                        if (stats.size < 1000) {
                            console.error('⚠️ Output file is suspiciously small!');
                            resolve({
                                success: false,
                                error: 'Output file too small - FFmpeg likely failed'
                            });
                            return;
                        }
                    }
                    else {
                        console.error('❌ Output file was not created!');
                        resolve({
                            success: false,
                            error: 'Output file not created'
                        });
                        return;
                    }
                    resolve({
                        success: true,
                        outputPath,
                        processingTime
                    });
                })
                    .on('error', (err, stdout, stderr) => {
                    console.error('❌ FFmpeg error:', err.message);
                    console.error('📤 FFmpeg stdout:', stdout);
                    console.error('📥 FFmpeg stderr:', stderr);
                    resolve({
                        success: false,
                        error: `FFmpeg error: ${err.message}`
                    });
                })
                    .save(outputPath);
            }
            catch (error) {
                console.error('Video processing error:', error);
                resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    async processVideoSimple(inputPath, outputPath, onProgress, startTime = Date.now()) {
        return new Promise((resolve) => {
            try {
                console.log('🎬 Fallback: Simple video copy without watermark');
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .outputOptions([
                    '-c:v libx264',
                    '-c:a aac',
                    '-preset fast',
                    '-crf 23',
                    '-movflags +faststart'
                ])
                    .on('start', (commandLine) => {
                    console.log('🎬 Simple FFmpeg started:', commandLine);
                })
                    .on('progress', (progress) => {
                    const percent = Math.round(progress.percent || 0);
                    console.log(`📊 Simple processing: ${percent}%`);
                    if (onProgress) {
                        onProgress(percent);
                    }
                })
                    .on('end', () => {
                    const processingTime = (Date.now() - startTime) / 1000;
                    console.log(`✅ Simple video processing completed in ${processingTime}s`);
                    resolve({
                        success: true,
                        outputPath,
                        processingTime
                    });
                })
                    .on('error', (err) => {
                    console.error('❌ Simple FFmpeg error:', err);
                    resolve({
                        success: false,
                        error: err.message
                    });
                })
                    .save(outputPath);
            }
            catch (error) {
                console.error('Simple video processing error:', error);
                resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    async saveUploadedFile(fileBuffer, originalName) {
        const filename = `${(0, nanoid_1.nanoid)()}_${originalName}`;
        const filePath = path_1.default.join(this.uploadsDir, filename);
        await fs_extra_1.default.writeFile(filePath, fileBuffer);
        return filePath;
    }
    async cleanup(filePath) {
        try {
            await fs_extra_1.default.unlink(filePath);
        }
        catch (error) {
            console.warn('Failed to cleanup file:', filePath, error);
        }
    }
    getOutputUrl(outputPath) {
        const filename = path_1.default.basename(outputPath);
        return `/output/video/${filename}`;
    }
}
exports.VideoProcessor = VideoProcessor;
exports.videoProcessor = new VideoProcessor();
//# sourceMappingURL=videoProcessor.js.map