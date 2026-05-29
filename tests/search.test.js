import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import { tokenise, indexForSearch, search } from '../src/p2p/search.js'

function makeTmpBee() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'search-test-'))
  const store = new Corestore(tmpDir)
  const core = store.get({ name: 'search-index' })
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  return { bee, store, tmpDir }
}

describe('search', () => {
  it('tokenise removes short tokens and deduplicates', () => {
    const tokens = tokenise('Hello world hi hello foo')
    expect(tokens).not.toContain('hi')  // length 2
    expect(tokens.filter(t => t === 'hello').length).toBe(1)  // deduplicated
    expect(tokens).toContain('hello')
    expect(tokens).toContain('world')
    expect(tokens).toContain('foo')
  })

  it('indexForSearch indexes a post by all its tokens', async () => {
    const { bee, store, tmpDir } = makeTmpBee()
    try {
      await bee.ready()
      const block = { type: 'post', id: 'abc', text: 'hello world', ts: 1000 }
      await indexForSearch(bee, block, 'author1')
      const entry = await bee.get(`search!hello!1000!abc`)
      expect(entry).not.toBeNull()
      expect(entry.value.id).toBe('abc')
      expect(entry.value.authorKey).toBe('author1')
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('search finds a post by a word in its text', async () => {
    const { bee, store, tmpDir } = makeTmpBee()
    try {
      await bee.ready()
      const block = { type: 'post', id: 'post1', text: 'decentralized community rocks', ts: 2000 }
      await indexForSearch(bee, block, 'author1')
      const results = await search(bee, 'decentralized')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('post1')
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('search returns empty array for no match', async () => {
    const { bee, store, tmpDir } = makeTmpBee()
    try {
      await bee.ready()
      const results = await search(bee, 'xyznotfound')
      expect(results).toEqual([])
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('search result limit is enforced at 30', async () => {
    const { bee, store, tmpDir } = makeTmpBee()
    try {
      await bee.ready()
      for (let i = 0; i < 35; i++) {
        const block = { type: 'post', id: `post${i}`, text: 'testtoken content here', ts: 1000 + i }
        await indexForSearch(bee, block, 'author1')
      }
      const results = await search(bee, 'testtoken')
      expect(results.length).toBe(30)
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
