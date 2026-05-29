import { app, BrowserWindow, session, protocol } from 'electron'
import { join, resolve } from 'path'
import { registerHandlers, init, setWindow, setWss, handlers } from './ipc.js'
import { startWsServer } from './ws-server.js'

// Make file:// a secure context so navigator.mediaDevices is available
// in production builds (getUserMedia requires a secure context)
protocol.registerSchemesAsPrivileged([{
  scheme: 'file',
  privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true }
}])

// CRITICAL for WebRTC P2P calls: by default Chromium hides the real local IP
// behind randomized .local mDNS hostnames. Two separate app instances can't
// resolve each other's .local candidates, so ICE never connects and no audio
// flows. Disabling this makes WebRTC use real host IPs — calls connect on LAN.
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns')
// Allow getUserMedia without an explicit user gesture / on insecure origins
app.commandLine.appendSwitch('enable-features', 'GetUserMedia')
// CRITICAL: allow remote audio to autoplay without a user click.
// Without this, the incoming audio stream is muted by Chromium's autoplay policy.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Use the OS standard user-data directory so data persists across app updates.
// macOS: ~/Library/Application Support/Pear Social/p2p-data
// Windows: %APPDATA%\Pear Social\p2p-data
// Linux:   ~/.config/Pear Social/p2p-data
// Override with DATA_PATH env var for development/testing.
const DATA_PATH = process.env.DATA_PATH || join(app.getPath('userData'), 'p2p-data')
const WS_PORT = parseInt(process.env.WS_PORT || '7777', 10)

// Single-instance lock: if a second instance launches (e.g. new installer on Windows),
// focus the existing window and quit the second instance.
// On macOS we skip this — macOS handles single-instance natively via the dock.
if (process.platform !== 'darwin') {
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    process.exit(0)
  }
}

registerHandlers()

// Track whether init has completed so the renderer can query it directly
let p2pReady = false

