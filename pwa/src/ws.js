import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

function getOrCreateKeypair() {
  const stored = localStorage.getItem('pear-keypair')
  if (stored) {
    const { publicKey, secretKey } = JSON.parse(stored)
    return {
      publicKey: decodeBase64(publicKey),
      secretKey: decodeBase64(secretKey)
    }
  }
  const kp = nacl.sign.keyPair()
  localStorage.setItem('pear-keypair', JSON.stringify({
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey)
  }))
  return kp
}

function toHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return bytes
}

export function createWsClient(url) {
  const kp = getOrCreateKeypair()
  const listeners = {}
  let ws = null
  let authenticated = false
  const queue = []

  function connect() {
    ws = new WebSocket(url)

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'challenge') {
        const nonceBytes = fromHex(msg.nonce)
        const signature = nacl.sign.detached(nonceBytes, kp.secretKey)
        ws.send(JSON.stringify({
          type: 'auth',
          pubkey: toHex(kp.publicKey),
          signature: toHex(signature)
        }))
        authenticated = true
        for (const queued of queue) ws.send(JSON.stringify(queued))
        queue.length = 0
        return
      }

      const cbs = listeners[msg.type] || []
      for (const cb of cbs) cb(msg.data)
    }

    ws.onerror = () => {}
    ws.onclose = () => { authenticated = false }
  }

  connect()

  return {
    send(type, data) {
      const msg = { type, data }
      if (ws && ws.readyState === WebSocket.OPEN && authenticated) {
        ws.send(JSON.stringify(msg))
      } else {
        queue.push(msg)
      }
    },
    on(type, cb) {
      if (!listeners[type]) listeners[type] = []
      listeners[type].push(cb)
    },
    getPublicKey() { return toHex(kp.publicKey) }
  }
}
