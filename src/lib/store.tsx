import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { PHOTO_BUCKET, supabase } from './supabase'
import type { Category, Entry, EntryInput, Member, Tag } from './types'
import { applyTheme, loadSettings, saveSettings, type Settings } from './settings'
import { dupKey, type ImportRow } from './spendeeImport'
import { COLOR_CHOICES } from './emoji'
import { DEFAULT_ICON } from './icons'

interface Store {
  session: Session | null
  member: Member | null
  authLoading: boolean
  recovery: boolean
  setRecovery: (v: boolean) => void
  loading: boolean
  error: string | null
  categories: Category[]
  tags: Tag[]
  entries: Entry[]
  catMap: Map<string, Category>
  tagMap: Map<string, Tag>
  settings: Settings
  setSettings: (s: Settings) => void
  refresh: () => Promise<void>
  addEntry: (input: EntryInput, photo?: Blob | null) => Promise<void>
  updateEntry: (id: string, patch: Partial<EntryInput>, photo?: Blob | null) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  saveCategory: (c: Omit<Category, 'id' | 'sort_order'> & { id?: string; sort_order?: number }) => Promise<void>
  deleteCategory: (id: string, reassignTo: string | null) => Promise<void>
  reorderCategories: (ids: string[]) => Promise<void>
  saveTag: (t: Omit<Tag, 'id'> & { id?: string }) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  photoUrl: (path: string) => Promise<string>
  importBackup: (data: { categories?: Category[]; tags?: Tag[]; entries?: Entry[] }) => Promise<number>
  importSpendee: (rows: ImportRow[], skipDuplicates: boolean, onProgress?: (done: number) => void) => Promise<{ inserted: number; skipped: number }>
  signOut: () => Promise<void>
}

export const StoreContext = createContext<Store | null>(null)
const Ctx = StoreContext
export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

const CACHE_KEY = 'xp.cache.v1'
function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (c && Array.isArray(c.entries)) return c as { categories: Category[]; tags: Tag[]; entries: Entry[] }
  } catch { /* ignore */ }
  return null
}

function normEntry(r: Record<string, unknown>): Entry {
  return { ...(r as unknown as Entry), amount: Number(r.amount), tag_ids: (r.tag_ids as string[]) ?? [] }
}

const byDateDesc = (a: Entry, b: Entry) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
const byOrder = (a: Category, b: Category) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name)

