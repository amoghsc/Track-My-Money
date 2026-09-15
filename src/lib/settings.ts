export interface Settings {
  fyStartMonth: number // 0 = Jan, 3 = Apr
}
const KEY = 'xp.settings'
export function loadSettings(): Settings {
  try {
    return { fyStartMonth: 3, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { fyStartMonth: 3 }
  }
}
export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}
