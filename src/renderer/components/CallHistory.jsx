import React, { useEffect, useState } from 'react'
import { Phone, Video } from 'lucide-react'

function fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function fmtDate(ts) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `Today ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
  return `${d.toLocaleDateString()} ${time}`
}

export default function CallHistory() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    window.pear.getCallHistory?.().then(setHistory)
  }, [])

  if (history.length === 0) return <p className="text-gray-500 text-sm text-center mt-4">No call history yet</p>

  return (
    <div className="space-y-1">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide px-1 mb-2">Recent calls</p>
      {history.map(log => (
        <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
          <div className="text-gray-400">{log.wasVideo ? <Video size={16} /> : <Phone size={16} />}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate">{(log.participants || []).map(k => k.slice(0, 8)).join(', ')}</p>
            <p className="text-gray-500 text-xs">{fmtDate(log.ts)} · {fmt(log.durationSeconds || 0)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
