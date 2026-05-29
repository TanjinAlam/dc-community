import React, { useState, useEffect } from 'react'
import CommentThread from './CommentThread'

export default function CommunityPostCard({ post, communityKey, isOwner }) {
  const [counts, setCounts] = useState({ up: 0, down: 0, score: 0 })
  const [myVote, setMyVote] = useState(0)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    if (!post.id) return
    window.pear.getVoteCounts(post.id).then(setCounts)
    window.pear.getMyVote(post.id).then(setMyVote)
  }, [post.id])

  const vote = async (value) => {
    await window.pear.castVote({ targetId: post.id, value })
    window.pear.getVoteCounts(post.id).then(setCounts)
    window.pear.getMyVote(post.id).then(setMyVote)
  }

  const handleRemove = async () => {
    if (!isOwner) return
    await window.pear.removePost({ targetId: post.id, communityKeyHex: communityKey, reason: 'Removed by moderator' })
  }

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => vote(1)} className={`text-lg ${myVote === 1 ? 'text-orange-400' : 'text-gray-500 hover:text-orange-400'}`}>▲</button>
          <span className={`text-sm font-bold ${counts.score > 0 ? 'text-orange-400' : counts.score < 0 ? 'text-blue-400' : 'text-gray-400'}`}>{counts.score}</span>
          <button onClick={() => vote(-1)} className={`text-lg ${myVote === -1 ? 'text-blue-400' : 'text-gray-500 hover:text-blue-400'}`}>▼</button>
        </div>
        <div className="flex-1">
          <div className="text-gray-400 text-xs mb-1">{post.author?.slice(0, 12) || 'unknown'}</div>
          <div className="text-white">{post.text}</div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowComments(!showComments)} className="text-gray-400 hover:text-white text-xs">
              💬 Comments
            </button>
            {isOwner && <button onClick={handleRemove} className="text-red-500 hover:text-red-400 text-xs">Remove</button>}
          </div>
          {showComments && <CommentThread postId={post.id} communityKey={communityKey} />}
        </div>
      </div>
    </div>
  )
}
