import { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import ColorSwatch from './ColorSwatch'
import ShoeIcon from './ShoeIcon'
import { createPLPTracker, createScrollObserver } from '../tracking/trackingEngine'

function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6
}

export default function ProductCard({ product, onCardClick }) {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0)
  const activeVariant = product.variants[activeVariantIndex]
  const hex = activeVariant?.hex || '#6B7280'
  const light = isLightColor(hex)
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
      <div
        className="aspect-[4/3] flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${hex}, ${hex}dd)`,
        }}
      >
        <ShoeIcon light={!light} />
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
