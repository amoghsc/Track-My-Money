import 'chart.js'
declare module 'chart.js' {
  interface PluginOptionsByType<TType> {
    centreText?: { label: string; value: string; color: string; muted: string }
  }
}
