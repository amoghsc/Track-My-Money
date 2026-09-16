export type Theme = 'light' | 'dark'
export interface Settings {
  fyStartMonth: number // 0 = Jan, 3 = Apr (fixed; no UI)
  theme: Theme
}
const KEY = 'xp.settings'
export function loadSettings(): Settings {
  try {
    return { fyStartMonth: 3, theme: 'light', ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { fyStartMonth: 3, theme: 'light' }
  }
}
export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f4f5f7')
}
