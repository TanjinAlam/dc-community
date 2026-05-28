import { useState } from 'react'

export default function SetupScreen({ onSetup }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const result = await window.pear.setMyProfile(name.trim())
    onSetup(result)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-80">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Pear</h1>
        <p className="text-sm text-gray-500 mb-6">A peer-to-peer social network. No servers.</p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            placeholder="e.g. Rahim"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-purple-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}
