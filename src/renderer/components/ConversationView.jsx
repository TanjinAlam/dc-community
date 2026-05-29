import React, { useState, useEffect, useRef } from 'react'

export default function ConversationView({ friendPubkey, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [myKey, setMyKey] = useState('')
  const [friendName, setFriendName] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    window.pear.getMyKey().then(setMyKey)
    window.pear.getFriendProfile?.(friendPubkey).then(p => {
      if (p?.name) setFriendName(p.name)
    })
    loadMessages()
    window.pear.onNewMessage?.((msg) => {
      if (msg.from === friendPubkey || msg.to === friendPubkey) loadMessages()
    })
  }, [friendPubkey])

  const loadMessages = () =>
    window.pear.getMessages({ friendPubkeyHex: friendPubkey }).then(msgs => {
      setMessages([...(msgs || [])].reverse())
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })

  const handleSend = async () => {
    if (!text.trim()) return
    await window.pear.sendMessage({ friendPubkeyHex: friendPubkey, text: text.trim() })
    setText('')
    loadMessages()
  }

  const displayName = friendName || friendPubkey.slice(0, 16) + '…'
  const initials = (friendName || friendPubkey).slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-lg mr-1">←</button>
        <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <span className="text-white font-semibold flex-1 truncate">{displayName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map(msg => {
          const isMe = msg.from === myKey
          return (
            <div
              key={msg.id || msg.ts}
              style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}
            >
              {/* Friend avatar — left side only */}
              {!isMe && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#7c3aed', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700
                }}>
                  {initials}
                </div>
              )}

              {/* Bubble */}
              <div style={{
                maxWidth: '60%',
                padding: '8px 12px',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isMe ? '#7c3aed' : '#374151',
                color: '#fff',
                fontSize: 14,
                lineHeight: 1.4,
              }}>
                <div>{msg.text}</div>
                <div style={{
                  fontSize: 11,
                  marginTop: 4,
                  color: isMe ? '#c4b5fd' : '#9ca3af',
                  textAlign: isMe ? 'right' : 'left'
                }}>
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Spacer for sent messages so avatar gap is symmetric */}
              {isMe && <div style={{ width: 28, flexShrink: 0 }} />}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-900 flex gap-2">
        <input
          className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-40 hover:bg-purple-500 flex-shrink-0"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
