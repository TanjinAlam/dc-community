import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { randomBytes } from 'crypto'
import { verifyChallenge } from './ws-auth.js'

export function startWsServer(port, handleMessage, pwaDist) {
  let handler = null
  if (pwaDist) {
    // Lazy import serve-handler only when needed (avoids ESM/CJS issues in tests)
    handler = pwaDist
  }

  const server = createServer(async (req, res) => {
    if (handler) {
      const { default: serveHandler } = await import('serve-handler')
      serveHandler(req, res, { public: handler })
    } else {
      res.writeHead(200)
      res.end('Pear Social WS Server')
    }
  })

  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws) => {
    const nonce = randomBytes(32).toString('hex')
    ws.authenticated = false
    ws.send(JSON.stringify({ type: 'challenge', nonce }))

    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw) } catch { ws.close(); return }

      if (!ws.authenticated) {
        if (msg.type === 'auth') {
          ws.authenticated = verifyChallenge(nonce, msg.signature, msg.pubkey)
          if (!ws.authenticated) ws.close()
        }
        return
      }

      handleMessage(ws, msg)
    })

    ws.on('error', () => ws.close())
  })

  // Wrap to expose address() that returns HTTP server address (same shape as before)
  const originalAddress = wss.address.bind(wss)
  wss.address = () => server.address()

  // Delegate listening event: http server emits 'listening', wss doesn't
  const originalOnce = wss.once.bind(wss)
  wss.once = (event, cb) => {
    if (event === 'listening') {
      server.once('listening', cb)
      return wss
    }
    return originalOnce(event, cb)
  }

  // Also forward close to close the http server
  const originalClose = wss.close.bind(wss)
  wss.close = (cb) => {
    originalClose(() => {
      server.close(cb)
    })
  }

  server.listen(port)
  return wss
}

export function broadcast(wss, event, data) {
  const payload = JSON.stringify({ type: event, data })
  for (const client of wss.clients) {
    if (client.authenticated && client.readyState === 1) {
      client.send(payload)
    }
  }
}
