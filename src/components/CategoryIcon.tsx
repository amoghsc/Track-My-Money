import { ICONS } from '../lib/icons'
import type { Category } from '../lib/types'

interface Props {
  category?: Pick<Category, 'icon' | 'emoji' | 'color'> | null
  size?: number // tile size; icon is size/2
  className?: string
}

/** Tinted rounded tile with the category's Lucide icon (falls back to its emoji, then a placeholder). */
export function CategoryIcon({ category, size = 40, className = '' }: Props) {
  const color = category?.color ?? '#9ca3af'
  const Icon = category?.icon ? ICONS[category.icon] : undefined
  const iconSize = Math.round(size / 2)
  return (
    <span className={`icon-tile ${className}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: color + '33', fontSize: iconSize }}>
      {Icon ? <Icon size={iconSize} strokeWidth={2} /> : category?.emoji ?? '?'}
    </span>
  )
}
