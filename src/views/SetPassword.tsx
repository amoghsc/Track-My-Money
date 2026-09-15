import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../lib/store'

export function SetPassword() {
  const { setRecovery, session } = useStore()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw !== pw2) { setErr('Passwords do not match'); return }
    setBusy(true); setErr(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      history.replaceState(null, '', location.pathname)
      setRecovery(false)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>New password</h1>
      <p>for {session?.user.email}</p>
      <div className="field"><label>New password</label><input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} autoFocus /></div>
      <div className="field"><label>Repeat it</label><input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} required minLength={6} /></div>
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={busy}>{busy ? '…' : 'Save password'}</button>
      <p style={{ marginTop: 16, textAlign: 'center' }}><button type="button" className="link" onClick={() => setRecovery(false)}>Skip, keep me signed in</button></p>
    </form>
  )
}
