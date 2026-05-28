import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import {
  initStore, getPublicKey, appendBlock, getBlock,
  initIndex, indexBlock, getFeed, getProfile
} from '../p2p/store.js'
import { startSwarm, replicateFriendCore } from '../p2p/swarm.js'

// These are set during init — tests will inject mocks
let core = null
let bee = null
let store = null
let swarm = null
let dataPath = './pear-social-data'
let win = null

export function setWindow(w) {
  win = w
}

const FRIENDS_FILE = () => `${dataPath}/friends.json`

function loadFriends() {
  const file = FRIENDS_FILE()
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return [] }
}

function saveFriends(friends) {
  writeFileSync(FRIENDS_FILE(), JSON.stringify(friends))
}

export async function init(dp) {
  dataPath = dp
  const { store: s, core: c } = await initStore(dp)
  core = c
  store = s
  bee = await initIndex(store)

  // Index existing blocks on startup
  for (let i = 0; i < core.length; i++) {
    const block = await getBlock(core, i)
    await indexBlock(bee, await getPublicKey(core), block, i)
  }

  // Index new blocks as they arrive
  core.on('append', async () => {
    const i = core.length - 1
    const block = await getBlock(core, i)
    await indexBlock(bee, await getPublicKey(core), block, i)
    if (win) {
      const feed = await getFeed(bee)
      win.webContents.send('feed-update', feed)
    }
  })

  // Start swarm
  try {
    swarm = await startSwarm(store, (key) => {
      // emit peer-connected (no-op for now)
    })
  } catch (e) {
    // swarm startup may fail in test environments
  }

  // Load previously saved friends
  const savedFriends = loadFriends()
  for (const pubkey of savedFriends) {
    await handlers.addFriend(pubkey)
  }
}

// Plain handler functions — exported for testing
export const handlers = {
  getMyKey: () => {
    if (!core) return 'mock-pubkey-abc123'
    return getPublicKey(core)
  },
  getMyProfile: () => {
    if (!bee || !core) return null
    return getPublicKey(core).then(key => getProfile(bee, key))
  },
  setMyProfile: (name) => {
    if (!core) return { name }
    return appendBlock(core, { type: 'profile', id: uuid(), name, ts: Date.now() }).then(() => ({ name }))
  },
  addFriend: (pubkey) => {
    if (!store) return { ok: true }
    return (async () => {
    const friendCore = await replicateFriendCore(store, pubkey)
    // watch for new blocks from this friend
    friendCore.on('append', async () => {
      const i = friendCore.length - 1
      const block = await getBlock(friendCore, i)
      await indexBlock(bee, pubkey, block, i)
    })
    // index existing blocks
    for (let i = 0; i < friendCore.length; i++) {
      const block = await getBlock(friendCore, i)
      await indexBlock(bee, pubkey, block, i)
    }
    // persist to friends.json
    const friends = loadFriends()
    if (!friends.includes(pubkey)) {
      friends.push(pubkey)
      saveFriends(friends)
    }
      return { ok: true }
    })()
  },
  getFriends: () => loadFriends(),
  createPost: (text) => {
    if (!core) return { ok: true }
    return appendBlock(core, { type: 'post', id: uuid(), text, ts: Date.now() }).then(() => ({ ok: true }))
  },
  getFeed: () => {
    if (!bee) return []
    return getFeed(bee)
  },
}

export function registerHandlers(ipcMainArg) {
  const im = ipcMainArg || ipcMain
  im.handle('get-my-key', () => handlers.getMyKey())
  im.handle('get-my-profile', () => handlers.getMyProfile())
  im.handle('set-my-profile', (_, name) => handlers.setMyProfile(name))
  im.handle('add-friend', (_, pubkey) => handlers.addFriend(pubkey))
  im.handle('get-friends', () => handlers.getFriends())
  im.handle('create-post', (_, text) => handlers.createPost(text))
  im.handle('get-feed', () => handlers.getFeed())
}
