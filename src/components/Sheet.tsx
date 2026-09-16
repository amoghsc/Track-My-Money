import { useEffect, type ReactNode } from 'react'

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // iOS ignores body{overflow:hidden}; pinning the body keeps the page from scrolling behind the sheet
    const y = window.scrollY
    Object.assign(document.body.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%' })
    return () => {
      document.removeEventListener('keydown', onKey)
      Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' })
      window.scrollTo(0, y)
    }
  }, [onClose])
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  )
}
