'use strict'
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const Hyperdrive = require('hyperdrive')
const b4a = require('b4a')
const { v4: uuidv4 } = require('uuid')

let store, bee, core, swarm, drive
let dataPath = './pear-social-data'
const friends = []

process.on('message', async (msg) => {
  try {
    const reply = (data) => process.send({ type: msg.type + '-reply', id: msg.id, data })
    const data = msg.data || {}

    switch (msg.type) {
      case 'init': {
        if (data.dataPath) dataPath = data.dataPath
        store = new Corestore(dataPath)
        await store.ready()
        core = store.get({ name: 'posts' })
        await core.ready()
        bee = new Hyperbee(store.get({ name: 'index' }), { keyEncoding: 'utf-8', valueEncoding: 'json' })
        await bee.ready()
        drive = new Hyperdrive(store)
        await drive.ready()

        // Index any existing blocks
        for (let i = 0; i < core.length; i++) {
          const block = await core.get(i)
          const decoded = JSON.parse(b4a.toString(block, 'utf-8'))
          if (decoded.type === 'post') {
            const key = `post!${decoded.ts}!${b4a.toString(core.key, 'hex')}!${i}`
            await bee.put(key, decoded)
          } else if (decoded.type === 'profile') {
            await bee.put(`profile!${b4a.toString(core.key, 'hex')}`, decoded)
          }
        }

        // Index new blocks
        core.on('append', async () => {
          const i = core.length - 1
          const block = await core.get(i)
          const decoded = JSON.parse(b4a.toString(block, 'utf-8'))
          if (decoded.type === 'post') {
            const key = `post!${decoded.ts}!${b4a.toString(core.key, 'hex')}!${i}`
            await bee.put(key, decoded)
            process.send({ type: 'feed-update', data: decoded })
          } else if (decoded.type === 'profile') {
            await bee.put(`profile!${b4a.toString(core.key, 'hex')}`, decoded)
          }
        })

        // Start swarm
        swarm = new Hyperswarm()
        const topic = b4a.from(require('crypto').createHash('sha256').update('pear-social-v1').digest())
        swarm.join(topic)
        swarm.on('connection', (conn) => store.replicate(conn))

        reply({ pubkey: b4a.toString(core.key, 'hex') })
        break
      }

      case 'set-profile': {
        const block = { type: 'profile', name: data.name, ts: Date.now() }
        await core.append(b4a.from(JSON.stringify(block), 'utf-8'))
        await bee.put(`profile!${b4a.toString(core.key, 'hex')}`, block)
        reply({ ok: true })
        break
      }

      case 'get-profile': {
        const entry = await bee.get(`profile!${b4a.toString(core.key, 'hex')}`)
        reply(entry ? entry.value : null)
        break
      }

      case 'create-post': {
        const block = { type: 'post', id: uuidv4(), text: data.text, ts: Date.now(), photoKey: data.photoKey || null }
        await core.append(b4a.from(JSON.stringify(block), 'utf-8'))
        reply({ ok: true })
        break
      }

      case 'get-feed': {
        const posts = []
        for await (const entry of bee.createReadStream({ gt: 'post!', lt: 'post~', reverse: true, limit: 50 })) {
          posts.push(entry.value)
        }
        reply(posts)
        break
      }

      case 'add-friend': {
        const friendKey = b4a.from(data.pubkey, 'hex')
        const friendCore = store.get({ key: friendKey })
        await friendCore.ready()
        if (!friends.includes(data.pubkey)) friends.push(data.pubkey)

        friendCore.on('append', async () => {
          const i = friendCore.length - 1
          const block = await friendCore.get(i)
          const decoded = JSON.parse(b4a.toString(block, 'utf-8'))
          if (decoded.type === 'post') {
            const key = `post!${decoded.ts}!${data.pubkey}!${i}`
            await bee.put(key, { ...decoded, author: data.pubkey })
            process.send({ type: 'feed-update', data: { ...decoded, author: data.pubkey } })
          } else if (decoded.type === 'profile') {
            await bee.put(`profile!${data.pubkey}`, decoded)
          }
        })
        reply({ ok: true })
        break
      }

      case 'get-friends': {
        reply(friends)
        break
      }

      case 'set-avatar': {
        const buf = b4a.from(data.arrayBuffer)
        await drive.put('/avatar', buf)
        await drive.put('/avatar.mime', b4a.from(data.mimeType, 'utf-8'))
        const driveKey = b4a.toString(drive.key, 'hex')
        const block = { type: 'profile', name: data.name || '', ts: Date.now(), driveKey }
        await core.append(b4a.from(JSON.stringify(block), 'utf-8'))
        await bee.put(`profile!${b4a.toString(core.key, 'hex')}`, block)
        reply({ driveKey })
        break
      }

      case 'get-avatar': {
        try {
          const remoteDrive = new Hyperdrive(store, b4a.from(data.driveKeyHex, 'hex'))
          await remoteDrive.ready()
          const buf = await remoteDrive.get('/avatar')
          const mimeBuf = await remoteDrive.get('/avatar.mime')
          if (!buf || !mimeBuf) { reply(null); break }
          reply({ base64: b4a.toString(buf, 'base64'), mimeType: b4a.toString(mimeBuf, 'utf-8') })
        } catch { reply(null) }
        break
      }

      case 'attach-photo': {
        const buf = b4a.from(data.imageBuffer)
        const photoId = uuidv4()
        await drive.put(`/photos/${photoId}`, buf)
        const driveKey = b4a.toString(drive.key, 'hex')
        reply({ driveKey, photoId })
        break
      }

      case 'get-photo': {
        try {
          const remoteDrive = new Hyperdrive(store, b4a.from(data.driveKey, 'hex'))
          await remoteDrive.ready()
          const buf = await remoteDrive.get(`/photos/${data.photoId}`)
          if (!buf) { reply(null); break }
          reply(b4a.toString(buf, 'base64'))
        } catch { reply(null) }
        break
      }

      case 'create-community':
        reply({ communityKey: uuidv4() })
        break

      case 'join-community':
        reply({ ok: true })
        break

      case 'get-communities':
        reply([])
        break

      case 'get-community-feed':
        reply([])
        break

      case 'submit-post':
        reply({ ok: true })
        break

      case 'remove-post':
        reply({ ok: true })
        break

      case 'cast-vote':
        reply({ ok: true })
        break

      case 'get-vote-counts':
        reply({ up: 0, down: 0, score: 0 })
        break

      case 'get-my-vote':
        reply(0)
        break

      case 'post-comment':
        reply({ ok: true })
        break

      case 'get-comment-tree':
        reply([])
        break

      case 'announce-community':
        reply({ ok: true })
        break

      case 'search-communities':
        reply([])
        break

      case 'list-communities':
        reply([])
        break

      case 'search':
        reply([])
        break

      case 'send-message': {
        // Full impl needs Hypercore — stub returns ok
        reply({ ok: true, message: { type: 'dm', id: uuidv4(), text: data.text, to: data.friendPubkeyHex, from: 'me', ts: Date.now() } })
        break
      }
      case 'get-messages': {
        reply([])
        break
      }
      case 'get-conversations': {
        reply([])
        break
      }

      case 'start-call':
        reply({ callId: uuidv4() })
        break

      case 'accept-call':
        reply({ ok: true })
        break

      case 'reject-call':
        reply({ ok: true })
        break

      case 'end-call':
        reply({ ok: true })
        break

      case 'toggle-mute':
        reply({ ok: true })
        break

      case 'start-screen-share':
        reply({ ok: true })
        break

      case 'stop-screen-share':
        reply({ ok: true })
        break

      case 'get-call-history':
        reply([])
        break

      default:
        reply(null)
    }
  } catch (err) {
    process.send({ type: 'error', id: msg.id, error: err.message })
  }
})
