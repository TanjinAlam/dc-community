import React, { useState, useEffect } from 'react'
import CommunityPostCard from '../components/CommunityPostCard'

export default function CommunityFeedScreen({ community, onBack }) {
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    window.pear.getCommunityFeed(community.communityKey).then(setPosts)
    window.pear.onFeedUpdate?.(() => window.pear.getCommunityFeed(community.communityKey).then(setPosts))
  }, [community.communityKey])

  const handlePost = async () => {
    if (!text.trim()) return
    await window.pear.submitPost({ text: text.trim(), communityKeyHex: community.communityKey })
    setText('')
    window.pear.getCommunityFeed(community.communityKey).then(setPosts)
  }

  const handleShare = () => {
    navigator.clipboard?.writeText(`pear-social://community/${community.communityKey}`)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-gray-700">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-white font-bold flex-1">{community.name}</h2>
        <button onClick={handleShare} className="text-purple-400 text-sm">Share Link</button>
      </div>
      <div className="p-4 border-b border-gray-700">
        <textarea
          className="w-full bg-gray-800 text-white rounded p-2 text-sm resize-none"
          rows={2} placeholder="Post to community..."
          value={text} onChange={e => setText(e.target.value)}
        />
        <button onClick={handlePost} className="mt-2 bg-purple-600 text-white px-4 py-1 rounded text-sm">Post</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {posts.map(p => <CommunityPostCard key={p.id || p.ts} post={p} communityKey={community.communityKey} isOwner={community.role === 'owner'} />)}
      </div>
    </div>
  )
}
