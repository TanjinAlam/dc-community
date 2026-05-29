import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff } from 'lucide-react'

const ICE_CONFIG = { iceServers: [], iceTransportPolicy: 'all' }

export default function CallScreen({ callId, participants, isVideo, callerKey, onEnd }) {
  const localVideoRef    = useRef(null)
  const localStreamRef   = useRef(null)
  const pcsRef           = useRef({})   // peerKey → RTCPeerConnection
  const remoteStreamsRef = useRef({})   // peerKey → MediaStream (survives re-render)
  const remoteVidRefs    = useRef({})   // peerKey → <video> element
  const remoteAudRefs    = useRef({})   // peerKey → <audio> element
  const pendingIceRef    = useRef({})   // peerKey → [candidates] buffered pre-remote-desc
  const myKeyRef         = useRef('')

  const [remoteKeys,    setRemoteKeys]    = useState([])
  const [isMicMuted,    setIsMicMuted]    = useState(false)
  const [isCamMuted,    setIsCamMuted]    = useState(false)
  const [isSharing,     setIsSharing]     = useState(false)
  const [status,        setStatus]        = useState('calling')
  const [micError,      setMicError]      = useState(null)
  const [iceState,      setIceState]      = useState('new')
  const [gotTrack,      setGotTrack]      = useState({})  // { audio: true, video: true }

  // ── helpers ──────────────────────────────────────────────────────────────

  // Attach a peer's stream to its audio + video elements (whichever exist)
  function attachStream(peerKey) {
    const stream = remoteStreamsRef.current[peerKey]
    if (!stream) return
    const aud = remoteAudRefs.current[peerKey]
    const vid = remoteVidRefs.current[peerKey]
    if (aud) {
      aud.srcObject = stream
      aud.muted = false
      aud.volume = 1.0
      aud.play?.().then(() => console.log('[call] audio playing'))
        .catch(e => console.warn('[call] audio.play() blocked:', e.message))
    }
    if (vid) {
      vid.srcObject = stream
      vid.play?.().catch(() => {})
    }
  }

  // Apply any ICE candidates that arrived before the remote description was set
  async function flushPendingIce(peerKey, pc) {
    const queued = pendingIceRef.current[peerKey] || []
    for (const cand of queued) {
      try { await pc.addIceCandidate(cand) } catch (e) {
        console.warn('[call] flush ICE failed:', e.message)
      }
    }
    pendingIceRef.current[peerKey] = []
  }

  // Always returns myKey (cached after first call)
  async function myKey() {
    if (myKeyRef.current) return myKeyRef.current
    const k = await window.pear.getMyKey()
    myKeyRef.current = k
    return k
  }

  // Returns local media stream (cached). Never throws — returns null on failure.
  async function getStream() {
    if (localStreamRef.current) return localStreamRef.current
    try {
      if (!navigator.mediaDevices) throw new Error('navigator.mediaDevices unavailable')
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!isVideo })
      console.log('[call] mic OK:', s.getTracks().map(t => t.kind))
      localStreamRef.current = s
      if (localVideoRef.current) localVideoRef.current.srcObject = s
      setMicError(null)
      return s
    } catch (err) {
      console.error('[call] getUserMedia failed:', err.name, err.message)
      setMicError(err.message)
      return null
    }
  }

  function createPC(peerKey) {
    const pc = new RTCPeerConnection(ICE_CONFIG)

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return
      console.log('[call] ICE candidate:', candidate.type)
      // CRITICAL: RTCIceCandidate properties are prototype getters that do NOT
      // survive IPC/JSON serialization (arrives as {}). Convert to a plain
      // object via toJSON() so the peer can actually use addIceCandidate().
      window.pear.sendCallSignal(peerKey, {
        type: 'ice-candidate', callId,
        fromKey: myKeyRef.current, toKey: peerKey, candidate: candidate.toJSON()
      })
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[call] ICE:', pc.iceConnectionState)
      setIceState(pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setStatus('active')
      }
    }

    pc.ontrack = (event) => {
      const track = event.track
      console.log('[call] remote track:', track.kind, '| readyState:', track.readyState)
      setStatus('active')
      setGotTrack(t => ({ ...t, [track.kind]: true }))

      // Build the remote stream manually — event.streams[0] is often empty
      // in unified-plan, so we accumulate tracks into our own MediaStream.
      let stream = remoteStreamsRef.current[peerKey]
      if (!stream) {
        stream = new MediaStream()
        remoteStreamsRef.current[peerKey] = stream
      }
      if (!stream.getTracks().includes(track)) stream.addTrack(track)

      setRemoteKeys(prev => prev.includes(peerKey) ? prev : [...prev, peerKey])
      attachStream(peerKey)
      setTimeout(() => attachStream(peerKey), 200)
    }

    pcsRef.current[peerKey] = pc
    return pc
  }

  // Add local tracks to a PC (creates stream if not yet acquired)
  async function addLocalTracks(pc) {
    const s = await getStream()
    if (!s) { console.warn('[call] no stream — call has no audio'); return }
    s.getTracks().forEach(t => {
      pc.addTrack(t, s)
      console.log('[call] added local track:', t.kind)
    })
  }

  async function sendOffer(peerKey) {
    const me = await myKey()
    let pc = pcsRef.current[peerKey]
    if (!pc) pc = createPC(peerKey)
    await addLocalTracks(pc)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    console.log('[call] → offer from', me.slice(0,8), 'to', peerKey.slice(0,8))
    window.pear.sendCallSignal(peerKey, {
      type: 'call-offer', callId, fromKey: me, toKey: peerKey, sdp: offer.sdp
    })
  }

  function cleanup() {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    Object.values(pcsRef.current).forEach(pc => { try { pc.close() } catch {} })
    pcsRef.current = {}
    remoteStreamsRef.current = {}
  }

  // ── core signal handler — used for both live and buffered signals ────────

  const handleSignal = useCallback(async (msg) => {
    if (msg.callId !== callId) return
    const me = await myKey()
    console.log('[call] signal:', msg.type, '| for me:', msg.toKey === me)

    if (msg.type === 'call-offer' && msg.toKey === me) {
      let pc = pcsRef.current[msg.fromKey]
      if (!pc) pc = createPC(msg.fromKey)
      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
      await addLocalTracks(pc)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await flushPendingIce(msg.fromKey, pc)
      console.log('[call] → answer to', msg.fromKey.slice(0, 8))
      window.pear.sendCallSignal(msg.fromKey, {
        type: 'call-answer', callId, fromKey: me, toKey: msg.fromKey, sdp: answer.sdp
      })
    }

    if (msg.type === 'call-answer' && msg.toKey === me) {
      const pc = pcsRef.current[msg.fromKey]
      console.log('[call] got answer, pc:', !!pc)
      if (pc) {
        await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
        await flushPendingIce(msg.fromKey, pc)
      }
    }

    if (msg.type === 'ice-candidate' && msg.toKey === me) {
      const pc = pcsRef.current[msg.fromKey]
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try { await pc.addIceCandidate(msg.candidate) }
        catch (e) { console.warn('[call] addIceCandidate failed:', e.message) }
      } else {
        if (!pendingIceRef.current[msg.fromKey]) pendingIceRef.current[msg.fromKey] = []
        pendingIceRef.current[msg.fromKey].push(msg.candidate)
        console.log('[call] buffered early ICE candidate')
      }
    }
  }, [callId])

  // ── mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true

    // Register listeners synchronously
    window.pear.onCallPeerAccepted?.(async ({ callId: cid, participants: peers }) => {
      if (!mounted || cid !== callId) return
      const me = await myKey()
      const targets = (peers || participants || []).filter(k => k !== me)
      console.log('[call] peer accepted → sending offers to', targets.length, 'peer(s)')
      for (const peerKey of targets) await sendOffer(peerKey)
    })

    window.pear.onCallSignalFromPeer?.(({ msg }) => { if (mounted) handleSignal(msg) })
    window.pear.onCallEnded?.(() => { if (mounted) { cleanup(); onEnd() } })

    ;(async () => {
      await myKey()       // populate myKeyRef before any signal processing
      getStream()         // pre-fetch mic in background

      // Tell main we're ready and drain any signals buffered during mount gap.
      // This is what catches the call-offer that arrived before we mounted.
      const buffered = await window.pear.callRendererReady?.() || []
      console.log('[call] draining', buffered.length, 'buffered signal(s)')
      for (const { msg } of buffered) {
        if (mounted) await handleSignal(msg)
      }
    })()

    return () => {
      mounted = false
      window.pear.callRendererDone?.()
    }
  }, [callId, handleSignal])

  // Re-attach streams whenever the remote media elements (re)mount
  useEffect(() => {
    remoteKeys.forEach(attachStream)
  }, [remoteKeys, isVideo])

  // ── controls ──────────────────────────────────────────────────────────────

  const endCall = async () => { cleanup(); await window.pear.endCall({ callId }); onEnd() }

  const toggleMic = async () => {
    const next = !isMicMuted; setIsMicMuted(next)
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next })
    await window.pear.toggleMute({ callId, audio: next })
  }

  const toggleCam = async () => {
    const next = !isCamMuted; setIsCamMuted(next)
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !next })
    await window.pear.toggleMute({ callId, video: next })
  }

  const toggleScreen = async () => {
    if (!isSharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const vt = screen.getVideoTracks()[0]
        Object.values(pcsRef.current).forEach(pc => {
          const s = pc.getSenders().find(s => s.track?.kind === 'video')
          if (s) s.replaceTrack(vt)
        })
        vt.onended = () => setIsSharing(false)
        setIsSharing(true)
        await window.pear.startScreenShare({ callId })
      } catch {}
    } else {
      const cam = localStreamRef.current?.getVideoTracks()[0]
      if (cam) Object.values(pcsRef.current).forEach(pc => {
        const s = pc.getSenders().find(s => s.track?.kind === 'video')
        if (s) s.replaceTrack(cam)
      })
      setIsSharing(false)
      await window.pear.stopScreenShare({ callId })
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const cols = remoteKeys.length <= 1 ? '1fr'
    : remoteKeys.length <= 3 ? '1fr 1fr' : '1fr 1fr 1fr'

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: '#0a0a0a' }}>

      {micError && (
        <div className="bg-red-900 text-red-200 text-xs px-4 py-2 text-center">
          ⚠️ Microphone blocked: {micError} — check System Settings → Privacy → Microphone
        </div>
      )}

      {/* Diagnostic status bar — shows exactly where the call pipeline is */}
      <div className="bg-gray-900 text-gray-300 text-xs px-4 py-1.5 flex gap-4 justify-center font-mono border-b border-gray-800">
        <span>mic: <b className={localStreamRef.current ? 'text-green-400' : 'text-red-400'}>
          {localStreamRef.current ? 'on' : 'off'}</b></span>
        <span>ICE: <b className={iceState === 'connected' || iceState === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
          {iceState}</b></span>
        <span>rx audio: <b className={gotTrack.audio ? 'text-green-400' : 'text-red-400'}>
          {gotTrack.audio ? 'yes' : 'no'}</b></span>
        <span>peers: <b>{remoteKeys.length}</b></span>
      </div>

      <div className="flex-1 relative overflow-hidden"
        style={{ display: 'grid', gridTemplateColumns: cols, gap: 4, padding: 4 }}>
        {remoteKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-400 gap-3 col-span-full">
            <div className="text-5xl animate-pulse">{isVideo ? '📹' : '🎙️'}</div>
            <div className="text-base">{status === 'calling' ? 'Calling…' : 'Connecting…'}</div>
            <div className="text-xs text-gray-600">Waiting for peer to connect</div>
          </div>
        ) : remoteKeys.map(key => (
          <div key={key} className="relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center min-h-32">
            {/* Hidden audio element — ALWAYS rendered so remote audio plays
                in both audio and video calls. This is what makes sound work. */}
            <audio
              autoPlay
              ref={el => { if (el) { remoteAudRefs.current[key] = el; attachStream(key) } }}
            />
            {isVideo
              ? <video autoPlay playsInline className="w-full h-full object-cover"
                  ref={el => { if (el) { remoteVidRefs.current[key] = el; attachStream(key) } }} />
              : <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center text-3xl font-bold text-white">
                    {key.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-white text-sm">🎙️ Live</span>
                </div>
            }
            <span className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-0.5 rounded">
              {key.slice(0, 8)}
            </span>
          </div>
        ))}

        {isVideo && (
          <div className="absolute bottom-4 right-4 w-36 h-24 bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 z-10">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 py-5"
        style={{ background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(10px)' }}>
        <Btn onClick={toggleMic} active={isMicMuted} label={isMicMuted ? 'Unmute' : 'Mute'}>
          {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </Btn>
        {isVideo && (
          <Btn onClick={toggleCam} active={isCamMuted} label={isCamMuted ? 'Start cam' : 'Stop cam'}>
            {isCamMuted ? <VideoOff size={20} /> : <Video size={20} />}
          </Btn>
        )}
        <Btn onClick={toggleScreen} active={isSharing} activeColor="bg-green-600" label="Share">
          <Monitor size={20} />
        </Btn>
        <button onClick={endCall} className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center">
            <PhoneOff size={22} className="text-white" />
          </div>
          <span className="text-gray-400 text-xs">End</span>
        </button>
      </div>
    </div>
  )
}

function Btn({ onClick, active, activeColor = 'bg-red-600', label, children }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? activeColor : 'bg-gray-700 hover:bg-gray-600'}`}>
        <span className="text-white">{children}</span>
      </div>
      <span className="text-gray-400 text-xs">{label}</span>
    </button>
  )
}
