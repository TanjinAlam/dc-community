import { describe, it, expect } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import { initDrive, setAvatar, getAvatar } from '../src/p2p/drive.js'
import { initIndex, getProfile } from '../src/p2p/store.js'

function makeTmpStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drive-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

describe('drive', () => {
  it('setAvatar writes and getAvatar reads back same buffer', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const drive = await initDrive(store)
      const imgBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG magic bytes
      const mimeType = 'image/png'
      const driveKeyHex = await setAvatar(drive, imgBuffer, mimeType)
      expect(typeof driveKeyHex).toBe('string')
      expect(driveKeyHex.length).toBe(64)

      // Read back directly from the same drive (own drive)
      const avatarBuf = await drive.get('/avatar')
      const mimeBuf = await drive.get('/avatar.mime')
      expect(avatarBuf).toBeTruthy()
      expect(Buffer.compare(avatarBuf, imgBuffer)).toBe(0)
      expect(mimeBuf.toString()).toBe(mimeType)
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('getAvatar returns null for unknown/uninitialized driveKey', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const drive = await initDrive(store)
      // Generate a random hex key that doesn't correspond to any known drive
      const fakeKeyHex = Buffer.alloc(32).fill(0xab).toString('hex')
      const result = await getAvatar(drive, fakeKeyHex)
      expect(result).toBeNull()
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('Profile block with driveKey round-trips through Hyperbee', async () => {
    const { store, tmpDir } = makeTmpStore()
    try {
      const bee = await initIndex(store)
      const pubkey = 'aabbcc112233'
      const profileBlock = { type: 'profile', id: 'test-id', name: 'Alice', driveKey: 'deadbeef1234', ts: Date.now() }

      // Manually index the profile block
      const key = `profile!${pubkey}`
      await bee.put(key, { ...profileBlock, author: pubkey })

      const stored = await getProfile(bee, pubkey)
      expect(stored).toBeTruthy()
      expect(stored.name).toBe('Alice')
      expect(stored.driveKey).toBe('deadbeef1234')
    } finally {
      await store.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
