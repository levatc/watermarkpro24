import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudArrowUpIcon, DocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { formatFileSize, isImageFile, isVideoFile, isArchiveFile } from '@/utils'
import toast from 'react-hot-toast'

interface DropZoneProps {
  onUpload?: (files: File[]) => Promise<void>
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
}

interface UploadingFile {
  file: File
  id: string
  status: 'uploading' | 'queued' | 'error'
  uploadId?: string
  jobId?: string
}

const DropZone: React.FC<DropZoneProps> = ({
  onUpload,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'],
    'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/x-7z-compressed': ['.7z'],
  },
  maxSize = 500 * 1024 * 1024, // 500MB
  multiple = true,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = async (file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Default watermark settings - in a real app, this would come from user input
    const watermarkSettings = {
      text: '© 2024 WatermarkPro',
      fontSize: 24,
      color: '#ffffff',
      position: 'bottom-right',
      opacity: 0.8
    }
    formData.append('watermark', JSON.stringify(watermarkSettings))

    // Determine endpoint based on file type
    const endpoint = isVideoFile(file.type) ? '/api/process-video' : '/api/process-file'
    
    const response = await fetch(`http://localhost:8000${endpoint}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Upload failed')
    }

    const result = await response.json()
    return result.data
  }

  const onDropAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      if (isUploading) return
      
      setIsUploading(true)
      
      // Add files to uploading state immediately
      const newUploadingFiles: UploadingFile[] = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'uploading'
      }))
      
      setUploadingFiles(newUploadingFiles)
      
      try {
        // Upload files in parallel
        const uploadPromises = acceptedFiles.map(async (file, index) => {
          try {
            const uploadResult = await uploadFile(file)
            
            // Update file status to queued
            setUploadingFiles(prev => prev.map(uf => 
              uf.file === file 
                ? { ...uf, status: 'queued', uploadId: uploadResult.uploadId, jobId: uploadResult.jobId }
                : uf
            ))
            
            return { file, success: true, uploadResult }
          } catch (error) {
            console.error(`Upload failed for ${file.name}:`, error)
            
            // Update file status to error
            setUploadingFiles(prev => prev.map(uf => 
              uf.file === file 
                ? { ...uf, status: 'error' }
                : uf
            ))
            
            toast.error(`Fehler beim Hochladen von ${file.name}`)
            return { file, success: false, error }
          }
        })
        
        const results = await Promise.all(uploadPromises)
        const successCount = results.filter(r => r.success).length
        
        if (successCount > 0) {
          toast.success(`${successCount} Datei(en) erfolgreich zur Verarbeitung hinzugefügt`)
          
          // Call onUpload if provided
          if (onUpload) {
            await onUpload(acceptedFiles)
          }
        }
        
        // Clear uploading files after 3 seconds
        setTimeout(() => {
          setUploadingFiles([])
        }, 3000)
        
      } catch (error) {
        console.error('Upload error:', error)
        toast.error('Fehler beim Hochladen der Dateien')
        setUploadingFiles([])
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, isUploading]
  )

  const onDropRejected = useCallback((rejectedFiles: any[]) => {
    rejectedFiles.forEach((rejection) => {
      const { file, errors } = rejection
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`${file.name} ist zu groß (max. ${formatFileSize(maxSize)})`)
        } else if (error.code === 'file-invalid-type') {
          toast.error(`${file.name} hat ein ungültiges Dateiformat`)
        } else {
          toast.error(`Fehler bei ${file.name}: ${error.message}`)
        }
      })
    })
  }, [maxSize])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDropAccepted,
    onDropRejected,
    accept,
    maxSize,
    multiple,
    disabled: false, // Allow multiple uploads
  })

  const getFileIcon = (file: File) => {
    if (isImageFile(file.type)) return '🖼️'
    if (isVideoFile(file.type)) return '🎥'
    if (isArchiveFile(file.type)) return '📦'
    return '📄'
  }

  const getFileTypeLabel = (file: File) => {
    if (isImageFile(file.type)) return 'Bild'
    if (isVideoFile(file.type)) return 'Video'
    if (isArchiveFile(file.type)) return 'Archiv'
    return 'Datei'
  }

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      case 'queued':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'error':
        return <div className="w-5 h-5 text-red-500">❌</div>
      default:
        return null
    }
  }

  const getStatusText = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading': return 'Wird hochgeladen...'
      case 'queued': return 'Zur Verarbeitung hinzugefügt'
      case 'error': return 'Fehler beim Upload'
      default: return ''
    }
  }

  return (
    <div className="w-full">
      <motion.div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
          'hover:border-primary-400 hover:bg-primary-50/30',
          {
            'border-primary-500 bg-primary-50 scale-105': isDragActive && !isDragReject,
            'border-red-500 bg-red-50': isDragReject,
            'border-gray-300 bg-white': !isDragActive,
          }
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
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
                  ? 'Ungültige Dateien'
                  : 'Dateien hier ablegen'
                : 'Dateien hochladen'}
            </h3>
            <p className="text-gray-500 mb-4">
              {isDragActive
                ? isDragReject
                  ? 'Diese Dateien werden nicht unterstützt'
                  : 'Lassen Sie die Dateien los, um sie hochzuladen'
                : 'Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen'}
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
              <span className="bg-gray-100 px-2 py-1 rounded">Bilder (JPG, PNG, WebP)</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Videos (MP4, AVI, MOV)</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Archive (ZIP, RAR, 7Z)</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Maximale Dateigröße: {formatFileSize(maxSize)}
            </p>
            {uploadingFiles.length > 0 && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                ✨ Weitere Dateien können jederzeit hinzugefügt werden
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-3">Upload-Status:</h4>
            <div className="space-y-2">
              {uploadingFiles.map((uploadingFile, index) => (
                <motion.div
                  key={uploadingFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getFileIcon(uploadingFile.file)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{uploadingFile.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {getFileTypeLabel(uploadingFile.file)} • {formatFileSize(uploadingFile.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(uploadingFile.status)}
                    <span className="text-xs text-gray-600">{getStatusText(uploadingFile.status)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            {uploadingFiles.some(f => f.status === 'queued') && (
              <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-700">
                  📊 Dateien werden im Hintergrund verarbeitet. Sie können weitere Dateien hochladen!
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DropZone 