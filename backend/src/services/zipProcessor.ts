import yauzl from 'yauzl'
import path from 'path'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'
import { fileProcessor } from './fileProcessor'
import { videoProcessor } from './videoProcessor'

interface WatermarkSettings {
  type: 'text' | 'image'
  text: string
  fontSize: number
  color: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

interface ExtractedFile {
  filename: string
  path: string
  type: 'image' | 'video' | 'pdf'
  size: number
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
  success: boolean
  totalFiles: number
  processedFiles: ProcessedFileResult[]
  skippedFiles: string[]
  processingTime: number
  error?: string
}

export class ZipProcessor {
  private readonly tempDir: string
  private readonly outputDir: string

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'zip')
    this.outputDir = path.join(process.cwd(), 'output')
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.tempDir)
    await fs.ensureDir(this.outputDir)
  }

  private getFileType(filename: string): 'image' | 'video' | 'pdf' | 'unsupported' {
    const ext = path.extname(filename).toLowerCase()
    
    // Bild-Formate
    if (['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'].includes(ext)) {
      return 'image'
    }
    
    // Video-Formate
    if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'].includes(ext)) {
      return 'video'
    }
    
    // PDF-Formate
    if (ext === '.pdf') {
      return 'pdf'
    }
    
    return 'unsupported'
  }

  private isFileTypeSupported(type: string): type is 'image' | 'video' | 'pdf' {
    return type === 'image' || type === 'video' || type === 'pdf'
  }

  private async extractZip(zipPath: string): Promise<ExtractedFile[]> {
    return new Promise((resolve, reject) => {
      const extractedFiles: ExtractedFile[] = []
      const extractDir = path.join(this.tempDir, nanoid())

      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(new Error(`ZIP-Datei konnte nicht geöffnet werden: ${err.message}`))
          return
        }

        if (!zipfile) {
          reject(new Error('ZIP-Datei ist ungültig'))
          return
        }

        zipfile.readEntry()

        zipfile.on('entry', async (entry) => {
          // Überspringe Verzeichnisse und versteckte Dateien
          if (/\/$/.test(entry.fileName) || entry.fileName.startsWith('.')) {
            zipfile.readEntry()
            return
          }

          // Überspringe __MACOSX und andere System-Dateien
          if (entry.fileName.includes('__MACOSX') || entry.fileName.includes('.DS_Store')) {
            zipfile.readEntry()
            return
          }

          const fileType = this.getFileType(entry.fileName)
          
          // Nur unterstützte Dateitypen extrahieren
          if (this.isFileTypeSupported(fileType)) {
            const outputPath = path.join(extractDir, path.basename(entry.fileName))
            
            try {
              await fs.ensureDir(path.dirname(outputPath))
              
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  console.warn(`Fehler beim Lesen der Datei ${entry.fileName}:`, err)
                  zipfile.readEntry()
                  return
                }

                if (!readStream) {
                  console.warn(`Kein ReadStream für Datei ${entry.fileName}`)
                  zipfile.readEntry()
                  return
                }

                const writeStream = fs.createWriteStream(outputPath)
                
                writeStream.on('error', (err) => {
                  console.warn(`Fehler beim Schreiben der Datei ${entry.fileName}:`, err)
                  zipfile.readEntry()
                })

                writeStream.on('close', () => {
                  extractedFiles.push({
                    filename: entry.fileName,
                    path: outputPath,
                    type: fileType,
                    size: entry.uncompressedSize
                  })
                  zipfile.readEntry()
                })

                readStream.pipe(writeStream)
              })
            } catch (error) {
              console.warn(`Fehler beim Erstellen des Ausgabepfads für ${entry.fileName}:`, error)
              zipfile.readEntry()
            }
          } else {
            zipfile.readEntry()
          }
        })

        zipfile.on('end', () => {
          resolve(extractedFiles)
        })

        zipfile.on('error', (err) => {
          reject(new Error(`ZIP-Verarbeitungsfehler: ${err.message}`))
        })
      })
    })
  }

  private async processExtractedFile(
    extractedFile: ExtractedFile,
    watermarkSettings: WatermarkSettings,
    onProgress?: (filename: string, progress: number) => void
  ): Promise<ProcessedFileResult> {
    const startTime = Date.now()

    try {
      let result
      
      if (extractedFile.type === 'video') {
        result = await videoProcessor.processVideo(
          extractedFile.path,
          watermarkSettings,
          (progress) => onProgress?.(extractedFile.filename, progress)
        )
      } else {
        // Für Bilder und PDFs
        result = await fileProcessor.processFile(
          extractedFile.path,
          extractedFile.type,
          watermarkSettings,
          (progress) => onProgress?.(extractedFile.filename, progress)
        )
      }

      const processingTime = (Date.now() - startTime) / 1000

      if (result.success && result.outputPath) {
        return {
          originalName: extractedFile.filename,
          processedUrl: fileProcessor.getOutputUrl(result.outputPath),
          fileType: extractedFile.type,
          processingTime,
          success: true
        }
      } else {
        return {
          originalName: extractedFile.filename,
          processedUrl: '',
          fileType: extractedFile.type,
          processingTime,
          success: false,
          error: result.error || 'Unbekannter Verarbeitungsfehler'
        }
      }
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000
      return {
        originalName: extractedFile.filename,
        processedUrl: '',
        fileType: extractedFile.type,
        processingTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      }
    } finally {
      // Cleanup extrahierte Datei
      try {
        await fs.unlink(extractedFile.path)
      } catch (error) {
        console.warn(`Fehler beim Löschen der temporären Datei ${extractedFile.path}:`, error)
      }
    }
  }

  async processZip(
    zipPath: string,
    watermarkSettings: WatermarkSettings,
    onProgress?: (status: string, currentFile?: string, fileProgress?: number) => void
  ): Promise<ZipProcessResult> {
    const startTime = Date.now()

    try {
      onProgress?.('ZIP-Datei wird entpackt...')
      
      // ZIP entpacken
      const extractedFiles = await this.extractZip(zipPath)
      
      if (extractedFiles.length === 0) {
        return {
          success: false,
          totalFiles: 0,
          processedFiles: [],
          skippedFiles: [],
          processingTime: (Date.now() - startTime) / 1000,
          error: 'Keine unterstützten Dateien in der ZIP-Datei gefunden'
        }
      }

      onProgress?.(`${extractedFiles.length} Dateien extrahiert, Verarbeitung startet...`)

      const processedFiles: ProcessedFileResult[] = []
      const skippedFiles: string[] = []

      // Dateien nacheinander verarbeiten
      for (let i = 0; i < extractedFiles.length; i++) {
        const file = extractedFiles[i]
        
        onProgress?.(
          `Verarbeite Datei ${i + 1}/${extractedFiles.length}`,
          file.filename,
          0
        )

        try {
          const result = await this.processExtractedFile(
            file,
            watermarkSettings,
            (filename, progress) => {
              onProgress?.(
                `Verarbeite Datei ${i + 1}/${extractedFiles.length}`,
                filename,
                progress
              )
            }
          )

          if (result.success) {
            processedFiles.push(result)
          } else {
            skippedFiles.push(`${file.filename}: ${result.error}`)
          }
        } catch (error) {
          skippedFiles.push(`${file.filename}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
        }
      }

      // Cleanup temp directory
      try {
        const extractDir = path.dirname(extractedFiles[0]?.path || '')
        if (extractDir && extractDir !== this.tempDir) {
          await fs.remove(extractDir)
        }
      } catch (error) {
        console.warn('Fehler beim Cleanup des temporären Verzeichnisses:', error)
      }

      const processingTime = (Date.now() - startTime) / 1000

      return {
        success: true,
        totalFiles: extractedFiles.length,
        processedFiles,
        skippedFiles,
        processingTime
      }

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000
      
      return {
        success: false,
        totalFiles: 0,
        processedFiles: [],
        skippedFiles: [],
        processingTime,
        error: error instanceof Error ? error.message : 'Unbekannter ZIP-Verarbeitungsfehler'
      }
    } finally {
      // Cleanup ZIP-Datei
      try {
        await fs.unlink(zipPath)
      } catch (error) {
        console.warn(`Fehler beim Löschen der ZIP-Datei ${zipPath}:`, error)
      }
    }
  }

  async saveUploadedZip(fileBuffer: Buffer, originalName: string): Promise<string> {
    const filename = `${nanoid()}_${originalName}`
    const filePath = path.join(this.tempDir, filename)
    
    await fs.writeFile(filePath, fileBuffer)
    return filePath
  }
}

export const zipProcessor = new ZipProcessor()