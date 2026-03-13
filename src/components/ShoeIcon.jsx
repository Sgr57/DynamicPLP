function SneakerSvg({ color, className }) {
  return (
    <svg viewBox="0 0 80 45" className={className} fill="none">
      {/* Shoe body - low profile sneaker with rounded toe */}
      <path
        d="M12 34 C12 30, 14 24, 22 22 C28 20, 34 18, 38 14 C40 12, 44 10, 50 10 C56 10, 64 14, 68 20 L70 26 L70 32 C70 33, 69 34, 68 34 Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
      />
      {/* Lace area detail */}
      <path
        d="M40 16 L44 14 M42 19 L46 17 M44 22 L48 20"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
      {/* Sole - flat sneaker sole */}
      <path
        d="M8 34 L72 34 C74 34, 74 38, 72 38 L8 38 C6 38, 6 34, 8 34Z"
        fill={color}
      />
      {/* Sole tread marks */}
      <path
        d="M14 38 L14 40 M22 38 L22 40 M30 38 L30 40 M38 38 L38 40 M46 38 L46 40 M54 38 L54 40 M62 38 L62 40"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.4"
      />
    </svg>
  )
}

function BootSvg({ color, className }) {
  return (
    <svg viewBox="0 0 70 55" className={className} fill="none">
      {/* Tall boot shaft */}
      <path
        d="M22 44 L22 14 C22 10, 24 6, 30 4 C36 2, 42 4, 44 8 L44 20 L50 22 C56 24, 60 28, 60 32 L60 40 C60 42, 58 44, 56 44 Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
      />
      {/* Boot top fold */}
      <path
        d="M22 14 C28 16, 38 16, 44 14"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.4"
      />
      {/* Ankle strap detail */}
      <path
        d="M22 28 C30 30, 40 30, 48 28"
        stroke={color}
        strokeWidth="1"
        opacity="0.35"
      />
      {/* Thick boot sole */}
      <path
        d="M18 44 L62 44 C64 44, 65 47, 64 49 L62 50 L18 50 L16 49 C15 47, 16 44, 18 44Z"
        fill={color}
      />
      {/* Heel */}
      <path
        d="M18 50 L26 50 L26 53 L18 53 Z"
        fill={color}
        opacity="0.7"
      />
    </svg>
  )
}

function LoaferSvg({ color, className }) {
  return (
    <svg viewBox="0 0 80 42" className={className} fill="none">
      {/* Loafer body - low, elegant, no laces */}
      <path
        d="M14 32 C14 28, 16 24, 24 22 C30 20, 36 20, 42 20 C48 20, 54 18, 58 16 C62 14, 66 16, 68 20 L68 28 C68 30, 66 32, 64 32 Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
      />
      {/* Penny strap / mocassin seam */}
      <path
        d="M38 20 C38 24, 42 26, 50 24 C54 23, 56 21, 56 18"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.4"
        fill="none"
      />
      {/* Penny slot detail */}
      <path
        d="M46 21 L50 21"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.35"
      />
      {/* Thin elegant sole */}
      <path
        d="M10 32 L70 32 C72 32, 72 35, 70 35 L10 35 C8 35, 8 32, 10 32Z"
        fill={color}
      />
    </svg>
  )
}

function SandalSvg({ color, className }) {
  return (
    <svg viewBox="0 0 80 42" className={className} fill="none">
      {/* Sole/footbed - visible since it's an open shoe */}
      <path
        d="M16 28 C14 28, 12 24, 16 22 L28 16 C34 14, 40 13, 46 14 L60 18 C66 20, 68 24, 66 28 C64 30, 60 30, 56 30 L24 30 C20 30, 17 29, 16 28Z"
        fill={color}
        opacity="0.5"
      />
      {/* Front strap */}
      <path
        d="M30 14 C32 8, 44 8, 46 14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Middle cross strap */}
      <path
        d="M24 20 C28 14, 52 14, 56 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ankle strap */}
      <path
        d="M18 26 C18 20, 22 22, 24 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Flat sole */}
      <path
        d="M12 30 L68 30 C70 30, 70 34, 68 34 L12 34 C10 34, 10 30, 12 30Z"
        fill={color}
      />
    </svg>
  )
}

function MoccasinSvg({ color, className }) {
  return (
    <svg viewBox="0 0 80 42" className={className} fill="none">
      {/* Moccasin body - soft, rounded, slipper-like */}
      <path
        d="M14 32 C14 28, 18 22, 28 20 C36 18, 44 16, 52 16 C58 16, 64 18, 66 22 L66 28 C66 30, 64 32, 62 32 Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
      />
      {/* U-shaped moccasin seam on top */}
      <path
        d="M34 18 C34 24, 40 28, 52 26 C58 25, 62 22, 64 18"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.4"
        fill="none"
      />
      {/* Center stitch detail */}
      <path
        d="M48 17 L48 22 M46 18 L46 23 M50 18 L50 22"
        stroke={color}
        strokeWidth="0.8"
        opacity="0.3"
      />
      {/* Soft thin sole - almost no sole visible */}
      <path
        d="M12 32 L68 32 C70 32, 70 35, 68 35 L12 35 C10 35, 10 32, 12 32Z"
        fill={color}
        opacity="0.8"
      />
    </svg>
  )
}

const shoeComponents = {
  sneaker: SneakerSvg,
  boot: BootSvg,
  loafer: LoaferSvg,
  sandalo: SandalSvg,
  mocassino: MoccasinSvg,
}

export default function ShoeIcon({ light, className = 'w-24 h-16', category }) {
  const color = light ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.25)'
  const Component = shoeComponents[category] || SneakerSvg

  return <Component color={color} className={className} />
}
