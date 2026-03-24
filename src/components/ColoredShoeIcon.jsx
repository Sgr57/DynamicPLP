import { useId } from 'react'

export default function ColoredShoeIcon({ primaryColor = '#6B7280', className = 'w-32 h-32', children, ...props }) {
  const id = useId().replace(/:/g, '')
  const scopeClass = `shoe-icon-${id}`

  return (
    <div className={`${scopeClass} ${className}`} style={{ '--icon-primary': primaryColor }} {...props}>
      <style>{`
        .${scopeClass} {
          --icon-dark: color-mix(in srgb, var(--icon-primary), black 30%);
          --icon-light: color-mix(in srgb, var(--icon-primary), white 40%);
        }
      `}</style>
      {children}
    </div>
  )
}
