import React from 'react'
import { motion } from 'framer-motion'

const StatsCards: React.FC = () => {
  const stats = [
    { label: 'Verarbeitete Dateien', value: '1,247', change: '+12%', color: 'text-blue-600' },
    { label: 'Aktive Jobs', value: '5', change: '+2', color: 'text-green-600' },
    { label: 'Erfolgsrate', value: '98.7%', change: '+0.3%', color: 'text-emerald-600' },
    { label: 'Avg. Zeit', value: '46s', change: '-8s', color: 'text-purple-600' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`text-sm font-medium ${stat.color}`}>
              {stat.change}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default StatsCards 