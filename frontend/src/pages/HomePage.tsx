import React, { useState } from 'react'
import { motion } from 'framer-motion'
import WatermarkEditor from '../components/WatermarkEditor'
import FileDropZone from '../components/FileDropZone'

interface WatermarkSettings {
  text: string
  fontSize: number
  color: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}

const HomePage: React.FC = () => {
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>({
    text: '© 2024 WatermarkPro',
    fontSize: 24,
    color: '#ffffff',
    position: 'bottom-right',
    opacity: 0.8
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.h1
          className="text-3xl font-bold text-gray-900"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Universelles Wasserzeichen Tool
        </motion.h1>
        <motion.p
          className="mt-2 text-lg text-gray-600"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Definieren Sie Ihr Text-Wasserzeichen und fügen Sie es zu Videos, Bildern oder PDFs hinzu
        </motion.p>
      </div>

      {/* Watermark Editor */}
      <WatermarkEditor onSettingsChange={setWatermarkSettings} />

      {/* File Upload and Processing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <FileDropZone watermarkSettings={watermarkSettings} />
      </motion.div>
    </div>
  )
}

export default HomePage 