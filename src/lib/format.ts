const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inrDec = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function money(n: number, opts: { sign?: '+' | '-' | ''; decimals?: boolean } = {}) {
  const abs = Math.abs(n)
  const body = opts.decimals || abs % 1 !== 0 ? inrDec.format(abs) : inr.format(abs)
  return `${opts.sign ?? ''}₹${body}`
}

export function pct(part: number, whole: number) {
  if (!whole) return '0%'
  return `${Math.round((part / whole) * 100)}%`
}
