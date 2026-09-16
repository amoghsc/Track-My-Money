import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '../lib/store'
import type { Entry, EntryType } from '../lib/types'
import { today } from '../lib/periods'
import { compressImage } from '../lib/image'
import { CameraIcon } from './Icons'
import { PhotoThumb } from './PhotoThumb'
import { COLOR_CHOICES } from '../lib/emoji'
import { CategoryIcon } from './CategoryIcon'

interface Props {
  entry?: Entry | null
  defaultDate?: string
  onClose: () => void
}

export function EntryForm({ entry, defaultDate, onClose }: Props) {
  const { categories, tags, addEntry, updateEntry, deleteEntry, saveTag } = useStore()
  const [type, setType] = useState<EntryType>(entry?.type ?? 'expense')
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [date, setDate] = useState(entry?.date ?? defaultDate ?? today())
  const [categoryId, setCategoryId] = useState<string | null>(entry?.category_id ?? null)
  const [note, setNote] = useState(entry?.note ?? '')
  const [tagIds, setTagIds] = useState<string[]>(entry?.tag_ids ?? [])
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined) // undefined = unchanged, null = removed
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!entry) setTimeout(() => amountRef.current?.focus(), 150) }, [entry])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  const cats = categories.filter(c => c.type === type)
  const switchType = (t: EntryType) => {
    setType(t)
    if (!categories.find(c => c.id === categoryId && c.type === t)) setCategoryId(null)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const blob = await compressImage(f)
      setPhoto(blob)
      setPhotoPreview(URL.createObjectURL(blob))
    } catch { setErr('Could not read that photo') }
    e.target.value = ''
  }

  const addTagInline = async () => {
    const name = newTag.trim()
    if (!name) return
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (existing) { setTagIds(ids => ids.includes(existing.id) ? ids : [...ids, existing.id]); setNewTag(''); return }
    const id = crypto.randomUUID()
    await saveTag({ id, name, color: COLOR_CHOICES[tags.length % COLOR_CHOICES.length] })
    setTagIds(ids => [...ids, id])
    setNewTag('')
  }

  const save = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setErr('Enter an amount'); amountRef.current?.focus(); return }
    if (!categoryId) { setErr('Pick a category'); return }
    setBusy(true); setErr(null)
    try {
      const input = { type, amount: Math.round(amt * 100) / 100, date, category_id: categoryId, note: note.trim(), tag_ids: tagIds, photo_path: entry?.photo_path ?? null }
      if (entry) await updateEntry(entry.id, input, photo)
      else await addEntry(input, photo ?? null)
      onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!entry || !confirm('Delete this entry?')) return
    setBusy(true)
    try { await deleteEntry(entry.id); onClose() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  const showExistingPhoto = entry?.photo_path && photo === undefined

  return (
    <Sheet onClose={onClose}>
      <h2>{entry ? 'Edit entry' : 'New entry'}</h2>
      <div className="type-toggle">
        <button className={`exp ${type === 'expense' ? 'active' : ''}`} onClick={() => switchType('expense')}>Expense</button>
        <button className={`inc ${type === 'income' ? 'active' : ''}`} onClick={() => switchType('income')}>Income</button>
      </div>
      <div className="field">
        <input ref={amountRef} className="amount-input" inputMode="decimal" placeholder="₹0" value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <input placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <div className="field">
        <label>Date</label>
        <input type="date" value={date} max="2099-12-31" onChange={e => e.target.value && setDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Tags</label>
        <div className="chips" style={{ flexWrap: 'wrap' }}>
          {tags.map(t => (
            <button key={t.id} type="button" className={`chip ${tagIds.includes(t.id) ? 'active' : ''}`}
              onClick={() => setTagIds(ids => ids.includes(t.id) ? ids.filter(x => x !== t.id) : [...ids, t.id])}>
              <span className="dot" style={{ background: t.color }} />{t.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input placeholder="New tag" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTagInline())} />
          <button type="button" className="btn secondary sm" onClick={addTagInline} disabled={!newTag.trim()}>Add</button>
        </div>
      </div>
      <div className="field">
        <label>Category</label>
        <div className="cat-grid">
          {cats.map(c => (
            <button key={c.id} type="button" className={`cat-cell ${c.id === categoryId ? 'active' : ''}`} onClick={() => setCategoryId(c.id)}>
              <CategoryIcon category={c} size={42} />
              <span className="n">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Photo / receipt</label>
        {photoPreview || showExistingPhoto ? (
          <div className="photo-box">
            {photoPreview ? <img src={photoPreview} alt="" /> : <PhotoThumb path={entry!.photo_path!} />}
            <button type="button" className="rm" onClick={() => { setPhoto(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null) }}>Remove</button>
          </div>
        ) : (
          <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}><CameraIcon /> Add photo</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      </div>
      {err && <div className="err">{err}</div>}
      <div className="btn-row">
        {entry && <button className="btn danger" onClick={remove} disabled={busy}>Delete</button>}
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : entry ? 'Save changes' : 'Add'}</button>
      </div>
    </Sheet>
  )
}
