import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { fileProcessor } from '../services/fileProcessor'
import path from 'path'
import fs from 'fs'

interface WatermarkSettings {
  text: string
  fontSize: number
  color: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

interface ProcessFileRequest extends FastifyRequest {
  body: {
    watermark?: string
  }
}

export async function fileRoutes(fastify: FastifyInstance) {
  // Download processed files (images, PDFs)
  fastify.get('/output/file/:filename', async (request: FastifyRequest<{Params: {filename: string}}>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      const outputPath = path.join(process.cwd(), 'output', filename)
      
      // Security check: ensure filename is safe
      if (!filename.match(/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|pdf|mp4|avi|mov|mkv|webm)$/)) {
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
      
      // Set appropriate headers based on file type
      const ext = path.extname(filename).toLowerCase()
      let contentType = 'application/octet-stream'
      let disposition = 'attachment'
      
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg'
          break
        case '.png':
          contentType = 'image/png'
          break
        case '.webp':
          contentType = 'image/webp'
          break
        case '.pdf':
          contentType = 'application/pdf'
          break
        case '.mp4':
          contentType = 'video/mp4'
          break
        case '.avi':
          contentType = 'video/x-msvideo'
          break
        case '.mov':
          contentType = 'video/quicktime'
          break
        case '.mkv':
          contentType = 'video/x-matroska'
          break
        case '.webm':
          contentType = 'video/webm'
          break
      }
      
      reply.header('Content-Type', contentType)
      reply.header('Content-Length', stats.size)
      reply.header('Content-Disposition', `${disposition}; filename="${filename}"`)
      
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

  // Process images and PDFs with watermark
  fastify.post('/api/process-file', async (request: ProcessFileRequest, reply: FastifyReply) => {
    try {
      console.log('File processing request received')
      
      let uploadedFile: any = null
      let watermarkSettings: WatermarkSettings | null = null
      let partCount = 0
      
      try {
        // Process multipart data
        const parts = request.parts()
        const processingPromise = new Promise<void>(async (resolve, reject) => {
          try {
            for await (const part of parts) {
              partCount++
              console.log(`📦 Processing part ${partCount}:`, part.fieldname, part.type)
              
              if (part.type === 'file' && part.fieldname === 'file') {
                uploadedFile = part
                console.log('✅ File received:', part.filename, part.mimetype)
              } else if (part.type === 'field' && part.fieldname === 'watermark') {
                try {
                  const watermarkData = part.value
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
              if (uploadedFile && watermarkSettings) {
                console.log('🎯 Both file and watermark received, processing...')
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
      console.log('- File:', uploadedFile ? `✅ ${uploadedFile.filename}` : '❌ Missing')
      console.log('- Watermark:', watermarkSettings ? `✅ ${watermarkSettings.text}` : '❌ Missing')
      
      // Validate uploaded file
      if (!uploadedFile) {
        console.log('Error: No file uploaded')
        return reply.code(400).send({
          success: false,
          error: { message: 'Keine Datei hochgeladen' }
        })
      }

      // Determine file type and validate
      const fileType = fileProcessor.getFileType(uploadedFile.mimetype)
      
      if (fileType === 'unsupported') {
        return reply.code(400).send({
          success: false,
          error: { message: 'Ungültiges Dateiformat. Unterstützt: JPG, PNG, WebP, PDF' }
        })
      }

      // Handle missing watermark settings with fallback
      if (!watermarkSettings) {
        console.log('❌ Missing watermark settings - using fallback')
        console.log('🔧 This indicates a multipart parsing issue')
        console.log('📊 Parts received:', partCount)
        
        // Use default watermark settings as fallback
        watermarkSettings = {
          text: '© 2024 WatermarkPro',
          fontSize: 24,
          color: '#ffffff',
          position: 'bottom-right',
          opacity: 0.8
        }
        console.log('✅ Using default watermark settings:', watermarkSettings)
      }

      // Validate watermark text
      if (!watermarkSettings.text || watermarkSettings.text.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: { message: 'Wasserzeichen-Text darf nicht leer sein' }
        })
      }

      // Get file buffer
      console.log('📁 Converting file to buffer...')
      let fileBuffer: Buffer
      
      if (uploadedFile.file && typeof uploadedFile.file.toBuffer === 'function') {
        fileBuffer = await uploadedFile.file.toBuffer()
      } else if (typeof uploadedFile.toBuffer === 'function') {
        fileBuffer = await uploadedFile.toBuffer()
      } else {
        const chunks: Buffer[] = []
        for await (const chunk of uploadedFile.file) {
          chunks.push(chunk)
        }
        fileBuffer = Buffer.concat(chunks)
      }
      
      console.log('✅ File buffer created, size:', fileBuffer.length)
      
      // Check file size (max 50MB for images/PDFs)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (fileBuffer.length > maxSize) {
        return reply.code(400).send({
          success: false,
          error: { message: 'Datei ist zu groß (max. 50MB)' }
        })
      }

      // Save uploaded file
      const inputPath = await fileProcessor.saveUploadedFile(fileBuffer, uploadedFile.filename)

      // Process file with progress tracking
      const result = await fileProcessor.processFile(
        inputPath,
        fileType,
        watermarkSettings,
        (progress) => {
          console.log(`Processing progress: ${progress}%`)
        }
      )

      // Cleanup input file
      await fileProcessor.cleanup(inputPath)

      if (result.success && result.outputPath) {
        // Return success with download URL
        return reply.send({
          success: true,
          data: {
            processedUrl: fileProcessor.getOutputUrl(result.outputPath),
            processingTime: result.processingTime,
            filename: uploadedFile.filename,
            fileType: fileType,
            watermark: watermarkSettings
          }
        })
      } else {
        return reply.code(500).send({
          success: false,
          error: { message: result.error || 'Datei-Verarbeitung fehlgeschlagen' }
        })
      }

    } catch (error) {
      console.error('File processing error:', error)
      
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
          message: 'Interner Server-Fehler bei der Datei-Verarbeitung',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })

  // Health check for file processing
  fastify.get('/api/file/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.send({
        success: true,
        message: 'File processing service is healthy',
        supportedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { message: 'File processing service unavailable' }
      })
    }
  })
}