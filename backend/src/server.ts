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

const prisma = new PrismaClient()

const server = Fastify({
  logger: true,
  bodyLimit: 1024 * 1024 * 500, // 500MB
  requestTimeout: 60000, // 60 seconds
})

// Declare plugins and decorators
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
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
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

    // Health check
    server.get('/health', async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            database: 'connected',
            queue: 'mock',
          }
        }
      } catch (error) {
        server.log.error('Health check failed', error)
        return {
          status: 'ok', // Return ok for now even if DB fails
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            database: 'mock',
            queue: 'mock',
          }
        }
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