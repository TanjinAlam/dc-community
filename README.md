# Pear Social

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Tests](https://img.shields.io/badge/tests-85%20passing-success.svg)](#run-tests)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20PWA-blue.svg)](#)

A **decentralized, end-to-end encrypted** peer-to-peer social network built on the [Hypercore Protocol](https://docs.pears.com/). No servers. No company. No central authority. Your data lives on your device and replicates directly to your peers.

> **Honest about privacy:** Pear Social is decentralized and your content is encrypted, but it is **not an anonymity tool**. See the [Privacy & Security Model](#privacy--security-model) below for exactly what is and isn't protected — we'd rather tell you the truth than make claims that put you at risk.

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

**No audio on calls**
Check the in-call diagnostic bar (`mic / ICE / rx audio / peers`). If `ICE` is stuck at `new`, candidates aren't being exchanged; if `mic: off`, grant microphone access in System Settings → Privacy → Microphone.

---

## Privacy & Security Model

We believe security claims should be precise. Here is exactly what Pear Social protects — and what it does not.

### ✅ What is protected

| Property | How |
|----------|-----|
| **No central server** | All data lives in your own [Hypercore](https://docs.pears.com/building-blocks/hypercore). There is no company database, no account server, nothing to subpoena or breach centrally. |
| **No accounts, no passwords** | Your identity is an Ed25519 keypair generated locally on first launch. Nobody issues it; nobody can revoke it. |
| **Encrypted data replication** | Hypercore connections use the [Noise protocol](http://www.noiseprotocol.org/) — data in transit between peers is encrypted. |
| **End-to-end encrypted calls** | Audio/video uses WebRTC **DTLS-SRTP**, which is mandatory and cannot be disabled. Call *content* is never readable by any relay. |
| **You own your data** | Posts, votes, comments, and DMs are stored in your device's append-only log. No third party holds the master copy. |
| **Open source & auditable** | Every line is in this repo. You can read, build, and verify exactly what the app does. |

### ⚠️ What is NOT protected (read this carefully)

Pear Social is **decentralized, not anonymous.** It is **not** a replacement for Tor, Signal, or a VPN.

| Limitation | What it means for you |
|------------|----------------------|
| **Metadata is visible** | Pear Social uses the public Hyperswarm DHT. A network observer (your ISP, anyone watching the DHT) can see that your IP address is participating in the network and which peers you connect to — even though they can't read your content. |
| **Calls reveal your IP to the other party** | This is inherent to peer-to-peer WebRTC. The person you call learns your IP address. Content is encrypted; the connection itself is not hidden. |
| **Friends hold copies of your data** | When you post and a friend replicates it, they have a full plaintext copy on their device. You cannot un-send or guarantee deletion of replicated data. |
| **Optional STUN/TURN sees your IP** | If you enable a STUN/TURN server for calls across networks (see [TURN-SERVER.md](./TURN-SERVER.md)), that server sees your IP address (but not call content). |
| **No traffic-analysis resistance** | Timing, volume, and connection patterns are observable. This is not designed to hide *that* you are communicating, only to protect *what* you communicate and to remove central control. |
| **PWA bridge is local-network** | The phone PWA talks to your desktop over a LAN WebSocket (challenge/response authenticated). Treat it as trusted-LAN-only. |

### Threat model summary

**Pear Social is a good fit if you want:** freedom from corporate data harvesting, no central point of censorship or failure, ownership of your social graph, and encrypted content.

**Pear Social is NOT a fit if you need:** anonymity from a network-level adversary, protection of *who* you talk to and *when*, or deniability. For those threat models, use purpose-built tools (Tor, Signal).

If you discover a security issue, please follow [SECURITY.md](./SECURITY.md) — do not open a public issue.

---

## Contributing

Contributions are very welcome — this is a community project. Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the full workflow and **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** for community standards.

Quick version:

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/dc-community.git
cd dc-community

# 2. Install + verify the suite passes
npm install
npm test          # 85 tests should pass

# 3. Branch, change, test
git checkout -b feat/my-change
npm test          # keep it green

# 4. Push and open a Pull Request
```

**Ground rules:**
- All new P2P logic goes in `src/p2p/` with matching tests in `tests/`.
- Keep `npm test` green — PRs with failing tests won't be merged.
- UI changes don't need tests, but the P2P layer always does.
- Be honest in security-related docs and code comments. No overclaiming.

Good first issues are labeled [`good first issue`](https://github.com/TanjinAlam/dc-community/labels/good%20first%20issue).

---

## License

[MIT](./LICENSE) © 2026 Tanjin Alam and Pear Social contributors.

You are free to use, modify, and distribute this software, including commercially, with attribution. There is no warranty.

---

## Acknowledgements

Built on the open-source [Hypercore / Pears](https://docs.pears.com/) stack by Holepunch:
Hypercore, Hyperbee, Hyperdrive, Hyperswarm, Corestore, Autobase, Protomux, and Bare.
