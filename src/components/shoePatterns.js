/**
 * CSS pattern styles for visual product differentiation.
 * Each pattern is a function that accepts a color string (rgba)
 * so patterns adapt to light/dark shoe colors.
 */

const PATTERNS = {
  stripe: (c) => ({
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${c} 4px, ${c} 6px)`,
  }),

  dots: (c) => ({
    backgroundImage: `radial-gradient(circle, ${c} 1.5px, transparent 1.5px)`,
    backgroundSize: '8px 8px',
  }),

  mesh: (c) => ({
    backgroundImage: [
      `repeating-linear-gradient(0deg, transparent, transparent 5px, ${c} 5px, ${c} 6px)`,
      `repeating-linear-gradient(90deg, transparent, transparent 5px, ${c} 5px, ${c} 6px)`,
    ].join(', '),
  }),

  zigzag: (c) => ({
    backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 4px, ${c} 4px, ${c} 6px)`,
  }),

  gradient: (c) => ({
    backgroundImage: `linear-gradient(135deg, transparent 0%, ${c} 100%)`,
  }),

  band: (c) => ({
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 6px, ${c} 6px, ${c} 8px)`,
  }),

  speckle: (c) => ({
    backgroundImage: `radial-gradient(circle, ${c} 2px, transparent 2px)`,
    backgroundSize: '12px 12px',
  }),
}

export function getPatternStyle(design, patternColor) {
  if (!design || design === 'solid') return null
  const fn = PATTERNS[design]
  return fn ? fn(patternColor) : null
}
