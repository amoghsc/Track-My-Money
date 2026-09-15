import { useState } from 'react'
import { useStore } from './lib/store'
import { Login } from './views/Login'
import { SetPassword } from './views/SetPassword'
import { LogView, EMPTY_FILTERS, type Filters } from './views/LogView'
import { ChartsView } from './views/ChartsView'
import { SettingsView } from './views/SettingsView'
import { periodFor, type Period } from './lib/periods'
import { ChartIcon, GearIcon, ListIcon } from './components/Icons'
import type { EntryType } from './lib/types'

type Tab = 'log' | 'charts' | 'settings'

export default function App() {
  const { session, member, authLoading, recovery, settings, signOut } = useStore()
  const [tab, setTab] = useState<Tab>('log')
  const [period, setPeriod] = useState<Period>(() => periodFor('month', new Date(), settings.fyStartMonth))
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  if (authLoading) return <div className="spinner">…</div>
  if (!session) return <Login />
  if (recovery) return <SetPassword />
  if (member === null) {
    return (
      <div className="login">
        <h1>Not allowed</h1>
        <p>{session.user.email} isn't on the member list for this tracker.</p>
        <button className="btn secondary" onClick={signOut}>Sign out</button>
      </div>
    )
  }

  const pickCategory = (id: string, type: EntryType) => {
    setFilters({ ...EMPTY_FILTERS, type, categoryId: id })
    setTab('log')
  }

  return (
    <div className="app">
      {tab === 'log' && <LogView period={period} setPeriod={setPeriod} filters={filters} setFilters={setFilters} />}
      {tab === 'charts' && <ChartsView period={period} setPeriod={setPeriod} onPickCategory={pickCategory} />}
      {tab === 'settings' && <SettingsView />}
      <nav className="tabbar">
        <div className="tabbar-inner">
          <button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}><ListIcon />Log</button>
          <button className={`tab ${tab === 'charts' ? 'active' : ''}`} onClick={() => setTab('charts')}><ChartIcon />Charts</button>
          <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}><GearIcon />Settings</button>
        </div>
      </nav>
    </div>
  )
}
