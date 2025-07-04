import Queue from 'bull'
import Redis from 'ioredis'
import { EventEmitter } from 'events'

export interface JobData {
  id: string
  file: {
    filename: string
    originalName: string
    buffer: Buffer
    mimetype: string
    size: number
  }
  watermark: any
  settings?: any
  userId?: string
  uploadId: string
}

export interface JobProgress {
  jobId: string
  uploadId: string
  filename: string
  progress: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  error?: string
  resultUrl?: string
}

export class QueueManager extends EventEmitter {
  private watermarkQueue: Queue.Queue
  private redis: Redis
  private activeJobs: Map<string, JobProgress> = new Map()

  constructor() {
    super()
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

  private setupWorkers() {
    // Image processing worker - 3 concurrent jobs
    this.watermarkQueue.process('image', 3, async (job) => {
      const { id, file, watermark, settings, uploadId } = job.data as JobData
      
      try {
        this.updateJobProgress(id, uploadId, file.filename, 'processing', 0)
        
        // Import file processor dynamically
        const { fileProcessor } = await import('../fileProcessor')
        
        // Save uploaded file
        const inputPath = await fileProcessor.saveUploadedFile(file.buffer, file.filename)
        
        // Simulate processing with progress updates
        for (let i = 10; i <= 90; i += 10) {
          job.progress(i)
          this.updateJobProgress(id, uploadId, file.filename, 'processing', i)
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        // Process file
        const result = await fileProcessor.processFile(
          inputPath,
          'image',
          watermark,
          (progress) => {
            job.progress(progress)
            this.updateJobProgress(id, uploadId, file.filename, 'processing', progress)
          }
        )

        // Cleanup input file
        await fileProcessor.cleanup(inputPath)

        if (result.success && result.outputPath) {
          const resultUrl = fileProcessor.getOutputUrl(result.outputPath)
          this.updateJobProgress(id, uploadId, file.filename, 'completed', 100, undefined, resultUrl)
          
          return {
            success: true,
            resultUrl,
            processingTime: result.processingTime,
          }
        } else {
          throw new Error(result.error || 'Processing failed')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.updateJobProgress(id, uploadId, file.filename, 'failed', 0, errorMessage)
        throw error
      }
    })

    // Video processing worker - 2 concurrent jobs
    this.watermarkQueue.process('video', 2, async (job) => {
      const { id, file, watermark, settings, uploadId } = job.data as JobData
      
      try {
        this.updateJobProgress(id, uploadId, file.filename, 'processing', 0)
        
        // Import video processor dynamically
        const { videoProcessor } = await import('../videoProcessor')
        
        // Save uploaded file
        const inputPath = await videoProcessor.saveUploadedFile(file.buffer, file.filename)
        
        // Process video
        const result = await videoProcessor.processVideo(
          inputPath,
          watermark,
          (progress) => {
            job.progress(progress)
            this.updateJobProgress(id, uploadId, file.filename, 'processing', progress)
          }
        )

        // Cleanup input file
        await videoProcessor.cleanup(inputPath)

        if (result.success && result.outputPath) {
          const resultUrl = videoProcessor.getOutputUrl(result.outputPath)
          this.updateJobProgress(id, uploadId, file.filename, 'completed', 100, undefined, resultUrl)
          
          return {
            success: true,
            resultUrl,
            processingTime: result.processingTime,
          }
        } else {
          throw new Error(result.error || 'Processing failed')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.updateJobProgress(id, uploadId, file.filename, 'failed', 0, errorMessage)
        throw error
      }
    })
  }

  private setupEventHandlers() {
    this.watermarkQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed:`, result)
      this.emit('job:completed', { jobId: job.id, result })
    })

    this.watermarkQueue.on('failed', (job, error) => {
      console.error(`❌ Job ${job.id} failed:`, error)
      this.emit('job:failed', { jobId: job.id, error: error.message })
    })

    this.watermarkQueue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`)
      this.emit('job:progress', { jobId: job.id, progress })
    })

    this.watermarkQueue.on('active', (job) => {
      console.log(`🚀 Job ${job.id} started processing`)
      this.emit('job:started', { jobId: job.id })
    })
  }

  private updateJobProgress(
    jobId: string, 
    uploadId: string, 
    filename: string, 
    status: JobProgress['status'], 
    progress: number,
    error?: string,
    resultUrl?: string
  ) {
    const jobProgress: JobProgress = {
      jobId,
      uploadId,
      filename,
      progress,
      status,
      startTime: this.activeJobs.get(jobId)?.startTime || new Date(),
      endTime: status === 'completed' || status === 'failed' ? new Date() : undefined,
      error,
      resultUrl
    }

    this.activeJobs.set(jobId, jobProgress)
    
    // Emit update for WebSocket clients
    this.emit('job:update', jobProgress)
  }

  async addJob(type: 'image' | 'video', data: JobData, options?: any) {
    // Add job to active jobs tracking
    this.activeJobs.set(data.id, {
      jobId: data.id,
      uploadId: data.uploadId,
      filename: data.file.filename,
      progress: 0,
      status: 'pending',
      startTime: new Date()
    })

    const job = await this.watermarkQueue.add(type, data, {
      priority: options?.priority || 5,
      delay: options?.delay || 0,
      ...options
    })

    // Emit job added event
    this.emit('job:added', {
      jobId: data.id,
      uploadId: data.uploadId,
      filename: data.file.filename,
      type
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
      totalJobs: this.activeJobs.size
    }
  }

  getActiveJobs(): JobProgress[] {
    return Array.from(this.activeJobs.values())
  }

  getJobsByUploadId(uploadId: string): JobProgress[] {
    return Array.from(this.activeJobs.values()).filter(job => job.uploadId === uploadId)
  }

  removeCompletedJob(jobId: string) {
    this.activeJobs.delete(jobId)
  }

  async cleanup() {
    await this.watermarkQueue.close()
    await this.redis.quit()
  }
} 