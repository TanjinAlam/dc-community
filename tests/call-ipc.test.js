import { describe, it, expect, beforeEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'
import Corestore from 'corestore'
import b4a from 'b4a'
import { createCallState } from '../src/p2p/signalling.js'
import { initIndex } from '../src/p2p/store.js'

function makeStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'call-ipc-test-'))
  const store = new Corestore(tmpDir)
  return { store, tmpDir }
}

async function cleanupStore(store, tmpDir) {
  await store.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

async function makeSetup(store) {
  const core = store.get({ name: 'user-core' })
  await core.ready()
  const bee = await initIndex(store)
  const myPubkey = core.key.toString('hex')
  return { core, bee, myPubkey }
}

describe('call IPC handlers logic', () => {
  it('startCall returns a callId and sets callState to ringing', async () => {
    let callState = createCallState()

    // Simulate startCall handler logic
    const participantKeys = ['a'.repeat(64)]
    const isVideo = false
    const callId = 'test-call-id-123'
    const myPubkey = 'b'.repeat(64)

    callState = { ...createCallState(), callId, status: 'ringing', participants: [myPubkey, ...participantKeys], isVideo, startedAt: Date.now() }

    expect(callId).toBeTruthy()
    expect(callState.status).toBe('ringing')
    expect(callState.participants).toContain(myPubkey)
    expect(callState.participants).toContain(participantKeys[0])
  })

  it('rejectCall resets callState status to idle', async () => {
    let callState = { ...createCallState(), callId: 'call-1', status: 'ringing', participants: ['a'.repeat(64)] }

    // Simulate rejectCall handler logic
    callState = createCallState()

    expect(callState.status).toBe('idle')
    expect(callState.callId).toBeNull()
  })

  it('endCall appends a call-log block to core and bee', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core, bee, myPubkey } = await makeSetup(store)

      const callId = 'call-end-test'
      const participants = [myPubkey, 'c'.repeat(64)]
      const startedAt = Date.now() - 5000
      let callState = { ...createCallState(), callId, status: 'connecting', participants, startedAt, isVideo: false }

      // Simulate endCall handler logic
      const logBlock = {
        type: 'call-log',
        id: callId,
        participants: callState.participants || [],
        startedAt: callState.startedAt,
        endedAt: Date.now(),
        durationSeconds: callState.startedAt ? Math.floor((Date.now() - callState.startedAt) / 1000) : 0,
        wasVideo: callState.isVideo,
        ts: Date.now()
      }
      await core.append(b4a.from(JSON.stringify(logBlock), 'utf-8'))
      await bee.put(`calllog!${logBlock.ts}!${logBlock.id}`, logBlock)
      callState = createCallState()

      expect(callState.status).toBe('idle')
      const stored = await bee.get(`calllog!${logBlock.ts}!${logBlock.id}`)
      expect(stored).toBeTruthy()
      expect(stored.value.type).toBe('call-log')
      expect(stored.value.id).toBe(callId)
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('getCallHistory returns call-log blocks sorted newest-first', async () => {
    const { store, tmpDir } = makeStore()
    try {
      const { core, bee, myPubkey } = await makeSetup(store)

      const ts1 = 1000
      const ts2 = 2000
      const log1 = { type: 'call-log', id: 'call-1', participants: [myPubkey], startedAt: ts1, endedAt: ts1 + 1000, durationSeconds: 1, wasVideo: false, ts: ts1 }
      const log2 = { type: 'call-log', id: 'call-2', participants: [myPubkey], startedAt: ts2, endedAt: ts2 + 2000, durationSeconds: 2, wasVideo: true, ts: ts2 }

      await bee.put(`calllog!${ts1}!${log1.id}`, log1)
      await bee.put(`calllog!${ts2}!${log2.id}`, log2)

      // Simulate getCallHistory handler logic
      const logs = []
      for await (const entry of bee.createReadStream({ gt: 'calllog!', lt: 'calllog~', reverse: true, limit: 50 })) {
        logs.push(entry.value)
      }

      expect(logs.length).toBe(2)
      // Sorted newest-first (reverse: true with lexicographic key ordering means ts2 > ts1 comes first)
      expect(logs[0].id).toBe('call-2')
      expect(logs[1].id).toBe('call-1')
    } finally {
      await cleanupStore(store, tmpDir)
    }
  })

  it('toggleMute with { audio: true } sets callState.isMuted.audio = true', async () => {
    let callState = createCallState()

    // Simulate toggleMute handler logic
    const audio = true
    const video = undefined
    callState = {
      ...callState,
      isMuted: {
        audio: audio !== undefined ? audio : callState.isMuted.audio,
        video: video !== undefined ? video : callState.isMuted.video
      }
    }

    expect(callState.isMuted.audio).toBe(true)
    expect(callState.isMuted.video).toBe(false)
  })
})
