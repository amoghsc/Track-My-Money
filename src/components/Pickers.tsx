import { useState } from 'react'
import { COLOR_CHOICES, EMOJI_CHOICES } from '../lib/emoji'

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
