import { describe, it, expect, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import { initDirectory, announceCommunity, searchDirectory, listAllCommunities } from '../src/p2p/directory.js'

function makeTmpStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'directory-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

describe('directory', () => {
  it('announceCommunity writes to directoryBee and listAllCommunities finds it', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const dirBee = await initDirectory(store, null)
      const userCore = store.get({ name: 'user-feed' })
      await userCore.ready()
      await announceCommunity(dirBee, userCore, {
        name: 'TestCommunity',
        description: 'A test community',
        communityKey: 'abc123'
      })
      const results = await listAllCommunities(dirBee)
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('TestCommunity')
      expect(results[0].communityKey).toBe('abc123')
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('searchDirectory finds community by partial name', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const dirBee = await initDirectory(store, null)
      const userCore = store.get({ name: 'user-feed' })
      await userCore.ready()
      await announceCommunity(dirBee, userCore, {
        name: 'JavaScript Devs',
        description: 'JS developers community',
        communityKey: 'jsdev1'
      })
      await announceCommunity(dirBee, userCore, {
        name: 'Python Devs',
        description: 'Python developers community',
        communityKey: 'pydev1'
      })
      const results = await searchDirectory(dirBee, 'java')
      expect(results.length).toBe(1)
      expect(results[0].communityKey).toBe('jsdev1')
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('searchDirectory returns empty array for no match', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const dirBee = await initDirectory(store, null)
      const userCore = store.get({ name: 'user-feed' })
      await userCore.ready()
      await announceCommunity(dirBee, userCore, {
        name: 'SomeCommunity',
        description: 'desc',
        communityKey: 'key1'
      })
      const results = await searchDirectory(dirBee, 'zzznomatch')
      expect(results).toEqual([])
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('listAllCommunities returns all announced communities', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const dirBee = await initDirectory(store, null)
      const userCore = store.get({ name: 'user-feed' })
      await userCore.ready()
      await announceCommunity(dirBee, userCore, { name: 'Alpha', description: 'a', communityKey: 'k1' })
      await announceCommunity(dirBee, userCore, { name: 'Beta', description: 'b', communityKey: 'k2' })
      await announceCommunity(dirBee, userCore, { name: 'Gamma', description: 'g', communityKey: 'k3' })
      const results = await listAllCommunities(dirBee)
      expect(results.length).toBe(3)
      const names = results.map(r => r.name)
      expect(names).toContain('Alpha')
      expect(names).toContain('Beta')
      expect(names).toContain('Gamma')
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('listAllCommunities limit enforced at 50', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const dirBee = await initDirectory(store, null)
      const userCore = store.get({ name: 'user-feed' })
      await userCore.ready()
      for (let i = 0; i < 55; i++) {
        await announceCommunity(dirBee, userCore, {
          name: `Community${String(i).padStart(3, '0')}`,
          description: `desc ${i}`,
          communityKey: `key${i}`
        })
      }
      const results = await listAllCommunities(dirBee)
      expect(results.length).toBe(50)
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
