import { useRef, useCallback } from 'react'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const SWATCH_HOVER_MIN = TRACKING_CONFIG.plp.swatchHover.minDurationMs

export default function ColorSwatch({ hex, isActive, onClick, onHover }) {
  const hoverTimer = useRef(null)

  const handleMouseEnter = useCallback(() => {
    if (!onHover) return
    hoverTimer.current = setTimeout(() => {
      onHover()
    }, SWATCH_HOVER_MIN)
  }, [onHover])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }, [])

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
        isActive ? 'border-gray-900 ring-2 ring-gray-400' : 'border-gray-300'
      }`}
      style={{ backgroundColor: hex }}
      aria-label={`Seleziona colore`}
    />
  )
}
