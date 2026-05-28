function relativeTime(ts) {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export default function PostCard({ post }) {
  const authorShort = post.author ? post.author.slice(0, 2).toUpperCase() : '?'
  const authorKey = post.author ? post.author.slice(0, 8) + '...' : 'unknown'

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
        {authorShort}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-gray-500">{authorKey}</span>
          <span className="text-xs text-gray-400">{relativeTime(post.ts)}</span>
        </div>
        <p className="text-sm text-gray-900 break-words">{post.text}</p>
      </div>
    </div>
  )
}
