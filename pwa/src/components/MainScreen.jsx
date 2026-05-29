import { useState, useEffect } from 'react'
import PostCard from './PostCard'
import AddFriendModal from './AddFriendModal'

export default function MainScreen({ ws, profile }) {
  const [feed, setFeed] = useState([])
  const [postText, setPostText] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)

  useEffect(() => {
    ws.send('get-feed', {})
    ws.on('feed-response', (data) => setFeed(data || []))
    ws.on('feed-update', (data) => setFeed(data || []))
  }, [])

  function handlePost(e) {
    e.preventDefault()
    if (!postText.trim()) return
    ws.send('create-post', { text: postText.trim() })
    setPostText('')
    setTimeout(() => ws.send('get-feed', {}), 300)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Pear Social</h1>
        <button onClick={() => setShowAddFriend(true)} className="text-sm text-purple-600 font-medium">+ Friend</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {feed.length === 0 && <div className="text-gray-400 text-sm text-center mt-8">No posts yet.</div>}
        {feed.map((post, i) => <PostCard key={post.id || i} post={post} />)}
      </div>
      <form onSubmit={handlePost} className="bg-white border-t px-4 py-3 flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="What's on your mind?"
          value={postText}
          onChange={e => setPostText(e.target.value)}
        />
        <button type="submit" disabled={!postText.trim()} className="bg-purple-600 text-white rounded-lg px-4 text-sm font-medium disabled:opacity-50">Post</button>
      </form>
      {showAddFriend && <AddFriendModal ws={ws} onClose={() => setShowAddFriend(false)} />}
    </div>
  )
}
