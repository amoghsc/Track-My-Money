import { isValid, parse, parseISO, format } from 'date-fns'
import type { Category, Entry, EntryType, Tag } from './types'

/** One normalised row from a Spendee CSV. */
export interface ImportRow {
  date: string // YYYY-MM-DD
  type: EntryType
  amount: number
  category: string // Spendee category name ('' = unknown)
  note: string
  tags: string[]
  author: string
}

export interface ImportPreview {
  rows: ImportRow[]
  skipped: { line: number; reason: string }[]
  columns: Record<string, number>
  newCategories: { name: string; type: EntryType }[]
  newTags: string[]
  duplicates: number
  totals: { expense: number; income: number }
  range: [string, string] | null
}

/** RFC 4180-ish CSV parser: quoted fields, doubled quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', q = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++ } else q = false }
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some(f => f.trim() !== '')) rows.push(row)
  return rows
}

const COLS: Record<string, string[]> = {
  date: ['date', 'transaction date', 'day'],
  type: ['type', 'transaction type'],
  category: ['category name', 'category'],
  amount: ['amount', 'value', 'sum'],
  note: ['note', 'description', 'notes', 'memo', 'payee'],
  labels: ['labels', 'label', 'tags', 'hashtags'],
  author: ['author', 'user', 'added by'],
  currency: ['currency'],
}

export function detectColumns(header: string[]) {
  const norm = header.map(h => h.trim().toLowerCase())
  const cols: Record<string, number> = {}
  for (const [key, names] of Object.entries(COLS)) {
    const i = norm.findIndex(h => names.includes(h))
    if (i >= 0) cols[key] = i
  }
  return cols
}

function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const iso = parseISO(s)
  if (isValid(iso) && /^\d{4}-\d{2}-\d{2}/.test(s)) return format(iso, 'yyyy-MM-dd')
  for (const f of ['dd/MM/yyyy', 'dd-MM-yyyy', 'dd.MM.yyyy', 'd/M/yyyy', 'MM/dd/yyyy', 'd MMM yyyy', 'dd MMM yyyy', 'MMM d, yyyy', 'yyyy/MM/dd']) {
    const d = parse(s.slice(0, 20), f, new Date())
    if (isValid(d)) return format(d, 'yyyy-MM-dd')
  }
  return null
}

function parseAmount(raw: string): number | null {
  const s = raw.replace(/[₹$€£,\s]/g, '').replace(/^\((.*)\)$/, '-$1')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export function normaliseRows(table: string[][]): { rows: ImportRow[]; skipped: ImportPreview['skipped']; columns: Record<string, number> } {
  const [header, ...body] = table
  const columns = detectColumns(header ?? [])
  const skipped: ImportPreview['skipped'] = []
  const rows: ImportRow[] = []
  if (columns.date === undefined || columns.amount === undefined) {
    return { rows, skipped: [{ line: 1, reason: 'Could not find Date and Amount columns in the header' }], columns }
  }
  const get = (r: string[], k: string) => (columns[k] === undefined ? '' : (r[columns[k]] ?? '').trim())
  body.forEach((r, i) => {
    const line = i + 2
    const date = parseDate(get(r, 'date'))
    if (!date) { skipped.push({ line, reason: `Unreadable date "${get(r, 'date')}"` }); return }
    const amt = parseAmount(get(r, 'amount'))
    if (amt === null || amt === 0) { skipped.push({ line, reason: `Unreadable amount "${get(r, 'amount')}"` }); return }
    const typeRaw = get(r, 'type').toLowerCase()
    if (typeRaw.startsWith('transfer')) { skipped.push({ line, reason: 'Transfer (not an expense or income)' }); return }
    // Spendee full export: expenses negative, income positive. Simple export (no Type column): positive = expense.
    let type: EntryType
    if (typeRaw.startsWith('income')) type = 'income'
    else if (typeRaw.startsWith('expense')) type = 'expense'
    else if (columns.type === undefined) type = amt < 0 ? 'income' : 'expense'
    else type = amt < 0 ? 'expense' : 'income'
    const tags = get(r, 'labels').split(/[;,|]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    rows.push({ date, type, amount: Math.abs(amt), category: get(r, 'category'), note: get(r, 'note'), tags, author: get(r, 'author') })
  })
  return { rows, skipped, columns }
}

/** Key used to detect an entry already present (same day, type, amount and note). */
export const dupKey = (e: { date: string; type: EntryType; amount: number; note: string }) =>
  `${e.date}|${e.type}|${Number(e.amount).toFixed(2)}|${e.note.trim().toLowerCase()}`

export function buildPreview(text: string, categories: Category[], tags: Tag[], entries: Entry[]): ImportPreview {
  const { rows, skipped, columns } = normaliseRows(parseCsv(text))
  const catKey = (n: string, t: EntryType) => `${t}|${n.trim().toLowerCase()}`
  const have = new Set(categories.map(c => catKey(c.name, c.type)))
  const newCats = new Map<string, { name: string; type: EntryType }>()
  for (const r of rows) if (r.category && !have.has(catKey(r.category, r.type))) newCats.set(catKey(r.category, r.type), { name: r.category.trim(), type: r.type })
  const haveTags = new Set(tags.map(t => t.name.toLowerCase()))
  const newTags = [...new Set(rows.flatMap(r => r.tags).filter(t => !haveTags.has(t.toLowerCase())))]
  const existing = new Set(entries.map(dupKey))
  const duplicates = rows.filter(r => existing.has(dupKey(r))).length
  const totals = { expense: 0, income: 0 }
  for (const r of rows) totals[r.type] += r.amount
  const dates = rows.map(r => r.date).sort()
  return { rows, skipped, columns, newCategories: [...newCats.values()], newTags, duplicates, totals, range: dates.length ? [dates[0], dates[dates.length - 1]] : null }
}
