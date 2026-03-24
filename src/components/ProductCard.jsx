import { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import ColorSwatch from './ColorSwatch'
import ColoredShoeIcon from './ColoredShoeIcon'
import { CATEGORY_ICON_MAP } from './icons'
import { createPLPTracker, createScrollObserver } from '../tracking/trackingEngine'

export default function ProductCard({ product, onCardClick }) {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0)
  const activeVariant = product.variants[activeVariantIndex]
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
    tracker.onClick()
    if (onCardClick) onCardClick(product)
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
            <ColoredShoeIcon primaryColor={hex} className="w-32 h-32">
              <Icon className="w-full h-full" />
            </ColoredShoeIcon>
          )
        })()}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
        <p className="font-bold text-indigo-600 mt-1">&euro;{product.price}</p>

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
