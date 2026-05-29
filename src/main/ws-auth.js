import hypercore_crypto from 'hypercore-crypto'
import b4a from 'b4a'

export function verifyChallenge(nonce, signature, pubkeyHex) {
  try {
    const pubkey = b4a.from(pubkeyHex, 'hex')
    const msg = b4a.from(nonce, 'hex')
    const sig = b4a.from(signature, 'hex')
    return hypercore_crypto.verify(msg, sig, pubkey)
  } catch {
    return false
  }
}
