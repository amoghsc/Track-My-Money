import { useState } from 'react'
import { COLOR_CHOICES, EMOJI_CHOICES } from '../lib/emoji'
import { ICONS, ICON_NAMES } from '../lib/icons'

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [custom, setCustom] = useState('')
  return (
    <div>
      <div className="emoji-grid">
        {EMOJI_CHOICES.map(e => (
          <button key={e} type="button" className={e === value ? 'active' : ''} onClick={() => onChange(e)}>{e}</button>
        ))}
      </div>
      <input
        style={{ marginTop: 8 }}
        placeholder="…or type / paste any emoji"
        value={custom}
        onChange={e => {
          const v = e.target.value
          setCustom(v)
          const m = [...new Intl.Segmenter().segment(v)].map(s => s.segment).filter(s => /\p{Extended_Pictographic}/u.test(s))
          if (m.length) onChange(m[m.length - 1])
        }}
      />
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="color-row">
      {COLOR_CHOICES.map(c => (
        <button key={c} type="button" className={c === value ? 'active' : ''} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
      ))}
    </div>
  )
}

export function IconPicker({ value, color, onChange }: { value: string | null; color: string; onChange: (name: string) => void }) {
  const [q, setQ] = useState('')
  const names = q.trim() ? ICON_NAMES.filter(n => n.includes(q.trim().toLowerCase())) : ICON_NAMES
  return (
    <div>
      <input placeholder="Search icons…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 8 }} />
      <div className="icon-grid">
        {names.map(n => {
          const I = ICONS[n]
          return (
            <button key={n} type="button" className={n === value ? 'active' : ''} onClick={() => onChange(n)} aria-label={n} title={n}
              style={n === value ? { background: color + '33' } : undefined}>
              <I size={20} strokeWidth={2} />
            </button>
          )
        })}
        {names.length === 0 && <div className="note" style={{ gridColumn: '1 / -1', padding: 8 }}>No icons match</div>}
      </div>
    </div>
  )
}
