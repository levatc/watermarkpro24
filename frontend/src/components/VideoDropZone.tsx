import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudArrowUpIcon, PlayIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { formatFileSize } from '@/utils'
import toast from 'react-hot-toast'

interface WatermarkSettings {
  text: string
  fontSize: number
  color: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

interface VideoDropZoneProps {
  watermarkSettings: WatermarkSettings
}

interface ProcessedVideo {
  originalFile: File
  processedUrl: string
  processingTime: number
}

const VideoDropZone: React.FC<VideoDropZoneProps> = ({ watermarkSettings }) => {
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedVideo, setProcessedVideo] = useState<ProcessedVideo | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const processVideo = async (file: File) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('video', file)
      formData.append('watermark', JSON.stringify(watermarkSettings))

      // Debug: Log what we're sending
      console.log('🚀 Sending FormData with:')
      console.log('- Video file:', file.name, file.type, file.size)
      console.log('- Watermark settings:', watermarkSettings)
      console.log('- FormData entries:')
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value)
      }

      const response = await fetch('http://localhost:8000/api/process-video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Video-Verarbeitung fehlgeschlagen')
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 500)

      const result = await response.json()
      
      clearInterval(progressInterval)
      setProgress(100)

      if (result.success) {
        setProcessedVideo({
          originalFile: file,
          processedUrl: result.data.processedUrl,
          processingTime: result.data.processingTime || 0
        })
        toast.success('Video erfolgreich verarbeitet!')
      } else {
        throw new Error(result.error?.message || 'Unbekannter Fehler')
      }
    } catch (error) {
      console.error('Processing error:', error)
      setError(error instanceof Error ? error.message : 'Video-Verarbeitung fehlgeschlagen')
      toast.error('Fehler bei der Video-Verarbeitung')
    } finally {
      setIsProcessing(false)
    }
  }

  const onDropAccepted = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    setUploadedVideo(file)
    setProcessedVideo(null)
    setError(null)
    toast.success('Video hochgeladen - bereit zur Verarbeitung!')
  }, [])

  const onDropRejected = useCallback((rejectedFiles: any[]) => {
    rejectedFiles.forEach((rejection) => {
      const { file, errors } = rejection
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`${file.name} ist zu groß (max. 100MB)`)
        } else if (error.code === 'file-invalid-type') {
          toast.error(`${file.name} ist kein unterstütztes Video-Format`)
        } else {
          toast.error(`Fehler bei ${file.name}: ${error.message}`)
        }
      })
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDropAccepted,
    onDropRejected,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
    disabled: isProcessing,
  })

  const downloadVideo = async () => {
    if (processedVideo) {
      try {
        // Vollständige URL erstellen
        const fullUrl = `http://localhost:8000${processedVideo.processedUrl}`
        
        // Fetch the video as blob to ensure proper download
        const response = await fetch(fullUrl)
        if (!response.ok) {
          throw new Error('Download fehlgeschlagen')
        }
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `watermarked_${processedVideo.originalFile.name}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Cleanup
        window.URL.revokeObjectURL(url)
        toast.success('Download gestartet!')
      } catch (error) {
        console.error('Download error:', error)
        toast.error('Fehler beim Herunterladen des Videos')
      }
    }
  }

  const resetUpload = () => {
    setUploadedVideo(null)
    setProcessedVideo(null)
    setProgress(0)
    setError(null)
  }

  return (
    <div className="w-full">
      {/* Upload Area */}
      <motion.div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
          'hover:border-primary-400 hover:bg-primary-50/30',
          {
            'border-primary-500 bg-primary-50 scale-105': isDragActive && !isDragReject,
            'border-red-500 bg-red-50': isDragReject,
            'border-gray-300 bg-white': !isDragActive && !uploadedVideo,
            'border-green-500 bg-green-50': uploadedVideo && !isProcessing,
            'cursor-not-allowed opacity-60': isProcessing,
          }
        )}
        whileHover={!isProcessing ? { scale: 1.02 } : undefined}
        whileTap={!isProcessing ? { scale: 0.98 } : undefined}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-primary-700">Video wird verarbeitet...</p>
              <p className="text-sm text-primary-600 mt-1">Wasserzeichen wird hinzugefügt</p>
              <div className="w-full max-w-md mt-4">
                <div className="bg-gray-200 rounded-full h-3">
                  <motion.div
                    className="bg-primary-600 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{Math.round(progress)}% abgeschlossen</p>
              </div>
            </motion.div>
          ) : uploadedVideo ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <PlayIcon className="w-16 h-16 text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-700">Video bereit!</p>
              <p className="text-sm text-green-600 mt-1">{uploadedVideo.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(uploadedVideo.size)}</p>
              
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    processVideo(uploadedVideo)
                  }}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Wasserzeichen hinzufügen
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    resetUpload()
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Neues Video
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {isDragActive
                  ? isDragReject
                    ? 'Ungültiges Video-Format'
                    : 'Video hier ablegen'
                  : 'Video hochladen'}
              </h3>
              <p className="text-gray-500 mb-4">
                {isDragActive
                  ? isDragReject
                    ? 'Nur Video-Dateien werden unterstützt'
                    : 'Lassen Sie das Video los, um es hochzuladen'
                  : 'Ziehen Sie ein Video hierher oder klicken Sie zum Auswählen'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                <span className="bg-gray-100 px-2 py-1 rounded">MP4</span>
                <span className="bg-gray-100 px-2 py-1 rounded">AVI</span>
                <span className="bg-gray-100 px-2 py-1 rounded">MOV</span>
                <span className="bg-gray-100 px-2 py-1 rounded">MKV</span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Maximale Dateigröße: 100MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 font-medium">Fehler bei der Verarbeitung</p>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processed Video Result */}
      <AnimatePresence>
        {processedVideo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800">Video erfolgreich verarbeitet!</h3>
                <p className="text-green-600 text-sm mt-1">
                  Verarbeitungszeit: {processedVideo.processingTime}s
                </p>
                <p className="text-green-600 text-sm">
                  Wasserzeichen: "{watermarkSettings.text}"
                </p>
              </div>
              <button
                onClick={downloadVideo}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Video herunterladen</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default VideoDropZone 