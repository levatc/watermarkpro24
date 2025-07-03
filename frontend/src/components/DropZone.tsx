import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudArrowUpIcon, DocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { formatFileSize, isImageFile, isVideoFile, isArchiveFile } from '@/utils'
import toast from 'react-hot-toast'

interface DropZoneProps {
  onUpload?: (files: File[]) => void
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDropAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true)
      setUploadedFiles(acceptedFiles)
      
      try {
        // Simuliere Upload-Prozess
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        onUpload?.(acceptedFiles)
        toast.success(`${acceptedFiles.length} Datei(en) erfolgreich hochgeladen`)
        
        // Reset nach 3 Sekunden
        setTimeout(() => {
          setUploadedFiles([])
        }, 3000)
      } catch (error) {
        toast.error('Fehler beim Hochladen der Dateien')
        setUploadedFiles([])
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload]
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
    disabled: isUploading,
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
            'cursor-not-allowed opacity-60': isUploading,
          }
        )}
        whileHover={!isUploading ? { scale: 1.02 } : undefined}
        whileTap={!isUploading ? { scale: 0.98 } : undefined}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-primary-700">Dateien werden hochgeladen...</p>
              <p className="text-sm text-primary-600 mt-1">Bitte warten Sie einen Moment</p>
            </motion.div>
          ) : uploadedFiles.length > 0 ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <CheckCircleIcon className="w-12 h-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-700">Upload erfolgreich!</p>
              <p className="text-sm text-green-600 mt-1">
                {uploadedFiles.length} Datei(en) verarbeitung wird gestartet
              </p>
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* File Preview */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && !isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-3">Hochgeladene Dateien:</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getFileIcon(file)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {getFileTypeLabel(file)} • {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DropZone 