import Queue from 'bull'
import Redis from 'ioredis'
import { FastifyInstance } from 'fastify'
import { videoProcessor } from '../videoProcessor'
import { fileProcessor } from '../fileProcessor'

interface JobData {
  id: string
  type: 'video' | 'image' | 'pdf'
  file: {
    filename: string
    path: string
    size: number
  }
  watermark: any
  settings: any
  userId?: string
  socketId?: string
}

interface JobProgress {
  jobId: string
  progress: number
  stage: string
  message: string
  estimatedTimeRemaining?: number
  processingSpeed?: number
}

export class QueueManager {
  private watermarkQueue: Queue.Queue
  private redis: Redis
  private fastify?: FastifyInstance
  private activeJobs: Map<string, any> = new Map()

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    })

    this.watermarkQueue = new Queue('watermark processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: 'exponential',
      },
    })

    this.setupWorkers()
    this.setupEventHandlers()
  }

  setFastifyInstance(fastify: FastifyInstance) {
    this.fastify = fastify
  }

  private broadcastProgress(jobId: string, progress: JobProgress) {
    if (this.fastify) {
      // Broadcast to all connected WebSocket clients
      this.fastify.websocketServer.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'job_progress',
            ...progress
          }))
        }
      })
    }
  }

  private broadcastJobUpdate(jobId: string, status: string, data?: any) {
    if (this.fastify) {
      this.fastify.websocketServer.clients.forEach((client: any) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'job_update',
            jobId,
            status,
            data
          }))
        }
      })
    }
  }

  private setupWorkers() {
    // Video processing worker
    this.watermarkQueue.process('video', 2, async (job) => {
      const jobData: JobData = job.data
      this.activeJobs.set(job.id.toString(), job)
      
      const startTime = Date.now()
      let lastProgressTime = startTime

      const onProgress = (progress: number, stage?: string) => {
        const currentTime = Date.now()
        const elapsedTime = currentTime - startTime
        const progressDelta = progress - (job.progress() || 0)
        const timeDelta = currentTime - lastProgressTime

        // Calculate processing speed and ETA
        let estimatedTimeRemaining
        let processingSpeed
        
        if (progress > 0 && progressDelta > 0) {
          processingSpeed = progressDelta / (timeDelta / 1000) // progress per second
          estimatedTimeRemaining = (100 - progress) / processingSpeed
        }

        job.progress(progress)
        
        this.broadcastProgress(job.id.toString(), {
          jobId: job.id.toString(),
          progress,
          stage: stage || 'Verarbeitung',
          message: `Video wird verarbeitet... ${Math.round(progress)}%`,
          estimatedTimeRemaining,
          processingSpeed
        })

        lastProgressTime = currentTime
      }

      try {
        this.broadcastProgress(job.id.toString(), {
          jobId: job.id.toString(),
          progress: 0,
          stage: 'Vorbereitung',
          message: 'Video-Verarbeitung wird gestartet...'
        })

        const result = await videoProcessor.processVideo(
          jobData.file.path,
          jobData.settings,
          onProgress
        )

        this.activeJobs.delete(job.id.toString())

        if (result.success) {
          this.broadcastProgress(job.id.toString(), {
            jobId: job.id.toString(),
            progress: 100,
            stage: 'Abgeschlossen',
            message: 'Video erfolgreich verarbeitet!'
          })

          return {
            success: true,
            outputPath: result.outputPath,
            downloadUrl: videoProcessor.getOutputUrl(result.outputPath!),
            processingTime: result.processingTime,
            filename: jobData.file.filename
          }
        } else {
          throw new Error(result.error || 'Video processing failed')
        }
      } catch (error) {
        this.activeJobs.delete(job.id.toString())
        this.broadcastProgress(job.id.toString(), {
          jobId: job.id.toString(),
          progress: 0,
          stage: 'Fehler',
          message: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
        })
        throw error
      }
    })

    // Image processing worker
    this.watermarkQueue.process('image', 5, async (job) => {
      const jobData: JobData = job.data
      this.activeJobs.set(job.id.toString(), job)

      const onProgress = (progress: number, stage?: string) => {
        job.progress(progress)
        this.broadcastProgress(job.id.toString(), {
          jobId: job.id.toString(),
          progress,
          stage: stage || 'Verarbeitung',
          message: `Bild wird verarbeitet... ${Math.round(progress)}%`
        })
      }

      try {
        onProgress(0, 'Vorbereitung')
        
        // Simulate image processing with progress updates
        for (let i = 0; i <= 100; i += 20) {
          onProgress(i, i === 100 ? 'Abschluss' : 'Verarbeitung')
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        this.activeJobs.delete(job.id.toString())

        return {
          success: true,
          outputPath: `/processed/${jobData.file.filename}`,
          downloadUrl: `/output/${jobData.file.filename}`,
          processingTime: 500,
          filename: jobData.file.filename
        }
      } catch (error) {
        this.activeJobs.delete(job.id.toString())
        throw error
      }
    })

    // PDF processing worker
    this.watermarkQueue.process('pdf', 3, async (job) => {
      const jobData: JobData = job.data
      this.activeJobs.set(job.id.toString(), job)

      const onProgress = (progress: number, stage?: string) => {
        job.progress(progress)
        this.broadcastProgress(job.id.toString(), {
          jobId: job.id.toString(),
          progress,
          stage: stage || 'Verarbeitung',
          message: `PDF wird verarbeitet... ${Math.round(progress)}%`
        })
      }

      try {
        onProgress(0, 'Vorbereitung')
        
        // Simulate PDF processing with progress updates
        for (let i = 0; i <= 100; i += 25) {
          onProgress(i, i === 100 ? 'Abschluss' : 'Verarbeitung')
          await new Promise(resolve => setTimeout(resolve, 150))
        }

        this.activeJobs.delete(job.id.toString())

        return {
          success: true,
          outputPath: `/processed/${jobData.file.filename}`,
          downloadUrl: `/output/${jobData.file.filename}`,
          processingTime: 600,
          filename: jobData.file.filename
        }
      } catch (error) {
        this.activeJobs.delete(job.id.toString())
        throw error
      }
    })
  }

  private setupEventHandlers() {
    this.watermarkQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed:`, result)
      this.broadcastJobUpdate(job.id.toString(), 'completed', result)
    })

    this.watermarkQueue.on('failed', (job: any, error: any) => {
      console.error(`❌ Job ${job.id} failed:`, error)
      this.broadcastJobUpdate(job.id.toString(), 'failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    })

    this.watermarkQueue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`)
    })

    this.watermarkQueue.on('waiting', (job) => {
      console.log(`⏳ Job ${job.id} is waiting`)
      this.broadcastJobUpdate(job.id.toString(), 'waiting')
    })

    this.watermarkQueue.on('active', (job) => {
      console.log(`🔄 Job ${job.id} started processing`)
      this.broadcastJobUpdate(job.id.toString(), 'active')
    })
  }

  async addJob(type: 'video' | 'image' | 'pdf', data: JobData, options?: any) {
    const job = await this.watermarkQueue.add(type, data, {
      priority: options?.priority || 5,
      delay: options?.delay || 0,
      ...options
    })

    // Broadcast job creation
    this.broadcastJobUpdate(job.id.toString(), 'created', {
      type,
      filename: data.file.filename,
      size: data.file.size,
      timestamp: new Date().toISOString()
    })

    return job
  }

  async getJobStats() {
    const waiting = await this.watermarkQueue.getWaiting()
    const active = await this.watermarkQueue.getActive()
    const completed = await this.watermarkQueue.getCompleted()
    const failed = await this.watermarkQueue.getFailed()

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      totalProcessed: completed.length + failed.length
    }
  }

  async getJobById(jobId: string) {
    return await this.watermarkQueue.getJob(jobId)
  }

  async getActiveJobs() {
    const active = await this.watermarkQueue.getActive()
    return active.map(job => ({
      id: job.id,
      data: job.data,
      progress: job.progress(),
      processedOn: job.processedOn,
      timestamp: job.timestamp
    }))
  }

  async removeJob(jobId: string) {
    const job = await this.watermarkQueue.getJob(jobId)
    if (job) {
      await job.remove()
      this.broadcastJobUpdate(jobId, 'removed')
      return true
    }
    return false
  }

  async cleanup() {
    await this.watermarkQueue.close()
    await this.redis.quit()
  }
} 