import React, { useEffect, useState } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'

export default function IncomingCallModal({ onAccepted }) {
  const [call, setCall] = useState(null)

  useEffect(() => {
    // Listen for real-time incoming calls
    window.pear.onIncomingCall?.((data) => setCall(data))

    // Fetch any call that arrived before this component mounted
    // (common in production builds where init() takes longer)
    window.pear.checkIncomingCall?.().then(data => {
      if (data) setCall(data)
    })
  }, [])

  if (!call) return null

  const accept = async () => {
    await window.pear.acceptCall({ callId: call.callId, callerKey: call.callerKey, isVideo: call.isVideo })
    onAccepted?.(call)
    setCall(null)
  }
  const decline = async () => {
    await window.pear.rejectCall({ callId: call.callId, callerKey: call.callerKey })
    setCall(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-6 w-80 shadow-2xl">
        {/* Pulsing avatar */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-purple-600 opacity-30 animate-ping" />
          <div className="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center text-white text-2xl font-bold z-10">
            {call.callerKey?.slice(0, 2).toUpperCase()}
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">{call.isVideo ? 'Incoming video call' : 'Incoming voice call'}</p>
          <p className="text-white font-semibold text-lg">{call.callerKey?.slice(0, 16)}…</p>
          {call.participants?.length > 2 && (
            <p className="text-gray-400 text-xs mt-1">+{call.participants.length - 1} others</p>
          )}
        </div>

        <div className="flex gap-8">
          <button onClick={decline} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg">
            <PhoneOff className="text-white" size={24} />
          </button>
          <button onClick={accept} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-lg">
            {call.isVideo ? <Video className="text-white" size={24} /> : <Phone className="text-white" size={24} />}
          </button>
        </div>
      </div>
    </div>
  )
}
