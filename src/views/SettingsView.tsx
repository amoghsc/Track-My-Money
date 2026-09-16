import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { Category, EntryType, Tag } from '../lib/types'
import { Sheet } from '../components/Sheet'
import { ColorPicker, IconPicker } from '../components/Pickers'
import { CategoryIcon } from '../components/CategoryIcon'
import { DEFAULT_ICON } from '../lib/icons'
import { buildPreview, type ImportPreview } from '../lib/spendeeImport'
import { money } from '../lib/format'
import { COLOR_CHOICES } from '../lib/emoji'

export function SettingsView() {
  const { member, session, categories, tags, entries, settings, setSettings, saveCategory, deleteCategory, reorderCategories, saveTag, deleteTag, importBackup, importSpendee, signOut, refresh } = useStore()
  const [catType, setCatType] = useState<EntryType>('expense')
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null)
  const [editTag, setEditTag] = useState<Partial<Tag> | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [reassign, setReassign] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const spendeeRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [skipDup, setSkipDup] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)

  const cats = categories.filter(c => c.type === catType)
  const usage = (id: string) => entries.filter(e => e.category_id === id).length

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true); setMsg(null)
    try { await fn(); if (ok) setMsg(ok) } catch (e) { setMsg('Error: ' + (e as Error).message) } finally { setBusy(false) }
  }

  const move = (c: Category, dir: -1 | 1) => {
    const ids = cats.map(x => x.id)
    const i = ids.indexOf(c.id), j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    run(() => reorderCategories(ids))
  }

  const askDelete = (c: Category) => {
    if (usage(c.id) === 0) { if (confirm(`Delete "${c.name}"?`)) run(() => deleteCategory(c.id, null)); return }
    setDeleting(c); setReassign(cats.find(x => x.id !== c.id)?.id ?? '')
  }

  const pickSpendee = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setPreview(buildPreview(await f.text(), categories, tags, entries))
  }
  const runSpendee = async () => {
    if (!preview) return
    setProgress(0)
    try {
      const r = await importSpendee(preview.rows, skipDup, setProgress)
      setMsg(`Imported ${r.inserted} entries${r.skipped ? `, skipped ${r.skipped} duplicates` : ''}`)
      setPreview(null)
    } catch (err) { setMsg('Error: ' + (err as Error).message) } finally { setProgress(null) }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), categories, tags, entries }, null, 1)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `track-my-money-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const importJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    const data = JSON.parse(await f.text())
    if (!confirm(`Import ${data.entries?.length ?? 0} entries, ${data.categories?.length ?? 0} categories, ${data.tags?.length ?? 0} tags? Existing rows with the same id are overwritten.`)) return
    run(async () => { const n = await importBackup(data); setMsg(`Imported ${n} rows`) })
  }

  return (
    <>
      <div className="topbar"><h2 style={{ margin: '4px 0' }}>Settings</h2></div>
      <div className="content">
        <div className="card">
          <h3>Categories</h3>
          <div className="section-tabs" style={{ padding: '0 14px' }}>
            <div className="seg" style={{ flex: 1 }}>
              <button className={catType === 'expense' ? 'active' : ''} onClick={() => setCatType('expense')}>Expense</button>
              <button className={catType === 'income' ? 'active' : ''} onClick={() => setCatType('income')}>Income</button>
            </div>
            <button className="btn sm" onClick={() => setEditCat({ type: catType, emoji: '📦', icon: DEFAULT_ICON, color: COLOR_CHOICES[categories.length % COLOR_CHOICES.length] })}>+ New</button>
          </div>
          {cats.map((c, i) => (
            <div className="srow" key={c.id}>
              <button onClick={() => setEditCat(c)}><CategoryIcon category={c} /></button>
              <button className="grow" style={{ textAlign: 'left' }} onClick={() => setEditCat(c)}>
                <div>{c.name}</div><div className="small">{usage(c.id)} entries</div>
              </button>
              <button className="mini" disabled={i === 0 || busy} onClick={() => move(c, -1)}>▲</button>
              <button className="mini" disabled={i === cats.length - 1 || busy} onClick={() => move(c, 1)}>▼</button>
              <button className="mini" style={{ color: 'var(--danger)' }} disabled={busy} onClick={() => askDelete(c)}>✕</button>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Tags</h3>
          <div style={{ padding: '0 14px 8px' }}><button className="btn sm" onClick={() => setEditTag({ color: COLOR_CHOICES[tags.length % COLOR_CHOICES.length] })}>+ New tag</button></div>
          {tags.length === 0 && <div className="srow small">No tags yet. You can also create tags while adding an entry.</div>}
          {tags.map(t => (
            <div className="srow" key={t.id}>
              <span className="dot" style={{ width: 14, height: 14, borderRadius: 7, background: t.color + '99', display: 'inline-block' }} />
              <button className="grow" style={{ textAlign: 'left' }} onClick={() => setEditTag(t)}>
                <div>{t.name}</div><div className="small">{entries.filter(e => e.tag_ids.includes(t.id)).length} entries</div>
              </button>
              <button className="mini" style={{ color: 'var(--danger)' }} disabled={busy} onClick={() => confirm(`Delete tag "${t.name}"? It will be removed from all entries.`) && run(() => deleteTag(t.id))}>✕</button>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Preferences</h3>
          <div className="srow">
            <div className="grow">Theme</div>
            <div className="seg" style={{ width: 160 }}>
              <button className={settings.theme === 'light' ? 'active' : ''} onClick={() => setSettings({ ...settings, theme: 'light' })}>Light</button>
              <button className={settings.theme === 'dark' ? 'active' : ''} onClick={() => setSettings({ ...settings, theme: 'dark' })}>Dark</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Import</h3>
          <div className="srow"><div className="grow">Import from Spendee<div className="small">CSV exported from the Spendee app or web</div></div><button className="btn sm" disabled={busy} onClick={() => spendeeRef.current?.click()}>Choose CSV</button><input ref={spendeeRef} type="file" accept=".csv,text/csv" hidden onChange={pickSpendee} /></div>
        </div>

        <div className="card">
          <h3>Backup</h3>
          <div className="srow"><div className="grow">Download everything as JSON<div className="small">{entries.length} entries · photos not included</div></div><button className="btn secondary sm" onClick={exportJson}>Export</button></div>
          <div className="srow"><div className="grow">Restore from a JSON backup</div><button className="btn secondary sm" disabled={busy} onClick={() => fileRef.current?.click()}>Import</button><input ref={fileRef} type="file" accept="application/json" hidden onChange={importJson} /></div>
          <div className="srow"><div className="grow">Reload data from server</div><button className="btn secondary sm" onClick={() => run(refresh, 'Refreshed')}>Refresh</button></div>
        </div>

        <div className="card">
          <h3>Account</h3>
          <div className="srow"><div className="grow">{member?.display_name}<div className="small">{session?.user.email}</div></div><button className="btn danger sm" onClick={signOut}>Sign out</button></div>
        </div>
        {msg && <div className="note" style={{ textAlign: 'center' }}>{msg}</div>}
      </div>

      {editCat && (
        <CategorySheet draft={editCat} onClose={() => setEditCat(null)}
          onSave={c => run(() => saveCategory(c)).then(() => setEditCat(null))} />
      )}
      {editTag && (
        <TagSheet draft={editTag} onClose={() => setEditTag(null)}
          onSave={t => run(() => saveTag(t)).then(() => setEditTag(null))} />
      )}
      {preview && (
        <Sheet onClose={() => progress === null && setPreview(null)}>
          <h2>Import from Spendee</h2>
          {preview.rows.length === 0 ? (
            <>
              <p className="err">Nothing to import. {preview.skipped[0]?.reason}</p>
              <p className="note">Found columns: {Object.keys(preview.columns).join(', ') || 'none'}. The file needs at least a Date and an Amount column.</p>
            </>
          ) : (
            <>
              <div className="summary" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="cell" style={{ background: 'var(--surface-2)' }}><div className="k">Entries</div><div className="v">{preview.rows.length}</div></div>
                <div className="cell" style={{ background: 'var(--surface-2)' }}><div className="k">Dates</div><div className="v" style={{ fontSize: 13 }}>{preview.range?.[0]} → {preview.range?.[1]}</div></div>
                <div className="cell" style={{ background: 'var(--surface-2)' }}><div className="k">Expenses</div><div className="v exp">{money(preview.totals.expense)}</div></div>
                <div className="cell" style={{ background: 'var(--surface-2)' }}><div className="k">Income</div><div className="v inc">{money(preview.totals.income)}</div></div>
              </div>
              {preview.newCategories.length > 0 && (
                <div className="field"><label>New categories ({preview.newCategories.length})</label>
                  <div className="chips" style={{ flexWrap: 'wrap' }}>{preview.newCategories.map(c => <span key={c.type + c.name} className="chip">{c.name}<span className="small" style={{ color: 'var(--muted)' }}>· {c.type}</span></span>)}</div>
                  <p className="note" style={{ margin: '4px 0 0' }}>Created with a default icon — you can change them afterwards. Rows without a category go to "Other".</p>
                </div>
              )}
              {preview.newTags.length > 0 && (
                <div className="field"><label>New tags ({preview.newTags.length})</label><div className="chips" style={{ flexWrap: 'wrap' }}>{preview.newTags.map(t => <span key={t} className="chip">{t}</span>)}</div></div>
              )}
              {preview.skipped.length > 0 && (
                <div className="field"><label>Skipped rows ({preview.skipped.length})</label>
                  <div className="note">{preview.skipped.slice(0, 5).map(x => <div key={x.line}>Line {x.line}: {x.reason}</div>)}{preview.skipped.length > 5 && <div>…and {preview.skipped.length - 5} more</div>}</div>
                </div>
              )}
              {preview.duplicates > 0 && (
                <label className="note" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={skipDup} onChange={e => setSkipDup(e.target.checked)} />
                  Skip {preview.duplicates} entries that already exist (same date, amount and description)
                </label>
              )}
              <div className="btn-row">
                <button className="btn secondary" onClick={() => setPreview(null)} disabled={progress !== null}>Cancel</button>
                <button className="btn" onClick={runSpendee} disabled={progress !== null}>{progress === null ? `Import ${skipDup ? preview.rows.length - preview.duplicates : preview.rows.length}` : `Importing… ${progress}`}</button>
              </div>
            </>
          )}
        </Sheet>
      )}
      {deleting && (
        <Sheet onClose={() => setDeleting(null)}>
          <h2>Delete "{deleting.name}"</h2>
          <p className="note">{usage(deleting.id)} entries use this category. Move them to:</p>
          <div className="field">
            <select value={reassign} onChange={e => setReassign(e.target.value)}>
              <option value="">— Leave uncategorised —</option>
              {cats.filter(x => x.id !== deleting.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn secondary" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn" style={{ background: 'var(--danger)' }} onClick={() => run(() => deleteCategory(deleting.id, reassign || null)).then(() => setDeleting(null))}>Delete & move</button>
          </div>
        </Sheet>
      )}
    </>
  )
}

function CategorySheet({ draft, onClose, onSave }: { draft: Partial<Category>; onClose: () => void; onSave: (c: Omit<Category, 'id' | 'sort_order'> & { id?: string; sort_order?: number }) => void }) {
  const [name, setName] = useState(draft.name ?? '')
  const [icon, setIcon] = useState<string | null>(draft.icon ?? DEFAULT_ICON)
  const [color, setColor] = useState(draft.color ?? COLOR_CHOICES[0])
  return (
    <Sheet onClose={onClose}>
      <h2>{draft.id ? 'Edit category' : 'New category'}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <CategoryIcon category={{ icon, emoji: draft.emoji ?? '📦', color }} size={56} />
        <input placeholder="Category name" value={name} onChange={e => setName(e.target.value)} autoFocus={!draft.id} />
      </div>
      <div className="field"><label>Icon</label><IconPicker value={icon} color={color} onChange={setIcon} /></div>
      <div className="field"><label>Colour</label><ColorPicker value={color} onChange={setColor} /></div>
      <button className="btn" disabled={!name.trim()} onClick={() => onSave({ id: draft.id, name: name.trim(), type: draft.type!, emoji: draft.emoji ?? '📦', icon, color, sort_order: draft.sort_order })}>Save</button>
    </Sheet>
  )
}

function TagSheet({ draft, onClose, onSave }: { draft: Partial<Tag>; onClose: () => void; onSave: (t: Omit<Tag, 'id'> & { id?: string }) => void }) {
  const [name, setName] = useState(draft.name ?? '')
  const [color, setColor] = useState(draft.color ?? COLOR_CHOICES[0])
  return (
    <Sheet onClose={onClose}>
      <h2>{draft.id ? 'Edit tag' : 'New tag'}</h2>
      <div className="field"><input placeholder="Tag name" value={name} onChange={e => setName(e.target.value)} autoFocus={!draft.id} /></div>
      <div className="field"><label>Colour</label><ColorPicker value={color} onChange={setColor} /></div>
      <button className="btn" disabled={!name.trim()} onClick={() => onSave({ id: draft.id, name: name.trim(), color })}>Save</button>
    </Sheet>
  )
}
