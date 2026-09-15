import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'

export function PhotoThumb({ path, className }: { path: string; className?: string }) {
  const { photoUrl } = useStore()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { let on = true; photoUrl(path).then(u => on && setUrl(u)).catch(() => {}); return () => { on = false } }, [path, photoUrl])
  if (!url) return <div className={className} style={{ minHeight: 120 }} />
  return <img className={className} src={url} alt="receipt" />
}
