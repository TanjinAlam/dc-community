import React, { useState, useEffect } from 'react'

export default function SearchScreen() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const handleSearch = async () => {
    if (!query.trim()) return
    const found = await window.pear.search(query.trim())
    setResults(found || [])
  }

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-white font-bold text-lg mb-4">Search</h2>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm" placeholder="Search posts and comments..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <button onClick={handleSearch} className="bg-purple-600 text-white px-4 py-2 rounded text-sm">Search</button>
      </div>
      <div className="space-y-2 overflow-y-auto">
        {results.map(r => (
          <div key={r.id} className="p-3 bg-gray-800 rounded">
            <div className="text-gray-400 text-xs mb-1">{r.type} · {r.authorKey?.slice(0,8)}</div>
            <div className="text-white text-sm">{r.preview}</div>
          </div>
        ))}
        {results.length === 0 && query && <p className="text-gray-500 text-sm">No results found.</p>}
      </div>
    </div>
  )
}
