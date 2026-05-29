import { ipcMain } from 'electron'
import { broadcast } from './ws-server.js'
import { v4 as uuid } from 'uuid'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  initStore, getPublicKey, appendBlock, getBlock,
  initIndex, indexBlock, getFeed, getProfile
} from '../p2p/store.js'
import { startSwarm, replicateFriendCore, setCallSignalHandler, sendCallSignal, broadcastCallSignal, setMyHypercoreKey } from '../p2p/swarm.js'
import { createCallState, handleSignalMessage, buildInviteMessage, buildEndMessage } from '../p2p/signalling.js'
// WebRTC media is handled entirely in the renderer (navigator.mediaDevices).
// The main process only relays signalling — no webrtc.js imports needed.
import { initDrive, setAvatar, getAvatar } from '../p2p/drive.js'
import { createCommunity, getCommunityCore, submitPostToCommunity, removePostFromCommunity, getCommunityFeed, joinCommunity, initAutobase, addModerator, getModerators } from '../p2p/community.js'
import { castVote, getVoteCounts, getMyVote } from '../p2p/votes.js'
import { sendMessage, indexIncomingMessage, getMessages, getConversations } from '../p2p/chat.js'
import { postComment, getComments, buildCommentTree } from '../p2p/comments.js'
import { initDirectory, announceCommunity, searchDirectory, listAllCommunities } from '../p2p/directory.js'
import { search } from '../p2p/search.js'
import b4a from 'b4a'

// These are set during init — tests will inject mocks
let core = null
let bee = null
let store = null
let swarm = null
let drive = null
let dataPath = './pear-social-data'
let win = null
let wss = null
let communitiesPath = null
let communityMap = new Map()
let autobaseMap = new Map()
let directoryBee = null
let callState = createCallState()
let pendingIncomingCall = null // buffered if renderer not ready when call arrives
let callSignalBuffer = []      // WebRTC signals buffered until CallScreen mounts
let rendererCallReady = false  // true once CallScreen registers its listener

export function setWindow(w) {
  win = w
}

