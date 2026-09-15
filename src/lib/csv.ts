import type { Category, Entry } from './types'

function q(s: string) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Matches the Date,Description,Amount layout used for Spendee's web importer.
 * Expenses are positive (as in the sample file); income, if included, is negative.
 */
export function entriesToCsv(entries: Entry[], cats: Map<string, Category>, includeIncome: boolean) {
  const rows = ['Date,Description,Amount']
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
  for (const e of sorted) {
    if (e.type === 'income' && !includeIncome) continue
    const desc = e.note.trim() || cats.get(e.category_id ?? '')?.name || 'Expense'
    const amt = e.type === 'income' ? -e.amount : e.amount
    rows.push(`${e.date},${q(desc)},${amt}`)
  }
  return rows.join('\n') + '\n'
}

export async function shareOrDownload(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime })
  const file = new File([blob], filename, { type: mime })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
