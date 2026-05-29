# Pear Social

A fully decentralized, peer-to-peer social network built on the Hypercore Protocol. No servers. No central authority. Your data lives on your device and replicates directly to your peers over the internet.

## What it is

Pear Social is a Reddit-style P2P social app with:

- **Personal feed** — post text and photos, follow friends
- **Communities** — create and join topic-based communities (like subreddits)
- **Voting** — upvote/downvote posts and comments, scores computed locally
- **Threaded comments** — nested replies up to 5 levels deep
- **1-to-1 chat** — direct messages between friends, delivered over Hyperswarm
- **Community discovery** — shared directory of public communities
- **Full-text search** — searches all locally replicated content
- **Avatars** — profile images stored in Hyperdrive
- **Multi-moderator support** — community owners can add moderators via Autobase
- **PWA mobile bridge** — open `http://desktop-ip:7777` on any phone on the same WiFi
- **React Native mobile app** — full peer node on Android/iOS via Bare runtime

## Architecture

```
Electron Desktop App          PWA (mobile browser)         React Native App
  └── React UI                  └── React UI                 └── React Native UI
  └── IPC (contextBridge)       └── WebSocket client         └── react-native-bare-kit
  └── Hypercore stack               └── ws://desktop:7777     └── Bare runtime worker
       ├── Corestore                       └── Desktop app         └── Hypercore stack
       ├── Hyperswarm (DHT)                                              └── Hyperswarm
       ├── Hyperbee (index)
       └── Hyperdrive (media)
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | bundled with Node |
| Git | any | https://git-scm.com |

---

## Desktop App

### Development

```bash
# Clone the repo
git clone <repo-url>
cd dc-community

# Install dependencies
npm install

# Start in development mode (hot reload)
npm run dev
```

The Electron window opens automatically. DevTools are open in development mode.

### Run tests

```bash
npm test
```

All tests use Vitest in Node environment. No browser or Electron required.

### Build for distribution

```bash
# Build for current platform
npm run dist

# macOS (DMG — universal x64 + arm64)
npm run dist:mac

# Windows (NSIS installer)
npm run dist:win

# Linux (AppImage)
npm run dist:linux
```

Output files land in `release/`. Share the `.dmg`, `.exe`, or `.AppImage` directly — no app store needed.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_PATH` | `./pear-social-data` | Where Hypercore data is stored |
| `NODE_ENV` | — | Set to `development` to enable DevTools and hot reload |

---

## PWA (Mobile Browser)

The desktop app serves a Progressive Web App on port 7777. Any phone on the same WiFi can use it as a thin client — no install required.

### Build the PWA

```bash
npm run build:pwa
```

Builds `pwa/dist/` which is served automatically when the desktop app runs.

### Use the PWA

1. Start the desktop app (`npm run dev` or the installed app)
2. Find your machine's local IP (e.g. `192.168.1.10`)
3. Open `http://192.168.1.10:7777` in any phone browser
4. Tap **Add to Home Screen** (Android Chrome / iOS Safari) to install as a PWA

### PWA development server

```bash
npm run dev:pwa   # Vite dev server on port 3001
```

---

## React Native Mobile App

The native app runs the full Hypercore P2P stack on-device. The phone is a complete peer, not a thin client.

Located at `pear-social-mobile/`.

### Prerequisites

- **Android**: Android Studio + JDK 17 + Android SDK (API 33+), set `ANDROID_HOME`
- **iOS**: Xcode 15+ on macOS + Apple Developer account
- **React Native CLI**: `npm install -g react-native-cli`

### Setup

```bash
cd pear-social-mobile
npm install --legacy-peer-deps
```

### Run on Android

```bash
# Start Metro bundler
npx react-native start

# In another terminal — connect a device or start an emulator first
npx react-native run-android
```

### Run on iOS

