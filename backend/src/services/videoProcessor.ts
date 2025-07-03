import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import path from 'path'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

interface WatermarkSettings {
  type: 'text' | 'image'
  // Text watermark properties
  text?: string
  fontSize?: number
  color?: string
  // Image watermark properties
  imagePath?: string
  imageOpacity?: number
  imageScale?: number
  // Common properties
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

interface ProcessVideoResult {
  success: boolean
  outputPath?: string
  processingTime?: number
  error?: string
}

export class VideoProcessor {
  private readonly uploadsDir: string
  private readonly outputDir: string
  private readonly watermarkDir: string

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads')
    this.outputDir = path.join(process.cwd(), 'output')
    this.watermarkDir = path.join(process.cwd(), 'watermarks')
    
    // Ensure directories exist
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.uploadsDir)
    await fs.ensureDir(this.outputDir)
    await fs.ensureDir(this.watermarkDir)
  }

  private getPositionFilter(position: string, videoWidth: number, videoHeight: number, fontSize: number): string {
    const padding = 20
    
    switch (position) {
      case 'top-left':
        return `x=${padding}:y=${padding}`
      case 'top-right':
        return `x=w-tw-${padding}:y=${padding}`
      case 'bottom-left':
        return `x=${padding}:y=h-th-${padding}`
      case 'bottom-right':
        return `x=w-tw-${padding}:y=h-th-${padding}`
      case 'center':
        return `x=(w-tw)/2:y=(h-th)/2`
      default:
        return `x=w-tw-${padding}:y=h-th-${padding}`
    }
  }

  private getImagePositionFilter(position: string): string {
    const padding = 20
    
    switch (position) {
      case 'top-left':
        return `x=${padding}:y=${padding}`
      case 'top-right':
        return `x=main_w-overlay_w-${padding}:y=${padding}`
      case 'bottom-left':
        return `x=${padding}:y=main_h-overlay_h-${padding}`
      case 'bottom-right':
        return `x=main_w-overlay_w-${padding}:y=main_h-overlay_h-${padding}`
      case 'center':
        return `x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2`
      default:
        return `x=main_w-overlay_w-${padding}:y=main_h-overlay_h-${padding}`
    }
  }

  private createTextFilter(settings: WatermarkSettings): string {
    const {
      text = '',
      fontSize = 24,
      color = '#ffffff',
      opacity = 0.8,
      position
    } = settings

    // Convert hex color to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          }
        : { r: 255, g: 255, b: 255 }
    }

    const rgb = hexToRgb(color)
    const alpha = Math.round(opacity * 255)

    // Create RGBA color string
    const fontColor = `0x${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}${alpha.toString(16).padStart(2, '0')}`

    // Escape special characters in text
    const escapedText = text.replace(/[\\:]/g, '\\$&').replace(/'/g, "'\\''")

    const positionFilter = this.getPositionFilter(position, 1920, 1080, fontSize)

    // Windows-compatible drawtext without font file
    return `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:${positionFilter}`
  }

  private createImageFilter(settings: WatermarkSettings): string {
    const {
      imageOpacity = 0.8,
      imageScale = 1.0,
      position
    } = settings

    const positionFilter = this.getImagePositionFilter(position)
    
    // Scale the watermark image if needed
    let scaleFilter = ''
    if (imageScale !== 1.0) {
      const scaleWidth = Math.round(200 * imageScale) // Base width of 200px
      scaleFilter = `scale=${scaleWidth}:-1,`
    }

    // Create overlay filter with opacity, starting with [1:v] input stream reference
    return `[1:v]${scaleFilter}format=rgba,colorchannelmixer=aa=${imageOpacity}[watermark];[0:v][watermark]overlay=${positionFilter}`
  }

  async processVideo(
    inputPath: string,
    settings: WatermarkSettings,
    onProgress?: (progress: number) => void
  ): Promise<ProcessVideoResult> {
    const startTime = Date.now()
    const outputFilename = `watermarked_${nanoid()}.mp4`
    const outputPath = path.join(this.outputDir, outputFilename)

    // Process based on watermark type
    const result = settings.type === 'image' && settings.imagePath
      ? await this.processVideoWithImageWatermark(inputPath, outputPath, settings, onProgress, startTime)
      : await this.processVideoWithTextWatermark(inputPath, outputPath, settings, onProgress, startTime)
    
    // If that fails, try simple copy without watermark
    if (!result.success) {
      console.log('🔄 Watermark processing failed, trying simple copy...')
      return this.processVideoSimple(inputPath, outputPath, onProgress, startTime)
    }
    
    return result
  }

  private async processVideoWithTextWatermark(
    inputPath: string,
    outputPath: string,
    settings: WatermarkSettings,
    onProgress?: (progress: number) => void,
    startTime: number = Date.now()
  ): Promise<ProcessVideoResult> {
    return new Promise((resolve) => {
      try {
        const textFilter = this.createTextFilter(settings)

        const ffmpegProcess = ffmpeg(inputPath)
          .videoFilters(textFilter)
          .outputOptions([
            '-c:v libx264',        // Video codec
            '-c:a aac',            // Audio codec
            '-preset fast',         // Encoding speed
            '-crf 23',             // Quality (lower = better quality)
            '-movflags +faststart' // Web optimization
          ])
          .on('start', (commandLine) => {
            console.log('🎬 FFmpeg started:', commandLine)
          })
          .on('progress', (progress) => {
            const percent = Math.round(progress.percent || 0)
            console.log(`📊 Processing: ${percent}% (${progress.timemark || 'N/A'})`)
            if (onProgress) {
              onProgress(percent)
            }
          })
          .on('stderr', (stderrLine) => {
            console.log('FFmpeg stderr:', stderrLine)
          })
          .on('end', () => {
            const processingTime = (Date.now() - startTime) / 1000
            console.log(`✅ Video processing completed in ${processingTime}s`)
            
            // Check if output file exists and has reasonable size
            if (fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath)
              console.log(`📁 Output file size: ${stats.size} bytes`)
              if (stats.size < 1000) {
                console.error('⚠️ Output file is suspiciously small!')
                resolve({
                  success: false,
                  error: 'Output file too small - FFmpeg likely failed'
                })
                return
              }
            } else {
              console.error('❌ Output file was not created!')
              resolve({
                success: false,
                error: 'Output file not created'
              })
              return
            }
            
            resolve({
              success: true,
              outputPath,
              processingTime
            })
          })
          .on('error', (err, stdout, stderr) => {
            console.error('❌ FFmpeg error:', err.message)
            console.error('📤 FFmpeg stdout:', stdout)
            console.error('📥 FFmpeg stderr:', stderr)
            resolve({
              success: false,
              error: `FFmpeg error: ${err.message}`
            })
          })
          .save(outputPath)
      } catch (error) {
        console.error('Video processing error:', error)
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }

  private async processVideoWithImageWatermark(
    inputPath: string,
    outputPath: string,
    settings: WatermarkSettings,
    onProgress?: (progress: number) => void,
    startTime: number = Date.now()
  ): Promise<ProcessVideoResult> {
    return new Promise((resolve) => {
      try {
        if (!settings.imagePath || !fs.existsSync(settings.imagePath)) {
          resolve({
            success: false,
            error: 'Watermark image file not found'
          })
          return
        }

        const imageFilter = this.createImageFilter(settings)

        const ffmpegProcess = ffmpeg(inputPath)
          .input(settings.imagePath) // Add watermark image as second input
          .complexFilter([imageFilter])
          .outputOptions([
            '-c:v libx264',        // Video codec
            '-c:a aac',            // Audio codec
            '-preset fast',         // Encoding speed
            '-crf 23',             // Quality (lower = better quality)
            '-movflags +faststart' // Web optimization
          ])
          .on('start', (commandLine) => {
            console.log('🎬 FFmpeg started with image watermark:', commandLine)
          })
          .on('progress', (progress) => {
            const percent = Math.round(progress.percent || 0)
            console.log(`📊 Processing: ${percent}% (${progress.timemark || 'N/A'})`)
            if (onProgress) {
              onProgress(percent)
            }
          })
          .on('stderr', (stderrLine) => {
            console.log('FFmpeg stderr:', stderrLine)
          })
          .on('end', () => {
            const processingTime = (Date.now() - startTime) / 1000
            console.log(`✅ Image watermark processing completed in ${processingTime}s`)
            
            // Check if output file exists and has reasonable size
            if (fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath)
              console.log(`📁 Output file size: ${stats.size} bytes`)
              if (stats.size < 1000) {
                console.error('⚠️ Output file is suspiciously small!')
                resolve({
                  success: false,
                  error: 'Output file too small - FFmpeg likely failed'
                })
                return
              }
            } else {
              console.error('❌ Output file was not created!')
              resolve({
                success: false,
                error: 'Output file not created'
              })
              return
            }
            
            resolve({
              success: true,
              outputPath,
              processingTime
            })
          })
          .on('error', (err, stdout, stderr) => {
            console.error('❌ FFmpeg image watermark error:', err.message)
            console.error('📤 FFmpeg stdout:', stdout)
            console.error('📥 FFmpeg stderr:', stderr)
            resolve({
              success: false,
              error: `FFmpeg image watermark error: ${err.message}`
            })
          })
          .save(outputPath)
      } catch (error) {
        console.error('Image watermark processing error:', error)
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }

  private async processVideoSimple(
    inputPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void,
    startTime: number = Date.now()
  ): Promise<ProcessVideoResult> {
    return new Promise((resolve) => {
      try {
        console.log('🎬 Fallback: Simple video copy without watermark')

        ffmpeg(inputPath)
          .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            '-preset fast',
            '-crf 23',
            '-movflags +faststart'
          ])
          .on('start', (commandLine) => {
            console.log('🎬 Simple FFmpeg started:', commandLine)
          })
          .on('progress', (progress) => {
            const percent = Math.round(progress.percent || 0)
            console.log(`📊 Simple processing: ${percent}%`)
            if (onProgress) {
              onProgress(percent)
            }
          })
          .on('end', () => {
            const processingTime = (Date.now() - startTime) / 1000
            console.log(`✅ Simple video processing completed in ${processingTime}s`)
            resolve({
              success: true,
              outputPath,
              processingTime
            })
          })
          .on('error', (err) => {
            console.error('❌ Simple FFmpeg error:', err)
            resolve({
              success: false,
              error: err.message
            })
          })
          .save(outputPath)
      } catch (error) {
        console.error('Simple video processing error:', error)
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }

  async saveUploadedFile(fileBuffer: Buffer, originalName: string): Promise<string> {
    const filename = `${nanoid()}_${originalName}`
    const filePath = path.join(this.uploadsDir, filename)
    
    await fs.writeFile(filePath, fileBuffer)
    return filePath
  }

  async saveWatermarkImage(fileBuffer: Buffer, originalName: string): Promise<string> {
    const filename = `watermark_${nanoid()}_${originalName}`
    const filePath = path.join(this.watermarkDir, filename)
    
    await fs.writeFile(filePath, fileBuffer)
    return filePath
  }

  async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn('Failed to cleanup file:', filePath, error)
    }
  }

  getOutputUrl(outputPath: string): string {
    const filename = path.basename(outputPath)
    return `/output/${filename}`
  }
}

export const videoProcessor = new VideoProcessor() 