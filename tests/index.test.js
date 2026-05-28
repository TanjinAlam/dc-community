import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Corestore from 'corestore'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { initIndex, indexBlock, getFeed, getProfile } from '../src/p2p/store.js'

let store, bee, tmpDir

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pear-test-'))
  store = new Corestore(tmpDir)
  bee = await initIndex(store)
})

afterEach(async () => {
  await store.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('feed indexer', () => {
  it('indexBlock with post block — getFeed returns it', async () => {
    const pubkey = 'abc123'
    const block = { type: 'post', id: '1', text: 'hello', ts: 1000 }
    await indexBlock(bee, pubkey, block, 0)
    const feed = await getFeed(bee)
    expect(feed).toHaveLength(1)
    expect(feed[0].text).toBe('hello')
    expect(feed[0].author).toBe('abc123')
  })

  it('indexBlock with profile block — getProfile returns it', async () => {
    const pubkey = 'abc123'
    const block = { type: 'profile', id: 'p1', name: 'Alice', ts: 1000 }
    await indexBlock(bee, pubkey, block, 0)
    const profile = await getProfile(bee, pubkey)
    expect(profile).not.toBeNull()
    expect(profile.name).toBe('Alice')
    expect(profile.author).toBe('abc123')
  })

  it('getFeed with 3 posts returns them newest-first', async () => {
    const pubkey = 'abc123'
    await indexBlock(bee, pubkey, { type: 'post', id: '1', text: 'first', ts: 1000 }, 0)
    await indexBlock(bee, pubkey, { type: 'post', id: '2', text: 'second', ts: 3000 }, 1)
    await indexBlock(bee, pubkey, { type: 'post', id: '3', text: 'third', ts: 2000 }, 2)
    const feed = await getFeed(bee)
    expect(feed).toHaveLength(3)
    expect(feed[0].text).toBe('second') // ts: 3000, newest
    expect(feed[1].text).toBe('third')  // ts: 2000
    expect(feed[2].text).toBe('first')  // ts: 1000, oldest
  })

  it('indexBlock with unknown type — getFeed returns 0 posts', async () => {
    const pubkey = 'abc123'
    const block = { type: 'like', id: '1', ts: 1000 }
    await indexBlock(bee, pubkey, block, 0)
    const feed = await getFeed(bee)
    expect(feed).toHaveLength(0)
  })
})
