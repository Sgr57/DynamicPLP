import { motion } from 'framer-motion'
import { MODEL_LABEL } from '../data/modelConfig'

export default function ModelLoader({ progress, isOverlay, onSkip }) {
  const percentage = progress?.percentage || 0
  const text = progress?.text || 'Preparazione...'

  const content = (
    <div className="flex flex-col items-center gap-6 max-w-md w-full px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">DynamicPLP</h1>
        <p className="text-gray-300 text-sm">AI-Powered Product Experience</p>
      </div>

      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Download {MODEL_LABEL}...</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          </motion.div>
        </div>
        <p className="text-xs text-gray-500 mt-2 truncate">{text}</p>
      </div>

      {onSkip && (
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-white transition-colors underline"
        >
          {isOverlay ? 'Naviga mentre scarica' : 'Salta caricamento modello'}
        </button>
      )}
    </div>
  )

  if (isOverlay) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700 py-4"
      >
        <div className="flex justify-center">
          {content}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      {content}
    </div>
  )
}
