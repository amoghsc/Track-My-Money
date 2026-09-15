import { PERIOD_KINDS, periodFor, shiftPeriod, type Period, type PeriodKind } from '../lib/periods'
import { useStore } from '../lib/store'

export function PeriodNav({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const { settings } = useStore()
  const setKind = (kind: PeriodKind) => {
    // keep the anchor inside the current period if possible, else today
    const anchor = period.start <= new Date() && period.end >= new Date() ? new Date() : period.start
    onChange(periodFor(kind, anchor, settings.fyStartMonth))
  }
  return (
    <>
      <div className="seg">
        {PERIOD_KINDS.map(k => (
          <button key={k.kind} className={period.kind === k.kind ? 'active' : ''} onClick={() => setKind(k.kind)}>{k.label}</button>
        ))}
      </div>
      <div className="period-nav">
        <button aria-label="Previous" onClick={() => onChange(shiftPeriod(period, -1, settings.fyStartMonth))}>‹</button>
        <button className="label" onClick={() => onChange(periodFor(period.kind, new Date(), settings.fyStartMonth))}>{period.label}</button>
        <button aria-label="Next" onClick={() => onChange(shiftPeriod(period, 1, settings.fyStartMonth))}>›</button>
      </div>
    </>
  )
}
