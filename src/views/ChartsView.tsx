import { useMemo } from 'react'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { eachDayOfInterval, eachMonthOfInterval, format, differenceInDays } from 'date-fns'
import { useStore } from '../lib/store'
import { inPeriod, toISODate, type Period, shiftPeriod } from '../lib/periods'
import { money, pct } from '../lib/format'
import { PeriodNav } from '../components/PeriodNav'
import type { Entry, EntryType } from '../lib/types'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler)

interface Props { period: Period; setPeriod: (p: Period) => void; onPickCategory: (id: string, type: EntryType) => void }

function useCss(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function ChartsView({ period, setPeriod, onPickCategory }: Props) {
  const { entries, catMap, settings } = useStore()
  const muted = useCss('--muted'), line = useCss('--line'), expC = useCss('--expense'), incC = useCss('--income'), accent = useCss('--accent')

  const inRange = useMemo(() => entries.filter(e => inPeriod(e.date, period)), [entries, period])
  const prev = useMemo(() => shiftPeriod(period, -1, settings.fyStartMonth), [period, settings.fyStartMonth])
  const inPrev = useMemo(() => entries.filter(e => inPeriod(e.date, prev)), [entries, prev])

  const byCat = (list: Entry[], type: EntryType) => {
    const m = new Map<string, number>()
    for (const e of list) if (e.type === type) m.set(e.category_id ?? '', (m.get(e.category_id ?? '') ?? 0) + e.amount)
    return [...m.entries()].map(([id, amt]) => ({ id, amt, cat: catMap.get(id) })).sort((a, b) => b.amt - a.amt)
  }
  const expCats = useMemo(() => byCat(inRange, 'expense'), [inRange, catMap]) // eslint-disable-line react-hooks/exhaustive-deps
  const incCats = useMemo(() => byCat(inRange, 'income'), [inRange, catMap]) // eslint-disable-line react-hooks/exhaustive-deps
  const expTotal = expCats.reduce((s, x) => s + x.amt, 0)
  const incTotal = incCats.reduce((s, x) => s + x.amt, 0)

  // buckets: days for day/week/month, months for year/fy
  const buckets = useMemo(() => {
    const monthly = period.kind === 'year' || period.kind === 'fy'
    const keys = monthly
      ? eachMonthOfInterval({ start: period.start, end: period.end }).map(d => format(d, 'yyyy-MM'))
      : eachDayOfInterval({ start: period.start, end: period.end }).map(toISODate)
    const labels = monthly ? keys.map(k => format(new Date(k + '-01'), 'MMM')) : keys.map(k => format(new Date(k), period.kind === 'month' ? 'd' : 'EEE'))
    const exp = keys.map(() => 0), inc = keys.map(() => 0)
    for (const e of inRange) {
      const k = monthly ? e.date.slice(0, 7) : e.date
      const i = keys.indexOf(k)
      if (i >= 0) (e.type === 'income' ? inc : exp)[i] += e.amount
    }
    return { labels, exp, inc, keys }
  }, [inRange, period])

  // cumulative expense this period vs previous, by day index
  const cumulative = useMemo(() => {
    const n = differenceInDays(period.end, period.start) + 1
    const build = (list: Entry[], start: Date) => {
      const arr = Array(n).fill(0)
      for (const e of list) if (e.type === 'expense') { const i = differenceInDays(new Date(e.date), start); if (i >= 0 && i < n) arr[i] += e.amount }
      let s = 0
      return arr.map(v => (s += v))
    }
    return { labels: Array.from({ length: n }, (_, i) => String(i + 1)), cur: build(inRange, period.start), prev: build(inPrev, prev.start) }
  }, [inRange, inPrev, period, prev])

  const donut = (rows: typeof expCats, total: number, type: EntryType) => (
    <>
      {rows.length === 0 ? <div className="empty" style={{ padding: 24 }}>No {type}s</div> : (
        <>
          <div style={{ maxWidth: 220, margin: '0 auto' }}>
            <Doughnut
              data={{ labels: rows.map(r => r.cat?.name ?? '—'), datasets: [{ data: rows.map(r => r.amt), backgroundColor: rows.map(r => r.cat?.color ?? '#9ca3af'), borderWidth: 0 }] }}
              options={{ cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${money(c.parsed)} (${pct(c.parsed, total)})` } } }, onClick: (_, els) => { if (els[0]) onPickCategory(rows[els[0].index].id, type) } }}
            />
          </div>
          <div className="legend">
            {rows.map(r => (
              <button key={r.id} onClick={() => onPickCategory(r.id, type)}>
                <span className="emoji-badge" style={{ width: 30, height: 30, fontSize: 15, background: (r.cat?.color ?? '#9ca3af') + '33' }}>{r.cat?.emoji ?? '❓'}</span>
                <span style={{ minWidth: 110, fontSize: 13 }}>{r.cat?.name ?? 'Uncategorised'}</span>
                <span className="bar"><i style={{ width: pct(r.amt, total), background: r.cat?.color ?? '#9ca3af' }} /></span>
                <span className="a">{money(r.amt)}</span>
                <span className="p">{pct(r.amt, total)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )

  const axis = { grid: { color: line }, ticks: { color: muted, font: { size: 11 } } }

  return (
    <>
      <div className="topbar"><PeriodNav period={period} onChange={setPeriod} /></div>
      <div className="content">
        <div className="chart-card">
          <h3>Expenses by category · <span className="exp">{money(expTotal)}</span></h3>
          {donut(expCats, expTotal, 'expense')}
        </div>
        <div className="chart-card">
          <h3>Income vs expenses</h3>
          <Bar
            data={{ labels: buckets.labels, datasets: [
              { label: 'Expenses', data: buckets.exp, backgroundColor: expC, borderRadius: 4 },
              { label: 'Income', data: buckets.inc, backgroundColor: incC, borderRadius: 4 },
            ] }}
            options={{ responsive: true, plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${money(c.parsed.y ?? 0)}` } } }, scales: { x: { ...axis, grid: { display: false } }, y: { ...axis, ticks: { ...axis.ticks, callback: v => money(Number(v)) } } } }}
          />
        </div>
        {period.kind !== 'day' && (
          <div className="chart-card">
            <h3>Cumulative spend vs previous {period.kind === 'fy' ? 'FY' : period.kind}</h3>
            <Line
              data={{ labels: cumulative.labels, datasets: [
                { label: period.label, data: cumulative.cur, borderColor: accent, backgroundColor: accent + '22', fill: true, tension: .3, pointRadius: 0 },
                { label: prev.label, data: cumulative.prev, borderColor: muted, borderDash: [4, 4], tension: .3, pointRadius: 0 },
              ] }}
              options={{ responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${money(c.parsed.y ?? 0)}` } } }, scales: { x: { ...axis, grid: { display: false }, ticks: { ...axis.ticks, maxTicksLimit: 8 } }, y: { ...axis, ticks: { ...axis.ticks, callback: v => money(Number(v)) } } } }}
            />
          </div>
        )}
        <div className="chart-card">
          <h3>Income by category · <span className="inc">{money(incTotal)}</span></h3>
          {donut(incCats, incTotal, 'income')}
        </div>
      </div>
    </>
  )
}
