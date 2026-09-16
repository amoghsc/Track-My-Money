import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { inPeriod, dayLabel, monthKey, monthLabel, shiftPeriod, type Period } from '../lib/periods'
import { useSwipe } from '../lib/useSwipe'
import { money } from '../lib/format'
import { PeriodNav } from '../components/PeriodNav'
import { EntryForm } from '../components/EntryForm'
import { DownloadIcon, FilterIcon, PhotoIcon } from '../components/Icons'
import { entriesToCsv, shareOrDownload } from '../lib/csv'
import type { Entry, EntryType } from '../lib/types'
import { CategoryIcon } from '../components/CategoryIcon'
import { TagPicker } from '../components/TagPicker'

export interface Filters { type: EntryType | 'all'; categoryId: string | null; tagId: string | null; q: string }
export const EMPTY_FILTERS: Filters = { type: 'all', categoryId: null, tagId: null, q: '' }

interface Props { period: Period; setPeriod: (p: Period) => void; filters: Filters; setFilters: (f: Filters) => void }

export function LogView({ period, setPeriod, filters, setFilters }: Props) {
  const { entries, categories, tags, catMap, tagMap, loading, error, refresh, settings } = useStore()
  const swipe = useSwipe(() => setPeriod(shiftPeriod(period, 1, settings.fyStartMonth)), () => setPeriod(shiftPeriod(period, -1, settings.fyStartMonth)))
  const [editing, setEditing] = useState<Entry | null | 'new'>(null)
  const [showFilters, setShowFilters] = useState(false)

  const searching = filters.q.trim().length > 0
  // a search looks across all entries, not just the selected period
  const inRange = useMemo(() => (searching ? entries : entries.filter(e => inPeriod(e.date, period))), [entries, period, searching])
  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    return inRange.filter(e =>
      (filters.type === 'all' || e.type === filters.type) &&
      (!filters.categoryId || e.category_id === filters.categoryId) &&
      (!filters.tagId || e.tag_ids.includes(filters.tagId)) &&
      (!q || e.note.toLowerCase().includes(q) || (catMap.get(e.category_id ?? '')?.name.toLowerCase().includes(q) ?? false) || e.tag_ids.some(id => tagMap.get(id)?.name.toLowerCase().includes(q))),
    )
  }, [inRange, filters, catMap, tagMap])

  const totals = useMemo(() => {
    let inc = 0, exp = 0
    for (const e of visible) e.type === 'income' ? (inc += e.amount) : (exp += e.amount)
    return { inc, exp, net: inc - exp }
  }, [visible])

  // group by month (only for year/fy) then by day
  const groups = useMemo(() => {
    const months = new Map<string, Map<string, Entry[]>>()
    for (const e of visible) {
      const mk = searching || period.kind === 'year' || period.kind === 'fy' ? monthKey(e.date) : 'all'
      const m = months.get(mk) ?? new Map<string, Entry[]>()
      months.set(mk, m)
      m.set(e.date, [...(m.get(e.date) ?? []), e])
    }
    return months
  }, [visible, period.kind, searching])

  const dayTotals = (list: Entry[]) => {
    let inc = 0, exp = 0
    for (const e of list) e.type === 'income' ? (inc += e.amount) : (exp += e.amount)
    return { inc, exp }
  }

  const filtersActive = filters.type !== 'all' || filters.categoryId || filters.tagId || filters.q
  const exportCsv = async () => {
    const includeIncome = visible.some(e => e.type === 'income') && confirm('Include income rows (as negative amounts)?\n\nOK = include, Cancel = expenses only')
    const name = `track-my-money_${period.label.replace(/[^\w]+/g, '_').toLowerCase()}.csv`
    await shareOrDownload(name, entriesToCsv(visible, catMap, includeIncome))
  }

  return (
    <div className="view" {...swipe}>
      <div className="topbar">
        <PeriodNav period={period} onChange={setPeriod} />
        <div className="summary">
          <div className="cell"><div className="k">Income</div><div className="v inc">{money(totals.inc)}</div></div>
          <div className="cell"><div className="k">Expenses</div><div className="v exp">{money(totals.exp)}</div></div>
          <div className="cell"><div className="k">Net</div><div className="v" style={{ color: totals.net < 0 ? 'var(--expense)' : 'var(--income)' }}>{money(totals.net, { sign: totals.net < 0 ? '-' : '' })}</div></div>
        </div>
        <div className="toolbar">
          <input type="search" placeholder="Search all entries" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
          <button className={`iconbtn ${filtersActive ? 'active' : ''}`} onClick={() => setShowFilters(s => !s)} aria-label="Filters"><FilterIcon /></button>
          <button className="iconbtn" onClick={exportCsv} aria-label="Download CSV" disabled={!visible.length}><DownloadIcon /></button>
        </div>
        {(showFilters || filtersActive) && (
          <>
            <div className="chips">
              {(['all', 'expense', 'income'] as const).map(t => (
                <button key={t} className={`chip ${filters.type === t ? 'active' : ''}`} onClick={() => setFilters({ ...filters, type: t })}>{t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}</button>
              ))}
              {filtersActive && <button className="chip" onClick={() => setFilters(EMPTY_FILTERS)}>✕ Clear</button>}
            </div>
            <div className="chips">
              {categories.filter(c => filters.type === 'all' || c.type === filters.type).map(c => (
                <button key={c.id} className={`chip ${filters.categoryId === c.id ? 'active' : ''}`} onClick={() => setFilters({ ...filters, categoryId: filters.categoryId === c.id ? null : c.id })}><CategoryIcon category={c} size={18} /> {c.name}</button>
              ))}
            </div>
            {tags.length > 0 && <TagPicker single selected={filters.tagId ? [filters.tagId] : []} onChange={ids => setFilters({ ...filters, tagId: ids[0] ?? null })} />}
          </>
        )}
      </div>

      <div className="content">
        {error && <div className="err">{error} <button className="link" onClick={refresh}>Retry</button></div>}
        {searching && <div className="note" style={{ margin: '4px 4px 0' }}>{visible.length} result{visible.length === 1 ? '' : 's'} for "{filters.q.trim()}" across all entries</div>}
        {visible.length === 0 && (
          <div className="empty">{loading ? 'Loading…' : searching ? 'No matches.' : 'Nothing here yet.'}</div>
        )}
        {[...groups.entries()].map(([mk, days]) => {
          const mt = dayTotals([...days.values()].flat())
          return (
            <div key={mk}>
              {mk !== 'all' && (
                <div className="month-head">
                  <span>{monthLabel(mk)}</span>
                  <span className="t" style={{ display: 'flex', gap: 10, fontVariantNumeric: 'tabular-nums' }}>
                    {mt.inc > 0 && <span className="inc">+{money(mt.inc)}</span>}
                    <span className="exp">−{money(mt.exp)}</span>
                  </span>
                </div>
              )}
              {[...days.entries()].map(([date, list]) => {
                const t = dayTotals(list)
                return (
                  <div className="day-group" key={date}>
                    <div className="day-head">
                      <span className="d">{dayLabel(date)}</span>
                      <span className="t">
                        {t.inc > 0 && <span className="inc">+{money(t.inc)}</span>}
                        {(t.exp > 0 || t.inc === 0) && <span className="exp">−{money(t.exp)}</span>}
                      </span>
                    </div>
                    {list.map(e => {
                      const c = catMap.get(e.category_id ?? '')
                      return (
                        <button className="row" key={e.id} onClick={() => setEditing(e)}>
                          <CategoryIcon category={c} />
                          <span className="main">
                            <div className="title">{e.note || c?.name || 'Uncategorised'}</div>
                            <div className="sub">
                              {e.note && c && <span>{c.name}</span>}
                              {e.author && <span>{e.note && c ? '· ' : ''}{e.author}</span>}
                              {e.photo_path && <span className="photo-ic"><PhotoIcon /></span>}
                              {e.tag_ids.map(id => tagMap.get(id)).filter(Boolean).map(t => <span key={t!.id} className="tagpill" style={{ background: t!.color + '26', color: t!.color }}>{t!.name}</span>)}
                            </div>
                          </span>
                          <span className={`amt ${e.type === 'income' ? 'inc' : ''}`}>{e.type === 'income' ? '+' : '−'}{money(e.amount)}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <button className="fab" onClick={() => setEditing('new')} aria-label="Add entry">+</button>
      {editing && (
        <EntryForm
          entry={editing === 'new' ? null : editing}
          defaultDate={period.kind === 'day' ? period.start.toISOString().slice(0, 10) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
