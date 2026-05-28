import { useState, useEffect } from 'react'
import PostCard from './PostCard'
import AddFriendModal from './AddFriendModal'

function initials(name) {
  return name ? name.slice(0, 2).toUpperCase() : '??'
}

function truncateKey(key, len = 8) {
  if (!key) return '...'
  return key.slice(0, len) + '...'
}

export default function MainScreen({ profile }) {
  const [feed, setFeed] = useState([])
  const [friends, setFriends] = useState([])
  const [myKey, setMyKey] = useState('')
  const [postText, setPostText] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)

  useEffect(() => {
    loadAll()
    window.pear.onFeedUpdate(() => loadFeed())
  }, [])

  async function loadAll() {
    const [f, fr, key] = await Promise.all([
      window.pear.getFeed(),
      window.pear.getFriends(),
      window.pear.getMyKey(),
    ])
    setFeed(f)
    setFriends(fr)
    setMyKey(key)
  }

  async function loadFeed() {
    const f = await window.pear.getFeed()
    setFeed(f)
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!postText.trim()) return
    await window.pear.createPost(postText.trim())
    setPostText('')
    loadFeed()
  }

  async function handleAddFriend(pubkey) {
    await window.pear.addFriend(pubkey)
    const fr = await window.pear.getFriends()
    setFriends(fr)
    setShowAddFriend(false)
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col p-4 gap-4 flex-shrink-0">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initials(profile?.name || '')}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{profile?.name}</div>
            <div className="text-xs text-gray-400 truncate">{truncateKey(myKey)}</div>
          </div>
        </div>

        <hr className="border-gray-700" />

        {/* Add friend button */}
        <button
          onClick={() => setShowAddFriend(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg py-2 font-medium"
        >
          + Add Friend
        </button>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Friends</div>
          {friends.length === 0 && (
            <div className="text-xs text-gray-500">No friends yet</div>
          )}
          {friends.map((f, i) => (
            <div key={i} className="text-xs text-gray-300 py-1 truncate">
              {truncateKey(f, 12)}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Feed</h1>
        </div>

        {/* Post composer */}
        <div className="bg-white border-b px-6 py-4">
          <form onSubmit={handlePost} className="flex gap-3">
            <textarea
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="What's on your mind?"
              rows={2}
              value={postText}
              onChange={e => setPostText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!postText.trim()}
              className="bg-purple-600 text-white rounded-lg px-5 text-sm font-medium self-end py-2 disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {feed.length === 0 && (
            <div className="text-gray-400 text-sm text-center mt-8">No posts yet. Be the first!</div>
          )}
          {feed.map((post, i) => <PostCard key={post.id || i} post={post} />)}
        </div>
      </main>

      {showAddFriend && (
        <AddFriendModal onAdd={handleAddFriend} onClose={() => setShowAddFriend(false)} />
      )}
    </div>
  )
}
