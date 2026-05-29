import { useState } from 'react'

export default function SetupScreen({ ws, onSetup }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    ws.send('set-profile', { name: name.trim() })
    ws.on('profile-set', (data) => onSetup(data))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-80">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Pear</h1>
        <p className="text-sm text-gray-500 mb-6">No servers. Peer-to-peer.</p>
        <form onSubmit={handleSubmit}>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-purple-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Setting up…' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}
