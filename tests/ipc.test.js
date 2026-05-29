import { describe, it, expect } from 'vitest'
import { handlers } from '../src/main/ipc.js'

describe('IPC handlers', () => {
  it('getMyKey returns mock pubkey', () => {
    expect(handlers.getMyKey()).toBe('mock-pubkey-abc123')
  })
  it('getMyProfile returns null', () => {
    expect(handlers.getMyProfile()).toBeNull()
  })
  it('setMyProfile returns object with name', () => {
    expect(handlers.setMyProfile('Alice')).toEqual({ name: 'Alice' })
  })
  it('addFriend returns ok: true', () => {
    expect(handlers.addFriend('some-key')).toEqual({ ok: true })
  })
  it('getFriends returns an array', () => {
    expect(Array.isArray(handlers.getFriends())).toBe(true)
  })
  it('createPost returns ok: true', () => {
    expect(handlers.createPost('hello')).toEqual({ ok: true })
  })
  it('getFeed returns empty array', () => {
    expect(handlers.getFeed()).toEqual([])
  })
})
