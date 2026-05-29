import Corestore from 'corestore'
import b4a from 'b4a'
import { v4 as uuidv4 } from 'uuid'
import Autobase from 'autobase'

export async function createCommunity(store, { name, description, rules }) {
  const core = store.get({ name: `community-${name}` })
  await core.ready()
  const block = { type: 'community', id: uuidv4(), name, description, rules, ts: Date.now() }
  await core.append(b4a.from(JSON.stringify(block), 'utf-8'))
  return { communityKey: core.key.toString('hex'), core }
}

export async function getCommunityCore(store, communityKeyHex) {
  const core = store.get({ key: Buffer.from(communityKeyHex, 'hex') })
  await core.ready()
  return core
}

export async function submitPostToCommunity(communityCore, authorKeyHex, seqNo) {
  const block = {
    type: 'post-ref',
    id: uuidv4(),
    communityKey: communityCore.key.toString('hex'),
    authorKey: authorKeyHex,
    seqNo,
    ts: Date.now()
  }
  await communityCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
  return block
}

export async function removePostFromCommunity(communityCore, targetId, reason) {
  const block = { type: 'remove-ref', id: uuidv4(), targetId, reason, ts: Date.now() }
  await communityCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
  return block
}

export async function getCommunityFeed(communityCore, authorCores, bee) {
  const postRefs = []
  const removeRefs = new Set()

  for (let i = 0; i < communityCore.length; i++) {
    const buf = await communityCore.get(i)
    const block = JSON.parse(b4a.toString(buf, 'utf-8'))
    if (block.type === 'post-ref') {
      postRefs.push(block)
    } else if (block.type === 'remove-ref') {
      removeRefs.add(block.targetId)
    }
  }

  const validRefs = postRefs.filter(ref => !removeRefs.has(ref.id))

  const posts = []
  for (const ref of validRefs) {
    const authorCore = authorCores.get(ref.authorKey)
    if (authorCore) {
      const buf = await authorCore.get(ref.seqNo)
      const post = JSON.parse(b4a.toString(buf, 'utf-8'))
      posts.push({ ...post, ts: ref.ts })
    }
  }

  posts.sort((a, b) => b.ts - a.ts)
  return posts
}

export async function joinCommunity(store, communityKeyHex, friendsList) {
  await getCommunityCore(store, communityKeyHex)
  return { ok: true }
}

export async function initAutobase(store, communityKeyHex, modKeyHexes = []) {
  const ownerCore = store.get({ key: Buffer.from(communityKeyHex, 'hex') })
  await ownerCore.ready()
  const inputs = [ownerCore]
  for (const modKeyHex of modKeyHexes) {
    const modCore = store.get({ key: Buffer.from(modKeyHex, 'hex') })
    await modCore.ready()
    inputs.push(modCore)
  }
  const output = store.get({ name: `autobase-output-${communityKeyHex.slice(0, 16)}` })
  await output.ready()
  const autobase = new Autobase(store, ownerCore.key, { apply: async (nodes, view, base) => {}, open: (store) => store.get('view') })
  await autobase.ready()
  return autobase
}

export async function addModerator(store, autobase, ownerCore, bee, communityKeyHex, modPubkeyHex) {
  const block = { type: 'add-mod', id: uuidv4(), modKey: modPubkeyHex, ts: Date.now() }
  await ownerCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
  await bee.put(`mod!${communityKeyHex}!${modPubkeyHex}`, { modKey: modPubkeyHex, ts: Date.now() })
  try {
    const modCore = store.get({ key: Buffer.from(modPubkeyHex, 'hex') })
    await modCore.ready()
    if (autobase && typeof autobase.addInput === 'function') {
      autobase.addInput(modCore)
    }
  } catch (e) {
    // ignore if modCore can't be loaded
  }
  return { ok: true }
}

export async function getModerators(bee, communityKeyHex) {
  const mods = []
  const range = bee.createReadStream({ gt: `mod!${communityKeyHex}!`, lt: `mod!${communityKeyHex}~` })
  for await (const entry of range) {
    mods.push(entry.value.modKey)
  }
  return mods
}
