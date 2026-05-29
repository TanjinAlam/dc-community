import React, { useState, useEffect } from 'react'
import CreateCommunityModal from '../components/CreateCommunityModal'
import CommunityFeedScreen from './CommunityFeedScreen'
import DiscoverScreen from './DiscoverScreen'

export default function CommunitiesScreen() {
  const [communities, setCommunities] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)
  const [activeCommunity, setActiveCommunity] = useState(null)

  useEffect(() => {
    window.pear.getCommunities().then(setCommunities)
  }, [])

  if (showDiscover) return <DiscoverScreen onBack={() => setShowDiscover(false)} />
  if (activeCommunity) return <CommunityFeedScreen community={activeCommunity} onBack={() => setActiveCommunity(null)} />

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowCreate(true)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm">+ Create</button>
        <button onClick={() => setShowDiscover(true)} className="border border-purple-600 text-purple-400 px-3 py-1 rounded text-sm">Discover</button>
      </div>
      <div className="space-y-2">
        {communities.map(c => (
          <div key={c.communityKey} onClick={() => setActiveCommunity(c)} className="p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-700">
            <div className="text-white font-medium">{c.name}</div>
            <div className="text-gray-400 text-xs">{c.role}</div>
          </div>
        ))}
        {communities.length === 0 && <p className="text-gray-500 text-sm">No communities yet. Create or discover one.</p>}
      </div>
      {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} onCreated={(c) => { setCommunities(prev => [...prev, c]); setShowCreate(false) }} />}
    </div>
  )
}
