import crypto from 'node:crypto'
import Hyperbee from 'hyperbee'
import { v4 as uuidv4 } from 'uuid'
import b4a from 'b4a'

export const DIRECTORY_TOPIC = crypto.createHash('sha256').update('pear-social-directory-v1').digest()

export async function initDirectory(store, swarm) {
  const core = store.get({ name: 'global-directory' })
  await core.ready()
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()
  if (swarm) {
    swarm.join(DIRECTORY_TOPIC)
  }
  return bee
}

export async function announceCommunity(directoryBee, userCore, { name, description, communityKey }) {
  await userCore.append(b4a.from(JSON.stringify({
    type: 'community-announce',
    id: uuidv4(),
    name,
    description,
    communityKey,
    ts: Date.now()
  }), 'utf-8'))
  await directoryBee.put(`community!${name.toLowerCase()}!${communityKey}`, {
    name,
    description,
    communityKey,
    ts: Date.now()
  })
}

export async function searchDirectory(directoryBee, query) {
  query = query.toLowerCase()
  const results = []
  for await (const entry of directoryBee.createReadStream({
    gt: `community!${query}`,
    lt: `community!${query}~`
  })) {
    results.push({ name: entry.value.name, description: entry.value.description, communityKey: entry.value.communityKey })
    if (results.length >= 20) break
  }
  return results
}

export async function listAllCommunities(directoryBee) {
  const results = []
  for await (const entry of directoryBee.createReadStream({
    gt: 'community!',
    lt: 'community~'
  })) {
    results.push({ name: entry.value.name, description: entry.value.description, communityKey: entry.value.communityKey })
    if (results.length >= 50) break
  }
  results.sort((a, b) => a.name.localeCompare(b.name))
  return results
}
