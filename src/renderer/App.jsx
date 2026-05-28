import { useState, useEffect } from 'react'
import SetupScreen from './components/SetupScreen'
import MainScreen from './components/MainScreen'

export default function App() {
  const [profile, setProfile] = useState(undefined)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!window.pear) {
      setError('window.pear not available — preload script may not have loaded.')
      return
    }
    window.pear.getMyProfile().then(p => setProfile(p)).catch(e => setError(String(e)))
  }, [])

  if (error) return (
    <div style={{ padding: 32, fontFamily: 'monospace', color: 'red' }}>
      <b>Preload error:</b> {error}
    </div>
  )

  if (profile === undefined) return (
    <div style={{ padding: 32, fontFamily: 'monospace', color: '#666' }}>Loading…</div>
  )

  if (!profile) return <SetupScreen onSetup={setProfile} />

  return <MainScreen profile={profile} />
}
