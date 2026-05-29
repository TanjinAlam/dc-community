import { describe, it, expect } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import { postComment, getComments, buildCommentTree } from '../src/p2p/comments.js'

function makeTmpStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comments-test-'))
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

describe('comments', () => {
  it('postComment creates an indexable comment (getComments finds it)', async () => {
    const ctx = await setup()
    try {
      const comment = await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, {
        parentId: 'post-1',
        communityKey: 'comm-1',
        text: 'Hello!'
      })
      expect(comment.id).toBeTruthy()
      const comments = await getComments(ctx.bee, 'comm-1', 'post-1')
      expect(comments.length).toBe(1)
      expect(comments[0].text).toBe('Hello!')
      expect(comments[0].author).toBe(ctx.myPubkeyHex)
    } finally {
      await teardown(ctx)
    }
  })

  it('getComments returns comments for a parentId sorted oldest-first', async () => {
    const ctx = await setup()
    try {
      await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: 'post-2', communityKey: 'comm-1', text: 'First' })
      await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: 'post-2', communityKey: 'comm-1', text: 'Second' })
      await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: 'post-2', communityKey: 'comm-1', text: 'Third' })
      const comments = await getComments(ctx.bee, 'comm-1', 'post-2')
      expect(comments.length).toBe(3)
      expect(comments[0].ts).toBeLessThanOrEqual(comments[1].ts)
      expect(comments[1].ts).toBeLessThanOrEqual(comments[2].ts)
    } finally {
      await teardown(ctx)
    }
  })

  it('buildCommentTree returns nested replies correctly (reply to a comment)', async () => {
    const ctx = await setup()
    try {
      const c1 = await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: 'post-3', communityKey: 'comm-1', text: 'Top level' })
      await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: c1.id, communityKey: 'comm-1', text: 'Reply to top' })
      const tree = await buildCommentTree(ctx.bee, 'comm-1', 'post-3')
      expect(tree.length).toBe(1)
      expect(tree[0].text).toBe('Top level')
      expect(tree[0].replies.length).toBe(1)
      expect(tree[0].replies[0].text).toBe('Reply to top')
    } finally {
      await teardown(ctx)
    }
  })

  it('buildCommentTree stops at depth 5 (6 levels deep, leaf has no children)', async () => {
    const ctx = await setup()
    try {
      // Create 6 levels: post -> c0 -> c1 -> c2 -> c3 -> c4 -> c5
      let parentId = 'post-deep'
      const ids = []
      for (let i = 0; i < 6; i++) {
        const c = await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, {
          parentId,
          communityKey: 'comm-1',
          text: `level-${i}`
        })
        ids.push(c.id)
        parentId = c.id
      }
      const tree = await buildCommentTree(ctx.bee, 'comm-1', 'post-deep')
      // Navigate to depth 4 (the 5th comment, index 4)
      let node = tree[0]
      for (let i = 0; i < 4; i++) {
        node = node.replies[0]
      }
      // At depth 5, replies should be empty (depth >= 5 stops recursion)
      expect(node.replies).toEqual([])
    } finally {
      await teardown(ctx)
    }
  })

  it('reply to a reply (depth 2) appears correctly in tree', async () => {
    const ctx = await setup()
    try {
      const c1 = await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: 'post-5', communityKey: 'comm-1', text: 'Depth 1' })
      const c2 = await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: c1.id, communityKey: 'comm-1', text: 'Depth 2' })
      await postComment(ctx.core, ctx.bee, ctx.myPubkeyHex, { parentId: c2.id, communityKey: 'comm-1', text: 'Depth 3' })
      const tree = await buildCommentTree(ctx.bee, 'comm-1', 'post-5')
      expect(tree.length).toBe(1)
      expect(tree[0].replies.length).toBe(1)
      expect(tree[0].replies[0].replies.length).toBe(1)
      expect(tree[0].replies[0].replies[0].text).toBe('Depth 3')
    } finally {
      await teardown(ctx)
    }
  })
})
