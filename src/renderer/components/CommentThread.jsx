import React, { useState, useEffect } from 'react'
import CommentNode from './CommentNode'

export default function CommentThread({ postId, communityKey }) {
  const [tree, setTree] = useState([])
  const [replyText, setReplyText] = useState('')

  const loadTree = () => window.pear.getCommentTree({ communityKey, postId }).then(setTree)
  useEffect(() => { loadTree() }, [postId, communityKey])

  const submitReply = async () => {
    if (!replyText.trim()) return
    await window.pear.postComment({ parentId: postId, communityKey, text: replyText.trim() })
    setReplyText('')
    loadTree()
  }

  return (
    <div className="mt-3 border-t border-gray-700 pt-3">
      {tree.map(c => <CommentNode key={c.id} comment={c} communityKey={communityKey} depth={0} onRefresh={loadTree} />)}
      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1"
          placeholder="Add a comment..."
          value={replyText} onChange={e => setReplyText(e.target.value)}
        />
        <button onClick={submitReply} className="bg-purple-600 text-white text-sm px-3 py-1 rounded">Reply</button>
      </div>
    </div>
  )
}
