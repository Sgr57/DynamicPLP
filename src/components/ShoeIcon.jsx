export default function ShoeIcon({ light, className = 'w-24 h-16' }) {
  const color = light ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.25)'
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none">
      <path
        d="M8 32 C8 28, 12 20, 20 18 C28 16, 32 12, 34 8 C36 4, 42 2, 48 4 C54 6, 58 12, 58 18 L58 28 C58 30, 56 32, 54 32 Z"
        fill={color}
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M4 32 L60 32 C62 32, 62 36, 60 36 L4 36 C2 36, 2 32, 4 32Z"
        fill={color}
      />
    </svg>
  )
}
