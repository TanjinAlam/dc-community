import { describe, it, expect } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import { sendMessage, indexIncomingMessage, getMessages, getConversations } from '../src/p2p/chat.js'

function makeTmpStore(prefix) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

async function setupUser(prefix) {
  const { store, tmpDir } = makeTmpStore(prefix)
  const core = store.get({ name: 'user-feed' })
  await core.ready()
  const beeCore = store.get({ name: 'index' })
  await beeCore.ready()
  const bee = new Hyperbee(beeCore, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()
  const pubkeyHex = core.key.toString('hex')
  return { store, tmpDir, core, bee, pubkeyHex }
}

async function teardown({ store, tmpDir }) {
  await store.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

describe('chat', () => {
  it('sendMessage appends a dm block and getMessages returns it', async () => {
    const alice = await setupUser('chat-alice')
    try {
      const block = await sendMessage(alice.core, alice.bee, alice.pubkeyHex, 'bob-pubkey-hex', 'Hello Bob!')
      expect(block.type).toBe('dm')
      expect(block.text).toBe('Hello Bob!')
      expect(block.from).toBe(alice.pubkeyHex)
      expect(block.to).toBe('bob-pubkey-hex')

      const msgs = await getMessages(alice.bee, alice.pubkeyHex, 'bob-pubkey-hex')
      expect(msgs).toHaveLength(1)
      expect(msgs[0].text).toBe('Hello Bob!')
    } finally {
      await teardown(alice)
    }
  })

  it('indexIncomingMessage indexes a message — getMessages finds it from recipient perspective', async () => {
    const alice = await setupUser('chat-alice2')
    const bob = await setupUser('chat-bob2')
    try {
      // Alice sends a message
      const block = await sendMessage(alice.core, alice.bee, alice.pubkeyHex, bob.pubkeyHex, 'Hi Bob from Alice')

      // Bob receives it via replication — simulate with indexIncomingMessage
      await indexIncomingMessage(bob.bee, block, alice.pubkeyHex, bob.pubkeyHex)

      const msgs = await getMessages(bob.bee, bob.pubkeyHex, alice.pubkeyHex)
      expect(msgs).toHaveLength(1)
      expect(msgs[0].text).toBe('Hi Bob from Alice')
    } finally {
      await teardown(alice)
      await teardown(bob)
    }
  })

  it('getMessages returns messages sorted newest-first', async () => {
    const alice = await setupUser('chat-alice3')
    try {
      await sendMessage(alice.core, alice.bee, alice.pubkeyHex, 'bob-hex', 'first')
      await new Promise(r => setTimeout(r, 5))
      await sendMessage(alice.core, alice.bee, alice.pubkeyHex, 'bob-hex', 'second')
      await new Promise(r => setTimeout(r, 5))
      await sendMessage(alice.core, alice.bee, alice.pubkeyHex, 'bob-hex', 'third')

      const msgs = await getMessages(alice.bee, alice.pubkeyHex, 'bob-hex')
      expect(msgs).toHaveLength(3)
      expect(msgs[0].text).toBe('third')
      expect(msgs[1].text).toBe('second')
      expect(msgs[2].text).toBe('first')
    } finally {
      await teardown(alice)
    }
  })

  it('getConversations returns conversations sorted by most recent message', async () => {
    const alice = await setupUser('chat-alice4')
    try {
      await sendMessage(alice.core, alice.bee, alice.pubkeyHex, 'charlie-hex', 'hey charlie')
      await new Promise(r => setTimeout(r, 10))
      await sendMessage(alice.core, alice.bee, alice.pubkeyHex, 'bob-hex', 'hey bob')

      const convs = await getConversations(alice.bee, alice.pubkeyHex, ['bob-hex', 'charlie-hex'])
      expect(convs).toHaveLength(2)
      expect(convs[0].friendPubkey).toBe('bob-hex')
      expect(convs[1].friendPubkey).toBe('charlie-hex')
    } finally {
      await teardown(alice)
    }
  })

  it('getConversations skips friends with no messages', async () => {
    const alice = await setupUser('chat-alice5')
    try {
      await sendMessage(alice.core, alice.bee, alice.pubkeyHex, 'bob-hex', 'hello')

      const convs = await getConversations(alice.bee, alice.pubkeyHex, ['bob-hex', 'dave-hex'])
      expect(convs).toHaveLength(1)
      expect(convs[0].friendPubkey).toBe('bob-hex')
    } finally {
      await teardown(alice)
    }
  })
})
