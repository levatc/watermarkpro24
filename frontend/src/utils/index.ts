// File utilities für Frontend
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

export const isImageFile = (mimetype: string): boolean => {
  return mimetype.startsWith('image/');
};

export const isVideoFile = (mimetype: string): boolean => {
  return mimetype.startsWith('video/');
};

export const isArchiveFile = (mimetype: string): boolean => {
  return ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(mimetype);
};

// Time utilities
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

// Progress utilities
export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

export interface JobProgress {
  jobId: string
  progress: number
  stage: string
  message: string
  estimatedTimeRemaining?: number
  processingSpeed?: number
}

export interface JobUpdate {
  jobId: string
  status: 'created' | 'waiting' | 'active' | 'completed' | 'failed' | 'removed'
  data?: any
}

export interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  totalProcessed: number
}

export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000
  private listeners: { [key: string]: Function[] } = {}

  constructor(private url: string) {
    this.connect()
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('🔌 WebSocket verbunden')
        this.reconnectAttempts = 0
        this.emit('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.emit(data.type, data)
        } catch (error) {
          console.error('❌ Fehler beim Parsen der WebSocket-Nachricht:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('🔌 WebSocket Verbindung geschlossen')
        this.emit('disconnected')
        this.handleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket Fehler:', error)
        this.emit('error', error)
      }
    } catch (error) {
      console.error('❌ Fehler beim Verbinden mit WebSocket:', error)
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Versuche Wiederverbindung... Versuch ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)) // Exponential backoff
    } else {
      console.error('❌ Maximale Anzahl an Wiederverbindungsversuchen erreicht')
      this.emit('max_reconnect_attempts_reached')
    }
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('⚠️ WebSocket ist nicht verbunden')
    }
  }

  public on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  public off(event: string, callback: Function) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback)
      if (index > -1) {
        this.listeners[event].splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data))
    }
  }

  public subscribeToJob(jobId: string) {
    this.send({
      type: 'subscribe_job',
      jobId
    })
  }

  public getQueueStats() {
    this.send({
      type: 'get_queue_stats'
    })
  }

  public getActiveJobs() {
    this.send({
      type: 'get_active_jobs'
    })
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-100'
    case 'active': return 'text-blue-600 bg-blue-100'
    case 'waiting': return 'text-yellow-600 bg-yellow-100'
    case 'failed': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return 'Fertig'
    case 'active': return 'Verarbeitung'
    case 'waiting': return 'Wartend'
    case 'failed': return 'Fehler'
    case 'created': return 'Erstellt'
    case 'removed': return 'Entfernt'
    default: return status
  }
} 