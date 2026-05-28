import { useState } from 'react'

export default function AddFriendModal({ onAdd, onClose }) {
  const [pubkey, setPubkey] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!pubkey.trim()) return
    setLoading(true)
    await onAdd(pubkey.trim())
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add Friend</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleAdd}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Public key</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            placeholder="Paste their public key (64 hex chars)"
            value={pubkey}
            onChange={e => setPubkey(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!pubkey.trim() || loading}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
