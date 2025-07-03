import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface WatermarkSettings {
  text: string
  fontSize: number
  color: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

interface WatermarkEditorProps {
  onSettingsChange: (settings: WatermarkSettings) => void
}

const WatermarkEditor: React.FC<WatermarkEditorProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<WatermarkSettings>({
    text: '© 2024 WatermarkPro',
    fontSize: 24,
    color: '#ffffff',
    position: 'bottom-right',
    opacity: 0.8
  })

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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Text-Wasserzeichen</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Text Input */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wasserzeichen Text
          </label>
          <input
            type="text"
            value={settings.text}
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
            value={settings.fontSize}
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

      {/* Color and Preview */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farbe
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => updateSettings({ color: e.target.value })}
                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.color}
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
              color: settings.color,
              fontSize: `${Math.min(settings.fontSize, 20)}px`,
              opacity: settings.opacity
            }}
          >
            {settings.text || 'Beispieltext'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default WatermarkEditor 