export function setWss(w) {
  wss = w
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
  communitiesPath = join(dataPath, 'communities.json')
  const { store: s, core: c } = await initStore(dp)
  core = c
  store = s
  bee = await initIndex(store)
  drive = await initDrive(store)

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
    if (wss) {
      const feed = await getFeed(bee)
      broadcast(wss, 'feed-update', feed)
    }
  })

  // Tell swarm our Hypercore key so the call-hello handshake maps correctly
  setMyHypercoreKey(core.key.toString('hex'))

  // Start swarm
  try {
    swarm = await startSwarm(store, (key) => {
      // emit peer-connected (no-op for now)
    })
  } catch (e) {
    // swarm startup may fail in test environments
  }

  // Register call signal handler
  setCallSignalHandler(async (msg, peerKey) => {
    const myPubkey = core ? core.key.toString('hex') : ''
    const { nextState, actions } = handleSignalMessage(callState, msg, myPubkey)
    callState = nextState

    // WebRTC signals (offer/answer/ice) go to the renderer — main has no mic.
    // But the renderer's CallScreen may not have mounted its listener yet,
    // so buffer signals until it tells us it's ready (callRendererReady).
    if (['call-offer', 'call-answer', 'ice-candidate', 'call-muted'].includes(msg.type)) {
      if (rendererCallReady && win) {
        win.webContents.send('call-signal-from-peer', { msg, peerKey })
      } else {
        callSignalBuffer.push({ msg, peerKey })
      }
      return
    }

    for (const action of actions) {
      await executeCallAction(action, msg, peerKey, myPubkey)
    }
  })

  // Load persisted communities
  if (existsSync(communitiesPath)) {
    const saved = JSON.parse(readFileSync(communitiesPath, 'utf-8'))
    for (const c of saved) {
      const cCore = await getCommunityCore(store, c.communityKey)
      communityMap.set(c.communityKey, { core: cCore, name: c.name, role: c.role })
    }
  }

  // Init directory
  if (store) {
    directoryBee = await initDirectory(store, swarm)
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
  getFriendProfile: async (pubkeyHex) => {
    if (!bee) return null
    return getProfile(bee, pubkeyHex)
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
      const myPubkey = core.key.toString('hex')
      if (block.type === 'dm' && block.to === myPubkey) {
        await indexIncomingMessage(bee, block, pubkey, myPubkey)
        if (wss) {
          const msg = JSON.stringify({ type: 'new-message', data: block })
          for (const client of wss.clients || []) {
            if (client.readyState === 1) client.send(msg)
          }
        }
        if (win) win.webContents.send('new-message', block)
      }
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
  removeFriend: (pubkey) => {
    const friends = loadFriends().filter(f => f !== pubkey)
    saveFriends(friends)
    return { ok: true }
  },
  createPost: (text) => {
    if (!core) return { ok: true }
    return appendBlock(core, { type: 'post', id: uuid(), text, ts: Date.now() }).then(() => ({ ok: true }))
  },
  getFeed: () => {
    if (!bee) return []
    return getFeed(bee)
  },
  setAvatar: async (arrayBuffer, mimeType) => {
    if (!drive || !core) return null
    const buf = Buffer.from(arrayBuffer)
    const driveKey = await setAvatar(drive, buf, mimeType)
    const pubkey = await getPublicKey(core)
    const profile = await getProfile(bee, pubkey)
    const name = profile ? profile.name : ''
    await appendBlock(core, { type: 'profile', id: uuid(), name, driveKey, ts: Date.now() })
    return driveKey
  },
  getAvatar: async (driveKeyHex) => {
    if (!drive) return null
    const result = await getAvatar(drive, driveKeyHex)
    if (!result) return null
    const base64 = result.buffer.toString('base64')
    return { base64, mimeType: result.mimeType }
  },

  createCommunity: async ({ name, description, rules } = {}) => {
    if (!store) {
      const communityKey = 'mock-community-key-' + uuid()
      communityMap.set(communityKey, { core: null, name, role: 'owner' })
      return { communityKey }
    }
    const { communityKey, core: cCore } = await createCommunity(store, { name, description, rules })
    communityMap.set(communityKey, { core: cCore, name, role: 'owner' })
    persistCommunities()
    return { communityKey }
  },

  joinCommunity: async (communityKeyHex) => {
    if (!store) {
      communityMap.set(communityKeyHex, { core: null, name: communityKeyHex.slice(0, 8), role: 'member' })
      return { ok: true }
    }
    const result = await joinCommunity(store, communityKeyHex)
    const cCore = await getCommunityCore(store, communityKeyHex)
    communityMap.set(communityKeyHex, { core: cCore, name: communityKeyHex.slice(0, 8), role: 'member' })
    persistCommunities()
    return result
  },

  getCommunities: async () => {
    const list = []
    for (const [communityKey, { name, role }] of communityMap) {
      list.push({ communityKey, name, role })
    }
    return list
  },

  getCommunityFeed: async (communityKeyHex) => {
    const entry = communityMap.get(communityKeyHex)
    if (!entry || !entry.core) return []
    const authorCores = new Map()
    if (core) authorCores.set(core.key.toString('hex'), core)
    return getCommunityFeed(entry.core, authorCores, bee)
  },

  submitPost: async ({ text, communityKeyHex } = {}) => {
    const entry = communityMap.get(communityKeyHex)
    if (!entry) throw new Error('Community not found')
    if (!core) return { ok: true }
    const block = { type: 'post', id: uuid(), text, ts: Date.now(), communityKey: communityKeyHex }
    await core.append(b4a.from(JSON.stringify(block), 'utf-8'))
    const seqNo = core.length - 1
    await submitPostToCommunity(entry.core, core.key.toString('hex'), seqNo)
    return { ok: true }
  },

  castVote: async ({ targetId, value } = {}) => {
    if (!bee || !core) return { changed: false }
    return castVote(core, bee, core.key.toString('hex'), targetId, value)
  },

  getVoteCounts: async (targetId) => {
    if (!bee) return { up: 0, down: 0, score: 0 }
    return getVoteCounts(bee, targetId)
  },

  getMyVote: async (targetId) => {
    if (!bee || !core) return 0
    return getMyVote(bee, core.key.toString('hex'), targetId)
  },

  postComment: async ({ parentId, communityKey, text }) => {
    return postComment(core, bee, core.key.toString('hex'), { parentId, communityKey, text })
  },

  getCommentTree: async ({ communityKey, postId }) => {
    return buildCommentTree(bee, communityKey, postId)
  },

  announceCommunity: async ({ name, description, communityKey } = {}) => {
    if (!directoryBee) return { ok: false }
    await announceCommunity(directoryBee, core, { name, description, communityKey })
    return { ok: true }
  },

  searchCommunities: async (query) => {
    if (!directoryBee) return []
    return searchDirectory(directoryBee, query)
  },

  listCommunities: async () => {
    if (!directoryBee) return []
    return listAllCommunities(directoryBee)
  },

  search: async (query) => {
    if (!bee) return []
    return search(bee, query)
  },

  removePost: async ({ targetId, communityKeyHex, reason } = {}) => {
    const entry = communityMap.get(communityKeyHex)
    if (!entry) throw new Error('Community not found')
    if (entry.role !== 'owner') {
      const mods = bee ? await getModerators(bee, communityKeyHex) : []
      const myPubkey = core ? core.key.toString('hex') : ''
      if (!mods.includes(myPubkey)) throw new Error('Not authorized')
    }
    if (!entry.core) return { ok: true }
    await removePostFromCommunity(entry.core, targetId, reason)
    return { ok: true }
  },

  addModerator: async ({ communityKeyHex, modPubkeyHex }) => {
    const entry = communityMap.get(communityKeyHex)
    if (!entry || entry.role !== 'owner') throw new Error('Not authorized')
    if (!autobaseMap.has(communityKeyHex)) {
      const ab = await initAutobase(store, communityKeyHex)
      autobaseMap.set(communityKeyHex, ab)
    }
    const ab = autobaseMap.get(communityKeyHex)
    await addModerator(store, ab, core, bee, communityKeyHex, modPubkeyHex)
    return { ok: true }
  },

  getModerators: async (communityKeyHex) => {
    return getModerators(bee, communityKeyHex)
  },

  sendMessage: async ({ friendPubkeyHex, text }) => {
    if (!core || !bee) return { ok: false }
    const block = await sendMessage(core, bee, core.key.toString('hex'), friendPubkeyHex, text)
    if (wss) {
      const msg = JSON.stringify({ type: 'new-message', data: block })
      for (const client of wss.clients || []) {
        if (client.readyState === 1) client.send(msg)
      }
    }
    return { ok: true, message: block }
  },

  getMessages: async ({ friendPubkeyHex, limit }) => {
    if (!bee || !core) return []
    return getMessages(bee, core.key.toString('hex'), friendPubkeyHex, limit || 50)
  },

  getConversations: async () => {
    if (!bee || !core) return []
    let friendPubkeys = []
    try {
      const { readFileSync, existsSync } = await import('node:fs')
      const { join } = await import('node:path')
      const friendsFile = join(dataPath, 'friends.json')
      if (existsSync(friendsFile)) {
        friendPubkeys = JSON.parse(readFileSync(friendsFile, 'utf-8'))
      }
    } catch {}
    return getConversations(bee, core.key.toString('hex'), friendPubkeys)
  },

  startCall: async ({ participantKeys, isVideo }) => {
    if (!core) return { ok: false }
    const callId = uuid()
    const myPubkey = core.key.toString('hex')
    // Media is acquired in the renderer (navigator.mediaDevices) — NOT here.
    // Calling getLocalStream() in the main process hangs forever.
    callState = { ...createCallState(), callId, status: 'ringing', participants: [myPubkey, ...participantKeys], isVideo, startedAt: Date.now() }
    const invite = buildInviteMessage(callId, myPubkey, callState.participants, isVideo)
    for (const peerKey of participantKeys) {
      sendCallSignal(peerKey, invite)
    }
    return { callId }
  },

  acceptCall: async ({ callId, callerKey, isVideo }) => {
    if (!core) return { ok: false }
    const myPubkey = core.key.toString('hex')
    // Media handled in renderer — just update state and notify the caller
    callState = { ...callState, status: 'connecting', isVideo }
    sendCallSignal(callerKey, { type: 'call-accepted', callId, accepterKey: myPubkey })
    return { ok: true }
  },

  rejectCall: async ({ callId, callerKey }) => {
    const myPubkey = core ? core.key.toString('hex') : ''
    sendCallSignal(callerKey, { type: 'call-rejected', callId, reason: 'declined' })
    callState = createCallState()
    return { ok: true }
  },

  endCall: async ({ callId }) => {
    const myPubkey = core ? core.key.toString('hex') : ''
    // Signal all participants that call is ending
    const endMsg = buildEndMessage(callId, myPubkey)
    for (const participantKey of (callState.participants || [])) {
      if (participantKey !== myPubkey) {
        sendCallSignal(participantKey, endMsg)
      }
    }
    if (core && bee) {
      const logBlock = { type: 'call-log', id: callId, participants: callState.participants || [], startedAt: callState.startedAt, endedAt: Date.now(), durationSeconds: callState.startedAt ? Math.floor((Date.now() - callState.startedAt) / 1000) : 0, wasVideo: callState.isVideo, ts: Date.now() }
      await core.append(b4a.from(JSON.stringify(logBlock), 'utf-8'))
      await bee.put(`calllog!${logBlock.ts}!${logBlock.id}`, logBlock)
    }
    callState = createCallState()
    return { ok: true }
  },

  toggleMute: async ({ callId, audio, video }) => {
    // Track enable/disable is done in the renderer; we just track state + notify peers
    callState = { ...callState, isMuted: { audio: audio !== undefined ? audio : callState.isMuted.audio, video: video !== undefined ? video : callState.isMuted.video } }
    for (const participantKey of (callState.participants || [])) {
      const myPubkey = core ? core.key.toString('hex') : ''
      if (participantKey !== myPubkey) {
        sendCallSignal(participantKey, { type: 'call-muted', callId, byKey: myPubkey, audio, video })
      }
    }
    return { ok: true }
  },

  startScreenShare: async ({ callId }) => {
    return { ok: true }
  },

  stopScreenShare: async ({ callId }) => {
    return { ok: true }
  },

  getCallHistory: async () => {
    if (!bee) return []
    const logs = []
    for await (const entry of bee.createReadStream({ gt: 'calllog!', lt: 'calllog~', reverse: true, limit: 50 })) {
      logs.push(entry.value)
    }
    return logs
  },
}

async function executeCallAction(action, msg, peerKey, myPubkey) {
  switch (action.type) {
    case 'show-incoming-call': {
      const callData = { callId: msg.callId, callerKey: msg.callerKey, isVideo: msg.video, participants: msg.participants }
      pendingIncomingCall = callData // buffer in case renderer isn't ready yet
      if (win) win.webContents.send('incoming-call', callData)
      break
    }

    case 'create-peer-connection':
      // WebRTC lives in the renderer. Tell caller's renderer that peer accepted
      // and is ready — renderer creates the PC and sends the offer NOW.
      if (win) win.webContents.send('call-peer-accepted', {
        callId: msg.callId,
        accepterKey: msg.accepterKey,
        participants: callState.participants,
        isVideo: callState.isVideo
      })
      break

    case 'set-remote-offer':
    case 'set-remote-answer':
    case 'add-ice-candidate':
      // Already forwarded to renderer above (before executeCallAction is called)
      // Nothing to do here.
      break

    case 'close-peer-connection':
      // Peer connections are closed in the renderer; main just logs + notifies
      if (core && bee) {
        const logBlock = { type: 'call-log', id: msg.callId, participants: callState.participants || [], startedAt: callState.startedAt, endedAt: Date.now(), durationSeconds: callState.startedAt ? Math.floor((Date.now() - callState.startedAt) / 1000) : 0, wasVideo: callState.isVideo, ts: Date.now() }
        await core.append(b4a.from(JSON.stringify(logBlock), 'utf-8'))
        await bee.put(`calllog!${logBlock.ts}!${logBlock.id}`, logBlock)
      }
      if (win) win.webContents.send('call-ended', { callId: msg.callId })
      break

    case 'update-mute-state':
      if (win) win.webContents.send('mute-changed', { callId: msg.callId, byKey: msg.byKey, audio: msg.audio, video: msg.video })
      break
  }
}

function persistCommunities() {
  if (!communitiesPath) return
  const list = []
  for (const [communityKey, { name, role }] of communityMap) {
    list.push({ communityKey, name, role })
  }
  writeFileSync(communitiesPath, JSON.stringify(list, null, 2))
}

export function registerHandlers(ipcMainArg) {
  const im = ipcMainArg || ipcMain
  // Renderer polls this to handle the race where p2p-ready fires before listener registers
  im.handle('check-p2p-ready', () => ({ ready: !!bee }))
  // Renderer calls this on mount to catch any call that arrived before it was ready
  im.handle('check-incoming-call', () => {
    const call = pendingIncomingCall
    pendingIncomingCall = null // consume it
    return call
  })
  // CallScreen calls this when mounted — marks renderer ready and returns any
  // WebRTC signals (offer/answer/ice) that arrived during the mount gap
  im.handle('call-renderer-ready', () => {
    rendererCallReady = true
    const buffered = callSignalBuffer
    callSignalBuffer = []
    return buffered
  })
  // CallScreen calls this on unmount — stop forwarding, reset buffer
  im.handle('call-renderer-done', () => {
    rendererCallReady = false
    callSignalBuffer = []
    return { ok: true }
  })
  im.handle('get-my-key', () => handlers.getMyKey())
  im.handle('get-my-profile', () => handlers.getMyProfile())
  im.handle('get-friend-profile', (_, pubkeyHex) => handlers.getFriendProfile(pubkeyHex))
  im.handle('set-my-profile', (_, name) => handlers.setMyProfile(name))
  im.handle('add-friend', (_, pubkey) => handlers.addFriend(pubkey))
  im.handle('get-friends', () => handlers.getFriends())
  im.handle('remove-friend', (_, pubkey) => handlers.removeFriend(pubkey))
  im.handle('create-post', (_, text) => handlers.createPost(text))
  im.handle('get-feed', () => handlers.getFeed())
  im.handle('set-avatar', (_, { arrayBuffer, mimeType }) => handlers.setAvatar(arrayBuffer, mimeType))
  im.handle('get-avatar', (_, driveKeyHex) => handlers.getAvatar(driveKeyHex))
  im.handle('create-community', (_, args) => handlers.createCommunity(args))
  im.handle('join-community', (_, key) => handlers.joinCommunity(key))
  im.handle('get-communities', () => handlers.getCommunities())
  im.handle('get-community-feed', (_, key) => handlers.getCommunityFeed(key))
  im.handle('submit-post', (_, args) => handlers.submitPost(args))
  im.handle('remove-post', (_, args) => handlers.removePost(args))
  im.handle('cast-vote', (_, args) => handlers.castVote(args))
  im.handle('get-vote-counts', (_, targetId) => handlers.getVoteCounts(targetId))
  im.handle('get-my-vote', (_, targetId) => handlers.getMyVote(targetId))
  im.handle('post-comment', (_, args) => handlers.postComment(args))
  im.handle('get-comment-tree', (_, args) => handlers.getCommentTree(args))
  im.handle('announce-community', (_, args) => handlers.announceCommunity(args))
  im.handle('search-communities', (_, query) => handlers.searchCommunities(query))
  im.handle('list-communities', () => handlers.listCommunities())
  im.handle('search', (_, query) => handlers.search(query))
  im.handle('add-moderator', (_, args) => handlers.addModerator(args))
  im.handle('get-moderators', (_, key) => handlers.getModerators(key))
  im.handle('send-message', (_, args) => handlers.sendMessage(args))
  im.handle('get-messages', (_, args) => handlers.getMessages(args))
  im.handle('get-conversations', () => handlers.getConversations())
  im.handle('start-call', (_, args) => handlers.startCall(args))
  im.handle('accept-call', (_, args) => handlers.acceptCall(args))
  im.handle('reject-call', (_, args) => handlers.rejectCall(args))
  im.handle('end-call', (_, args) => handlers.endCall(args))
  im.handle('toggle-mute', (_, args) => handlers.toggleMute(args))
  im.handle('start-screen-share', (_, args) => handlers.startScreenShare(args))
  im.handle('stop-screen-share', (_, args) => handlers.stopScreenShare(args))
  im.handle('get-call-history', () => handlers.getCallHistory())

  // Renderer → peer: forward a WebRTC signal (offer/answer/ice) to a specific peer
  im.handle('send-call-signal', (_, { peerKey, signal }) => {
    sendCallSignal(peerKey, signal)
    return { ok: true }
  })
}
