import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Corestore from 'corestore'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { appendBlock, getBlock, initIndex, indexBlock, getFeed } from '../src/p2p/store.js'

let tmpDirA, tmpDirB, storeA, storeB

beforeEach(async () => {
  tmpDirA = mkdtempSync(join(tmpdir(), 'pear-a-'))
  tmpDirB = mkdtempSync(join(tmpdir(), 'pear-b-'))
  storeA = new Corestore(tmpDirA)
  storeB = new Corestore(tmpDirB)
})

afterEach(async () => {
  await storeA.close()
  await storeB.close()
  rmSync(tmpDirA, { recursive: true, force: true })
  rmSync(tmpDirB, { recursive: true, force: true })
})

describe('replication', () => {
  it('two stores replicate a single appended block', async () => {
    // Create core in store A
    const coreA = storeA.get({ name: 'user-feed' })
    await coreA.ready()

    // Append a block to A
    await appendBlock(coreA, { type: 'post', id: '1', text: 'hello from A', ts: 1000 })

    // Store B gets the same core by key
    const coreB = storeB.get({ key: coreA.key })
    await coreB.ready()

    // Direct stream replication between the two stores
    const s1 = storeA.replicate(true)
    const s2 = storeB.replicate(false)
    s1.pipe(s2).pipe(s1)

    // Wait for replication
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(coreB.length).toBe(1)
    const block = await getBlock(coreB, 0)
    expect(block.text).toBe('hello from A')
  })

  it('after replication, indexBlock makes post appear in getFeed', async () => {
    const coreA = storeA.get({ name: 'user-feed' })
    await coreA.ready()
    await appendBlock(coreA, { type: 'post', id: '1', text: 'replicated post', ts: 2000 })

    const coreB = storeB.get({ key: coreA.key })
    await coreB.ready()

    const s1 = storeA.replicate(true)
    const s2 = storeB.replicate(false)
    s1.pipe(s2).pipe(s1)
    await new Promise(resolve => setTimeout(resolve, 500))

    // Now index the replicated block in B's feed index
    const beeB = await initIndex(storeB)
    const pubkeyHex = coreA.key.toString('hex')
    const block = await getBlock(coreB, 0)
    await indexBlock(beeB, pubkeyHex, block, 0)

    const feed = await getFeed(beeB)
    expect(feed).toHaveLength(1)
    expect(feed[0].text).toBe('replicated post')
  })
})
