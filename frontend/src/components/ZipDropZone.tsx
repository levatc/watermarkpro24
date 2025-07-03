import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CloudArrowUpIcon, 
  ArchiveBoxIcon,
  ArrowDownTrayIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  PhotoIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
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

interface ZipDropZoneProps {
  watermarkSettings: WatermarkSettings
}

interface ProcessedFileResult {
  originalName: string
  processedUrl: string
  fileType: 'image' | 'video' | 'pdf'
  processingTime: number
  success: boolean
  error?: string
}

interface ZipProcessResult {
  totalFiles: number
  processedFiles: ProcessedFileResult[]
  skippedFiles: string[]
  processingTime: number
  filename: string
}

const ZipDropZone: React.FC<ZipDropZoneProps> = ({ watermarkSettings }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<ZipProcessResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStatus, setCurrentStatus] = useState<string>('')
  const [currentFile, setCurrentFile] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const getFileIcon = (fileType: 'image' | 'video' | 'pdf') => {
    switch (fileType) {
      case 'video':
        return <PlayIcon className="w-5 h-5 text-blue-500" />
      case 'image':
        return <PhotoIcon className="w-5 h-5 text-green-500" />
      case 'pdf':
        return <DocumentIcon className="w-5 h-5 text-red-500" />
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getFileTypeLabel = (fileType: 'image' | 'video' | 'pdf'): string => {
    switch (fileType) {
      case 'video': return 'Video'
      case 'image': return 'Bild'
      case 'pdf': return 'PDF'
      default: return 'Datei'
    }
  }

  const processZipFile = async (file: File) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setCurrentStatus('ZIP-Datei wird vorbereitet...')
    setCurrentFile('')

    try {
      const formData = new FormData()
      formData.append('zip', file)
      formData.append('watermark', JSON.stringify({
        type: 'text',
        ...watermarkSettings
      }))

      console.log('🚀 Sending ZIP FormData with:')
      console.log('- ZIP file:', file.name, file.type, file.size)
      console.log('- Watermark settings:', watermarkSettings)

      const response = await fetch('http://localhost:8000/api/process-zip', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'ZIP-Verarbeitung fehlgeschlagen')
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 5
        })
      }, 1000)

      const result = await response.json()
      
      clearInterval(progressInterval)
      setProgress(100)

      if (result.success) {
        setProcessResult({
          totalFiles: result.data.totalFiles,
          processedFiles: result.data.processedFiles,
          skippedFiles: result.data.skippedFiles,
          processingTime: result.data.processingTime,
          filename: result.data.filename
        })
        
        const successCount = result.data.processedFiles.length
        const totalCount = result.data.totalFiles
        toast.success(`${successCount} von ${totalCount} Dateien erfolgreich verarbeitet!`)
      } else {
        throw new Error(result.error?.message || 'Unbekannter Fehler')
      }
    } catch (error) {
      console.error('ZIP processing error:', error)
      setError(error instanceof Error ? error.message : 'ZIP-Verarbeitung fehlgeschlagen')
      toast.error('Fehler bei der ZIP-Verarbeitung')
    } finally {
      setIsProcessing(false)
      setCurrentStatus('')
      setCurrentFile('')
    }
  }

  const onDropAccepted = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    setUploadedFile(file)
    setProcessResult(null)
    setError(null)
    
    toast.success(`ZIP-Datei hochgeladen - bereit zur Verarbeitung!`)
  }, [])

  const onDropRejected = useCallback((rejectedFiles: any[]) => {
    rejectedFiles.forEach((rejection) => {
      const { file, errors } = rejection
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`${file.name} ist zu groß (max. 200MB)`)
        } else if (error.code === 'file-invalid-type') {
          toast.error(`${file.name} ist keine ZIP-Datei`)
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
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    maxSize: 200 * 1024 * 1024, // 200MB max
    multiple: false,
    disabled: isProcessing,
  })

  const downloadFile = async (processedFile: ProcessedFileResult) => {
    try {
      const fullUrl = `http://localhost:8000${processedFile.processedUrl}`
      
      const response = await fetch(fullUrl)
      if (!response.ok) {
        throw new Error('Download fehlgeschlagen')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      
      const extension = processedFile.fileType === 'video' ? '.mp4' : 
                       processedFile.fileType === 'image' ? '.jpg' : '.pdf'
      
      link.download = `watermarked_${processedFile.originalName.replace(/\.[^/.]+$/, "")}${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)
      toast.success(`${processedFile.originalName} heruntergeladen!`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Fehler beim Herunterladen der Datei')
    }
  }

  const downloadAllFiles = async () => {
    if (!processResult) return
    
    for (const file of processResult.processedFiles) {
      await downloadFile(file)
      // Kleine Pause zwischen Downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const resetUpload = () => {
    setUploadedFile(null)
    setProcessResult(null)
    setProgress(0)
    setError(null)
    setCurrentStatus('')
    setCurrentFile('')
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
            'border-gray-300 bg-white': !isDragActive && !uploadedFile,
            'border-green-500 bg-green-50': uploadedFile && !isProcessing,
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
              <p className="text-lg font-medium text-primary-700">
                ZIP-Datei wird verarbeitet...
              </p>
              <p className="text-sm text-primary-600 mt-1">{currentStatus}</p>
              {currentFile && (
                <p className="text-xs text-primary-500 mt-1">Aktuelle Datei: {currentFile}</p>
              )}
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
          ) : uploadedFile ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <ArchiveBoxIcon className="w-16 h-16 text-purple-500 mb-4" />
              <p className="text-lg font-medium text-green-700">
                ZIP-Datei bereit!
              </p>
              <p className="text-sm text-green-600 mt-1">{uploadedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</p>
              
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    processZipFile(uploadedFile)
                  }}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  ZIP verarbeiten
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    resetUpload()
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Neue ZIP-Datei
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
              <ArchiveBoxIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {isDragActive
                  ? isDragReject
                    ? 'Ungültiges Dateiformat'
                    : 'ZIP-Datei hier ablegen'
                  : 'ZIP-Datei hochladen'}
              </h3>
              <p className="text-gray-500 mb-4">
                {isDragActive
                  ? isDragReject
                    ? 'Nur ZIP-Dateien werden akzeptiert'
                    : 'Lassen Sie die ZIP-Datei los, um sie hochzuladen'
                  : 'Ziehen Sie eine ZIP-Datei hierher oder klicken Sie zum Auswählen'}
              </p>
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Unterstützte Dateien in ZIP:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <PhotoIcon className="w-4 h-4 text-green-500" />
                    <span>Bilder (JPG, PNG, WebP)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <PlayIcon className="w-4 h-4 text-blue-500" />
                    <span>Videos (MP4, AVI, MOV)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DocumentIcon className="w-4 h-4 text-red-500" />
                    <span>PDFs</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Maximale Dateigröße: 200MB
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
              <p className="text-red-700 font-medium">Fehler bei der ZIP-Verarbeitung</p>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Results */}
      <AnimatePresence>
        {processResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-4"
          >
            {/* Summary */}
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-green-800">
                    ZIP-Verarbeitung abgeschlossen!
                  </h3>
                  <p className="text-green-600 text-sm mt-1">
                    {processResult.processedFiles.length} von {processResult.totalFiles} Dateien erfolgreich verarbeitet
                  </p>
                  <p className="text-green-600 text-sm">
                    Verarbeitungszeit: {processResult.processingTime.toFixed(1)}s
                  </p>
                </div>
                {processResult.processedFiles.length > 0 && (
                  <button
                    onClick={downloadAllFiles}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>Alle herunterladen</span>
                  </button>
                )}
              </div>
            </div>

            {/* Processed Files */}
            {processResult.processedFiles.length > 0 && (
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h4 className="text-md font-medium text-gray-800 mb-3">
                  Erfolgreich verarbeitete Dateien:
                </h4>
                <div className="space-y-2">
                  {processResult.processedFiles.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.fileType)}
                        <div>
                          <p className="text-sm font-medium text-gray-700">{file.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {getFileTypeLabel(file.fileType)} • {file.processingTime.toFixed(1)}s
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        <button
                          onClick={() => downloadFile(file)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped Files */}
            {processResult.skippedFiles.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-md font-medium text-yellow-800 mb-3">
                  Übersprungene Dateien:
                </h4>
                <div className="space-y-1">
                  {processResult.skippedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-yellow-700">
                      <XMarkIcon className="w-4 h-4" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ZipDropZone