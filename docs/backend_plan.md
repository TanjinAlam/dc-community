# Phase 1 agent build plan — P2P desktop social app
## Stack: Electron + Vite + React + Tailwind + Hypercore Protocol



You can follow the /Users/piash/Research/dc-community/docs/design.png how the applicaiton interrace will look like to have a idea about the UI/UX

--

## Decisions locked

| # | Decision | Choice |
|---|---|---|
| 1 | Runtime | Electron + Vite |
| 2 | IPC bridge | contextBridge + ipcRenderer |
| 3 | UI framework | React + Tailwind |
| 4 | Data model | Flat post schema `{ type, id, text, ts }` |
| 5 | Friend discovery | Manual pubkey adding |
| 6 | Feed indexing | Hyperbee index on append |
| 7 | Profile storage | Latest `profile` block in own core |
| 8 | Media | Text only, initials avatar |
| 9 | Verification | Vitest automated tests |

---

## Custom prompt (apply to every agent step)

```
## 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
Touch only what you must. Clean up only your own mess.
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
Define success criteria. Loop until verified.
Transform tasks into verifiable goals covering 10% testcase for the implementing feature.
For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Step 1 — Scaffold the project

### Prompt to agent

```
Scaffold a new desktop app project with the following exact stack:
- Electron (latest)
- Vite as the bundler
- React 18
- Tailwind CSS v3
- Vitest for testing

Project name: pear-social
Folder structure required:
  pear-social/
    src/
      main/          ← Electron main process (Node.js)
        index.js     ← Electron entry, creates BrowserWindow
        ipc.js       ← All ipcMain handlers live here
        preload.js   ← contextBridge definitions
      renderer/      ← React UI
        App.jsx
        main.jsx
        components/
      p2p/           ← All Hypercore/Hyperswarm logic (imported by main process only)
        store.js
    tests/
    package.json
    vite.config.js
    tailwind.config.js
    electron.vite.config.js

