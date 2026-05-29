import React, { useState, useEffect } from 'react'

export default function DiscoverScreen({ onBack }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const handleSearch = async () => {
    const found = query.trim()
      ? await window.pear.searchCommunities(query.trim())
      : await window.pear.listCommunities()
    setResults(found || [])
  }

  useEffect(() => { window.pear.listCommunities().then(r => setResults(r || [])) }, [])

  const join = async (communityKey) => {
    await window.pear.joinCommunity(communityKey)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-white font-bold flex-1">Discover Communities</h2>
      </div>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm" placeholder="Search communities..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <button onClick={handleSearch} className="bg-purple-600 text-white px-4 py-2 rounded text-sm">Search</button>
      </div>
      <div className="space-y-2 overflow-y-auto">
        {results.map(c => (
          <div key={c.communityKey} className="p-3 bg-gray-800 rounded flex items-center justify-between">
            <div>
              <div className="text-white font-medium">{c.name}</div>
              <div className="text-gray-400 text-xs">{c.description}</div>
            </div>
            <button onClick={() => join(c.communityKey)} className="bg-purple-600 text-white text-xs px-3 py-1 rounded ml-3">Join</button>
          </div>
        ))}
        {results.length === 0 && <p className="text-gray-500 text-sm">No communities found.</p>}
      </div>
    </div>
  )
}
