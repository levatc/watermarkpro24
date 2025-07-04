import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QueueListIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useWebSocket, JobProgress } from '../hooks/useWebSocket'
import toast from 'react-hot-toast'

const QueueDashboard: React.FC = () => {
  const [completedJobs, setCompletedJobs] = useState<JobProgress[]>([])
  
  const { isConnected, queueStats, activeJobs } = useWebSocket({
    onJobUpdate: (job) => {
      console.log('Job update received:', job)
    },
    onJobCompleted: (jobInfo) => {
      console.log('Job completed:', jobInfo)
      toast.success(`${jobInfo.filename || 'Datei'} erfolgreich verarbeitet!`)
      
             // Move completed job to completed list
       const completedJob = activeJobs.find((job: JobProgress) => job.jobId === jobInfo.jobId)
      if (completedJob) {
        setCompletedJobs(prev => [completedJob, ...prev.slice(0, 4)]) // Keep last 5 completed
      }
    },
    onJobFailed: (jobInfo) => {
      console.log('Job failed:', jobInfo)
      toast.error(`Fehler bei der Verarbeitung: ${jobInfo.error || 'Unbekannter Fehler'}`)
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 border-green-200'
      case 'processing': return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'failed': return 'text-red-600 bg-red-100 border-red-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />
      case 'processing': return <ArrowPathIcon className="w-4 h-4 animate-spin" />
      case 'pending': return <ClockIcon className="w-4 h-4" />
      case 'failed': return <ExclamationCircleIcon className="w-4 h-4" />
      default: return <ClockIcon className="w-4 h-4" />
    }
  }

  const getTypeIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
      case 'gif':
        return '🖼️'
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
      case 'webm':
        return '🎥'
      case 'zip':
      case 'rar':
      case '7z':
        return '📦'
      case 'pdf':
        return '📄'
      default:
        return '📄'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Fertig'
      case 'processing': return 'Verarbeitung'
      case 'pending': return 'Wartend'
      case 'failed': return 'Fehler'
      default: return 'Unbekannt'
    }
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return ''
    
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

     // Filter active jobs (not completed or failed for more than 5 seconds)
   const displayJobs = activeJobs.filter((job: JobProgress) => {
     if (job.status === 'pending' || job.status === 'processing') return true
     if (job.status === 'completed' || job.status === 'failed') {
       const endTime = job.endTime ? new Date(job.endTime) : new Date()
       const now = new Date()
       return (now.getTime() - endTime.getTime()) < 5000 // Show for 5 seconds after completion
     }
     return false
   })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QueueListIcon className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Verarbeitungs-Queue</h2>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isConnected ? 'Verbunden' : 'Getrennt'}</span>
            </div>
          </div>
          
          {queueStats && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span>{queueStats.waiting} wartend</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>{queueStats.active} aktiv</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>{queueStats.completed} fertig</span>
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {displayJobs.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Keine aktiven Jobs</p>
            <p className="text-xs text-gray-400 mt-1">
              Lade Dateien hoch, um die Verarbeitung zu starten
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
                             {displayJobs.map((job: JobProgress, index: number) => (
                <motion.div
                  key={job.jobId}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="text-2xl flex-shrink-0">
                    {getTypeIcon(job.filename)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {job.filename}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">
                          {job.progress}%
                        </span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span>{getStatusText(job.status)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`h-2 rounded-full transition-colors duration-300 ${
                            job.status === 'completed' ? 'bg-green-500' :
                            job.status === 'failed' ? 'bg-red-500' :
                            job.status === 'processing' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${job.progress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {job.status === 'processing' && 'Wird verarbeitet...'}
                          {job.status === 'pending' && 'Wartet auf Verarbeitung...'}
                          {job.status === 'completed' && job.resultUrl && (
                            <a 
                              href={job.resultUrl} 
                              className="text-blue-600 hover:text-blue-700 font-medium"
                              download
                            >
                              📥 Download bereit
                            </a>
                          )}
                          {job.status === 'failed' && job.error && (
                            <span className="text-red-600">❌ {job.error}</span>
                          )}
                        </span>
                        <span>
                          {formatDuration(job.startTime, job.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {/* Recently completed jobs */}
        {completedJobs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Kürzlich abgeschlossen</h3>
            <div className="space-y-2">
              {completedJobs.slice(0, 3).map((job, index) => (
                <motion.div
                  key={`completed-${job.jobId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-100"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(job.filename)}</span>
                    <span className="text-sm text-gray-700 truncate">{job.filename}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    {job.resultUrl && (
                      <a 
                        href={job.resultUrl} 
                        className="text-xs text-blue-600 hover:text-blue-700"
                        download
                      >
                        Download
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QueueDashboard 