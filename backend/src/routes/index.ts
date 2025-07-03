import { FastifyInstance } from 'fastify'
import { videoRoutes } from './videoRoutes'
import { fileRoutes } from './fileRoutes'
import { QueueManager } from '../services/queue/QueueManager'

const queueManager = new QueueManager()

export async function setupRoutes(fastify: FastifyInstance) {
  // Set QueueManager reference for WebSocket broadcasts
  queueManager.setFastifyInstance(fastify)

  // WebSocket route for real-time progress updates
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      console.log('🔌 WebSocket client connected')
      
      connection.socket.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString())
          
          switch (data.type) {
            case 'subscribe_job':
              // Client wants to subscribe to a specific job
              console.log(`📡 Client subscribed to job: ${data.jobId}`)
              break
              
            case 'get_queue_stats':
              // Send current queue statistics
              const stats = await queueManager.getJobStats()
              connection.socket.send(JSON.stringify({
                type: 'queue_stats',
                data: stats
              }))
              break
              
            case 'get_active_jobs':
              // Send active jobs
              const activeJobs = await queueManager.getActiveJobs()
              connection.socket.send(JSON.stringify({
                type: 'active_jobs',
                data: activeJobs
              }))
              break
              
            default:
              console.log('❓ Unknown WebSocket message type:', data.type)
          }
        } catch (error) {
          console.error('❌ WebSocket message error:', error)
        }
      })
      
      connection.socket.on('close', () => {
        console.log('🔌 WebSocket client disconnected')
      })
      
      // Send initial connection confirmation
      connection.socket.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket verbunden - Echtzeit-Updates aktiviert'
      }))
    })
  })

  // Queue management API routes
  fastify.get('/api/queue/stats', async (request, reply) => {
    try {
      const stats = await queueManager.getJobStats()
      return reply.send({
        success: true,
        data: stats
      })
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { message: 'Fehler beim Abrufen der Queue-Statistiken' }
      })
    }
  })

  fastify.get('/api/queue/jobs/active', async (request, reply) => {
    try {
      const activeJobs = await queueManager.getActiveJobs()
      return reply.send({
        success: true,
        data: activeJobs
      })
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { message: 'Fehler beim Abrufen der aktiven Jobs' }
      })
    }
  })

  fastify.get('/api/queue/jobs/:jobId', async (request: any, reply) => {
    try {
      const { jobId } = request.params
      const job = await queueManager.getJobById(jobId)
      
      if (!job) {
        return reply.code(404).send({
          success: false,
          error: { message: 'Job nicht gefunden' }
        })
      }
      
      return reply.send({
        success: true,
        data: {
          id: job.id,
          data: job.data,
          progress: job.progress(),
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          timestamp: job.timestamp
        }
      })
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { message: 'Fehler beim Abrufen des Jobs' }
      })
    }
  })

  fastify.delete('/api/queue/jobs/:jobId', async (request: any, reply) => {
    try {
      const { jobId } = request.params
      const removed = await queueManager.removeJob(jobId)
      
      if (!removed) {
        return reply.code(404).send({
          success: false,
          error: { message: 'Job nicht gefunden' }
        })
      }
      
      return reply.send({
        success: true,
        message: 'Job erfolgreich entfernt'
      })
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { message: 'Fehler beim Entfernen des Jobs' }
      })
    }
  })

  // Register existing routes
  await fastify.register(videoRoutes)
  await fastify.register(fileRoutes)
}

export { queueManager } 