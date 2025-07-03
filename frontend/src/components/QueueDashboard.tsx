import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  QueueListIcon, 
  ClockIcon, 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  WifiIcon
} from '@heroicons/react/24/outline'
import { 
  WebSocketManager, 
  JobProgress, 
  JobUpdate, 
  QueueStats, 
  formatFileSize, 
  formatDuration, 
  getStatusColor, 
  getStatusText 
} from '../utils'

interface Job {
  id: string
  filename: string
  type: 'video' | 'image' | 'pdf'
  size: number
  status: 'created' | 'waiting' | 'active' | 'completed' | 'failed' | 'removed'
  progress: number
  stage: string
  message: string
  estimatedTimeRemaining?: number
  processingSpeed?: number
  downloadUrl?: string
  createdAt: string
  completedAt?: string
  error?: string
}

const QueueDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<QueueStats>({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0
  })
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocketManager | null>(null)

  useEffect(() => {
    // Initialize WebSocket connection
    const wsUrl = `ws://${window.location.hostname}:8000/ws`
    wsRef.current = new WebSocketManager(wsUrl)

    // Set up event listeners
    wsRef.current.on('connected', () => {
      setIsConnected(true)
      // Request initial data
      wsRef.current?.getQueueStats()
      wsRef.current?.getActiveJobs()
    })

    wsRef.current.on('disconnected', () => {
      setIsConnected(false)
    })

    wsRef.current.on('job_progress', (data: JobProgress) => {
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === data.jobId 
            ? {
                ...job,
                progress: data.progress,
                stage: data.stage,
                message: data.message,
                estimatedTimeRemaining: data.estimatedTimeRemaining,
                processingSpeed: data.processingSpeed,
                status: data.progress === 100 ? 'completed' : 'active'
              }
            : job
        )
      )
    })

    wsRef.current.on('job_update', (data: JobUpdate) => {
      const { jobId, status, data: jobData } = data

      setJobs(prevJobs => {
        const existingJobIndex = prevJobs.findIndex(job => job.id === jobId)
        
        if (status === 'created' && existingJobIndex === -1) {
          // Add new job
          const newJob: Job = {
            id: jobId,
            filename: jobData.filename || 'Unbekannte Datei',
            type: jobData.type || 'video',
            size: jobData.size || 0,
            status: 'created',
            progress: 0,
            stage: 'Erstellt',
            message: 'Job wurde erstellt...',
            createdAt: jobData.timestamp || new Date().toISOString()
          }
          return [...prevJobs, newJob]
        } else if (existingJobIndex !== -1) {
          // Update existing job
          const updatedJobs = [...prevJobs]
          const job = updatedJobs[existingJobIndex]
          
          if (status === 'completed' && jobData) {
            job.status = 'completed'
            job.progress = 100
            job.stage = 'Abgeschlossen'
            job.message = 'Verarbeitung erfolgreich abgeschlossen!'
            job.downloadUrl = jobData.downloadUrl
            job.completedAt = new Date().toISOString()
          } else if (status === 'failed' && jobData) {
            job.status = 'failed'
            job.stage = 'Fehler'
            job.message = 'Verarbeitung fehlgeschlagen'
            job.error = jobData.error
          } else if (status === 'waiting') {
            job.status = 'waiting'
            job.stage = 'Wartend'
            job.message = 'Warten auf Verarbeitung...'
          } else if (status === 'active') {
            job.status = 'active'
            job.stage = 'Verarbeitung'
            job.message = 'Verarbeitung läuft...'
          } else if (status === 'removed') {
            return updatedJobs.filter(j => j.id !== jobId)
          }
          
          updatedJobs[existingJobIndex] = job
          return updatedJobs
        }
        
        return prevJobs
      })
    })

    wsRef.current.on('queue_stats', (data: { data: QueueStats }) => {
      setStats(data.data)
    })

    wsRef.current.on('active_jobs', (data: { data: any[] }) => {
      const activeJobs = data.data.map(jobData => ({
        id: jobData.id.toString(),
        filename: jobData.data.file.filename,
        type: jobData.data.type,
        size: jobData.data.file.size,
        status: 'active' as const,
        progress: jobData.progress || 0,
        stage: 'Verarbeitung',
        message: `Verarbeitung läuft... ${jobData.progress || 0}%`,
        createdAt: new Date(jobData.timestamp).toISOString()
      }))
      
      setJobs(prevJobs => {
        const existingIds = prevJobs.map(job => job.id)
        const newJobs = activeJobs.filter(job => !existingIds.includes(job.id))
        return [...prevJobs, ...newJobs]
      })
    })

    // Cleanup on unmount
    return () => {
      wsRef.current?.disconnect()
    }
  }, [])

  const handleRemoveJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/queue/jobs/${jobId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId))
      }
    } catch (error) {
      console.error('Fehler beim Entfernen des Jobs:', error)
    }
  }

  const handleDownload = (job: Job) => {
    if (job.downloadUrl) {
      window.open(job.downloadUrl, '_blank')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'pdf': return '�'
      default: return '📄'
    }
  }

  const getProgressBarColor = (status: string, progress: number) => {
    if (status === 'failed') return 'bg-red-500'
    if (status === 'completed') return 'bg-green-500'
    if (status === 'active') return 'bg-blue-500'
    return 'bg-yellow-500'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QueueListIcon className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Verarbeitungs-Queue</h2>
            <div className="flex items-center space-x-1">
              <WifiIcon className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Verbunden' : 'Getrennt'}
              </span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{stats.waiting} wartend</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{stats.active} aktiv</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{stats.completed} fertig</span>
            </div>
            {stats.failed > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{stats.failed} fehler</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Jobs List */}
      <div className="p-6">
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Keine aktiven Jobs</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  {/* File Icon & Info */}
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-2xl flex-shrink-0">{getTypeIcon(job.type)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{job.filename}</p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {getStatusText(job.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">{formatFileSize(job.size)}</span>
                        <span className="text-xs text-gray-500">{job.stage}</span>
                        {job.estimatedTimeRemaining && job.estimatedTimeRemaining > 0 && (
                          <span className="text-xs text-blue-600">
                            ~{formatDuration(job.estimatedTimeRemaining)} verbleibend
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 mt-1">{job.message}</p>
                      
                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Fortschritt</span>
                          <span className="text-xs font-medium text-gray-700">{job.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            className={`h-2 rounded-full ${getProgressBarColor(job.status, job.progress)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${job.progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      
                      {/* Error Message */}
                      {job.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          {job.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {job.status === 'completed' && job.downloadUrl && (
                      <button
                        onClick={() => handleDownload(job)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Herunterladen"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {(job.status === 'completed' || job.status === 'failed') && (
                      <button
                        onClick={() => handleRemoveJob(job.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Entfernen"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {job.status === 'active' && (
                      <div className="p-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      </div>
                    )}
                    
                    {job.status === 'waiting' && (
                      <div className="p-2">
                        <ClockIcon className="h-4 w-4 text-yellow-600" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default QueueDashboard 