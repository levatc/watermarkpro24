import React, { useState, useEffect } from 'react'

interface ProgressBarProps {
  jobId: string
  initialProgress?: number
  onComplete?: (result: any) => void
  onError?: (error: string) => void
}

interface ProgressData {
  progress: number
  stage: string
  message: string
  estimatedTimeRemaining?: number
  processingSpeed?: number
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  jobId, 
  initialProgress = 0, 
  onComplete, 
  onError 
}) => {
  const [progress, setProgress] = useState<ProgressData>({
    progress: initialProgress,
    stage: 'Initialisierung',
    message: 'Verarbeitung wird vorbereitet...'
  })
  const [isConnected, setIsConnected] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    // WebSocket-Verbindung für Echtzeit-Updates
    const connectWebSocket = () => {
      const wsUrl = `ws://${window.location.hostname}:8000/ws`
      const websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        console.log('🔌 WebSocket für Progress verbunden')
        setIsConnected(true)
        
        // Job abonnieren
        websocket.send(JSON.stringify({
          type: 'subscribe_job',
          jobId: jobId
        }))
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'job_progress' && data.jobId === jobId) {
            setProgress({
              progress: data.progress,
              stage: data.stage,
              message: data.message,
              estimatedTimeRemaining: data.estimatedTimeRemaining,
              processingSpeed: data.processingSpeed
            })
            
            // Wenn abgeschlossen, Callback aufrufen
            if (data.progress >= 100 && onComplete) {
              onComplete(data)
            }
          } else if (data.type === 'job_update' && data.jobId === jobId) {
            if (data.status === 'failed' && onError) {
              onError(data.data?.error || 'Unbekannter Fehler')
            } else if (data.status === 'completed' && onComplete) {
              onComplete(data.data)
            }
          }
        } catch (error) {
          console.error('❌ Fehler beim Parsen der WebSocket-Nachricht:', error)
        }
      }

      websocket.onclose = () => {
        console.log('🔌 WebSocket-Verbindung geschlossen')
        setIsConnected(false)
      }

      websocket.onerror = (error) => {
        console.error('❌ WebSocket-Fehler:', error)
        setIsConnected(false)
      }

      setWs(websocket)
    }

    connectWebSocket()

    // Cleanup
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [jobId])

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.round(seconds % 60)
      return `${minutes}m ${remainingSeconds}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  const getProgressColor = () => {
    if (progress.progress >= 100) return 'bg-green-500'
    if (progress.progress > 0) return 'bg-blue-500'
    return 'bg-gray-300'
  }

  const getStageColor = () => {
    if (progress.stage === 'Fehler') return 'text-red-600'
    if (progress.stage === 'Abgeschlossen') return 'text-green-600'
    if (progress.stage === 'Verarbeitung') return 'text-blue-600'
    return 'text-gray-600'
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Verarbeitung</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${getStageColor()}`}>
            {progress.stage}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {Math.round(progress.progress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
            style={{ width: `${Math.min(progress.progress, 100)}%` }}
          >
            {/* Animated stripes for active progress */}
            {progress.progress > 0 && progress.progress < 100 && (
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="mb-4">
        <p className="text-sm text-gray-700">{progress.message}</p>
      </div>

      {/* Time Information */}
      {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Verbleibend:</span>
          <span className="font-medium text-blue-600">
            ~{formatDuration(progress.estimatedTimeRemaining)}
          </span>
        </div>
      )}

      {progress.processingSpeed && progress.processingSpeed > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Geschwindigkeit:</span>
          <span className="font-medium">
            {progress.processingSpeed.toFixed(1)}% / Sekunde
          </span>
        </div>
      )}

      {/* Job ID */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Job ID: {jobId}</p>
      </div>
    </div>
  )
}

export default ProgressBar