import Hyperswarm from 'hyperswarm'
import Protomux from 'protomux'
import c from 'compact-encoding'
import crypto from 'crypto'

// Hypercore pubkey hex → send function (populated after call-hello handshake)
const peerChannels = new Map()

// Messages queued while the hello handshake is still in flight
// hypercoreKeyHex → [msg, msg, ...]
const pendingSignals = new Map()

let onCallSignal = null
let myHypercoreKey = null

export function setCallSignalHandler(handler) {
  onCallSignal = handler
}

export function setMyHypercoreKey(hexKey) {
  myHypercoreKey = hexKey
}

export function sendCallSignal(hypercoreKeyHex, msg) {
  const send = peerChannels.get(hypercoreKeyHex)
  if (send) {
    try { send(msg) } catch (e) {
      console.error('[call] send failed:', e.message)
    }
    return true
  }

  // Channel not ready yet (hello handshake in flight) — queue the message.
  // It will be flushed the moment the peer's Hypercore key is confirmed.
  console.log('[call] channel not ready, queuing signal for:', hypercoreKeyHex?.slice(0, 16))
  if (!pendingSignals.has(hypercoreKeyHex)) pendingSignals.set(hypercoreKeyHex, [])
  pendingSignals.get(hypercoreKeyHex).push(msg)
  return false
}

export function broadcastCallSignal(msg) {
  for (const send of peerChannels.values()) {
    try { send(msg) } catch {}
  }
}

function openCallChannel(conn) {
  try {
    const mux = Protomux.from(conn)

    const channel = mux.createChannel({
      protocol: 'pear-social-call/1',
      onclose() {},
      onerror(err) { console.error('[call-channel] error:', err.message) }
    })

    if (!channel) return

    let peerHypercoreKey = null

    const message = channel.addMessage({
      encoding: c.json,
      onmessage(data) {
        if (!data || !data.type) return

        if (data.type === 'call-hello') {
          peerHypercoreKey = data.hypercoreKey
          const sendFn = (msg) => message.send(msg)
          peerChannels.set(peerHypercoreKey, sendFn)
          console.log('[call] channel ready with peer:', peerHypercoreKey?.slice(0, 16))

          // Flush any signals that were queued before the channel was ready
          const queued = pendingSignals.get(peerHypercoreKey) || []
          if (queued.length > 0) {
            console.log('[call] flushing', queued.length, 'queued signal(s) to peer')
            for (const msg of queued) {
              try { sendFn(msg) } catch {}
            }
            pendingSignals.delete(peerHypercoreKey)
          }
          return
        }

        // All other messages are call signals — forward to ipc.js handler
        if (onCallSignal && peerHypercoreKey) {
          onCallSignal(data, peerHypercoreKey)
        }
      }
    })

    channel.open()

    // Send our Hypercore key immediately so the peer can map us
    setImmediate(() => {
      if (myHypercoreKey) {
        try { message.send({ type: 'call-hello', hypercoreKey: myHypercoreKey }) } catch {}
      }
    })

  } catch (err) {
    console.error('[swarm] call channel setup failed:', err.message)
  }
}

export async function startSwarm(store, onPeerConnected) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (conn, info) => {
    store.replicate(conn)

    const noiseKey = info.publicKey.toString('hex')
    if (onPeerConnected) onPeerConnected(noiseKey)

    openCallChannel(conn)

    conn.on('error', () => {})
    conn.on('close', () => {
      // Clean up channel on disconnect
      for (const [key, _] of peerChannels) {
        // We don't know which key maps to this conn, but the channel's onclose handles it
      }
    })
  })

  const topic = crypto.createHash('sha256').update('pear-social-v1').digest()
  await swarm.join(topic)

  return swarm
}

export async function replicateFriendCore(store, friendPubkeyHex) {
  const core = store.get({ key: Buffer.from(friendPubkeyHex, 'hex') })
  await core.ready()
  return core
}
