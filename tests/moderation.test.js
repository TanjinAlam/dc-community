import { describe, it, expect } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import b4a from 'b4a'
import {
  createCommunity,
  submitPostToCommunity,
  removePostFromCommunity,
  getCommunityFeed,
  addModerator,
  getModerators
} from '../src/p2p/community.js'

function makeStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mod-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

async function makeBee(store) {
  const beeCore = store.get({ name: 'bee' })
  await beeCore.ready()
  const bee = new Hyperbee(beeCore, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()
  return bee
}

async function cleanupStore(store, tmpDir) {
  await store.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

describe('moderation', () => {
  it('addModerator writes mod entry to bee', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { communityKey, core: ownerCore } = await createCommunity(store, {
        name: 'mod-community',
        description: 'Test',
        rules: ''
      })
      const bee = await makeBee(store)
      const modKey = 'b'.repeat(64)
      await addModerator(store, null, ownerCore, bee, communityKey, modKey)
      const entry = await bee.get(`mod!${communityKey}!${modKey}`)
      expect(entry).not.toBeNull()
      expect(entry.value.modKey).toBe(modKey)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getModerators returns the added moderator pubkey', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { communityKey, core: ownerCore } = await createCommunity(store, {
        name: 'mod-community2',
        description: 'Test',
        rules: ''
      })
      const bee = await makeBee(store)
      const modKey = 'c'.repeat(64)
      await addModerator(store, null, ownerCore, bee, communityKey, modKey)
      const mods = await getModerators(bee, communityKey)
      expect(mods).toContain(modKey)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('moderator (non-owner) can call removePostFromCommunity and post is excluded from feed', async () => {
    const { store, tmpDir } = makeStore()
    try {
      // Create community and owner core
      const { communityKey, core: communityCore } = await createCommunity(store, {
        name: 'mod-community3',
        description: 'Test',
        rules: ''
      })
      // Create an author core with a post
      const authorCore = store.get({ name: 'author-core' })
      await authorCore.ready()
      const postBlock = { type: 'post', id: 'post-id-1', text: 'Hello World', ts: Date.now() }
      await authorCore.append(b4a.from(JSON.stringify(postBlock), 'utf-8'))
      const seqNo = authorCore.length - 1
      const postRef = await submitPostToCommunity(communityCore, authorCore.key.toString('hex'), seqNo)

      // Verify post is in feed
      const authorCores = new Map([[authorCore.key.toString('hex'), authorCore]])
      const feedBefore = await getCommunityFeed(communityCore, authorCores, null)
      expect(feedBefore.length).toBe(1)

      // Moderator removes the post (directly calling the community.js function)
      await removePostFromCommunity(communityCore, postRef.id, 'spam')

      // Verify post is excluded
      const feedAfter = await getCommunityFeed(communityCore, authorCores, null)
      expect(feedAfter.length).toBe(0)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('non-moderator pubkey is not in getModerators result', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { communityKey, core: ownerCore } = await createCommunity(store, {
        name: 'mod-community4',
        description: 'Test',
        rules: ''
      })
      const bee = await makeBee(store)
      const modKey = 'd'.repeat(64)
      const nonModKey = 'e'.repeat(64)
      await addModerator(store, null, ownerCore, bee, communityKey, modKey)
      const mods = await getModerators(bee, communityKey)
      expect(mods).not.toContain(nonModKey)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })
})
