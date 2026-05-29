import { describe, it, expect, afterEach } from 'vitest'
import { WebSocket } from 'ws'
import { startWsServer, broadcast } from '../src/main/ws-server.js'

let wss
afterEach(() => {
  return new Promise((resolve) => {
    if (wss) {
      for (const client of wss.clients) client.terminate()
      wss.close(() => { wss = null; resolve() })
    } else {
      resolve()
    }
  })
})

function startOnRandomPort(handleMessage) {
  return new Promise((resolve) => {
    const srv = startWsServer(0, handleMessage)
    srv.once('listening', () => resolve(srv))
  })
}

/**
 * Connect and return { ws, messages } where messages is an async queue.
 * Messages are buffered so they're not lost before a listener is attached.
 */
function connectWithBuffer(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`)
    const buffer = []
    const waiters = []

    ws.on('message', (d) => {
      const msg = JSON.parse(d)
      if (waiters.length > 0) {
        waiters.shift()(msg)
      } else {
        buffer.push(msg)
      }
    })

    function nextMessage() {
      if (buffer.length > 0) return Promise.resolve(buffer.shift())
      return new Promise((r) => waiters.push(r))
    }

    ws.once('open', () => resolve({ ws, nextMessage }))
    ws.once('error', reject)
  })
}

describe('ws-server', () => {
  it('starts and accepts a connection', async () => {
    wss = await startOnRandomPort(() => {})
    const port = wss.address().port
    const { ws } = await connectWithBuffer(port)
    expect(ws.readyState).toBe(1) // OPEN
  })

  it('sends challenge on connect', async () => {
    wss = await startOnRandomPort(() => {})
    const port = wss.address().port
    const { nextMessage } = await connectWithBuffer(port)
    const msg = await nextMessage()
    expect(msg.type).toBe('challenge')
    expect(typeof msg.nonce).toBe('string')
    expect(msg.nonce.length).toBe(64)
  })

  it('unauthenticated client sending get-feed gets no response', async () => {
    wss = await startOnRandomPort((ws, msg) => {
      ws.send(JSON.stringify({ type: 'feed-response', data: [] }))
    })
    const port = wss.address().port
    const { ws, nextMessage } = await connectWithBuffer(port)
    await nextMessage() // consume challenge
    ws.send(JSON.stringify({ type: 'get-feed' }))
    // Should get no response — wait 200ms and check
    const result = await Promise.race([
      nextMessage(),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 200))
    ])
    expect(result).toBe('timeout')
  })

  it('broadcast sends to authenticated clients', async () => {
    wss = await startOnRandomPort(() => {})
    const port = wss.address().port
    const { nextMessage } = await connectWithBuffer(port)
    await nextMessage() // consume challenge
    // Manually mark server-side clients as authenticated
    for (const client of wss.clients) client.authenticated = true
    const msgPromise = nextMessage()
    broadcast(wss, 'test-event', { hello: 'world' })
    const msg = await msgPromise
    expect(msg.type).toBe('test-event')
    expect(msg.data.hello).toBe('world')
  })

  it('verifyChallenge returns false for bad signature', async () => {
    const { verifyChallenge } = await import('../src/main/ws-auth.js')
    const result = verifyChallenge('aabbcc', 'deadbeef', '0'.repeat(64))
    expect(result).toBe(false)
  })
})
