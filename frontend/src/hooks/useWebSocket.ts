import { useEffect, useRef, useState, useCallback } from 'react'

export interface JobProgress {
  jobId: string
  uploadId: string
  filename: string
  progress: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startTime?: string
  endTime?: string
  error?: string
  resultUrl?: string
}

export interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  totalJobs: number
}

export interface WebSocketMessage {
  type: 'job:update' | 'job:added' | 'job:completed' | 'job:failed' | 'queue_status' | 'pong'
  data: any
}

interface UseWebSocketOptions {
  onJobUpdate?: (job: JobProgress) => void
  onJobCompleted?: (job: any) => void
  onJobFailed?: (job: any) => void
  onQueueStatusUpdate?: (status: { stats: QueueStats; activeJobs: JobProgress[] }) => void
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [activeJobs, setActiveJobs] = useState<JobProgress[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  const connect = useCallback(() => {
    try {
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `wss://${window.location.host}/ws`
        : 'ws://localhost:8000/ws'
      
      console.log('Connecting to WebSocket:', wsUrl)
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        reconnectAttempts.current = 0
        
        // Request initial queue status
        ws.send(JSON.stringify({ type: 'get_queue_status' }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('📨 WebSocket message:', message)

          switch (message.type) {
            case 'job:update':
              const jobUpdate = message.data as JobProgress
              setActiveJobs((prev: JobProgress[]) => {
                const index = prev.findIndex((job: JobProgress) => job.jobId === jobUpdate.jobId)
                if (index >= 0) {
                  const newJobs = [...prev]
                  newJobs[index] = jobUpdate
                  return newJobs
                } else {
                  return [...prev, jobUpdate]
                }
              })
              options.onJobUpdate?.(jobUpdate)
              break

            case 'job:added':
              console.log('🆕 New job added:', message.data)
              break

            case 'job:completed':
              console.log('✅ Job completed:', message.data)
              options.onJobCompleted?.(message.data)
              break

            case 'job:failed':
              console.log('❌ Job failed:', message.data)
              options.onJobFailed?.(message.data)
              break

            case 'queue_status':
              const statusData = message.data
              setQueueStats(statusData.stats)
              setActiveJobs(statusData.activeJobs)
              options.onQueueStatusUpdate?.(statusData)
              break

            case 'pong':
              console.log('🏓 Pong received')
              break

            default:
              console.log('❓ Unknown message type:', message.type)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          console.log(`🔄 Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
      }

    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
    }
  }, [options])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }, [])

  const ping = useCallback(() => {
    sendMessage({ type: 'ping' })
  }, [sendMessage])

  const requestQueueStatus = useCallback(() => {
    sendMessage({ type: 'get_queue_status' })
  }, [sendMessage])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!isConnected) return

    const pingInterval = setInterval(() => {
      ping()
    }, 30000)

    return () => clearInterval(pingInterval)
  }, [isConnected, ping])

  return {
    isConnected,
    queueStats,
    activeJobs,
    connect,
    disconnect,
    sendMessage,
    ping,
    requestQueueStatus
  }
}