```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

### Build release APK

```bash
cd pear-social-mobile
npm run build:android
# Output: android/app/build/outputs/apk/release/app-release.apk
```

See `pear-social-mobile/RELEASE.md` for signing setup and the full iOS TestFlight guide.

---

## Project Structure

```
dc-community/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.js        # App entry, WS server startup
│   │   ├── ipc.js          # All IPC handlers + Hypercore logic
│   │   ├── ws-server.js    # WebSocket server (port 7777)
│   │   └── ws-auth.js      # Challenge/response auth
│   ├── preload/
│   │   └── index.js        # contextBridge → window.pear API
│   ├── renderer/           # React desktop UI
│   │   ├── App.jsx
│   │   ├── components/     # PostCard, CommentThread, ConversationView…
│   │   └── screens/        # MainScreen, CommunitiesScreen, ChatScreen…
│   └── p2p/                # Pure Hypercore P2P modules (no Electron deps)
│       ├── store.js        # Corestore + Hyperbee init + indexing
│       ├── swarm.js        # Hyperswarm peer discovery
│       ├── community.js    # Communities + multi-mod (Autobase)
│       ├── votes.js        # Voting
│       ├── comments.js     # Threaded comments
│       ├── chat.js         # 1-to-1 direct messages
│       ├── directory.js    # Community discovery directory
│       ├── drive.js        # Hyperdrive avatars + photos
│       └── search.js       # Local full-text search
├── pwa/                    # PWA mobile bridge (Vite + React)
│   └── src/
│       └── ws.js           # WebSocket client with ed25519 auth
├── pear-social-mobile/     # React Native mobile app
│   ├── src/
│   │   ├── p2p/
│   │   │   ├── worker.js   # Bare runtime — full Hypercore stack on-device
│   │   │   └── index.ts    # BareKit wiring → typed p2p API
│   │   ├── screens/        # SetupScreen, MainScreen, ChatListScreen…
│   │   └── components/     # PostCard, CommunityPostCard, AvatarImage…
│   └── RELEASE.md          # Android APK + iOS TestFlight release guide
├── tests/                  # Vitest test suite
├── docs/                   # Implementation plans
└── electron.vite.config.js
```

---

## Data schema

All data is stored as typed JSON blocks appended to Hypercores:

```js
// User content
{ type: 'post',               id, text, ts, communityKey?, photoKey? }
{ type: 'profile',            id, name, ts, driveKey? }
{ type: 'dm',                 id, to, from, text, ts }

// Community
{ type: 'community',          id, name, description, rules, ts }
{ type: 'post-ref',           id, communityKey, authorKey, seqNo, ts }
{ type: 'remove-ref',         id, targetId, reason, ts }
{ type: 'community-announce', id, name, description, communityKey, ts }
{ type: 'add-mod',            id, modKey, ts }

// Social interactions
{ type: 'vote',               id, targetId, value, ts }  // value: 1 | -1
{ type: 'comment',            id, parentId, communityKey, text, ts }
```

No karma. No central user IDs. Identity is an Ed25519 keypair generated on first launch.

---

## How peers connect

1. On startup the desktop app joins a well-known Hyperswarm topic derived from `sha256('pear-social-v1')`
2. Peers discover each other via the Hyperswarm DHT — no central server involved
3. Each connection replicates all known cores via `store.replicate(conn)`
4. New blocks appear in real-time via `core.on('append')`

To add a friend: share your public key (64-char hex) or scan each other's QR codes. Replication starts immediately.

---

## Quick start: connecting two peers

1. Launch the desktop app on two machines (or one machine + a phone on the PWA)
2. Open the **Profile** tab → copy your public key
3. On the other device: **Add Friend** → paste the key (or scan QR)
4. Posts, messages, votes, and comments replicate automatically within seconds

---

## Troubleshooting

**White screen on startup**
Run `npm run dev` and check the DevTools console. Most commonly caused by a missing `npm install`.

**"Cannot find addon" error**
Native modules (sodium-native) must not be bundled. The `electron.vite.config.js` externalizes all node_modules — do not change the `external` config in the main build.

**Peers not connecting**
Both devices need UDP reachability on the Hyperswarm DHT ports. Try disabling your firewall or using a mobile hotspot if on a restrictive network.

**PWA not loading at port 7777**
Run `npm run build:pwa` first. The PWA static files must be built before the desktop app can serve them.

**Port 7777 already in use**
Another app instance is running. Kill it:
```bash
lsof -ti:7777 | xargs kill
```

**`__filename is not defined` / ESM errors**
Do not add `"type": "module"` to `package.json`. The Hypercore stack uses CJS native modules that are incompatible with ESM mode.
