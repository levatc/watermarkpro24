import sharp from 'sharp'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import path from 'path'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'

interface WatermarkSettings {
  text: string
  fontSize: number
  color: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

interface ProcessFileResult {
  success: boolean
  outputPath?: string
  processingTime?: number
  error?: string
}

export class FileProcessor {
  private readonly uploadsDir: string
  private readonly outputDir: string

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads')
    this.outputDir = path.join(process.cwd(), 'output')
    
    // Ensure directories exist
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.uploadsDir)
    await fs.ensureDir(this.outputDir)
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 }
  }

  private getPositionCoordinates(
    position: string,
    containerWidth: number,
    containerHeight: number,
    textWidth: number,
    textHeight: number,
    padding: number = 20
  ): { x: number; y: number } {
    switch (position) {
      case 'top-left':
        return { x: padding, y: padding }
      case 'top-right':
        return { x: containerWidth - textWidth - padding, y: padding }
      case 'bottom-left':
        return { x: padding, y: containerHeight - textHeight - padding }
      case 'bottom-right':
        return { x: containerWidth - textWidth - padding, y: containerHeight - textHeight - padding }
      case 'center':
        return { x: (containerWidth - textWidth) / 2, y: (containerHeight - textHeight) / 2 }
      default:
        return { x: containerWidth - textWidth - padding, y: containerHeight - textHeight - padding }
    }
  }

  async processImage(
    inputPath: string,
    settings: WatermarkSettings,
    onProgress?: (progress: number) => void
  ): Promise<ProcessFileResult> {
    const startTime = Date.now()
    const outputFilename = `watermarked_${nanoid()}.jpg`
    const outputPath = path.join(this.outputDir, outputFilename)

    try {
      if (onProgress) onProgress(10)

      // Load image metadata
      const metadata = await sharp(inputPath).metadata()
      const { width = 1920, height = 1080 } = metadata

      if (onProgress) onProgress(30)

      // Create text watermark using SVG
      const textWidth = settings.text.length * settings.fontSize * 0.6
      const textHeight = settings.fontSize

      // Get position
      const { x, y } = this.getPositionCoordinates(
        settings.position,
        width,
        height,
        textWidth,
        textHeight
      )

      // Convert color and opacity to RGBA
      const color = this.hexToRgb(settings.color)
      const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${settings.opacity})`

      // Create SVG watermark
      const svgWatermark = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text x="${x}" y="${y + textHeight}" 
                font-family="Arial, sans-serif" 
                font-size="${settings.fontSize}" 
                fill="${rgba}"
                font-weight="normal">
            ${settings.text}
          </text>
        </svg>
      `

      if (onProgress) onProgress(60)

      // Convert SVG to buffer
      const overlayBuffer = Buffer.from(svgWatermark)

      if (onProgress) onProgress(80)

      // Composite image with watermark
      await sharp(inputPath)
        .composite([{
          input: overlayBuffer,
          blend: 'over'
        }])
        .jpeg({ quality: 90 })
        .toFile(outputPath)

      if (onProgress) onProgress(100)

      const processingTime = (Date.now() - startTime) / 1000

      return {
        success: true,
        outputPath,
        processingTime
      }
    } catch (error) {
      console.error('Image processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async processPDF(
    inputPath: string,
    settings: WatermarkSettings,
    onProgress?: (progress: number) => void
  ): Promise<ProcessFileResult> {
    const startTime = Date.now()
    const outputFilename = `watermarked_${nanoid()}.pdf`
    const outputPath = path.join(this.outputDir, outputFilename)

    try {
      if (onProgress) onProgress(10)

      // Read the PDF
      const existingPdfBytes = await fs.readFile(inputPath)
      const pdfDoc = await PDFDocument.load(existingPdfBytes)

      if (onProgress) onProgress(30)

      // Get pages
      const pages = pdfDoc.getPages()
      const totalPages = pages.length

      // Convert color
      const color = this.hexToRgb(settings.color)

      if (onProgress) onProgress(50)

      // Add watermark to each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()

        // Estimate text dimensions (approximate)
        const textWidth = settings.text.length * settings.fontSize * 0.6
        const textHeight = settings.fontSize

        // Get position
        const { x, y } = this.getPositionCoordinates(
          settings.position,
          width,
          height,
          textWidth,
          textHeight
        )

        // Add text watermark
        page.drawText(settings.text, {
          x,
          y,
          size: settings.fontSize,
          color: rgb(color.r / 255, color.g / 255, color.b / 255),
          opacity: settings.opacity
        })

        if (onProgress) {
          const pageProgress = 50 + ((i + 1) / totalPages) * 40
          onProgress(pageProgress)
        }
      }

      if (onProgress) onProgress(90)

      // Save the PDF
      const pdfBytes = await pdfDoc.save()
      await fs.writeFile(outputPath, pdfBytes)

      if (onProgress) onProgress(100)

      const processingTime = (Date.now() - startTime) / 1000

      return {
        success: true,
        outputPath,
        processingTime
      }
    } catch (error) {
      console.error('PDF processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async processFile(
    inputPath: string,
    fileType: 'image' | 'pdf',
    settings: WatermarkSettings,
    onProgress?: (progress: number) => void
  ): Promise<ProcessFileResult> {
    switch (fileType) {
      case 'image':
        return this.processImage(inputPath, settings, onProgress)
      case 'pdf':
        return this.processPDF(inputPath, settings, onProgress)
      default:
        return {
          success: false,
          error: 'Unsupported file type'
        }
    }
  }

  async saveUploadedFile(fileBuffer: Buffer, originalName: string): Promise<string> {
    const filename = `${nanoid()}_${originalName}`
    const filePath = path.join(this.uploadsDir, filename)
    
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
    return `/output/file/${filename}`
  }

  getFileType(mimetype: string): 'image' | 'pdf' | 'unsupported' {
    if (mimetype.startsWith('image/')) {
      return 'image'
    }
    if (mimetype === 'application/pdf') {
      return 'pdf'
    }
    return 'unsupported'
  }
}

export const fileProcessor = new FileProcessor()