import { describe, it, expect, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import { castVote, getVoteCounts, getMyVote } from '../src/p2p/votes.js'

function makeTmpStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'votes-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

async function setup() {
  const { store, tmpDir } = makeTmpStore()
  const core = store.get({ name: 'user-feed' })
  await core.ready()
  const beeCore = store.get({ name: 'index' })
  await beeCore.ready()
  const bee = new Hyperbee(beeCore, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()
  const myPubkeyHex = core.key.toString('hex')
  return { store, tmpDir, core, bee, myPubkeyHex }
}

async function teardown({ store, tmpDir }) {
  await store.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

describe('votes', () => {
  it('castVote value 1 → getVoteCounts returns { up:1, down:0, score:1 }', async () => {
    const ctx = await setup()
    try {
      await castVote(ctx.core, ctx.bee, ctx.myPubkeyHex, 'post-1', 1)
      const counts = await getVoteCounts(ctx.bee, 'post-1')
      expect(counts).toEqual({ up: 1, down: 0, score: 1 })
    } finally {
      await teardown(ctx)
    }
  })

  it('castVote value -1 → getVoteCounts returns { up:0, down:1, score:-1 }', async () => {
    const ctx = await setup()
    try {
      await castVote(ctx.core, ctx.bee, ctx.myPubkeyHex, 'post-2', -1)
      const counts = await getVoteCounts(ctx.bee, 'post-2')
      expect(counts).toEqual({ up: 0, down: 1, score: -1 })
    } finally {
      await teardown(ctx)
    }
  })

  it('castVote twice same value → getVoteCounts still shows 1 vote (not 2)', async () => {
    const ctx = await setup()
    try {
      await castVote(ctx.core, ctx.bee, ctx.myPubkeyHex, 'post-3', 1)
      await castVote(ctx.core, ctx.bee, ctx.myPubkeyHex, 'post-3', 1)
      const counts = await getVoteCounts(ctx.bee, 'post-3')
      expect(counts).toEqual({ up: 1, down: 0, score: 1 })
    } finally {
      await teardown(ctx)
    }
  })

  it('castVote then flip (1 then -1) → getVoteCounts reflects only the new value', async () => {
    const ctx = await setup()
    try {
      await castVote(ctx.core, ctx.bee, ctx.myPubkeyHex, 'post-4', 1)
      await castVote(ctx.core, ctx.bee, ctx.myPubkeyHex, 'post-4', -1)
      const counts = await getVoteCounts(ctx.bee, 'post-4')
      expect(counts).toEqual({ up: 0, down: 1, score: -1 })
    } finally {
      await teardown(ctx)
    }
  })

  it('getMyVote returns 0 when no vote cast', async () => {
    const ctx = await setup()
    try {
      const result = await getMyVote(ctx.bee, ctx.myPubkeyHex, 'post-5')
      expect(result).toBe(0)
    } finally {
      await teardown(ctx)
    }
  })

  it('getMyVote returns correct value after voting', async () => {
    const ctx = await setup()
    try {
      await castVote(ctx.core, ctx.bee, ctx.myPubkeyHex, 'post-6', 1)
      const result = await getMyVote(ctx.bee, ctx.myPubkeyHex, 'post-6')
      expect(result).toBe(1)
    } finally {
      await teardown(ctx)
    }
  })
})
