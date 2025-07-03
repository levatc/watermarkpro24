import React from 'react'
import { motion } from 'framer-motion'
import DropZone from '../components/DropZone'
import QueueDashboard from '../components/QueueDashboard'

const HomePage: React.FC = () => {
  const handleUpload = async (files: File[]) => {
    console.log('Files uploaded to queue:', files)
    // Files are automatically processed by the queue system
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 WatermarkPro
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Füge professionelle Wasserzeichen zu deinen Bildern und Videos hinzu. 
            Lade mehrere Dateien hoch und verfolge den Fortschritt in Echtzeit!
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                📤 Dateien hochladen
              </h2>
              <p className="text-gray-600 mb-6">
                Ziehe deine Dateien hierher oder klicke zum Auswählen. 
                Die Verarbeitung startet automatisch im Hintergrund.
              </p>
              <DropZone onUpload={handleUpload} />
            </div>
          </motion.div>

          {/* Queue Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <QueueDashboard />
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ✨ Features
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Sofortiger Upload
              </h3>
              <p className="text-gray-600">
                Dateien werden sofort hochgeladen und zur Verarbeitung hinzugefügt. 
                Keine Wartezeit!
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Hintergrund-Verarbeitung
              </h3>
              <p className="text-gray-600">
                Jobs werden im Hintergrund nacheinander abgearbeitet. 
                Du kannst weitere Dateien hochladen!
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Echtzeit-Status
              </h3>
              <p className="text-gray-600">
                Verfolge den Fortschritt deiner Uploads mit Prozentanzeige 
                und animierten Updates.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 bg-blue-50 rounded-lg border border-blue-200 p-8"
        >
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            🎯 Wie es funktioniert
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Dateien auswählen</h3>
              <p className="text-blue-700 text-sm">
                Ziehe Bilder oder Videos in die Upload-Zone
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Automatischer Upload</h3>
              <p className="text-blue-700 text-sm">
                Dateien werden sofort zur Queue hinzugefügt
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Verarbeitung</h3>
              <p className="text-blue-700 text-sm">
                Wasserzeichen werden im Hintergrund hinzugefügt
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Download</h3>
              <p className="text-blue-700 text-sm">
                Lade die bearbeiteten Dateien herunter
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default HomePage 