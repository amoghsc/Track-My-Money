import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '../lib/store'
import type { Entry, EntryType } from '../lib/types'
import { today } from '../lib/periods'
import { compressImage } from '../lib/image'
import { CameraIcon } from './Icons'
import { X } from 'lucide-react'
import { PhotoThumb } from './PhotoThumb'
import { CategoryIcon } from './CategoryIcon'
import { TagPicker } from './TagPicker'

interface Props {
  entry?: Entry | null
  defaultDate?: string
  onClose: () => void
}

export function EntryForm({ entry, defaultDate, onClose }: Props) {
  const { categories, addEntry, updateEntry, deleteEntry } = useStore()
  const [type, setType] = useState<EntryType>(entry?.type ?? 'expense')
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [date, setDate] = useState(entry?.date ?? defaultDate ?? today())
  const [categoryId, setCategoryId] = useState<string | null>(entry?.category_id ?? null)
  const [note, setNote] = useState(entry?.note ?? '')
  const [tagIds, setTagIds] = useState<string[]>(entry?.tag_ids ?? [])
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined) // undefined = unchanged, null = removed
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // focus inside the tap that opened the sheet, otherwise iOS won't show the keypad
  useLayoutEffect(() => { if (!entry) amountRef.current?.focus() }, [entry])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  const cats = categories.filter(c => c.type === type)
  const selectedCat = categories.find(c => c.id === categoryId) ?? null
  const catRef = useRef<HTMLDivElement>(null)
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
      <div className="sheet-head">
        <h2>{entry ? 'Edit entry' : 'New entry'}</h2>
        <button type="button" className="iconbtn close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      <div className="type-toggle">
        <button className={`exp ${type === 'expense' ? 'active' : ''}`} onClick={() => switchType('expense')}>Expense</button>
        <button className={`inc ${type === 'income' ? 'active' : ''}`} onClick={() => switchType('income')}>Income</button>
      </div>
      <div className="field amount-row">
        <button type="button" className="amount-cat" onClick={() => catRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-label="Category">
          <CategoryIcon category={selectedCat} size={48} />
        </button>
        <input ref={amountRef} className="amount-input" inputMode="decimal" autoFocus={!entry} placeholder="₹0" value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <div className="desc-row">
          <input placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
          {photoPreview || showExistingPhoto ? (
            <button type="button" className="photo-thumb" onClick={() => { if (confirm('Remove photo?')) { setPhoto(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null) } }} aria-label="Remove photo">
              {photoPreview ? <img src={photoPreview} alt="" /> : <PhotoThumb path={entry!.photo_path!} />}
              <span className="rm">×</span>
            </button>
          ) : (
            <button type="button" className="iconbtn" onClick={() => fileRef.current?.click()} aria-label="Add photo"><CameraIcon /></button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        </div>
      </div>
      <div className="field">
        <label>Date</label>
        <input type="date" value={date} max="2099-12-31" onChange={e => e.target.value && setDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Tags</label>
        <TagPicker selected={tagIds} onChange={setTagIds} />
      </div>
      <div className="field" ref={catRef}>
        <label>Category</label>
        <div className="cat-grid">
          {cats.map(c => (
            <button key={c.id} type="button" className={`cat-cell ${c.id === categoryId ? 'active' : ''}`} onClick={() => setCategoryId(c.id)}>
              <CategoryIcon category={c} size={46} />
              <span className="n">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="btn-row sheet-footer">
        {entry && <button className="btn danger" onClick={remove} disabled={busy}>Delete</button>}
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : entry ? 'Save changes' : 'Add'}</button>
      </div>
    </Sheet>
  )
}
