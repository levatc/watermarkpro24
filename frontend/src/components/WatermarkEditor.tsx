import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface WatermarkSettings {
  type: 'text' | 'image'
  // Text watermark properties
  text?: string
  fontSize?: number
  color?: string
  // Image watermark properties
  imagePath?: string
  imageOpacity?: number
  imageScale?: number
  // Common properties
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

interface WatermarkEditorProps {
  onSettingsChange: (settings: WatermarkSettings) => void
}

const WatermarkEditor: React.FC<WatermarkEditorProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<WatermarkSettings>({
    type: 'text',
    text: '© 2024 WatermarkPro',
    fontSize: 24,
    color: '#ffffff',
    position: 'bottom-right',
    opacity: 0.8,
    imageOpacity: 0.8,
    imageScale: 1.0
  })

  const [uploadedImage, setUploadedImage] = useState<{
    file: File
    preview: string
    path?: string
  } | null>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateSettings = (newSettings: Partial<WatermarkSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    onSettingsChange(updated)
  }

  const positions = [
    { value: 'top-left', label: 'Oben Links' },
    { value: 'top-right', label: 'Oben Rechts' },
    { value: 'bottom-left', label: 'Unten Links' },
    { value: 'bottom-right', label: 'Unten Rechts' },
    { value: 'center', label: 'Mitte' },
  ]

  const handleImageUpload = async (file: File) => {
    setIsUploading(true)
    
    try {
      // Create preview
      const preview = URL.createObjectURL(file)
      
      // Upload to backend
      const formData = new FormData()
      formData.append('watermark', file)
      
      const response = await fetch('/api/upload-watermark', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        const imageData = {
          file,
          preview,
          path: result.data.imagePath
        }
        
        setUploadedImage(imageData)
        updateSettings({
          type: 'image',
          imagePath: result.data.imagePath
        })
      } else {
        console.error('Upload failed:', result.error)
        alert('Fehler beim Hochladen des Bildes: ' + result.error.message)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Fehler beim Hochladen des Bildes')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        alert('Ungültiges Bildformat. Unterstützt: JPEG, PNG, GIF, WebP')
        return
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        alert('Bild ist zu groß (max. 5MB)')
        return
      }
      
      handleImageUpload(file)
    }
  }

  const removeImage = () => {
    if (uploadedImage?.preview) {
      URL.revokeObjectURL(uploadedImage.preview)
    }
    setUploadedImage(null)
    updateSettings({ type: 'text', imagePath: undefined })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Wasserzeichen-Editor</h2>
      
      {/* Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Wasserzeichen-Typ
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="watermarkType"
              value="text"
              checked={settings.type === 'text'}
              onChange={(e) => updateSettings({ type: e.target.value as 'text' | 'image' })}
              className="mr-2 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Text</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="watermarkType"
              value="image"
              checked={settings.type === 'image'}
              onChange={(e) => updateSettings({ type: e.target.value as 'text' | 'image' })}
              className="mr-2 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Bild</span>
          </label>
        </div>
      </div>

      {/* Text Watermark Settings */}
      {settings.type === 'text' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Text Input */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wasserzeichen Text
            </label>
            <input
              type="text"
              value={settings.text || ''}
              onChange={(e) => updateSettings({ text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ihr Wasserzeichen Text..."
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schriftgröße: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="72"
              value={settings.fontSize || 24}
              onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <select
              value={settings.position}
              onChange={(e) => updateSettings({ position: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {positions.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {pos.label}
                </option>
              ))}
            </select>
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transparenz: {Math.round(settings.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.opacity}
              onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Image Watermark Settings */}
      {settings.type === 'image' && (
        <div className="mb-6">
          {/* Image Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wasserzeichen-Bild
            </label>
            
            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
              >
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm">
                    {isUploading ? 'Bild wird hochgeladen...' : 'Klicken Sie hier oder ziehen Sie ein Bild herein'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, GIF, WebP (max. 5MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={uploadedImage.preview} 
                  alt="Watermark Preview" 
                  className="max-w-xs max-h-32 object-contain border border-gray-300 rounded"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
                <p className="text-sm text-gray-600 mt-2">{uploadedImage.file.name}</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Image Settings */}
          {uploadedImage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={settings.position}
                  onChange={(e) => updateSettings({ position: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {positions.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Größe: {Math.round((settings.imageScale || 1.0) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="2.0"
                  step="0.1"
                  value={settings.imageScale || 1.0}
                  onChange={(e) => updateSettings({ imageScale: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Opacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transparenz: {Math.round((settings.imageOpacity || 0.8) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.imageOpacity || 0.8}
                  onChange={(e) => updateSettings({ imageOpacity: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Color and Preview for Text */}
      {settings.type === 'text' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Farbe
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={settings.color || '#ffffff'}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.color || '#ffffff'}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="text-right">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vorschau
            </label>
            <div 
              className="inline-block px-4 py-2 bg-black rounded"
              style={{
                color: settings.color || '#ffffff',
                fontSize: `${Math.min(settings.fontSize || 24, 20)}px`,
                opacity: settings.opacity
              }}
            >
              {settings.text || 'Beispieltext'}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default WatermarkEditor 