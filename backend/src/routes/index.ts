import { FastifyInstance } from 'fastify'
import { videoRoutes } from './videoRoutes'

export async function setupRoutes(server: FastifyInstance) {
  // Register video processing routes
  await server.register(videoRoutes)

  // API prefix
  await server.register(async function (fastify) {
    // Mock file upload endpoint
    fastify.post('/api/files/upload', async (request, reply) => {
      const parts = request.parts()
      const files: any[] = []
      
      for await (const part of parts) {
        if (part.type === 'file') {
          files.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            originalName: part.filename,
            filename: `${Date.now()}_${part.filename}`,
            mimetype: part.mimetype,
            size: 0, // Would be calculated from actual file
            url: `/uploads/${part.filename}`,
            thumbnailUrl: part.mimetype?.startsWith('image/') ? `/thumbnails/${part.filename}` : null,
            metadata: {
              format: part.filename?.split('.').pop() || 'unknown',
            },
            uploadedAt: new Date().toISOString(),
          })
        }
      }

      return {
        success: true,
        data: {
          uploadId: `upload_${Date.now()}`,
          files,
          totalSize: files.reduce((sum, file) => sum + file.size, 0),
          estimatedProcessingTime: files.length * 2, // 2 seconds per file
        },
        message: `${files.length} file(s) uploaded successfully`
      }
    })

    // Mock jobs endpoint
    fastify.post('/api/jobs/watermark', async (request, reply) => {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      return {
        success: true,
        data: {
          jobId,
          status: 'pending',
          estimatedDuration: 30,
          queuePosition: Math.floor(Math.random() * 5) + 1,
          files: [],
          createdAt: new Date().toISOString(),
        }
      }
    })

    // Mock watermarks endpoint
    fastify.get('/api/watermarks', async (request, reply) => {
      return {
        success: true,
        data: [
          {
            id: 'wm_1',
            name: 'Standard Logo',
            type: 'image',
            settings: {
              opacity: 0.8,
              position: 'bottom-right',
              scale: 0.2,
              blendMode: 'normal',
            },
            previewUrl: '/watermarks/logo_preview.png',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'wm_2',
            name: 'Copyright Text',
            type: 'text',
            settings: {
              opacity: 0.7,
              position: 'bottom-center',
              scale: 0.1,
              blendMode: 'normal',
              text: '© 2024 WatermarkPro',
              fontFamily: 'Arial',
              fontSize: 24,
              color: '#ffffff',
            },
            createdAt: new Date().toISOString(),
          },
        ]
      }
    })

    // Mock stats endpoint
    fastify.get('/api/stats/overview', async (request, reply) => {
      return {
        success: true,
        data: {
          totalFiles: 1247,
          totalJobs: 342,
          totalProcessingTime: 15847,
          averageProcessingTime: 46.3,
          successRate: 98.7,
          queueLength: 3,
          activeWorkers: 5,
        }
      }
    })

    // WebSocket endpoint for real-time updates
    fastify.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, (connection, req) => {
        connection.socket.on('message', (message) => {
          // Handle incoming WebSocket messages
          const data = JSON.parse(message.toString())
          
          if (data.type === 'subscribe') {
            // Subscribe to job updates
            connection.socket.send(JSON.stringify({
              type: 'subscription_confirmed',
              data: { jobId: data.jobId }
            }))

            // Simulate periodic updates
            const interval = setInterval(() => {
              const progress = Math.min(100, Math.floor(Math.random() * 100))
              connection.socket.send(JSON.stringify({
                type: 'job_update',
                data: {
                  jobId: data.jobId,
                  status: progress === 100 ? 'completed' : 'processing',
                  progress,
                  fileUpdates: []
                }
              }))

              if (progress === 100) {
                clearInterval(interval)
              }
            }, 2000)

            connection.socket.on('close', () => {
              clearInterval(interval)
            })
          }
        })

        // Send welcome message
        connection.socket.send(JSON.stringify({
          type: 'connected',
          data: { message: 'WebSocket connection established' }
        }))
      })
    })
  })
} 