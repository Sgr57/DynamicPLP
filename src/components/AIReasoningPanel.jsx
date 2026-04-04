import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSessionStats } from '../db/trackingRepo'
import { formatEvents } from '../ai/eventFormatter'
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

const SPARKLES = [
  { left: '5%', delay: '0s', size: 12, opacity: 0.9 },
  { left: '14%', delay: '0.5s', size: 9, opacity: 0.7 },
  { left: '26%', delay: '1.1s', size: 14, opacity: 0.85 },
  { left: '38%', delay: '0.2s', size: 10, opacity: 0.7 },
  { left: '48%', delay: '0.8s', size: 13, opacity: 0.8 },
  { left: '60%', delay: '1.5s', size: 11, opacity: 0.75 },
  { left: '72%', delay: '0.4s', size: 8, opacity: 0.65 },
  { left: '82%', delay: '1.0s', size: 14, opacity: 0.85 },
  { left: '92%', delay: '1.7s', size: 10, opacity: 0.7 },
  { left: '18%', delay: '1.3s', size: 12, opacity: 0.75 },
  { left: '55%', delay: '0.7s', size: 11, opacity: 0.8 },
  { left: '35%', delay: '1.9s', size: 9, opacity: 0.7 },
]

function SparkleLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="absolute bottom-0.5"
          style={{
            left: s.left,
            fontSize: `${s.size}px`,
            color: `rgba(167,139,250,${s.opacity})`,
            filter: 'drop-shadow(0 0 3px rgba(167,139,250,0.8))',
            animation: `sparkle-rise 2s ease-out ${s.delay} infinite`,
          }}
        >
          &#10022;
        </span>
      ))}
    </div>
  )
}

export default function AIReasoningPanel({ isAnalyzing, lastMessage, aiEnabled, onToggleAI, onResetEvents }) {
  const [isOpen, setIsOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [stats, setStats] = useState({ total: 0, unanalyzed: 0 })
  const [eventsText, setEventsText] = useState('')
  const [weights, setWeights] = useState(null)
  const [userProfile, setUserProfile] = useState('')
  const [confidence, setConfidence] = useState(null)
  const [intent, setIntent] = useState('')

  useEffect(() => {
    const update = () => {
      setStats(getSessionStats())
      if (debugOpen) {
        const { text } = formatEvents()
        setEventsText(text)
        setWeights(getWeights())
        setUserProfile(getMemoryValue('user_profile') || '')
        setConfidence(getMemoryValue('confidence'))
        setIntent(getMemoryValue('intent') || '')
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
      : lastMessage
        ? 'Personalizzato'
        : 'In attesa'

  const statusColor = !aiEnabled
    ? 'text-gray-400'
    : isAnalyzing
      ? 'text-purple-500'
      : lastMessage
        ? 'text-indigo-600'
        : 'text-gray-400'

  return (
    <div className={`relative border-b transition-colors duration-500 ${
      isAnalyzing
        ? 'border-purple-200/60'
        : 'border-indigo-100'
    }`}>
      {/* Aurora background */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isAnalyzing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(270deg, rgba(99,102,241,0.08), rgba(139,92,246,0.12), rgba(168,85,247,0.08), rgba(192,132,252,0.1), rgba(139,92,246,0.12), rgba(99,102,241,0.08))',
          backgroundSize: '300% 100%',
          animation: isAnalyzing ? 'aurora 4s ease-in-out infinite' : 'none',
        }}
      />
      {/* Static background when not analyzing */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 transition-opacity duration-700 ${
          isAnalyzing ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {/* Border sweep */}
      {isAnalyzing && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.6), rgba(233,213,255,0.8), rgba(196,181,253,0.6), transparent)',
            backgroundSize: '200% 100%',
            animation: 'border-sweep 2.5s linear infinite',
          }}
        />
      )}
      {/* Sparkles */}
      {isAnalyzing && <SparkleLayer />}

      <div className="relative max-w-7xl mx-auto px-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex flex-col gap-1 py-3 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm ${aiEnabled ? 'text-indigo-500' : 'text-gray-400'}`}
                style={isAnalyzing ? { animation: 'star-glow 1.8s ease-in-out infinite' } : undefined}
              >
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
            </div>
            <span className="text-xs text-gray-400">
              {isOpen ? '\u25B2' : '\u25BC'}
            </span>
          </div>
          {lastMessage && aiEnabled && !isOpen && (
            <p className="text-xs text-gray-500 line-clamp-4 pl-5">
              {lastMessage}
            </p>
          )}
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

                {lastMessage && aiEnabled && (
                  <div className="bg-white/60 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed">
                    {lastMessage}
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
                        {/* Event log */}
                        {eventsText && (
                          <>
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                              Interazioni ({stats.total} eventi)
                            </div>
                            <pre className="text-[10px] text-gray-600 bg-white/60 rounded p-2 leading-relaxed font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                              {eventsText}
                            </pre>
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

                        {/* AI State: confidence + intent */}
                        {(confidence != null || intent) && (
                          <div className="pt-1 border-t border-gray-200/60">
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                              Stato AI
                            </div>
                            <div className="flex gap-4 text-[11px] font-mono text-gray-600">
                              {confidence != null && (
                                <span>Confidence: <strong className="text-indigo-600">{Math.round(confidence * 100)}%</strong></span>
                              )}
                              {intent && (
                                <span>Intent: <strong className="text-indigo-600">{intent}</strong></span>
                              )}
                            </div>
                          </div>
                        )}

                        {!eventsText && !weights && (
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
