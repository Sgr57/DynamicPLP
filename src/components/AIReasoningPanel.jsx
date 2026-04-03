import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSessionStats } from '../db/trackingRepo'
import { aggregateAllStats } from '../ai/statsAggregator'
import { getWeights, getMemoryValue } from '../db/aiMemoryRepo'
import { MODEL_LABEL } from '../data/modelConfig'

const COLOR_HEX = {
  nero: '#1A1A1A', bianco: '#F5F5F5', rosso: '#E53E3E', grigio: '#6B7280',
  arancione: '#F97316', 'grigio chiaro': '#D1D5DB', verde: '#10B981',
  celeste: '#67E8F9', blu: '#3B82F6', rosa: '#EC4899', corallo: '#F87171',
  giallo: '#EAB308', 'blu scuro': '#1E3A5F', viola: '#8B5CF6', beige: '#D4A574',
  oliva: '#6B7C3F', marrone: '#92400E', 'verde scuro': '#065F46', cuoio: '#C68E5B',
  cammello: '#C19A6B', 'marrone chiaro': '#B8860B', bordeaux: '#7F1D1D', panna: '#FFF8E7',
}

function AffinityBars({ title, data, colorMode }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)), 1)

  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{title}</div>
      <div className="space-y-0.5">
        {entries.map(([key, val]) => {
          const pct = Math.min(Math.abs(val) / maxVal * 100, 100)
          const bg = colorMode ? (COLOR_HEX[key] || '#6366f1') : '#6366f1'
          const needsBorder = colorMode && ['bianco', 'panna', 'grigio chiaro', 'beige'].includes(key)
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 w-20 truncate text-right font-mono">{key}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-sm overflow-hidden relative">
                <div
                  className={`h-full rounded-sm transition-all duration-500 ${needsBorder ? 'border border-gray-300' : ''}`}
                  style={{ width: `${pct}%`, backgroundColor: bg, opacity: val < 0 ? 0.4 : 0.8 }}
                />
              </div>
              <span className="text-[10px] font-mono text-gray-600 w-10 text-right">
                {val > 0 ? '+' : ''}{Math.round(val * 10) / 10}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeightBars({ title, data, colorMode }) {
  if (!data || Object.keys(data).length === 0) return null
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{title}</div>
      <div className="space-y-0.5">
        {entries.map(([key, val]) => {
          const pct = Math.abs(val) * 50
          const isPositive = val >= 0
          const bg = colorMode ? (COLOR_HEX[key] || (isPositive ? '#6366f1' : '#ef4444')) : (isPositive ? '#6366f1' : '#ef4444')
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 w-20 truncate text-right font-mono">{key}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-sm overflow-hidden relative">
                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
                <div
                  className="h-full rounded-sm transition-all duration-500 absolute"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: bg,
                    opacity: 0.8,
                    ...(isPositive ? { left: '50%' } : { right: '50%' }),
                  }}
                />
              </div>
              <span className={`text-[10px] font-mono w-10 text-right ${isPositive ? 'text-indigo-600' : 'text-red-500'}`}>
                {val > 0 ? '+' : ''}{Math.round(val * 100) / 100}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AIReasoningPanel({ isAnalyzing, lastReasoning, aiEnabled, onToggleAI, onResetEvents }) {
  const [isOpen, setIsOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [stats, setStats] = useState({ total: 0, unanalyzed: 0 })
  const [affinity, setAffinity] = useState(null)
  const [weights, setWeights] = useState(null)
  const [userProfile, setUserProfile] = useState('')

  useEffect(() => {
    const update = () => {
      setStats(getSessionStats())
      if (debugOpen) {
        setAffinity(aggregateAllStats())
        setWeights(getWeights())
        setUserProfile(getMemoryValue('user_profile') || '')
      }
    }
    const interval = setInterval(update, 3000)
    update()
    return () => clearInterval(interval)
  }, [debugOpen])

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
            {aiEnabled && (
              <span className="text-[10px] text-gray-400 font-mono">
                {MODEL_LABEL}
              </span>
            )}
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
                    {stats.total > 0 && (
                      <button
                        onClick={onResetEvents}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Reset
                      </button>
                    )}
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

                {/* Debug toggle */}
                <button
                  onClick={() => setDebugOpen(!debugOpen)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {debugOpen ? '\u25B4 Nascondi debug' : '\u25BE Dettagli debug'}
                </button>

                <AnimatePresence>
                  {debugOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white/40 rounded-lg border border-gray-200/60 p-3 space-y-3">
                        {/* Affinities from interactions */}
                        {affinity && affinity.totalInteractions > 0 && (
                          <>
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                              Affinit&agrave; (dalle interazioni)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <AffinityBars title="Colori" data={affinity.colorAffinity} colorMode />
                              <AffinityBars title="Stili" data={affinity.styleAffinity} />
                              <AffinityBars title="Categorie" data={affinity.categoryAffinity} />
                            </div>
                          </>
                        )}

                        {/* LLM weights */}
                        {weights && (
                          <>
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pt-1 border-t border-gray-200/60">
                              Pesi LLM (-1.0 &rarr; +1.0)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <WeightBars title="Colori" data={weights.color_weights} colorMode />
                              <WeightBars title="Stili" data={weights.style_weights} />
                              <WeightBars title="Categorie" data={weights.category_weights} />
                            </div>
                          </>
                        )}

                        {/* User profile */}
                        {userProfile && (
                          <div className="pt-1 border-t border-gray-200/60">
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                              Profilo utente
                            </div>
                            <div className="text-[11px] text-gray-600 bg-white/60 rounded p-2 leading-relaxed font-mono">
                              {userProfile}
                            </div>
                          </div>
                        )}

                        {!affinity?.totalInteractions && !weights && (
                          <div className="text-[10px] text-gray-400 italic">
                            Nessun dato ancora. Interagisci con i prodotti per vedere le affinit&agrave;.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
