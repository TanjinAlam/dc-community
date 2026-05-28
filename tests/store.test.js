import { describe, it, expect, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import { getPublicKey, appendBlock, getBlock } from '../src/p2p/store.js'

function makeTmpStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'corestore-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

describe('store', () => {
  it('initStore returns a core with a valid key', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const core = store.get({ name: 'user-feed' })
      await core.ready()
      expect(core.key).toBeTruthy()
      expect(core.key.length).toBe(32) // 32 bytes = 64 hex chars
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('appendBlock then getBlock returns the same object', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const core = store.get({ name: 'user-feed' })
      await core.ready()
      const block = { type: 'post', text: 'hello', ts: Date.now() }
      const index = await appendBlock(core, block)
      const retrieved = await getBlock(core, index)
      expect(retrieved).toEqual(block)
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('getPublicKey returns a 64-char hex string', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const core = store.get({ name: 'user-feed' })
      await core.ready()
      const key = await getPublicKey(core)
      expect(typeof key).toBe('string')
      expect(key.length).toBe(64)
      expect(key).toMatch(/^[0-9a-f]+$/)
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
