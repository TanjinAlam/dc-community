import { useState, useEffect, useRef } from 'react'
import SetupScreen from './components/SetupScreen'
import MainScreen from './components/MainScreen'

export default function App() {
  const [phase, setPhase] = useState('loading') // 'loading' | 'setup' | 'main'
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const resolvedRef = useRef(false) // prevent double-resolve

  useEffect(() => {
    if (!window.pear) {
      setError('Preload not available.')
      return
    }

    async function onReady() {
      if (resolvedRef.current) return
      resolvedRef.current = true
      try {
        const p = await window.pear.getMyProfile()
        setProfile(p)
        setPhase(p ? 'main' : 'setup')
      } catch (e) {
        setError(String(e))
      }
    }

    // Path 1: listen for the event (normal case)
    window.pear.onP2PReady(onReady)

    // Path 2: poll — handles the race where the event fired before this
    // component mounted and registered the once-listener above
    const poll = setInterval(async () => {
      try {
        const { ready } = await window.pear.checkP2PReady()
        if (ready) { clearInterval(poll); onReady() }
      } catch {}
    }, 300)

    // Path 3: hard timeout — if init hangs for 15s, proceed anyway
    // (user will see mock data but app won't be stuck forever)
    const timeout = setTimeout(() => {
      clearInterval(poll)
      onReady()
    }, 15000)

    return () => { clearInterval(poll); clearTimeout(timeout) }
  }, [])

  if (error) return (
    <div style={{ padding: 32, fontFamily: 'monospace', color: 'red' }}>
      <b>Error:</b> {error}
    </div>
  )

  if (phase === 'loading') return (
    <div style={{
      minHeight: '100vh', background: '#1e1b4b',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ fontSize: 40 }}>🍐</div>
      <div style={{ color: '#a78bfa', fontSize: 20, fontWeight: 700 }}>Pear Social</div>
      <div style={{ color: '#6b7280', fontSize: 13 }}>Connecting to the network…</div>
    </div>
  )

  if (phase === 'setup') return (
    <SetupScreen onSetup={p => { setProfile(p); setPhase('main') }} />
  )

  return <MainScreen profile={profile} />
}
