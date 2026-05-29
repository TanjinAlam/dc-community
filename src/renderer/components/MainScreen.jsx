import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Phone, Video, UserMinus } from 'lucide-react'
import PostCard from './PostCard'
import AddFriendModal from './AddFriendModal'
import CommunitiesScreen from '../screens/CommunitiesScreen'
import SearchScreen from '../screens/SearchScreen'
import ChatScreen from '../screens/ChatScreen'
import IncomingCallModal from './IncomingCallModal'
import CallScreen from './CallScreen'
import CallHistory from './CallHistory'

function initials(name) {
  return name ? name.slice(0, 2).toUpperCase() : '??'
}

function truncateKey(key, len = 8) {
  if (!key) return '...'
  return key.slice(0, len) + '...'
}

const TABS = ['Home', 'Communities', 'Chat', 'Search', 'Profile']

export default function MainScreen({ profile }) {
  const [activeTab, setActiveTab] = useState('Home')
  const [activeCall, setActiveCall] = useState(null)
  const [feed, setFeed] = useState([])
  const [friends, setFriends] = useState([])
  const [friendNames, setFriendNames] = useState({}) // pubkey → name
  const [myKey, setMyKey] = useState('')
  const [postText, setPostText] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showMyQR, setShowMyQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState(null)

  useEffect(() => {
    loadAll()
    window.pear.onFeedUpdate(() => loadFeed())
  }, [])

  useEffect(() => {
    if (profile?.driveKey) {
      window.pear.getAvatar(profile.driveKey).then(result => {
        if (result) {
          setAvatarDataUrl(`data:${result.mimeType};base64,${result.base64}`)
        }
      })
    } else {
      setAvatarDataUrl(null)
    }
  }, [profile?.driveKey])

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 512 * 1024) {
      alert('Image must be under 512KB')
      return
    }
    const arrayBuffer = await file.arrayBuffer()
    await window.pear.setAvatar(arrayBuffer, file.type)
    const updatedProfile = await window.pear.getMyProfile()
    if (updatedProfile?.driveKey) {
      const result = await window.pear.getAvatar(updatedProfile.driveKey)
      if (result) setAvatarDataUrl(`data:${result.mimeType};base64,${result.base64}`)
    }
  }

  async function loadAll() {
    const [f, fr, key] = await Promise.all([
      window.pear.getFeed(),
      window.pear.getFriends(),
      window.pear.getMyKey(),
    ])
    setFeed(f)
    setFriends(fr)
    setMyKey(key)
    // Load friend names
    if (fr?.length) {
      const entries = await Promise.all(
        fr.map(async pk => {
          const p = await window.pear.getFriendProfile?.(pk)
          return [pk, p?.name || null]
        })
      )
      setFriendNames(Object.fromEntries(entries))
    }
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

  async function handleShowMyQR() {
    if (myKey) {
      const url = await QRCode.toDataURL('pear-social://add/' + myKey)
      setQrDataUrl(url)
    }
    setShowMyQR(true)
  }

  const startAudioCall = async (friendKey) => {
    const result = await window.pear.startCall({ participantKeys: [friendKey], isVideo: false })
    setActiveCall({ callId: result.callId, participants: [myKey, friendKey], isVideo: false, callerKey: myKey })
  }

  const startVideoCall = async (friendKey) => {
    const result = await window.pear.startCall({ participantKeys: [friendKey], isVideo: true })
    setActiveCall({ callId: result.callId, participants: [myKey, friendKey], isVideo: true, callerKey: myKey })
  }

  async function handleAddFriend(pubkey) {
    await window.pear.addFriend(pubkey)
    const fr = await window.pear.getFriends()
    setFriends(fr)
    setShowAddFriend(false)
  }

  async function handleRemoveFriend(pubkey) {
    if (!confirm(`Remove ${friendNames[pubkey] || pubkey.slice(0, 16) + '…'} from friends?`)) return
    await window.pear.removeFriend(pubkey)
    setFriends(prev => prev.filter(f => f !== pubkey))
    setFriendNames(prev => { const n = { ...prev }; delete n[pubkey]; return n })
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col p-4 gap-4 flex-shrink-0">
        {/* Identity */}
        <div className="flex items-center gap-3">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {initials(profile?.name || '')}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{profile?.name}</div>
            <div className="text-xs text-gray-400 truncate">{truncateKey(myKey)}</div>
          </div>
        </div>
        <label className="cursor-pointer text-xs text-purple-400 hover:text-purple-300">
          Change avatar
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </label>

        <hr className="border-gray-700" />

        {/* Add friend button */}
        <button
          onClick={() => setShowAddFriend(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg py-2 font-medium"
        >
          + Add Friend
        </button>

        {/* My QR Code button */}
        <button
          onClick={handleShowMyQR}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg py-2 font-medium"
        >
          My QR Code
        </button>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Friends</div>
          {friends.length === 0 && (
            <div className="text-xs text-gray-500">No friends yet</div>
          )}
          {friends.map((f, i) => (
            <div key={i} className="flex items-center gap-1 text-xs text-gray-300 py-1 group">
              <span className="flex-1 truncate">{friendNames[f] || truncateKey(f, 12)}</span>
              <button onClick={() => startAudioCall(f)} title="Voice call" className="text-gray-400 hover:text-green-400 flex-shrink-0">
                <Phone size={14} />
              </button>
              <button onClick={() => startVideoCall(f)} title="Video call" className="text-gray-400 hover:text-blue-400 flex-shrink-0">
                <Video size={14} />
              </button>
              <button
                onClick={() => handleRemoveFriend(f)}
                title="Remove friend"
                className="text-gray-600 hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <UserMinus size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tab navigation */}
        <div className="bg-white border-b flex">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Home' && (
          <>
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
          </>
        )}

        {activeTab === 'Communities' && (
          <div className="flex-1 overflow-hidden bg-gray-900">
            <CommunitiesScreen />
          </div>
        )}

        {activeTab === 'Chat' && (
          <div className="flex-1 overflow-hidden bg-gray-900">
            <ChatScreen />
          </div>
        )}

        {activeTab === 'Search' && (
          <div className="flex-1 overflow-hidden bg-gray-900">
            <SearchScreen />
          </div>
        )}

        {activeTab === 'Profile' && (
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-900">
            <h2 className="text-white text-xl font-bold mb-4">Profile</h2>
            <div className="flex items-center gap-4 mb-4">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold text-white">
                  {initials(profile?.name || '')}
                </div>
              )}
              <div>
                <div className="text-white font-medium text-lg">{profile?.name}</div>
                <div className="text-gray-400 text-xs break-all">{myKey}</div>
              </div>
            </div>
            <label className="cursor-pointer text-sm text-purple-400 hover:text-purple-300">
              Change avatar
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <div className="mt-6">
              <CallHistory />
            </div>
          </div>
        )}
      </main>

      <IncomingCallModal onAccepted={(call) => setActiveCall({ callId: call.callId, participants: call.participants, isVideo: call.isVideo, callerKey: call.callerKey })} />

      {activeCall && (
        <CallScreen
          callId={activeCall.callId}
          participants={activeCall.participants}
          isVideo={activeCall.isVideo}
          callerKey={activeCall.callerKey}
          onEnd={() => setActiveCall(null)}
        />
      )}

      {showAddFriend && (
        <AddFriendModal onAdd={handleAddFriend} onClose={() => setShowAddFriend(false)} />
      )}

      {showMyQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 mx-4 flex flex-col items-center gap-4">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-lg font-semibold">My QR Code</h2>
              <button onClick={() => setShowMyQR(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="My QR Code" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-sm">No key available</div>
            )}
            <div className="w-full">
              <div className="text-xs text-gray-500 mb-1">Your public key:</div>
              <code
                className="block w-full bg-gray-100 rounded px-2 py-1 text-xs font-mono break-all cursor-pointer select-all"
                title="Click to select all"
              >
                {myKey || '...'}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(myKey)}
                className="mt-2 w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded font-medium"
              >
                Copy Public Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