async function fetchAll<T>(table: string, order: string, asc = true): Promise<T[]> {
  const out: T[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending: asc }).range(from, from + page - 1)
    if (error) throw error
    out.push(...(data as T[]))
    if (!data || data.length < page) break
  }
  return out
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cached = useMemo(readCache, [])
  const [categories, setCategories] = useState<Category[]>(cached?.categories ?? [])
  const [tags, setTags] = useState<Tag[]>(cached?.tags ?? [])
  const [entries, setEntries] = useState<Entry[]>(cached?.entries ?? [])
  const [settings, setSettingsState] = useState<Settings>(loadSettings)
  const urlCache = useRef(new Map<string, { url: string; exp: number }>())

  const setSettings = useCallback((s: Settings) => { setSettingsState(s); saveSettings(s); applyTheme(s.theme) }, [])
  useEffect(() => { applyTheme(settings.theme) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // ---- membership + initial load ----
  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const [cats, tgs, ents] = await Promise.all([
        fetchAll<Category>('xp_categories', 'sort_order'),
        fetchAll<Tag>('xp_tags', 'name'),
        fetchAll<Record<string, unknown>>('xp_entries', 'date', false),
      ])
      const e = ents.map(normEntry).sort(byDateDesc)
      setCategories(cats.sort(byOrder)); setTags(tgs.sort(byName)); setEntries(e)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ categories: cats, tags: tgs, entries: e })) } catch { /* quota */ }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (!session) { setMember(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('xp_members').select('*').eq('email', session.user.email!.toLowerCase()).maybeSingle()
      if (cancelled) return
      setMember(data ?? null)
      if (data) await refresh()
    })()
    return () => { cancelled = true }
  }, [session, refresh])

  // ---- realtime + refetch when app comes back to foreground ----
  useEffect(() => {
    if (!member) return
    const upsert = <T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>, row: T, sort: (a: T, b: T) => number) =>
      set(prev => [...prev.filter(x => x.id !== row.id), row].sort(sort))
    const remove = <T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>, id: string) =>
      set(prev => prev.filter(x => x.id !== id))

    const ch = supabase.channel('xp-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'xp_entries' }, p => {
        if (p.eventType === 'DELETE') remove(setEntries, (p.old as { id: string }).id)
        else upsert(setEntries, normEntry(p.new as Record<string, unknown>), byDateDesc)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'xp_categories' }, p => {
        if (p.eventType === 'DELETE') remove(setCategories, (p.old as { id: string }).id)
        else upsert(setCategories, p.new as Category, byOrder)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'xp_tags' }, p => {
        if (p.eventType === 'DELETE') remove(setTags, (p.old as { id: string }).id)
        else upsert(setTags, p.new as Tag, byName)
      })
      .subscribe()

    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      supabase.removeChannel(ch)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [member, refresh])

  // ---- mutations ----
  const uploadPhoto = async (id: string, blob: Blob) => {
    const path = `${id}.jpg`
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    urlCache.current.delete(path)
    return path
  }

  const addEntry = async (input: EntryInput, photo?: Blob | null) => {
    const id = crypto.randomUUID()
    const photo_path = photo ? await uploadPhoto(id, photo) : null
    const row = { ...input, id, photo_path, author: member?.display_name ?? '' }
    const { data, error } = await supabase.from('xp_entries').insert(row).select().single()
    if (error) throw error
    setEntries(prev => [...prev.filter(x => x.id !== id), normEntry(data)].sort(byDateDesc))
  }

  const updateEntry = async (id: string, patch: Partial<EntryInput>, photo?: Blob | null) => {
    const p: Partial<Entry> = { ...patch }
    if (photo) p.photo_path = await uploadPhoto(id, photo)
    else if (photo === null) {
      await supabase.storage.from(PHOTO_BUCKET).remove([`${id}.jpg`])
      p.photo_path = null
    }
    const { data, error } = await supabase.from('xp_entries').update(p).eq('id', id).select().single()
    if (error) throw error
    setEntries(prev => [...prev.filter(x => x.id !== id), normEntry(data)].sort(byDateDesc))
  }

  const deleteEntry = async (id: string) => {
    const e = entries.find(x => x.id === id)
    const { error } = await supabase.from('xp_entries').delete().eq('id', id)
    if (error) throw error
    if (e?.photo_path) supabase.storage.from(PHOTO_BUCKET).remove([e.photo_path])
    setEntries(prev => prev.filter(x => x.id !== id))
  }

  const saveCategory: Store['saveCategory'] = async c => {
    const row = { ...c, sort_order: c.sort_order ?? (Math.max(0, ...categories.filter(x => x.type === c.type && x.sort_order < 99).map(x => x.sort_order)) + 1) }
    const { data, error } = await supabase.from('xp_categories').upsert(row).select().single()
    if (error) throw error
    setCategories(prev => [...prev.filter(x => x.id !== data.id), data].sort(byOrder))
  }

  const deleteCategory = async (id: string, reassignTo: string | null) => {
    const { error: e1 } = await supabase.from('xp_entries').update({ category_id: reassignTo }).eq('category_id', id)
    if (e1) throw e1
    const { error } = await supabase.from('xp_categories').delete().eq('id', id)
    if (error) throw error
    setEntries(prev => prev.map(e => (e.category_id === id ? { ...e, category_id: reassignTo } : e)))
    setCategories(prev => prev.filter(x => x.id !== id))
  }

  const reorderCategories = async (ids: string[]) => {
    const rows = ids.map((id, i) => ({ ...categories.find(c => c.id === id)!, sort_order: i + 1 }))
    setCategories(prev => prev.map(c => rows.find(r => r.id === c.id) ?? c).sort(byOrder))
    const { error } = await supabase.from('xp_categories').upsert(rows)
    if (error) throw error
  }

  const saveTag: Store['saveTag'] = async t => {
    const { data, error } = await supabase.from('xp_tags').upsert(t).select().single()
    if (error) throw error
    setTags(prev => [...prev.filter(x => x.id !== data.id), data].sort(byName))
  }

  const deleteTag = async (id: string) => {
    const affected = entries.filter(e => e.tag_ids.includes(id))
    for (const e of affected) {
      await supabase.from('xp_entries').update({ tag_ids: e.tag_ids.filter(t => t !== id) }).eq('id', e.id)
    }
    const { error } = await supabase.from('xp_tags').delete().eq('id', id)
    if (error) throw error
    setEntries(prev => prev.map(e => ({ ...e, tag_ids: e.tag_ids.filter(t => t !== id) })))
    setTags(prev => prev.filter(x => x.id !== id))
  }

  const photoUrl = async (path: string) => {
    const hit = urlCache.current.get(path)
    if (hit && hit.exp > Date.now()) return hit.url
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)
    if (error) throw error
    urlCache.current.set(path, { url: data.signedUrl, exp: Date.now() + 55 * 60 * 1000 })
    return data.signedUrl
  }

  const importBackup: Store['importBackup'] = async data => {
    let n = 0
    if (data.categories?.length) { const { error } = await supabase.from('xp_categories').upsert(data.categories); if (error) throw error; n += data.categories.length }
    if (data.tags?.length) { const { error } = await supabase.from('xp_tags').upsert(data.tags); if (error) throw error; n += data.tags.length }
    if (data.entries?.length) {
      for (let i = 0; i < data.entries.length; i += 500) {
        const chunk = data.entries.slice(i, i + 500).map(e => ({ ...e, photo_path: null }))
        const { error } = await supabase.from('xp_entries').upsert(chunk)
        if (error) throw error
      }
      n += data.entries.length
    }
    await refresh()
    return n
  }

  const importSpendee: Store['importSpendee'] = async (rows, skipDuplicates, onProgress) => {
    // 1. categories that don't exist yet (matched case-insensitively per type)
    const catKey = (n: string, t: string) => `${t}|${n.trim().toLowerCase()}`
    const catIds = new Map(categories.map(c => [catKey(c.name, c.type), c.id]))
    const fallback = (t: string) => categories.find(c => c.type === t && c.name === 'Other')?.id ?? null
    const newCats: Category[] = []
    for (const r of rows) {
      if (!r.category || catIds.has(catKey(r.category, r.type))) continue
      const c: Category = { id: crypto.randomUUID(), name: r.category.trim(), type: r.type, emoji: '📦', icon: DEFAULT_ICON, color: COLOR_CHOICES[(categories.length + newCats.length) % 13], sort_order: 50 + newCats.length }
      newCats.push(c); catIds.set(catKey(c.name, c.type), c.id)
    }
    if (newCats.length) { const { error } = await supabase.from('xp_categories').insert(newCats); if (error) throw error }
    // 2. tags
    const tagIds = new Map(tags.map(t => [t.name.toLowerCase(), t.id]))
    const newTags: Tag[] = []
    for (const name of new Set(rows.flatMap(r => r.tags))) {
      if (tagIds.has(name.toLowerCase())) continue
      const t: Tag = { id: crypto.randomUUID(), name, color: COLOR_CHOICES[(tags.length + newTags.length) % 13] }
      newTags.push(t); tagIds.set(name.toLowerCase(), t.id)
    }
    if (newTags.length) { const { error } = await supabase.from('xp_tags').insert(newTags); if (error) throw error }
    // 3. entries — Spendee authors like "Amogh C" map to our member names
    const { data: members } = await supabase.from('xp_members').select('display_name')
    const names = (members ?? []).map(m => m.display_name as string)
    const authorFor = (a: string) => names.find(n => a.toLowerCase().startsWith(n.toLowerCase())) ?? a
    const existing = new Set(entries.map(dupKey))
    const toInsert = rows.filter(r => !(skipDuplicates && existing.has(dupKey(r)))).map(r => ({
      id: crypto.randomUUID(), type: r.type, date: r.date, amount: r.amount,
      category_id: r.category ? (catIds.get(catKey(r.category, r.type)) ?? fallback(r.type)) : fallback(r.type),
      note: r.note, tag_ids: r.tags.map(t => tagIds.get(t.toLowerCase())!).filter(Boolean), photo_path: null,
      author: r.author ? authorFor(r.author) : (member?.display_name || 'Spendee'),
    }))
    for (let i = 0; i < toInsert.length; i += 200) {
      const { error } = await supabase.from('xp_entries').insert(toInsert.slice(i, i + 200))
      if (error) throw error
      onProgress?.(Math.min(i + 200, toInsert.length))
    }
    await refresh()
    return { inserted: toInsert.length, skipped: rows.length - toInsert.length }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
    setEntries([]); setCategories([]); setTags([])
  }

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags])

  const value: Store = {
    session, member, authLoading, recovery, setRecovery, loading, error, categories, tags, entries, catMap, tagMap,
    settings, setSettings, refresh, addEntry, updateEntry, deleteEntry, saveCategory, deleteCategory,
    reorderCategories, saveTag, deleteTag, photoUrl, importBackup, importSpendee, signOut,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
