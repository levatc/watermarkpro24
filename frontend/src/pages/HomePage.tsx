import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArchiveBoxIcon, DocumentIcon } from '@heroicons/react/24/outline'
import WatermarkEditor from '../components/WatermarkEditor'
import FileDropZone from '../components/FileDropZone'
import ZipDropZone from '../components/ZipDropZone'
import { clsx } from 'clsx'

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

  const [activeTab, setActiveTab] = useState<'single' | 'zip'>('single')

  const tabs = [
    {
      id: 'single' as const,
      name: 'Einzelne Dateien',
      icon: DocumentIcon,
      description: 'Bilder, Videos oder PDFs einzeln verarbeiten'
    },
    {
      id: 'zip' as const,
      name: 'ZIP-Archive',
      icon: ArchiveBoxIcon,
      description: 'Mehrere Dateien gleichzeitig aus ZIP-Archiven verarbeiten'
    }
  ]

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
          Definieren Sie Ihr Text-Wasserzeichen und fügen Sie es zu Videos, Bildern, PDFs oder ZIP-Archiven hinzu
        </motion.p>
      </div>

      {/* Watermark Editor */}
      <WatermarkEditor onSettingsChange={setWatermarkSettings} />

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className={clsx(
                    'mr-2 h-5 w-5',
                    activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  )} />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs font-normal text-gray-400">{tab.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </motion.div>

      {/* File Upload and Processing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {activeTab === 'single' ? (
          <FileDropZone watermarkSettings={watermarkSettings} />
        ) : (
          <ZipDropZone watermarkSettings={watermarkSettings} />
        )}
      </motion.div>
    </div>
  )
}

export default HomePage 