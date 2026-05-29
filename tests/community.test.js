import { describe, it, expect } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import b4a from 'b4a'
import {
  createCommunity,
  submitPostToCommunity,
  removePostFromCommunity,
  getCommunityFeed,
  joinCommunity
} from '../src/p2p/community.js'

function makeStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'community-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

async function cleanupStore(store, tmpDir) {
  await store.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

describe('community', () => {
  it('createCommunity returns a valid 64-char hex communityKey', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { communityKey } = await createCommunity(store, {
        name: 'test-community',
        description: 'A test community',
        rules: 'Be nice'
      })
      expect(communityKey).toHaveLength(64)
      expect(communityKey).toMatch(/^[0-9a-f]+$/)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('submitPostToCommunity appends a post-ref block', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core: communityCore } = await createCommunity(store, {
        name: 'test-community2',
        description: 'Test',
        rules: ''
      })
      const authorKeyHex = 'a'.repeat(64)
      await submitPostToCommunity(communityCore, authorKeyHex, 0)
      const buf = await communityCore.get(1)
      const block = JSON.parse(b4a.toString(buf, 'utf-8'))
      expect(block.type).toBe('post-ref')
      expect(block.authorKey).toBe(authorKeyHex)
      expect(block.seqNo).toBe(0)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getCommunityFeed excludes a post after removePostFromCommunity', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core: communityCore } = await createCommunity(store, {
        name: 'test-community3',
        description: 'Test',
        rules: ''
      })

      const userCore = store.get({ name: 'user-core-3' })
      await userCore.ready()
      const postBlock = { type: 'post', text: 'Hello world', ts: Date.now() }
      await userCore.append(b4a.from(JSON.stringify(postBlock), 'utf-8'))

      const authorKeyHex = userCore.key.toString('hex')
      const ref = await submitPostToCommunity(communityCore, authorKeyHex, 0)
      await removePostFromCommunity(communityCore, ref.id, 'spam')

      const authorCores = new Map([[authorKeyHex, userCore]])
      const feed = await getCommunityFeed(communityCore, authorCores, null)
      expect(feed).toHaveLength(0)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getCommunityFeed resolves post-refs to actual post content', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core: communityCore } = await createCommunity(store, {
        name: 'test-community4',
        description: 'Test',
        rules: ''
      })

      const userCore = store.get({ name: 'user-core-4' })
      await userCore.ready()
      const postBlock = { type: 'post', text: 'Hello from user', ts: Date.now() }
      await userCore.append(b4a.from(JSON.stringify(postBlock), 'utf-8'))

      const authorKeyHex = userCore.key.toString('hex')
      await submitPostToCommunity(communityCore, authorKeyHex, 0)

      const authorCores = new Map([[authorKeyHex, userCore]])
      const feed = await getCommunityFeed(communityCore, authorCores, null)
      expect(feed).toHaveLength(1)
      expect(feed[0].text).toBe('Hello from user')
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getCommunityFeed returns posts sorted newest-first', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core: communityCore } = await createCommunity(store, {
        name: 'test-community5',
        description: 'Test',
        rules: ''
      })

      const userCore = store.get({ name: 'user-core-5' })
      await userCore.ready()
      const post1 = { type: 'post', text: 'Post 1', ts: 1000 }
      const post2 = { type: 'post', text: 'Post 2', ts: 2000 }
      await userCore.append(b4a.from(JSON.stringify(post1), 'utf-8'))
      await userCore.append(b4a.from(JSON.stringify(post2), 'utf-8'))

      const authorKeyHex = userCore.key.toString('hex')
      await submitPostToCommunity(communityCore, authorKeyHex, 0)
      await new Promise(r => setTimeout(r, 10))
      await submitPostToCommunity(communityCore, authorKeyHex, 1)

      const authorCores = new Map([[authorKeyHex, userCore]])
      const feed = await getCommunityFeed(communityCore, authorCores, null)
      expect(feed).toHaveLength(2)
      expect(feed[0].ts).toBeGreaterThanOrEqual(feed[1].ts)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })
})
