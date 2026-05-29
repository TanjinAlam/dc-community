import { v4 as uuidv4 } from 'uuid'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

// Load WebRTC native binding synchronously — no top-level await needed
let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, getUserMedia
try {
  const wrtc = _require('@roamhq/wrtc')
  RTCPeerConnection = wrtc.RTCPeerConnection
  RTCSessionDescription = wrtc.RTCSessionDescription
  RTCIceCandidate = wrtc.RTCIceCandidate
  getUserMedia = wrtc.nonstandard?.getUserMedia || null
} catch {
  // Renderer process or test environment — browser APIs used instead
  RTCPeerConnection = null
}

// No STUN needed — Hyperswarm already established a direct P2P connection
// between peers via its own DHT hole-punching. WebRTC ICE will discover
// host candidates (local network interfaces) which is sufficient.
export const ICE_SERVERS = []

const connections = new Map() // `${callId}:${peerPubkey}` → RTCPeerConnection

export async function createPeerConnection(callId, peerPubkey, onSignal, onTrack) {
  const key = `${callId}:${peerPubkey}`
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) onSignal({ type: 'ice-candidate', callId, candidate })
  }
  pc.ontrack = ({ streams }) => {
    if (streams[0]) onTrack(streams[0])
  }
  connections.set(key, pc)
  return pc
}

export async function addLocalStream(callId, peerPubkey, stream) {
  const pc = connections.get(`${callId}:${peerPubkey}`)
  if (!pc) return
  stream.getTracks().forEach(track => pc.addTrack(track, stream))
}

export async function createOffer(callId, peerPubkey) {
  const pc = connections.get(`${callId}:${peerPubkey}`)
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  return { type: 'call-offer', sdp: offer.sdp }
}

export async function handleOffer(callId, peerPubkey, sdp) {
  const pc = connections.get(`${callId}:${peerPubkey}`)
  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  return { type: 'call-answer', sdp: answer.sdp }
}

export async function handleAnswer(callId, peerPubkey, sdp) {
  const pc = connections.get(`${callId}:${peerPubkey}`)
  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
}

export async function handleIceCandidate(callId, peerPubkey, candidate) {
  const pc = connections.get(`${callId}:${peerPubkey}`)
  if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate))
}

export async function closeConnection(callId, peerPubkey) {
  const key = `${callId}:${peerPubkey}`
  const pc = connections.get(key)
  if (pc) {
    pc.close()
    connections.delete(key)
  }
}

export async function getLocalStream(video = true) {
  if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    return navigator.mediaDevices.getUserMedia({ audio: true, video })
  }
  // In main process (Node): use wrtc's getUserMedia if available
  if (getUserMedia) {
    return getUserMedia({ audio: true, video })
  }
  throw new Error('getUserMedia not available in this environment')
}

export async function getDisplayStream() {
  if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
  }
  throw new Error('Screen share must be initiated from renderer process')
}
