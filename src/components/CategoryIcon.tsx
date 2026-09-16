import { CircleDashed } from 'lucide-react'
import { ICONS } from '../lib/icons'
import type { Category } from '../lib/types'

interface Props {
  category?: Pick<Category, 'icon' | 'emoji' | 'color'> | null
  size?: number // circle diameter; the icon is 2/3 of it (diameter = 1.5 × icon)
  className?: string
}

/** White for dark tiles, near-black for light tiles (e.g. #FFFFFF or #BED940). */
export function contrastOn(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.72 ? '#0f172a' : '#ffffff'
}

/** Solid colour circle with the category's Lucide icon (falls back to its emoji; dashed circle when there is no category). */
export function CategoryIcon({ category, size = 40, className = '' }: Props) {
  const iconSize = Math.round(size / 1.5)
  if (!category) {
    return (
      <span className={`icon-tile none ${className}`} style={{ width: size, height: size, fontSize: iconSize }}>
        <CircleDashed size={iconSize} strokeWidth={1.75} />
      </span>
    )
  }
  const color = category.color
  const Icon = category.icon ? ICONS[category.icon] : undefined
  return (
    <span className={`icon-tile ${className}`} style={{ width: size, height: size, background: color, color: contrastOn(color), fontSize: iconSize }}>
      {Icon ? <Icon size={iconSize} strokeWidth={2} /> : category.emoji}
    </span>
  )
}
