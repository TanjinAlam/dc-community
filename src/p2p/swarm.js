import Hyperswarm from 'hyperswarm'
import crypto from 'crypto'

export async function startSwarm(store, onPeerConnected) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (conn, info) => {
    store.replicate(conn)
    if (onPeerConnected) {
      onPeerConnected(info.publicKey.toString('hex'))
    }
  })

  const topic = crypto.createHash('sha256').update('pear-social-v1').digest()
  await swarm.join(topic)

  return swarm
}

export async function replicateFriendCore(store, friendPubkeyHex) {
  const core = store.get({ key: Buffer.from(friendPubkeyHex, 'hex') })
  await core.ready()
  return core
}
