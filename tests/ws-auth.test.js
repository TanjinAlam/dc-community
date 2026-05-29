import { describe, it, expect } from 'vitest'
import hypercore_crypto from 'hypercore-crypto'
import b4a from 'b4a'
import { verifyChallenge } from '../src/main/ws-auth.js'

describe('verifyChallenge', () => {
  it('returns true for valid signature', () => {
    const { publicKey, secretKey } = hypercore_crypto.keyPair()
    const nonce = b4a.from('deadbeef1234', 'hex')
    const signature = hypercore_crypto.sign(nonce, secretKey)
    const result = verifyChallenge(
      b4a.toString(nonce, 'hex'),
      b4a.toString(signature, 'hex'),
      b4a.toString(publicKey, 'hex')
    )
    expect(result).toBe(true)
  })

  it('returns false for bad signature', () => {
    const { publicKey } = hypercore_crypto.keyPair()
    expect(verifyChallenge('aabb', 'ccdd', b4a.toString(publicKey, 'hex'))).toBe(false)
  })
})