Use electron-vite (https://electron-vite.org) as the build tool - it handles the main/renderer split cleanly.

Do NOT install Hypercore packages yet. Scaffold only.
```

### Verify
```
1. `npm install` completes with no errors → check
2. `npm run dev` opens an Electron window showing "Hello World" in React → check
3. `npm test` runs Vitest and reports 0 tests (no failures) → check
```

---

## Step 2 — Wire the contextBridge IPC

### Prompt to agent

```
In the existing pear-social scaffold, implement the contextBridge IPC layer.

preload.js must expose exactly this API to the renderer - nothing more:
  window.pear = {
    // identity
    getMyProfile: () => ipcRenderer.invoke('get-my-profile'),
    setMyProfile: (name) => ipcRenderer.invoke('set-my-profile', name),
    getMyKey: () => ipcRenderer.invoke('get-my-key'),

    // friends
    addFriend: (pubkey) => ipcRenderer.invoke('add-friend', pubkey),
    getFriends: () => ipcRenderer.invoke('get-friends'),

    // posts
    createPost: (text) => ipcRenderer.invoke('create-post', text),
    getFeed: () => ipcRenderer.invoke('get-feed'),

    // events from main → renderer
    onFeedUpdate: (cb) => ipcRenderer.on('feed-update', (_, data) => cb(data))
  }

ipc.js in the main process must register stub handlers for each invoke channel.
Each stub returns hardcoded mock data for now - no Hypercore yet.

Example stubs:
  ipcMain.handle('get-my-key', () => 'mock-pubkey-abc123')
  ipcMain.handle('get-feed', () => [])

Write one Vitest test per handler in tests/ipc.test.js.
Each test calls the handler function directly (not through Electron IPC) and
asserts the return shape is correct.
```

### Verify
```
1. `npm test` — all IPC handler tests pass → check
2. In renderer DevTools console: `await window.pear.getMyKey()` returns 'mock-pubkey-abc123' → check
3. No Node.js APIs accessible directly in renderer (contextIsolation is on) → check
```

---

## Step 3 — Install and initialise Hypercore stack

### Prompt to agent

```
Install the P2P dependencies into pear-social:
  npm install hyperswarm corestore hyperbee b4a

In src/p2p/store.js, implement and export exactly these functions:

  async function initStore(dataPath)
    - Creates a Corestore at dataPath
    - Gets or creates a core named 'user-feed'
    - Awaits core.ready()
    - Returns { store, core }

  async function getPublicKey(core)
    - Returns core.key as a hex string using b4a

  async function appendBlock(core, block)
    - Appends JSON.stringify(block) to core
    - Returns the block index

  async function getBlock(core, index)
    - Returns JSON.parse of the block at index

Do NOT implement Hyperswarm yet. Local only.

Write tests in tests/store.test.js using an in-memory corestore:
  new Corestore(RAM) where RAM = require('random-access-memory')

Tests must cover:
  1. initStore returns a core with a valid key
  2. appendBlock then getBlock returns the same object
  3. getPublicKey returns a 64-char hex string
```

### Verify
```
1. `npm test` — all 3 store tests pass → check
2. No Hyperswarm or Hyperbee imported yet in store.js → check
```

---

## Step 4 — Implement the Hyperbee feed indexer

### Prompt to agent

```
In src/p2p/store.js, add a feed indexer on top of the existing functions.

Add and export exactly these new functions:

  async function initIndex(store)
    - Creates a Hyperbee on a core named 'feed-index'
    - keyEncoding: 'utf-8', valueEncoding: 'json'
    - Returns the bee instance

  async function indexBlock(bee, pubkey, block, seqNo)
    - If block.type === 'post':
        key = `post!${block.ts}!${pubkey}!${seqNo}`
        value = { ...block, author: pubkey }
        await bee.put(key, value)
    - If block.type === 'profile':
        key = `profile!${pubkey}`
        value = { ...block, author: pubkey }
        await bee.put(key, value)
    - Otherwise: do nothing

  async function getFeed(bee)
    - Returns all entries where key starts with 'post!'
    - Sorted by timestamp descending (newest first)
    - Returns array of value objects

  async function getProfile(bee, pubkey)
    - Returns value at key `profile!${pubkey}` or null

Write tests in tests/index.test.js covering:
  1. indexBlock with a post block — getFeed returns it
  2. indexBlock with a profile block — getProfile returns it
  3. getFeed with 3 posts returns them newest-first
  4. indexBlock with unknown type — getFeed still returns 0 posts
```

### Verify
```
1. `npm test` — all 4 indexer tests pass → check
2. store.js is under 120 lines total → check
```

---

## Step 5 — Wire real Hypercore into IPC handlers

### Prompt to agent

```
Replace the stub IPC handlers in src/main/ipc.js with real implementations
using the functions from src/p2p/store.js.

On app startup (called from main/index.js before window opens):
  1. Call initStore('./pear-social-data') → { store, core }
  2. Call initIndex(store) → bee
  3. Watch core.on('append') → for each new block, call indexBlock

Replace these stub handlers with real implementations:

  'get-my-key' → return getPublicKey(core)

  'set-my-profile' (name) →
    append { type:'profile', id: uuid(), name, ts: Date.now() } to core

  'get-my-profile' →
    return getProfile(bee, getPublicKey(core))

  'create-post' (text) →
    append { type:'post', id: uuid(), text, ts: Date.now() } to core

  'get-feed' →
    return getFeed(bee)

Use the 'uuid' package for generating ids (npm install uuid).

Keep the existing stub tests passing by extracting handler logic into
plain async functions that the tests can call directly - don't couple
tests to ipcMain.

Do not implement addFriend or getFriends yet.
```

### Verify
```
1. `npm test` — all existing tests still pass → check
2. `npm run dev` → open app → DevTools console:
   await window.pear.setMyProfile('Rahim') → no error
   await window.pear.getMyProfile() → returns { name: 'Rahim', ... }
   await window.pear.createPost('Hello Dhaka!') → no error
   await window.pear.getFeed() → returns array with 1 post → check
3. Data persists after app restart → check
```

---

## Step 6 — Implement Hyperswarm peer sync

### Prompt to agent

```
In src/p2p/swarm.js, implement peer discovery and core replication.

Export exactly these functions:

  async function startSwarm(store, onPeerConnected)
    - Creates a Hyperswarm instance
    - On 'connection': calls store.replicate(conn)
    - On 'connection': calls onPeerConnected(info.publicKey.toString('hex'))
    - Joins the topic: sha256('pear-social-v1')
    - Returns the swarm instance

  async function replicateFriendCore(store, friendPubkeyHex)
    - Gets the core for friendPubkeyHex from the store:
        store.get({ key: Buffer.from(friendPubkeyHex, 'hex') })
    - Awaits core.ready()
    - Returns the core (replication happens automatically via store.replicate)

Add to ipc.js:

  On app init: call startSwarm(store, (key) => win.webContents.send('peer-connected', key))

  'add-friend' (pubkeyHex) →
    - Call replicateFriendCore(store, pubkeyHex) → friendCore
    - Watch friendCore.on('append') → for each new block, call indexBlock(bee, pubkeyHex, block, seq)
    - Persist the friend pubkey to a local JSON file: ./pear-social-data/friends.json
    - Return { ok: true }

  'get-friends' →
    - Read friends.json, return array of pubkey strings

On startup, load friends.json and call replicateFriendCore for each saved friend.

Write tests in tests/swarm.test.js:
  1. Two in-memory Corestores replicate a single appended block between them
     (use Hyperswarm in test mode or direct stream replication via store.replicate)
  2. After replication, indexBlock is called and getFeed returns the replicated post
```

### Verify
```
1. `npm test` — replication tests pass → check
2. Run two instances of the app (different data paths via env var):
   Instance A: copy pubkey from DevTools
   Instance B: addFriend(Instance A pubkey)
   Instance A: createPost('Hello from A')
   Instance B: getFeed() → contains Instance A's post → check
```

---

## Step 7 — Build the React UI

### Prompt to agent

```
Build the React UI in src/renderer/. All data comes from window.pear.* only.
No direct Hypercore imports in the renderer.

Implement these components using Tailwind CSS:

1. src/renderer/components/SetupScreen.jsx
   - Shown only if window.pear.getMyProfile() returns null
   - Single input: "Your name"
   - Submit calls window.pear.setMyProfile(name)
   - On success: transitions to MainScreen

2. src/renderer/components/MainScreen.jsx
   - Left sidebar (240px):
       - User avatar (initials circle, 2 letters from name, bg-purple-600)
       - User name and truncated pubkey (first 8 chars + '...')
       - "Add Friend" button → opens AddFriendModal
       - List of friends (pubkey truncated)
   - Main content area:
       - PostComposer at top (textarea + "Post" button)
       - Feed of PostCard components below
   - On mount: load feed via window.pear.getFeed()
   - Listen to window.pear.onFeedUpdate → refresh feed

3. src/renderer/components/PostCard.jsx
   Props: { post: { text, ts, author } }
   - Initials avatar (first 2 chars of author pubkey)
   - Truncated author pubkey
   - Post text
   - Relative timestamp (e.g. "2 min ago") - use no library, implement simply

4. src/renderer/components/AddFriendModal.jsx
   - Text input for pubkey
   - "Add" button calls window.pear.addFriend(pubkey)
   - Close button

Style requirements:
   - Dark sidebar, light main content
   - No external component libraries - Tailwind only
   - No animations

Do not write tests for UI components. The IPC layer is already tested.
```

### Verify
```
1. `npm run dev` → SetupScreen appears on first run → check
2. Enter name → MainScreen appears with correct initials avatar → check
3. Type a post → appears in feed immediately → check
4. Add a friend pubkey → friend appears in sidebar → check
5. Two instances: post from A appears in B's feed within 5 seconds → check
```

---

## Step 8 — Final integration pass

### Prompt to agent

```
Run the full test suite and fix any failures.

Then do one integration check:
1. Delete ./pear-social-data (fresh start)
2. npm run dev
3. Verify the full user journey works end to end:
   - Setup name
   - Create 3 posts
   - Copy pubkey
   - Open second instance (DATA_PATH=./pear-social-data-2 npm run dev)
   - Add first instance as friend
   - Verify all 3 posts appear in second instance feed
   - Create a new post in first instance
   - Verify it appears in second instance feed live

Fix any bugs found. Do not add features.

Finally, run: npm run build
Verify it produces a distributable Electron app with no build errors.
```

### Verify
```
1. `npm test` — all tests pass → check
2. Full user journey works as described → check
3. `npm run build` succeeds → check
```

---

## Re-evaluation checkpoint (use after each step)

After each step completes, paste this into a new conversation with the agent:

```
Review what you just built against these criteria:

1. Does every changed line trace directly to the step's requirements?
   List any lines that don't.

2. Is there any code that could be simpler? Show the simpler version.

3. Do all tests pass? Run npm test and paste the output.

4. Are there any assumptions you made that weren't explicitly stated?
   List them.

5. What is the riskiest part of what you just built?
   How would you verify it doesn't break in step N+1?

Do not proceed to the next step until all 5 questions are answered cleanly.
```

---

## Dependency map

```
Step 1 (scaffold)
  └── Step 2 (IPC bridge)
        └── Step 3 (Hypercore init)
              └── Step 4 (Hyperbee indexer)
                    └── Step 5 (wire IPC → real Hypercore)
                          └── Step 6 (Hyperswarm sync)
                                └── Step 7 (React UI)
                                      └── Step 8 (integration)
```

Each step depends on the previous. Do not skip steps.
The architecture cannot "drift" — every decision from the 9-question interview
is enforced by the step's constraints.

---

## npm packages used across all steps

```json
{
  "dependencies": {
    "electron": "latest",
    "react": "^18",
    "react-dom": "^18",
    "hyperswarm": "latest",
    "corestore": "latest",
    "hyperbee": "latest",
    "b4a": "latest",
    "uuid": "latest"
  },
  "devDependencies": {
    "electron-vite": "latest",
    "vite": "latest",
    "tailwindcss": "^3",
    "vitest": "latest",
    "random-access-memory": "latest"
  }
}
```