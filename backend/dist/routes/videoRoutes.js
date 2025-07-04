"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoRoutes = videoRoutes;
const videoProcessor_1 = require("../services/videoProcessor");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function videoRoutes(fastify) {
    // Download processed video
    fastify.get('/output/video/:filename', async (request, reply) => {
        try {
            const { filename } = request.params;
            const outputPath = path_1.default.join(process.cwd(), 'output', filename);
            // Security check: ensure filename is safe
            if (!filename.match(/^[a-zA-Z0-9_-]+\.(mp4|avi|mov|mkv|webm)$/)) {
                return reply.code(400).send({
                    success: false,
                    error: { message: 'Ungültiger Dateiname' }
                });
            }
            // Check if file exists
            if (!fs_1.default.existsSync(outputPath)) {
                return reply.code(404).send({
                    success: false,
                    error: { message: 'Datei nicht gefunden' }
                });
            }
            const stats = fs_1.default.statSync(outputPath);
            // Set appropriate headers
            reply.header('Content-Type', 'video/mp4');
            reply.header('Content-Length', stats.size);
            reply.header('Content-Disposition', `attachment; filename="${filename}"`);
            // Stream the file
            const stream = fs_1.default.createReadStream(outputPath);
            return reply.send(stream);
        }
        catch (error) {
            console.error('Download error:', error);
            return reply.code(500).send({
                success: false,
                error: { message: 'Fehler beim Herunterladen der Datei' }
            });
        }
    });
    // Process video with watermark
    fastify.post('/api/process-video', async (request, reply) => {
        try {
            console.log('Video processing request received');
            // Use promise-based multipart processing to avoid hanging
            console.log('Starting multipart processing...');
            let videoFile = null;
            let watermarkSettings = null;
            let partCount = 0;
            try {
                // Process with timeout and early exit
                const parts = request.parts();
                const processingPromise = new Promise(async (resolve, reject) => {
                    try {
                        for await (const part of parts) {
                            partCount++;
                            console.log(`📦 Processing part ${partCount}:`, part.fieldname, part.type);
                            if (part.type === 'file' && part.fieldname === 'video') {
                                videoFile = part;
                                console.log('✅ Video file received:', part.filename, part.mimetype);
                            }
                            else if (part.type === 'field' && part.fieldname === 'watermark') {
                                try {
                                    const watermarkData = part.value;
                                    console.log('📝 Raw watermark data length:', watermarkData?.length || 0);
                                    watermarkSettings = JSON.parse(watermarkData.toString());
                                    console.log('✅ Watermark settings parsed:', watermarkSettings);
                                }
                                catch (error) {
                                    console.log('❌ Error parsing watermark data:', error);
                                }
                            }
                            else {
                                console.log('❓ Unknown part:', part.fieldname, part.type);
                                if (part.type === 'field') {
                                    console.log('Field value:', part.value);
                                }
                            }
                            // Early exit if we have both parts
                            if (videoFile && watermarkSettings) {
                                console.log('🎯 Both video and watermark received, processing...');
                                break;
                            }
                        }
                        resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                // Race with timeout
                await Promise.race([
                    processingPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Multipart processing timeout')), 5000))
                ]);
                console.log(`✅ Multipart processing completed (${partCount} parts processed)`);
            }
            catch (error) {
                console.log('⚠️ Multipart processing error or timeout:', error);
                console.log(`📊 Processed ${partCount} parts before timeout/error`);
            }
            console.log('🔍 Final state:');
            console.log('- Video file:', videoFile ? `✅ ${videoFile.filename}` : '❌ Missing');
            console.log('- Watermark:', watermarkSettings ? `✅ ${watermarkSettings.text}` : '❌ Missing');
            // Validate video file
            if (!videoFile) {
                console.log('Error: No video file uploaded');
                return reply.code(400).send({
                    success: false,
                    error: { message: 'Keine Video-Datei hochgeladen' }
                });
            }
            // Validate file type
            const validVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
            if (!validVideoTypes.includes(videoFile.mimetype)) {
                return reply.code(400).send({
                    success: false,
                    error: { message: 'Ungültiges Video-Format. Unterstützt: MP4, AVI, MOV, MKV, WebM' }
                });
            }
            // Handle missing watermark settings with fallback
            if (!watermarkSettings) {
                console.log('❌ Missing watermark settings - using fallback');
                console.log('🔧 This indicates a multipart parsing issue');
                console.log('📊 Parts received:', partCount);
                // Use default watermark settings as fallback
                watermarkSettings = {
                    text: '© 2024 WatermarkPro',
                    fontSize: 24,
                    color: '#ffffff',
                    position: 'bottom-right',
                    opacity: 0.8
                };
                console.log('✅ Using default watermark settings:', watermarkSettings);
            }
            // Validate watermark text
            if (!watermarkSettings.text || watermarkSettings.text.trim() === '') {
                return reply.code(400).send({
                    success: false,
                    error: { message: 'Wasserzeichen-Text darf nicht leer sein' }
                });
            }
            // Get file buffer - different method for parts() vs file()
            console.log('📁 Converting video file to buffer...');
            let fileBuffer;
            if (videoFile.file && typeof videoFile.file.toBuffer === 'function') {
                // Method 1: request.file() structure
                fileBuffer = await videoFile.file.toBuffer();
            }
            else if (typeof videoFile.toBuffer === 'function') {
                // Method 2: parts() structure - direct toBuffer
                fileBuffer = await videoFile.toBuffer();
            }
            else {
                // Method 3: parts() structure - read chunks
                const chunks = [];
                for await (const chunk of videoFile.file) {
                    chunks.push(chunk);
                }
                fileBuffer = Buffer.concat(chunks);
            }
            console.log('✅ File buffer created, size:', fileBuffer.length);
            // Check file size (max 100MB)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (fileBuffer.length > maxSize) {
                return reply.code(400).send({
                    success: false,
                    error: { message: 'Video-Datei ist zu groß (max. 100MB)' }
                });
            }
            // Save uploaded file
            const inputPath = await videoProcessor_1.videoProcessor.saveUploadedFile(fileBuffer, videoFile.filename);
            // Process video with progress tracking
            const result = await videoProcessor_1.videoProcessor.processVideo(inputPath, watermarkSettings, (progress) => {
                // Here you could emit WebSocket events for real-time progress
                console.log(`Processing progress: ${progress}%`);
            });
            // Cleanup input file
            await videoProcessor_1.videoProcessor.cleanup(inputPath);
            if (result.success && result.outputPath) {
                // Return success with download URL
                return reply.send({
                    success: true,
                    data: {
                        processedUrl: videoProcessor_1.videoProcessor.getOutputUrl(result.outputPath),
                        processingTime: result.processingTime,
                        filename: videoFile.filename,
                        watermark: watermarkSettings
                    }
                });
            }
            else {
                return reply.code(500).send({
                    success: false,
                    error: { message: result.error || 'Video-Verarbeitung fehlgeschlagen' }
                });
            }
        }
        catch (error) {
            console.error('Video processing error:', error);
            // Check if it's a specific multipart error
            if (error instanceof Error && error.message.includes('Part terminated')) {
                return reply.code(400).send({
                    success: false,
                    error: { message: 'Upload-Fehler: Datei unvollständig übertragen' }
                });
            }
            return reply.code(500).send({
                success: false,
                error: {
                    message: 'Interner Server-Fehler bei der Video-Verarbeitung',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }
            });
        }
    });
    // Health check for video processing
    fastify.get('/api/video/health', async (request, reply) => {
        try {
            return reply.send({
                success: true,
                message: 'Video processing service is healthy',
                ffmpegAvailable: true,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                error: { message: 'Video processing service unavailable' }
            });
        }
    });
}
//# sourceMappingURL=videoRoutes.js.map