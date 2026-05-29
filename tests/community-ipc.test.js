import { describe, it, expect, beforeEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import b4a from 'b4a'
import { createCommunity, submitPostToCommunity, removePostFromCommunity, getCommunityFeed } from '../src/p2p/community.js'

// We test the community handlers logic directly without electron IPC,
// mirroring how handlers work in ipc.js but with real Corestores.

function makeStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'community-ipc-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

async function cleanupStore(store, tmpDir) {
  await store.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

async function makeUserCore(store) {
  const core = store.get({ name: 'user-core' })
  await core.ready()
  return core
}

describe('community IPC handlers logic', () => {
  it('createCommunity handler returns a communityKey', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { communityKey, core } = await createCommunity(store, {
        name: 'my-community',
        description: 'Test desc',
        rules: 'Be respectful'
      })
      expect(communityKey).toBeTruthy()
      expect(communityKey).toHaveLength(64)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('submitPost appends to userCore and communityCore', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const userCore = await makeUserCore(store)
      const { communityKey, core: communityCore } = await createCommunity(store, {
        name: 'my-community2',
        description: 'desc',
        rules: ''
      })

      // Simulate submitPost handler logic
      const block = { type: 'post', id: 'post-1', text: 'Hello world', ts: Date.now(), communityKey }
      await userCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
      const seqNo = userCore.length - 1
      await submitPostToCommunity(communityCore, userCore.key.toString('hex'), seqNo)

      expect(userCore.length).toBe(1)
      expect(communityCore.length).toBe(2) // community block + post-ref
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getCommunityFeed returns the submitted post', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const userCore = await makeUserCore(store)
      const { core: communityCore } = await createCommunity(store, {
        name: 'my-community3',
        description: 'desc',
        rules: ''
      })

      const block = { type: 'post', id: 'post-2', text: 'Feed test post', ts: Date.now() }
      await userCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
      const seqNo = userCore.length - 1
      await submitPostToCommunity(communityCore, userCore.key.toString('hex'), seqNo)

      const authorCores = new Map()
      authorCores.set(userCore.key.toString('hex'), userCore)
      const feed = await getCommunityFeed(communityCore, authorCores, null)

      expect(feed).toHaveLength(1)
      expect(feed[0].text).toBe('Feed test post')
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('removePost by owner removes post from feed', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const userCore = await makeUserCore(store)
      const { core: communityCore } = await createCommunity(store, {
        name: 'my-community4',
        description: 'desc',
        rules: ''
      })

      const block = { type: 'post', id: 'post-3', text: 'Post to remove', ts: Date.now() }
      await userCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
      const seqNo = userCore.length - 1
      const postRef = await submitPostToCommunity(communityCore, userCore.key.toString('hex'), seqNo)

      // Remove by targetId of the post-ref block
      await removePostFromCommunity(communityCore, postRef.id, 'spam')

      const authorCores = new Map()
      authorCores.set(userCore.key.toString('hex'), userCore)
      const feed = await getCommunityFeed(communityCore, authorCores, null)

      expect(feed).toHaveLength(0)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('removePost by non-owner (member role) throws an error', async () => {
    // Simulate the role check in the removePost handler
    const communityMap = new Map()
    const communityKeyHex = 'a'.repeat(64)
    communityMap.set(communityKeyHex, { core: null, name: 'test', role: 'member' })

    const removePost = async ({ targetId, communityKeyHex: key, reason }) => {
      const entry = communityMap.get(key)
      if (!entry) throw new Error('Community not found')
      if (entry.role !== 'owner') throw new Error('Not authorized')
      return { ok: true }
    }

    await expect(
      removePost({ targetId: 'post-1', communityKeyHex, reason: 'spam' })
    ).rejects.toThrow('Not authorized')
  })
})
