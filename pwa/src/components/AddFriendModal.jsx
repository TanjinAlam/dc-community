import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'

export default function AddFriendModal({ ws, onClose }) {
  const [pubkey, setPubkey] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!pubkey.trim()) return
    ws.send('add-friend', { pubkey: pubkey.trim() })
    onClose()
  }

  async function startScan() {
    setCameraError(null)
    setScanning(true)
  }

  useEffect(() => {
    if (!scanning) return

    let active = true

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        requestAnimationFrame(tick)
      } catch (err) {
        if (active) setCameraError('Camera access denied or unavailable.')
        setScanning(false)
      }
    }

    function tick() {
      if (!active) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code && code.data) {
          const match = code.data.match(/^pear-social:\/\/add\/(.+)$/)
          if (match) {
            setPubkey(match[1])
            stopCamera()
            return
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    initCamera()

    return () => {
      active = false
      stopCamera()
    }
  }, [scanning])

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-80 mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add Friend</h2>
          <button onClick={handleClose} className="text-gray-400 text-xl">x</button>
        </div>
        <form onSubmit={handleAdd}>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Paste their public key"
            value={pubkey}
            onChange={e => setPubkey(e.target.value)}
            autoFocus
          />

          {!scanning && (
            <button
              type="button"
              onClick={startScan}
              className="w-full mb-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border rounded-lg flex items-center justify-center gap-2"
            >
              <span>📷</span> Scan QR
            </button>
          )}

          {scanning && (
            <div className="mb-4">
              <video ref={videoRef} className="w-full rounded-lg" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <button
                type="button"
                onClick={stopCamera}
                className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel scan
              </button>
            </div>
          )}

          {cameraError && (
            <p className="text-xs text-red-500 mb-3">{cameraError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg">Cancel</button>
            <button type="submit" disabled={!pubkey.trim()} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg disabled:opacity-50">Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}
