import {
  addDays, addMonths, addYears, endOfMonth, endOfWeek, endOfYear, format, isSameDay,
  startOfMonth, startOfWeek, startOfYear, parseISO, isWithinInterval, startOfDay,
} from 'date-fns'

export type PeriodKind = 'day' | 'week' | 'month' | 'year' | 'fy'
export const PERIOD_KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'day', label: 'Day' },
  { kind: 'week', label: 'Week' },
  { kind: 'month', label: 'Month' },
  { kind: 'year', label: 'Year' },
  { kind: 'fy', label: 'FY' },
]

export interface Period {
  kind: PeriodKind
  start: Date
  end: Date // inclusive, start of last day
  label: string
}

/** fyStartMonth: 0 = Jan … 3 = April */
export function periodFor(kind: PeriodKind, anchor: Date, fyStartMonth: number): Period {
  const a = startOfDay(anchor)
  switch (kind) {
    case 'day':
      return { kind, start: a, end: a, label: isSameDay(a, new Date()) ? `Today, ${format(a, 'd MMM')}` : format(a, 'EEE, d MMM yyyy') }
    case 'week': {
      const start = startOfWeek(a, { weekStartsOn: 1 })
      const end = startOfDay(endOfWeek(a, { weekStartsOn: 1 }))
      const sameMonth = start.getMonth() === end.getMonth()
      return { kind, start, end, label: `${format(start, sameMonth ? 'd' : 'd MMM')} – ${format(end, 'd MMM yyyy')}` }
    }
    case 'month':
      return { kind, start: startOfMonth(a), end: startOfDay(endOfMonth(a)), label: format(a, 'MMMM yyyy') }
    case 'year':
      return { kind, start: startOfYear(a), end: startOfDay(endOfYear(a)), label: format(a, 'yyyy') }
    case 'fy': {
      const y = a.getMonth() >= fyStartMonth ? a.getFullYear() : a.getFullYear() - 1
      const start = new Date(y, fyStartMonth, 1)
      const end = startOfDay(addDays(addYears(start, 1), -1))
      const label = fyStartMonth === 0 ? `FY ${y}` : `FY ${y}–${String(y + 1).slice(2)}`
      return { kind, start, end, label }
    }
  }
}

export function shiftPeriod(p: Period, dir: 1 | -1, fyStartMonth: number): Period {
  let anchor: Date
  switch (p.kind) {
    case 'day': anchor = addDays(p.start, dir); break
    case 'week': anchor = addDays(p.start, 7 * dir); break
    case 'month': anchor = addMonths(p.start, dir); break
    case 'year': anchor = addYears(p.start, dir); break
    case 'fy': anchor = addYears(p.start, dir); break
  }
  return periodFor(p.kind, anchor, fyStartMonth)
}

export function inPeriod(dateStr: string, p: Period) {
  return isWithinInterval(parseISO(dateStr), { start: p.start, end: p.end })
}

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')
export const today = () => toISODate(new Date())

/** Human label for a YYYY-MM-DD day header */
export function dayLabel(dateStr: string) {
  const d = parseISO(dateStr)
  const now = new Date()
  if (isSameDay(d, now)) return 'Today'
  if (isSameDay(d, addDays(now, -1))) return 'Yesterday'
  return format(d, d.getFullYear() === now.getFullYear() ? 'EEE, d MMM' : 'EEE, d MMM yyyy')
}

export function monthKey(dateStr: string) { return dateStr.slice(0, 7) }
export function monthLabel(key: string) { return format(parseISO(key + '-01'), 'MMMM yyyy') }
