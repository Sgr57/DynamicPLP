import { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import ColorSwatch from './ColorSwatch'
import ColoredShoeIcon from './ColoredShoeIcon'
import { CATEGORY_ICON_MAP } from './icons'
import { createPLPTracker, createScrollObserver } from '../tracking/trackingEngine'

export default function ProductCard({ product, onCardClick, preferredColors }) {
  const bestVariantIndex = useMemo(() => {
    if (!preferredColors || preferredColors.length === 0) return 0
    for (const color of preferredColors) {
      const idx = product.variants.findIndex(v => v.color === color)
      if (idx !== -1) return idx
    }
    return 0
  }, [preferredColors, product.variants])

  const [activeVariantIndex, setActiveVariantIndex] = useState(bestVariantIndex)
  const activeVariant = product.variants[activeVariantIndex]

  useEffect(() => {
    setActiveVariantIndex(bestVariantIndex)
  }, [bestVariantIndex])
  const hex = activeVariant?.hex || '#6B7280'
  const cardRef = useRef(null)

  const tracker = useMemo(
    () => createPLPTracker(product.id, product.variants),
    [product.id]
  )

  // IntersectionObserver for scrollSkip detection
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    return createScrollObserver(product.id, el)
  }, [product.id])

  function handleCardClick() {
    tracker.onClick(activeVariant.color)
    if (onCardClick) onCardClick(product, activeVariantIndex)
  }

  function handleSwatchClick(color, index) {
    tracker.onSwatchClick(color)
    setActiveVariantIndex(index)
  }

  function handleSwatchHover(color) {
    tracker.onSwatchHover(color)
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onMouseEnter={tracker.onMouseEnter}
      onMouseLeave={tracker.onMouseLeave}
      onClick={handleCardClick}
    >
      <div className="aspect-[4/3] flex items-center justify-center bg-gray-50">
        {(() => {
          const Icon = CATEGORY_ICON_MAP[product.category] || CATEGORY_ICON_MAP.running
          return (
            <ColoredShoeIcon primaryColor={hex} design={product.design} category={product.category} className="w-32 h-32">
              <Icon className="w-full h-full" />
            </ColoredShoeIcon>
          )
        })()}
      </div>

      <div className="p-3">
        <div className="flex justify-between items-baseline">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
          <span className="font-bold text-indigo-600 text-sm">&euro;{product.price}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>

        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{product.category}</span>
          {product.styles.map(s => (
            <span key={s} className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{s}</span>
          ))}
        </div>

        <div className="flex gap-1.5 mt-2">
          {product.variants.map((v, i) => (
            <ColorSwatch
              key={v.color}
              hex={v.hex}
              isActive={i === activeVariantIndex}
              onClick={(e) => {
                e.stopPropagation()
                handleSwatchClick(v.color, i)
              }}
              onHover={() => handleSwatchHover(v.color)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