app.whenReady().then(async () => {
  // Allow microphone + camera access from the renderer (file:// and localhost)
  // Without this, getUserMedia fails silently in production builds
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture']
    callback(allowed.includes(permission))
  })
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture']
    return allowed.includes(permission)
  })

  // Create window immediately — never block UI on P2P stack init
  const win = createWindow()

  // Give init() a max of 10 seconds — if native modules hang, proceed anyway
  await Promise.race([
    init(DATA_PATH),
    new Promise(resolve => setTimeout(resolve, 10000))
  ]).catch(err => {
    console.error('[init] P2P stack failed to initialise:', err)
  })

  p2pReady = true

  // Signal the renderer. Use did-finish-load as a gate so the listener
  // is definitely registered, but also handle the case where loading
  // already finished (send immediately).
  const sendReady = () => {
    if (!win.isDestroyed()) win.webContents.send('p2p-ready')
  }

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', sendReady)
  } else {
    sendReady()
  }

  const pwaDist = resolve('./pwa/dist')
  const wss = startWsServer(WS_PORT, async (ws, msg) => {
    if (msg.type === 'get-feed') {
      const feed = await handlers.getFeed()
      ws.send(JSON.stringify({ type: 'feed-response', data: feed }))
    } else if (msg.type === 'create-post') {
      await handlers.createPost(msg.data?.text || '')
      ws.send(JSON.stringify({ type: 'post-created', data: { ok: true } }))
    } else if (msg.type === 'get-profile') {
      const profile = await handlers.getMyProfile()
      ws.send(JSON.stringify({ type: 'profile-response', data: profile }))
    } else if (msg.type === 'set-profile') {
      const result = await handlers.setMyProfile(msg.data?.name || '')
      ws.send(JSON.stringify({ type: 'profile-set', data: result }))
    } else if (msg.type === 'add-friend') {
      const result = await handlers.addFriend(msg.data?.pubkey || '')
      ws.send(JSON.stringify({ type: 'friend-added', data: result }))
    } else if (msg.type === 'get-friends') {
      const friends = await handlers.getFriends()
      ws.send(JSON.stringify({ type: 'friends-response', data: friends }))
    } else if (msg.type === 'get-key') {
      const key = await handlers.getMyKey()
      ws.send(JSON.stringify({ type: 'key-response', data: key }))
    } else if (msg.type === 'set-avatar') {
      await handlers.setAvatar(msg.data?.arrayBuffer, msg.data?.mimeType)
      ws.send(JSON.stringify({ type: 'avatar-set', data: { ok: true } }))
    } else if (msg.type === 'get-avatar') {
      const result = await handlers.getAvatar(msg.data?.driveKeyHex)
      ws.send(JSON.stringify({ type: 'avatar-response', data: result }))
    } else if (msg.type === 'create-community') {
      const result = await handlers.createCommunity(msg.data || {})
      ws.send(JSON.stringify({ type: 'community-created', data: result }))
    } else if (msg.type === 'join-community') {
      const result = await handlers.joinCommunity(msg.data?.communityKeyHex || '')
      ws.send(JSON.stringify({ type: 'community-joined', data: result }))
    } else if (msg.type === 'get-communities') {
      const result = await handlers.getCommunities()
      ws.send(JSON.stringify({ type: 'communities-response', data: result }))
    } else if (msg.type === 'get-community-feed') {
      const result = await handlers.getCommunityFeed(msg.data?.communityKeyHex || '')
      ws.send(JSON.stringify({ type: 'community-feed-response', data: result }))
    } else if (msg.type === 'submit-post') {
      await handlers.submitPost(msg.data || {})
      ws.send(JSON.stringify({ type: 'post-submitted', data: { ok: true } }))
    } else if (msg.type === 'remove-post') {
      await handlers.removePost(msg.data || {})
      ws.send(JSON.stringify({ type: 'post-removed', data: { ok: true } }))
    } else if (msg.type === 'cast-vote') {
      const result = await handlers.castVote(msg.data || {})
      ws.send(JSON.stringify({ type: 'vote-cast', data: result }))
    } else if (msg.type === 'get-vote-counts') {
      const result = await handlers.getVoteCounts(msg.data?.targetId || '')
      ws.send(JSON.stringify({ type: 'vote-counts-response', data: result }))
    } else if (msg.type === 'get-my-vote') {
      const result = await handlers.getMyVote(msg.data?.targetId || '')
      ws.send(JSON.stringify({ type: 'my-vote-response', data: result }))
    } else if (msg.type === 'post-comment') {
      const result = await handlers.postComment(msg.data || {})
      ws.send(JSON.stringify({ type: 'comment-posted', data: result }))
    } else if (msg.type === 'get-comment-tree') {
      const result = await handlers.getCommentTree(msg.data || {})
      ws.send(JSON.stringify({ type: 'comment-tree-response', data: result }))
    } else if (msg.type === 'announce-community') {
      const result = await handlers.announceCommunity(msg.data || {})
      ws.send(JSON.stringify({ type: 'community-announced', data: result }))
    } else if (msg.type === 'search-communities') {
      const result = await handlers.searchCommunities(msg.data?.query || '')
      ws.send(JSON.stringify({ type: 'communities-search-response', data: result }))
    } else if (msg.type === 'list-communities') {
      const result = await handlers.listCommunities()
      ws.send(JSON.stringify({ type: 'communities-list-response', data: result }))
    } else if (msg.type === 'search') {
      const result = await handlers.search(msg.data?.query || '')
      ws.send(JSON.stringify({ type: 'search-response', data: result }))
    } else if (msg.type === 'send-message') {
      const result = await handlers.sendMessage(msg.data || {})
      ws.send(JSON.stringify({ type: 'message-sent', data: result }))
    } else if (msg.type === 'get-messages') {
      const result = await handlers.getMessages(msg.data || {})
      ws.send(JSON.stringify({ type: 'messages-response', data: result }))
    } else if (msg.type === 'get-conversations') {
      const result = await handlers.getConversations()
      ws.send(JSON.stringify({ type: 'conversations-response', data: result }))
    }
  }, pwaDist)
  setWss(wss)

  // On macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#1e1b4b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow getUserMedia (mic/camera) when loaded from file:// in production
      allowRunningInsecureContent: false,
      webSecurity: true
    }
  })

  // Show once fully painted — prevents white flash on macOS
  win.once('ready-to-show', () => {
    win.show()
    win.focus()
    if (process.env.NODE_ENV === 'development') win.webContents.openDevTools()
  })

  // Safety fallback: if ready-to-show never fires (renderer crash / slow load)
  // show the window anyway after 4 seconds so it's not invisible forever
  const showFallback = setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) {
      win.show()
      win.focus()
    }
  }, 4000)
  win.once('ready-to-show', () => clearTimeout(showFallback))

  // Log renderer crashes to help diagnose macOS production issues
  win.webContents.on('render-process-gone', (_, details) => {
    console.error('[renderer] process gone:', details.reason)
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  })

  win.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('[renderer] failed to load:', code, desc)
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setWindow(win)
  return win
}

app.on('window-all-closed', () => {
  // On macOS apps stay in dock until explicitly quit — standard behavior
  if (process.platform !== 'darwin') app.quit()
})
