import { describe, it, expect, beforeEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import { initIndex } from '../src/p2p/store.js'
import { sendMessage, getMessages, getConversations } from '../src/p2p/chat.js'

function makeStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-ipc-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

async function cleanupStore(store, tmpDir) {
  await store.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

async function makeSetup(store) {
  const core = store.get({ name: 'user-core' })
  await core.ready()
  const bee = await initIndex(store)
  const myPubkey = core.key.toString('hex')
  return { core, bee, myPubkey }
}

describe('chat IPC handlers logic', () => {
  it('sendMessage handler returns { ok: true, message: { text, type: "dm" } }', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core, bee, myPubkey } = await makeSetup(store)
      const friendPubkey = 'a'.repeat(64)

      // simulate handler logic
      const block = await sendMessage(core, bee, myPubkey, friendPubkey, 'Hello friend!')
      const result = { ok: true, message: block }

      expect(result.ok).toBe(true)
      expect(result.message.type).toBe('dm')
      expect(result.message.text).toBe('Hello friend!')
      expect(result.message.to).toBe(friendPubkey)
      expect(result.message.from).toBe(myPubkey)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getMessages returns the sent message', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core, bee, myPubkey } = await makeSetup(store)
      const friendPubkey = 'b'.repeat(64)

      await sendMessage(core, bee, myPubkey, friendPubkey, 'Test message')

      const messages = await getMessages(bee, myPubkey, friendPubkey, 50)
      expect(messages).toHaveLength(1)
      expect(messages[0].text).toBe('Test message')
      expect(messages[0].type).toBe('dm')
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getConversations returns conversation with the friend', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core, bee, myPubkey } = await makeSetup(store)
      const friendPubkey = 'c'.repeat(64)

      await sendMessage(core, bee, myPubkey, friendPubkey, 'Hey there')

      const conversations = await getConversations(bee, myPubkey, [friendPubkey])
      expect(conversations).toHaveLength(1)
      expect(conversations[0].friendPubkey).toBe(friendPubkey)
      expect(conversations[0].lastMessage.text).toBe('Hey there')
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getMessages returns empty array for friend with no messages', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core, bee, myPubkey } = await makeSetup(store)
      const friendPubkey = 'd'.repeat(64)

      const messages = await getMessages(bee, myPubkey, friendPubkey, 50)
      expect(messages).toHaveLength(0)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })
})
