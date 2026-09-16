import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import type { Tag } from '../lib/types'
import { COLOR_CHOICES } from '../lib/emoji'

interface Props {
  selected: string[]
  onChange: (ids: string[]) => void
  /** single-select filter mode: no creation, one active tag */
  single?: boolean
  limit?: number
}

/** Faint tag pill: tinted background, coloured text. */
export function TagChip({ tag, active, onClick }: { tag: Tag; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={`chip tag ${active ? 'active' : ''}`} onClick={onClick}
      style={{ background: tag.color + (active ? '33' : '1f'), color: tag.color, borderColor: active ? tag.color : 'transparent' }}>
      <span className="dot" style={{ background: tag.color + '99' }} />{tag.name}
    </button>
  )
}

/**
 * Selected tags first, then the most-used tags; typing filters by prefix (most used first)
 * and offers to create the tag if it doesn't exist.
 */
export function TagPicker({ selected, onChange, single = false, limit = 10 }: Props) {
  const { tags, tagMap, entries, saveTag } = useStore()
  const [q, setQ] = useState('')

  const usage = useMemo(() => {
    const n = new Map<string, number>()
    for (const e of entries) for (const t of e.tag_ids) n.set(t, (n.get(t) ?? 0) + 1)
    return n
  }, [entries])
  const byUsage = useMemo(() => [...tags].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name)), [tags, usage])

  const query = q.trim().toLowerCase()
  const selectedTags = selected.map(id => tagMap.get(id)).filter(Boolean) as Tag[]
  const shown = query
    ? byUsage.filter(t => t.name.toLowerCase().startsWith(query)).slice(0, 30)
    : [...selectedTags, ...byUsage.filter(t => !selected.includes(t.id)).slice(0, limit)]
  const exact = tags.find(t => t.name.toLowerCase() === query)

  const toggle = (id: string) => {
    if (single) onChange(selected.includes(id) ? [] : [id])
    else onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
    setQ('')
  }
  const create = async () => {
    const name = q.trim()
    if (!name) return
    if (exact) { toggle(exact.id); return }
    const id = crypto.randomUUID()
    await saveTag({ id, name, color: COLOR_CHOICES[tags.length % 13] })
    onChange(single ? [id] : [...selected, id])
    setQ('')
  }

  return (
    <div className="tagpicker">
      <div className="chips">
        {shown.map(t => <TagChip key={t.id} tag={t} active={selected.includes(t.id)} onClick={() => toggle(t.id)} />)}
        {query && !exact && !single && <button type="button" className="chip" onClick={create}>+ Create "{q.trim()}"</button>}
        {query && shown.length === 0 && single && <span className="note" style={{ padding: '6px 4px' }}>No tags start with "{q.trim()}"</span>}
      </div>
      <input placeholder={single ? 'Find a tag…' : 'Search or add a tag…'} value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (single) { if (shown[0]) toggle(shown[0].id) } else create() } }} />
    </div>
  )
}
