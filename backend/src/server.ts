import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import helmet from '@fastify/helmet'
import staticFiles from '@fastify/static'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { setupRoutes } from './routes'
import { QueueManager } from './services/queue/QueueManager'

const prisma = new PrismaClient()

const server = Fastify({
  logger: true,
  bodyLimit: 1024 * 1024 * 500, // 500MB
  requestTimeout: 60000, // 60 seconds
})

// Global queue manager instance
let queueManager: QueueManager

// WebSocket clients storage
const wsClients = new Set<any>()

// Declare plugins and decorators
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    queueManager: QueueManager
  }
}

async function start() {
  try {
    // Security
    await server.register(helmet, {
      contentSecurityPolicy: false, // Disable for development
    })

    // CORS
    await server.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    })

    // Rate limiting
    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    })

    // File upload
    await server.register(multipart, {
      limits: {
        fieldNameSize: 100,
        fieldSize: 1024 * 1024 * 500, // 500MB
        fields: 10,
        fileSize: 1024 * 1024 * 500, // 500MB
        files: 50,
      },
    })

    // WebSocket support
    await server.register(websocket)

    // Static file serving for processed videos
    await server.register(staticFiles, {
      root: path.join(process.cwd(), 'output'),
      prefix: '/output/',
      decorateReply: false
    })

    // Decorators for dependency injection
    server.decorate('prisma', prisma)

    // Initialize queue manager
    queueManager = new QueueManager()

    // Setup WebSocket event handlers
    queueManager.on('job:update', (jobProgress) => {
      // Broadcast to all connected WebSocket clients
      wsClients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'job:update',
            data: jobProgress
          }))
        }
      })
    })

    queueManager.on('job:added', (jobInfo) => {
      wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'job:added',
            data: jobInfo
          }))
        }
      })
    })

    queueManager.on('job:completed', (jobInfo) => {
      wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'job:completed',
            data: jobInfo
          }))
        }
      })
    })

    queueManager.on('job:failed', (jobInfo) => {
      wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'job:failed',
            data: jobInfo
          }))
        }
      })
    })

    // Decorate server with queue manager
    server.decorate('queueManager', queueManager)

    // WebSocket route for real-time updates
    await server.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, (connection, req) => {
        console.log('New WebSocket connection established')
        wsClients.add(connection.socket)

        connection.socket.on('message', (message: any) => {
          try {
            const data = JSON.parse(message.toString())
            
            if (data.type === 'ping') {
              connection.socket.send(JSON.stringify({ type: 'pong' }))
            } else if (data.type === 'get_queue_status') {
              // Send current queue status
              queueManager.getJobStats().then(stats => {
                connection.socket.send(JSON.stringify({
                  type: 'queue_status',
                  data: {
                    stats,
                    activeJobs: queueManager.getActiveJobs()
                  }
                }))
              })
            }
          } catch (error) {
            console.error('WebSocket message error:', error)
          }
        })

        connection.socket.on('close', () => {
          console.log('WebSocket connection closed')
          wsClients.delete(connection.socket)
        })

        connection.socket.on('error', (error: any) => {
          console.error('WebSocket error:', error)
          wsClients.delete(connection.socket)
        })

        // Send initial queue status
        queueManager.getJobStats().then(stats => {
          connection.socket.send(JSON.stringify({
            type: 'queue_status',
            data: {
              stats,
              activeJobs: queueManager.getActiveJobs()
            }
          }))
        })
      })
    })

    // API routes for queue management
    server.get('/api/queue/status', async (request, reply) => {
      try {
        const stats = await queueManager.getJobStats()
        const activeJobs = queueManager.getActiveJobs()
        
        return reply.send({
          success: true,
          data: {
            stats,
            activeJobs
          }
        })
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: { message: 'Failed to get queue status' }
        })
      }
    })

    server.get('/api/queue/jobs/:uploadId', async (request: any, reply) => {
      try {
        const { uploadId } = request.params
        const jobs = queueManager.getJobsByUploadId(uploadId)
        
        return reply.send({
          success: true,
          data: jobs
        })
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: { message: 'Failed to get jobs for upload' }
        })
      }
    })

    // Health check
    server.get('/health', async () => {
      const queueStats = await queueManager.getJobStats()
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        queue: queueStats,
        websocketClients: wsClients.size
      }
    })

    // API Routes
    await setupRoutes(server)

    // Error handler
    server.setErrorHandler(async (error, request, reply) => {
      server.log.error(error)
      
      if (error.statusCode === 429) {
        return reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            timestamp: new Date().toISOString(),
          }
        })
      }

      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Internal Server Error',
          timestamp: new Date().toISOString(),
        }
      })
    })

    // Start server
    const port = parseInt(process.env.PORT || '8000')
    const host = process.env.HOST || '0.0.0.0'
    
    await server.listen({ port, host })
    
    console.log(`🚀 Server running on http://${host}:${port}`)
    console.log(`📊 Health check: http://${host}:${port}/health`)
    console.log(`🔗 WebSocket: ws://${host}:${port}/ws`)
    
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📴 Received ${signal}, starting graceful shutdown...`)
  
  try {
    await server.close()
    await prisma.$disconnect()
    await queueManager.cleanup()
    console.log('✅ Server closed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

start() 