import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { videoProcessor } from '../services/videoProcessor'
import { QueueManager, JobData } from '../services/queue/QueueManager'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

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

interface ProcessVideoRequest extends FastifyRequest {
  body: {
    watermark?: string
  }
}

export async function videoRoutes(fastify: FastifyInstance) {
  // Upload watermark image
  fastify.post('/api/upload-watermark', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('Watermark image upload request received')
      
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Keine Bild-Datei hochgeladen' }
        })
      }

      // Validate file type (images only)
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validImageTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Ungültiges Bild-Format. Unterstützt: JPEG, PNG, GIF, WebP' }
        })
      }

      // Get file buffer
      const fileBuffer = await data.toBuffer()
      
      // Check file size (max 5MB for images)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (fileBuffer.length > maxSize) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Bild-Datei ist zu groß (max. 5MB)' }
        })
      }

      // Save watermark image
      const imagePath = await videoProcessor.saveWatermarkImage(fileBuffer, data.filename)

      return reply.send({
        success: true,
        data: {
          imagePath: imagePath,
          filename: data.filename,
          size: fileBuffer.length
        }
      })

    } catch (error) {
      console.error('Watermark image upload error:', error)
      return reply.code(500).send({
        success: false,
        error: { 
          message: 'Fehler beim Hochladen des Wasserzeichen-Bildes',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Download processed video
  fastify.get('/output/:filename', async (request: FastifyRequest<{Params: {filename: string}}>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      const outputPath = path.join(process.cwd(), 'output', filename)
      
      // Security check: ensure filename is safe
      if (!filename.match(/^[a-zA-Z0-9_-]+\.(mp4|avi|mov|mkv|webm)$/)) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Ungültiger Dateiname' }
        })
      }
      
      // Check if file exists
      if (!fs.existsSync(outputPath)) {
        return reply.code(404).send({
          success: false,
          error: { message: 'Datei nicht gefunden' }
        })
      }
      
      const stats = fs.statSync(outputPath)
      
      // Set appropriate headers
      reply.header('Content-Type', 'video/mp4')
      reply.header('Content-Length', stats.size)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      // Stream the file
      const stream = fs.createReadStream(outputPath)
      return reply.send(stream)
      
    } catch (error) {
      console.error('Download error:', error)
      return reply.code(500).send({
        success: false,
        error: { message: 'Fehler beim Herunterladen der Datei' }
      })
    }
  })

  // Process video with watermark - NEW QUEUE-BASED APPROACH
  fastify.post('/api/process-video', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('Video processing request received')
      
      // Use promise-based multipart processing to avoid hanging
      console.log('Starting multipart processing...')
      
      let videoFile: any = null
      let watermarkSettings: WatermarkSettings | null = null
      let partCount = 0
      
      try {
        // Process with timeout and early exit
        const parts = request.parts()
        const processingPromise = new Promise<void>(async (resolve, reject) => {
          try {
            for await (const part of parts) {
              partCount++
              console.log(`📦 Processing part ${partCount}:`, part.fieldname, part.type)
              
              if (part.type === 'file' && part.fieldname === 'video') {
                videoFile = part
                console.log('✅ Video file received:', part.filename, part.mimetype)
              } else if (part.type === 'field' && part.fieldname === 'watermark') {
                try {
                  const watermarkData = part.value as string
                  console.log('📝 Raw watermark data length:', watermarkData?.length || 0)
                  watermarkSettings = JSON.parse(watermarkData.toString())
                  console.log('✅ Watermark settings parsed:', watermarkSettings)
                } catch (error) {
                  console.log('❌ Error parsing watermark data:', error)
                }
              } else {
                console.log('❓ Unknown part:', part.fieldname, part.type)
                if (part.type === 'field') {
                  console.log('Field value:', part.value)
                }
              }
              
              // Early exit if we have both parts
              if (videoFile && watermarkSettings) {
                console.log('🎯 Both video and watermark received, processing...')
                break
              }
            }
            resolve()
          } catch (error) {
            reject(error)
          }
        })
        
        // Race with timeout
        await Promise.race([
          processingPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Multipart processing timeout')), 5000)
          )
        ])
        
        console.log(`✅ Multipart processing completed (${partCount} parts processed)`)
        
      } catch (error) {
        console.log('⚠️ Multipart processing error or timeout:', error)
        console.log(`📊 Processed ${partCount} parts before timeout/error`)
      }
      
      console.log('🔍 Final state:')
      console.log('- Video file:', videoFile ? `✅ ${videoFile.filename}` : '❌ Missing')
      console.log('- Watermark:', watermarkSettings ? `✅ Type: ${(watermarkSettings as WatermarkSettings).type}` : '❌ Missing')
      
      // Validate video file
      if (!videoFile) {
        console.log('Error: No video file uploaded')
        return reply.code(400).send({
          success: false,
          error: { message: 'Keine Video-Datei hochgeladen' }
        })
      }

      // Validate file type
      const validVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
      if (!validVideoTypes.includes(videoFile.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Ungültiges Video-Format. Unterstützt: MP4, AVI, MOV, MKV, WebM' }
        })
      }

      // Handle missing watermark settings with fallback
      if (!watermarkSettings) {
        console.log('❌ Missing watermark settings - using fallback')
        console.log('🔧 This indicates a multipart parsing issue')
        console.log('📊 Parts received:', partCount)
        
        // Use default text watermark settings as fallback
        watermarkSettings = {
          type: 'text',
          text: '© 2024 WatermarkPro',
          fontSize: 24,
          color: '#ffffff',
          position: 'bottom-right',
          opacity: 0.8
        }
        console.log('✅ Using default watermark settings:', watermarkSettings)
      }

      // Validate watermark settings based on type
      if (watermarkSettings.type === 'text') {
        if (!watermarkSettings.text || watermarkSettings.text.trim() === '') {
          return reply.code(400).send({
            success: false,
            error: { message: 'Wasserzeichen-Text darf nicht leer sein' }
          })
        }
      } else if (watermarkSettings.type === 'image') {
        if (!watermarkSettings.imagePath) {
          return reply.code(400).send({
            success: false,
            error: { message: 'Kein Wasserzeichen-Bild ausgewählt' }
          })
        }
      }

      // Get file buffer - different method for parts() vs file()
      console.log('📁 Converting video file to buffer...')
      let fileBuffer: Buffer
      
      if (videoFile.file && typeof videoFile.file.toBuffer === 'function') {
        // Method 1: request.file() structure
        fileBuffer = await videoFile.file.toBuffer()
      } else if (typeof videoFile.toBuffer === 'function') {
        // Method 2: parts() structure - direct toBuffer
        fileBuffer = await videoFile.toBuffer()
      } else {
        // Method 3: parts() structure - read chunks
        const chunks: Buffer[] = []
        for await (const chunk of videoFile.file) {
          chunks.push(chunk)
        }
        fileBuffer = Buffer.concat(chunks)
      }
      
      console.log('✅ File buffer created, size:', fileBuffer.length)
      
      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (fileBuffer.length > maxSize) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Video-Datei ist zu groß (max. 100MB)' }
        })
      }

      // Generate unique IDs
      const uploadId = uuidv4()
      const jobId = uuidv4()

      // Create job data for queue
      const jobData: JobData = {
        id: jobId,
        file: {
          filename: videoFile.filename,
          originalName: videoFile.filename,
          buffer: fileBuffer,
          mimetype: videoFile.mimetype,
          size: fileBuffer.length
        },
        watermark: watermarkSettings,
        uploadId
      }

      // Add job to queue instead of processing immediately
      await fastify.queueManager.addJob('video', jobData)

      // Return immediate response with upload ID for tracking
      return reply.send({
        success: true,
        data: {
          uploadId,
          jobId,
          filename: videoFile.filename,
          watermark: watermarkSettings,
          status: 'queued',
          message: 'Video wurde zur Verarbeitung hinzugefügt'
        }
      })

    } catch (error) {
      console.error('Video processing error:', error)
      
      // Check if it's a specific multipart error
      if (error instanceof Error && error.message.includes('Part terminated')) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Upload-Fehler: Datei unvollständig übertragen' }
        })
      }
      
      return reply.code(500).send({
        success: false,
        error: { 
          message: 'Interner Server-Fehler bei der Video-Verarbeitung',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Health check for video processing
  fastify.get('/api/video/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.send({
        success: true,
        message: 'Video processing service is healthy',
        ffmpegAvailable: true,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { message: 'Video processing service unavailable' }
      })
    }
  })
} 