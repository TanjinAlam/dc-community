import React, { useState, useEffect } from 'react'

export default function CommentNode({ comment, communityKey, depth, onRefresh }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [counts, setCounts] = useState({ up: 0, down: 0, score: 0 })

  useEffect(() => {
    if (comment.id) window.pear.getVoteCounts(comment.id).then(setCounts)
  }, [comment.id])

  const vote = async (value) => {
    await window.pear.castVote({ targetId: comment.id, value })
    window.pear.getVoteCounts(comment.id).then(setCounts)
  }

  const submitReply = async () => {
    if (!replyText.trim()) return
    await window.pear.postComment({ parentId: comment.id, communityKey, text: replyText.trim() })
    setReplyText('')
    setShowReply(false)
    onRefresh()
  }

  return (
    <div style={{ marginLeft: depth * 16 }} className="border-l border-gray-700 pl-3 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => vote(1)} className="text-gray-500 hover:text-orange-400 text-xs">▲</button>
        <span className="text-gray-400 text-xs">{counts.score}</span>
        <button onClick={() => vote(-1)} className="text-gray-500 hover:text-blue-400 text-xs">▼</button>
        <span className="text-gray-500 text-xs">{comment.author?.slice(0, 8)}</span>
      </div>
      <p className="text-white text-sm">{comment.text}</p>
      {depth < 5 && (
        <button onClick={() => setShowReply(!showReply)} className="text-gray-400 hover:text-white text-xs mt-1">Reply</button>
      )}
      {showReply && (
        <div className="flex gap-2 mt-1">
          <input className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1" value={replyText} onChange={e => setReplyText(e.target.value)} />
          <button onClick={submitReply} className="bg-purple-600 text-white text-xs px-2 py-1 rounded">Post</button>
        </div>
      )}
      {(comment.replies || []).map(r => <CommentNode key={r.id} comment={r} communityKey={communityKey} depth={depth + 1} onRefresh={onRefresh} />)}
    </div>
  )
}
