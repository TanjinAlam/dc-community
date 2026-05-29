import React, { useState, useEffect } from 'react'
import ConversationView from '../components/ConversationView'

export default function ChatScreen() {
  const [conversations, setConversations] = useState([])
  const [friends, setFriends] = useState([])
  const [nameMap, setNameMap] = useState({}) // pubkey → name
  const [activeFriend, setActiveFriend] = useState(null)

  useEffect(() => {
    loadAll()
    window.pear.onNewMessage?.(() => loadConversations())
  }, [])

  async function loadAll() {
    const [convs, frs] = await Promise.all([
      window.pear.getConversations(),
      window.pear.getFriends()
    ])
    setConversations(convs || [])
    setFriends(frs || [])

    // Load names for all known pubkeys
    const allKeys = [...new Set([
      ...(convs || []).map(c => c.friendPubkey),
      ...(frs || [])
    ])]
    const entries = await Promise.all(
      allKeys.map(async key => {
        const profile = await window.pear.getFriendProfile?.(key)
        return [key, profile?.name || null]
      })
    )
    setNameMap(Object.fromEntries(entries))
  }

  const loadConversations = () =>
    window.pear.getConversations().then(c => setConversations(c || []))

  const displayName = (pubkey) =>
    nameMap[pubkey] || (pubkey.slice(0, 16) + '…')

  const initials = (pubkey) =>
    (nameMap[pubkey] || pubkey).slice(0, 2).toUpperCase()

  const friendsWithNoConv = friends.filter(
    f => !conversations.find(c => c.friendPubkey === f)
  )

  if (activeFriend) {
    return (
      <ConversationView
        friendPubkey={activeFriend}
        onBack={() => { setActiveFriend(null); loadAll() }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-white font-bold text-lg p-4 border-b border-gray-700">Messages</h2>
      <div className="flex-1 overflow-y-auto">
        {conversations.map(c => (
          <div
            key={c.friendPubkey}
            onClick={() => setActiveFriend(c.friendPubkey)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800"
          >
            <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials(c.friendPubkey)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{displayName(c.friendPubkey)}</div>
              <div className="text-gray-400 text-xs truncate">{c.lastMessage?.text || ''}</div>
            </div>
          </div>
        ))}
        {friendsWithNoConv.map(f => (
          <div
            key={f}
            onClick={() => setActiveFriend(f)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 opacity-60"
          >
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials(f)}
            </div>
            <div className="text-white text-sm">{displayName(f)}</div>
          </div>
        ))}
        {conversations.length === 0 && friends.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8">Add friends to start chatting</p>
        )}
      </div>
    </div>
  )
}
