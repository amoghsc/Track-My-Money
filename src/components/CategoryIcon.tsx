import { ICONS } from '../lib/icons'
import type { Category } from '../lib/types'

interface Props {
  category?: Pick<Category, 'icon' | 'emoji' | 'color'> | null
  size?: number // tile size; icon is size/2
  className?: string
}

/** White for dark tiles, near-black for light tiles (e.g. #FFFFFF or #BED940). */
export function contrastOn(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.72 ? '#0f172a' : '#ffffff'
}

/** Solid colour tile with the category's Lucide icon (falls back to its emoji, then a placeholder). */
export function CategoryIcon({ category, size = 40, className = '' }: Props) {
  const color = category?.color ?? '#9ca3af'
  const Icon = category?.icon ? ICONS[category.icon] : undefined
  const iconSize = Math.round(size / 2)
  return (
    <span className={`icon-tile ${className}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: color, color: contrastOn(color), fontSize: iconSize }}>
      {Icon ? <Icon size={iconSize} strokeWidth={2} /> : category?.emoji ?? '?'}
    </span>
  )
}
