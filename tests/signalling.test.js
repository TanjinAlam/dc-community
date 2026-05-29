import { describe, it, expect } from 'vitest'
import { createCallState, handleSignalMessage, buildInviteMessage, buildEndMessage } from '../src/p2p/signalling.js'

const ME = 'a'.repeat(64)
const OTHER = 'b'.repeat(64)

describe('signalling', () => {
  it('Test 1: idle + call-invite (from other) → ringing + show-incoming-call', () => {
    const state = createCallState()
    const msg = buildInviteMessage('call-1', OTHER, [ME, OTHER], false)
    const { nextState, actions } = handleSignalMessage(state, msg, ME)
    expect(nextState.status).toBe('ringing')
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('show-incoming-call')
    expect(actions[0].payload).toBe(msg)
  })

  it('Test 2: ringing + call-accepted → connecting + create-peer-connection', () => {
    const state = { ...createCallState(), status: 'ringing' }
    const msg = { type: 'call-accepted', callId: 'call-1' }
    const { nextState, actions } = handleSignalMessage(state, msg, ME)
    expect(nextState.status).toBe('connecting')
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('create-peer-connection')
  })

  it('Test 3: ringing + call-rejected → idle + show-rejected', () => {
    const state = { ...createCallState(), status: 'ringing' }
    const msg = { type: 'call-rejected', callId: 'call-1' }
    const { nextState, actions } = handleSignalMessage(state, msg, ME)
    expect(nextState.status).toBe('idle')
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('show-rejected')
  })

  it('Test 4: active status + call-ended → ended + close-peer-connection', () => {
    const state = { ...createCallState(), status: 'active' }
    const msg = buildEndMessage('call-1', OTHER)
    const { nextState, actions } = handleSignalMessage(state, msg, ME)
    expect(nextState.status).toBe('ended')
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('close-peer-connection')
  })

  it('Test 5: call-muted updates isMuted correctly', () => {
    const state = createCallState()
    const msg = { type: 'call-muted', audio: true, video: false }
    const { nextState, actions } = handleSignalMessage(state, msg, ME)
    expect(nextState.isMuted.audio).toBe(true)
    expect(nextState.isMuted.video).toBe(false)
    expect(actions[0].type).toBe('update-mute-state')
  })

  it('Test 6: pure function — does not mutate input state', () => {
    const state = Object.freeze({ ...createCallState(), isMuted: Object.freeze({ audio: false, video: false }), participants: Object.freeze([]) })
    const msg = { type: 'call-muted', audio: true, video: true }
    expect(() => handleSignalMessage(state, msg, ME)).not.toThrow()
    expect(state.isMuted.audio).toBe(false)
  })
})
