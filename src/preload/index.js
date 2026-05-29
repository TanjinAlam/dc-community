import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pear', {
  // Fires once when the P2P stack finishes initialising (after app start)
  onP2PReady: (cb) => ipcRenderer.once('p2p-ready', cb),
  // Poll whether P2P is ready — handles race where event fired before listener registered
  checkP2PReady: () => ipcRenderer.invoke('check-p2p-ready'),

  // identity
  getMyProfile: () => ipcRenderer.invoke('get-my-profile'),
  setMyProfile: (name) => ipcRenderer.invoke('set-my-profile', name),
  getMyKey: () => ipcRenderer.invoke('get-my-key'),

  // friends
  addFriend: (pubkey) => ipcRenderer.invoke('add-friend', pubkey),
  getFriends: () => ipcRenderer.invoke('get-friends'),
  removeFriend: (pubkey) => ipcRenderer.invoke('remove-friend', pubkey),
  getFriendProfile: (pubkeyHex) => ipcRenderer.invoke('get-friend-profile', pubkeyHex),

  // posts
  createPost: (text) => ipcRenderer.invoke('create-post', text),
  getFeed: () => ipcRenderer.invoke('get-feed'),

  // avatar
  setAvatar: (arrayBuffer, mimeType) => ipcRenderer.invoke('set-avatar', { arrayBuffer, mimeType }),
  getAvatar: (driveKeyHex) => ipcRenderer.invoke('get-avatar', driveKeyHex),

  // communities
  createCommunity: (args) => ipcRenderer.invoke('create-community', args),
  joinCommunity: (key) => ipcRenderer.invoke('join-community', key),
  getCommunities: () => ipcRenderer.invoke('get-communities'),
  getCommunityFeed: (key) => ipcRenderer.invoke('get-community-feed', key),
  submitPost: (args) => ipcRenderer.invoke('submit-post', args),
  removePost: (args) => ipcRenderer.invoke('remove-post', args),

  // votes
  castVote: (args) => ipcRenderer.invoke('cast-vote', args),
  getVoteCounts: (targetId) => ipcRenderer.invoke('get-vote-counts', targetId),
  getMyVote: (targetId) => ipcRenderer.invoke('get-my-vote', targetId),

  // comments
  postComment: (args) => ipcRenderer.invoke('post-comment', args),
  getCommentTree: (args) => ipcRenderer.invoke('get-comment-tree', args),

  // directory
  announceCommunity: (args) => ipcRenderer.invoke('announce-community', args),
  searchCommunities: (query) => ipcRenderer.invoke('search-communities', query),
  listCommunities: () => ipcRenderer.invoke('list-communities'),

  // search
  search: (query) => ipcRenderer.invoke('search', query),

  // moderation
  addModerator: (args) => ipcRenderer.invoke('add-moderator', args),
  getModerators: (key) => ipcRenderer.invoke('get-moderators', key),

  // 1-to-1 chat
  sendMessage: (args) => ipcRenderer.invoke('send-message', args),
  getMessages: (args) => ipcRenderer.invoke('get-messages', args),
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  onNewMessage: (cb) => ipcRenderer.on('new-message', (_, data) => cb(data)),

  // calling
  startCall: (args) => ipcRenderer.invoke('start-call', args),
  acceptCall: (args) => ipcRenderer.invoke('accept-call', args),
  rejectCall: (args) => ipcRenderer.invoke('reject-call', args),
  endCall: (args) => ipcRenderer.invoke('end-call', args),
  toggleMute: (args) => ipcRenderer.invoke('toggle-mute', args),
  startScreenShare: (args) => ipcRenderer.invoke('start-screen-share', args),
  stopScreenShare: (args) => ipcRenderer.invoke('stop-screen-share', args),
  getCallHistory: () => ipcRenderer.invoke('get-call-history'),
  onIncomingCall: (cb) => ipcRenderer.on('incoming-call', (_, data) => cb(data)),
  checkIncomingCall: () => ipcRenderer.invoke('check-incoming-call'),
  onCallEnded: (cb) => ipcRenderer.on('call-ended', (_, data) => cb(data)),
  onRemoteStream: (cb) => ipcRenderer.on('remote-stream', (_, data) => cb(data)),
  onMuteChanged: (cb) => ipcRenderer.on('mute-changed', (_, data) => cb(data)),
  // Peer accepted — caller renderer should now create PC and send offer
  onCallPeerAccepted: (cb) => ipcRenderer.on('call-peer-accepted', (_, data) => cb(data)),
  // Peer's WebRTC signal arrives in renderer (offer/answer/ice)
  onCallSignalFromPeer: (cb) => ipcRenderer.on('call-signal-from-peer', (_, data) => cb(data)),
  // CallScreen mounts → mark ready + drain buffered signals from the mount gap
  callRendererReady: () => ipcRenderer.invoke('call-renderer-ready'),
  // CallScreen unmounts → stop buffering
  callRendererDone: () => ipcRenderer.invoke('call-renderer-done'),
  // Renderer sends its own WebRTC signal to a peer via main process
  sendCallSignal: (peerKey, signal) => ipcRenderer.invoke('send-call-signal', { peerKey, signal }),

  // events from main → renderer
  onFeedUpdate: (cb) => ipcRenderer.on('feed-update', (_, data) => cb(data))
})
