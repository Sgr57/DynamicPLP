import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSessionStats } from '../db/trackingRepo'

export default function AIReasoningPanel({ isAnalyzing, lastReasoning, aiEnabled, onToggleAI }) {
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState({ total: 0, unanalyzed: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getSessionStats())
    }, 3000)
    setStats(getSessionStats())
    return () => clearInterval(interval)
  }, [])

  const statusLabel = !aiEnabled
    ? 'Disattivata'
    : isAnalyzing
      ? 'Analisi in corso...'
      : lastReasoning
        ? 'Personalizzato'
        : 'In attesa'

  const statusColor = !aiEnabled
    ? 'text-gray-400'
    : isAnalyzing
      ? 'text-purple-500'
      : lastReasoning
        ? 'text-indigo-600'
        : 'text-gray-400'

  return (
    <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-indigo-100">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isAnalyzing ? 'animate-pulse' : ''} ${aiEnabled ? 'text-indigo-500' : 'text-gray-400'}`}>
              &#10022;
            </span>
            <span className={`text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            {lastReasoning && aiEnabled && !isOpen && (
              <span className="text-xs text-gray-400 max-w-xs truncate hidden sm:inline">
                — {lastReasoning}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastReasoning && aiEnabled && (
              <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                AI Pick
              </span>
            )}
            <span className="text-xs text-gray-400">
              {isOpen ? '\u25B2' : '\u25BC'}
            </span>
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pb-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Eventi tracciati: <strong className="text-gray-700">{stats.total}</strong></span>
                    <span>Non analizzati: <strong className="text-gray-700">{stats.unanalyzed}</strong></span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">AI</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={aiEnabled}
                        onChange={onToggleAI}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-gray-300 rounded-full peer-checked:bg-indigo-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                    </div>
                  </label>
                </div>

                {lastReasoning && aiEnabled && (
                  <div className="bg-white/60 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed">
                    {lastReasoning}
                  </div>
                )}

                {!aiEnabled && (
                  <div className="text-xs text-gray-400 italic">
                    L&apos;AI &egrave; disattivata. I prodotti sono mostrati nell&apos;ordine predefinito.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
