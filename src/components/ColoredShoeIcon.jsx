import { useId, useMemo } from 'react'
import { getPatternStyle } from './shoePatterns'
import { CATEGORY_SILHOUETTES } from './shoeSilhouettes'

function hexToLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r * 0.299 + g * 0.587 + b * 0.114
}

export default function ColoredShoeIcon({ primaryColor = '#6B7280', design = 'solid', category, className = 'w-32 h-32', children, ...props }) {
  const id = useId().replace(/:/g, '')
  const scopeClass = `shoe-icon-${id}`
  const silhouette = category ? CATEGORY_SILHOUETTES[category] : null

  const isDark = useMemo(() => hexToLuminance(primaryColor) < 128, [primaryColor])
  const patternColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'
  const blendMode = isDark ? 'screen' : 'multiply'
  const patternStyle = getPatternStyle(design, patternColor)

  return (
    <div className={`${scopeClass} ${className} relative`} style={{ '--icon-primary': primaryColor }} {...props}>
      <style>{`
        .${scopeClass} {
          --icon-dark: color-mix(in srgb, var(--icon-primary), black 30%);
          --icon-light: color-mix(in srgb, var(--icon-primary), white 40%);
        }
      `}</style>
      {children}
      {patternStyle && silhouette && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            ...patternStyle,
            mixBlendMode: blendMode,
            WebkitMaskImage: `url("${silhouette}")`,
            maskImage: `url("${silhouette}")`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      )}
    </div>
  )
}
