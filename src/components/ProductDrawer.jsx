import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ColoredShoeIcon from './ColoredShoeIcon'
import { CATEGORY_ICON_MAP } from './icons'
import { useDrawerTracker } from '../hooks/useDrawerTracker'

export default function ProductDrawer({ product, initialVariantIndex = 0, onClose }) {
  const [activeVariantIndex, setActiveVariantIndex] = useState(initialVariantIndex)
  const activeVariant = product.variants[activeVariantIndex]
  const hex = activeVariant?.hex || '#6B7280'

  const { onVariantHover, onVariantClick } = useDrawerTracker(product, true, initialVariantIndex)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleVariantClick(color, index) {
    onVariantClick(color)
    setActiveVariantIndex(index)
  }

  function handleVariantHover(color) {
    onVariantHover(color)
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black/50 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <motion.div
        className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white z-50 shadow-2xl overflow-y-auto"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">
            {product.name}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Chiudi"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image area */}
        <div className="aspect-square flex items-center justify-center bg-gray-50">
          {(() => {
            const Icon = CATEGORY_ICON_MAP[product.category] || CATEGORY_ICON_MAP.running
            return (
              <ColoredShoeIcon primaryColor={hex} design={product.design} category={product.category} className="w-48 h-48">
                <Icon className="w-full h-full" />
              </ColoredShoeIcon>
            )
          })()}
        </div>

        {/* Product info */}
        <div className="p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-gray-500">{product.brand}</p>
            <p className="text-sm text-gray-500 capitalize">{product.gender}</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-2">&euro;{product.price}</p>

          {/* Category */}
          <div className="mt-3">
            <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {product.category}
            </span>
          </div>

          {/* Styles */}
          {product.styles && product.styles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {product.styles.map((style) => (
                <span
                  key={style}
                  className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {style}
                </span>
              ))}
            </div>
          )}

          {/* Variants section */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Varianti colore</h3>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((v, i) => {
                const isActive = i === activeVariantIndex
                return (
                  <button
                    key={v.color}
                    onClick={() => handleVariantClick(v.color, i)}
                    onMouseEnter={() => handleVariantHover(v.color)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className="w-[30px] h-[30px] rounded-full flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: v.hex }}
                    />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.color}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            v.inStock === 1 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-xs text-gray-500">
                          {v.inStock === 1 ? 'In stock' : 'Esaurito'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
