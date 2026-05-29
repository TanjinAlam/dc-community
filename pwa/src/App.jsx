import { useState, useEffect, useRef } from 'react'
import { createWsClient } from './ws'
import SetupScreen from './components/SetupScreen'
import MainScreen from './components/MainScreen'

const WS_URL = `ws://${window.location.hostname}:${window.location.port || 7777}`

export default function App() {
  const [profile, setProfile] = useState(undefined)
  const wsRef = useRef(null)

  useEffect(() => {
    const client = createWsClient(WS_URL)
    wsRef.current = client

    client.on('profile-response', (data) => {
      setProfile(data)
    })

    setTimeout(() => {
      client.send('get-profile', {})
    }, 500)
  }, [])

  if (profile === undefined) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Connecting…
    </div>
  )

  if (!profile) return <SetupScreen ws={wsRef.current} onSetup={setProfile} />

  return <MainScreen ws={wsRef.current} profile={profile} />
}
