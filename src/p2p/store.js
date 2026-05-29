import Corestore from 'corestore'
import b4a from 'b4a'
import Hyperbee from 'hyperbee'
import { indexForSearch } from './search.js'

export async function initStore(dataPath) {
  const store = new Corestore(dataPath)
  const core = store.get({ name: 'user-feed' })
  await core.ready()
  return { store, core }
}

export async function getPublicKey(core) {
  return b4a.toString(core.key, 'hex')
}

export async function appendBlock(core, block) {
  const { length } = await core.append(Buffer.from(JSON.stringify(block)))
  return length - 1
}

export async function getBlock(core, index) {
  const buf = await core.get(index)
  return JSON.parse(buf.toString())
}

export async function initIndex(store) {
  const core = store.get({ name: 'feed-index' })
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  await bee.ready()
  return bee
}

export async function indexBlock(bee, pubkey, block, seqNo) {
  if (block.type === 'post') {
    const key = `post!${block.ts}!${pubkey}!${seqNo}`
    await bee.put(key, { ...block, author: pubkey })
  } else if (block.type === 'profile') {
    const key = `profile!${pubkey}`
    await bee.put(key, { ...block, author: pubkey })
  }
  // unknown types: do nothing
  await indexForSearch(bee, block, pubkey)
}

export async function getFeed(bee) {
  const posts = []
  for await (const entry of bee.createReadStream({ gt: 'post!', lt: 'post!~' })) {
    posts.push(entry.value)
  }
  // sort newest first (keys contain ts, but sort by value.ts to be safe)
  posts.sort((a, b) => b.ts - a.ts)
  return posts
}

export async function getProfile(bee, pubkey) {
  const entry = await bee.get(`profile!${pubkey}`)
  return entry ? entry.value : null
}
