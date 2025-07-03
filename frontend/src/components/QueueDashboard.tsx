import React from 'react'
import { motion } from 'framer-motion'
import { QueueListIcon, ClockIcon } from '@heroicons/react/24/outline'

const QueueDashboard: React.FC = () => {
  const queueItems = [
    { id: 1, filename: 'vacation_photos.zip', type: 'archive', progress: 75, status: 'processing' },
    { id: 2, filename: 'product_shot.jpg', type: 'image', progress: 100, status: 'completed' },
    { id: 3, filename: 'demo_video.mp4', type: 'video', progress: 30, status: 'processing' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'archive': return '📦'
      default: return '📄'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <QueueListIcon className="h-6 w-6 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Verarbeitungs-Queue</h2>
        </div>
      </div>
      
      <div className="p-6">
        {queueItems.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Keine aktiven Jobs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queueItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="text-2xl">{getTypeIcon(item.type)}</div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.filename}</p>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-primary-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">{item.progress}%</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                    {item.status === 'processing' ? 'Verarbeitung' : 
                     item.status === 'completed' ? 'Fertig' :
                     item.status === 'pending' ? 'Wartend' : 'Fehler'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default QueueDashboard 