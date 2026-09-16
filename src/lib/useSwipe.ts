import { useRef, type TouchEvent } from 'react'

/** Horizontal swipe detection for period navigation. Ignores touches that start on horizontally scrollable rows or canvases. */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number; skip: boolean } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    const el = e.target as HTMLElement
    const skip = !!el.closest('.chips, canvas, input, .icon-grid, .emoji-grid')
    start.current = { x: t.clientX, y: t.clientY, skip }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const s = start.current; start.current = null
    if (!s || s.skip) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x, dy = t.clientY - s.y
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && Math.abs(dx) > Math.abs(dy) * 2) (dx < 0 ? onLeft : onRight)()
  }
  return { onTouchStart, onTouchEnd }
}
