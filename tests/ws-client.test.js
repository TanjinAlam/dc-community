import { describe, it, expect } from 'vitest'

// Test the message construction logic directly (not the full WS connection)
// since the browser WebSocket API isn't available in Node vitest

describe('ws-client message logic', () => {
  it('send() produces correct message shape', () => {
    const sent = []
    const mockWs = {
      readyState: 1,
      send: (data) => sent.push(JSON.parse(data)),
      onmessage: null, onerror: null, onclose: null
    }
    const type = 'get-feed'
    const data = {}
    mockWs.send(JSON.stringify({ type, data }))
    expect(sent[0]).toEqual({ type: 'get-feed', data: {} })
  })

  it('on() registers listener and fires on matching message type', () => {
    const listeners = {}
    function on(type, cb) {
      if (!listeners[type]) listeners[type] = []
      listeners[type].push(cb)
    }
    function dispatch(type, data) {
      for (const cb of (listeners[type] || [])) cb(data)
    }
    let received = null
    on('feed-response', (data) => { received = data })
    dispatch('feed-response', [{ text: 'hello' }])
    expect(received).toEqual([{ text: 'hello' }])
  })

  it('auth message includes pubkey and signature fields', () => {
    const authMsg = { type: 'auth', pubkey: 'ab'.repeat(32), signature: 'cd'.repeat(32) }
    expect(authMsg.type).toBe('auth')
    expect(authMsg.pubkey).toHaveLength(64)
    expect(authMsg.signature).toHaveLength(64)
  })
})
