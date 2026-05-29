# Contributing to Pear Social

Thank you for considering a contribution! Pear Social is a community-driven, fully decentralized social network. This guide explains how to get set up, the standards we hold, and how to land your change.

By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Table of Contents

- [Ways to contribute](#ways-to-contribute)
- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Testing requirements](#testing-requirements)
- [Coding standards](#coding-standards)
- [Commit & PR guidelines](#commit--pr-guidelines)
- [Security issues](#security-issues)

---

## Ways to contribute

- **Report bugs** — open an issue with clear reproduction steps.
- **Suggest features** — open an issue describing the problem first, not just the solution.
- **Improve docs** — README, this guide, code comments, the privacy model.
- **Write code** — pick up a [`good first issue`](https://github.com/TanjinAlam/dc-community/labels/good%20first%20issue) or propose your own.
- **Test on your platform** — macOS, Windows, Linux, and mobile all need real-world testing.

---

## Development setup

**Prerequisites:** Node.js 18+, npm 9+, Git.

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/dc-community.git
cd dc-community

# Install dependencies (electron-rebuild runs automatically via postinstall)
npm install

# Run the test suite — should be all green
npm test

# Start the app in development mode
npm run dev
```

The dev build runs the WebSocket/PWA server on port **8888** and stores data in `./pear-social-data`, so it won't conflict with an installed production build (which uses port 7777). This lets you test peer-to-peer features between a dev instance and an installed build on the same machine.

---

## Project structure

```
src/
  main/        Electron main process — IPC handlers, WebSocket server
  preload/     contextBridge — the window.pear API surface
  renderer/    React UI (components + screens)
  p2p/         Pure Hypercore logic — NO Electron imports, fully unit-testable
tests/         Vitest suite (node environment)
pwa/           Progressive Web App (thin client over WebSocket)
pear-social-mobile/  React Native source (native projects not yet generated)
docs/          Implementation plans
```

**Key rule:** anything in `src/p2p/` must be free of Electron/DOM dependencies so it can be unit-tested in Node. Wiring to Electron happens in `src/main/`.

---

## Development workflow

1. **Create a branch** off `main`:
   ```bash
   git checkout -b feat/short-description    # or fix/, docs/, refactor/
   ```
2. **Make your change.** Keep it focused — one logical change per PR.
3. **Add or update tests** for any P2P logic (see below).
4. **Run the suite:**
   ```bash
   npm test
   npm run lint    # if you touched JS/JSX
   ```
5. **Commit** with a clear message (see [commit guidelines](#commit--pr-guidelines)).
6. **Push and open a Pull Request** against `main`.

---

## Testing requirements

We use [Vitest](https://vitest.dev/) in a node environment.

- **All P2P logic (`src/p2p/`) must have tests** in `tests/`. Look at `tests/votes.test.js` or `tests/community.test.js` for the established pattern (temp dirs + Corestore).
- **`npm test` must stay green.** PRs that break tests will not be merged.
- **UI components do not need tests** — the P2P layer beneath them is what's covered.
- New IPC handlers should have a test that calls the handler directly (see `tests/community-ipc.test.js`).

```bash
npm test              # run once
npx vitest            # watch mode while developing
```

---

## Coding standards

- **Match the surrounding style.** No Prettier config is enforced; mirror nearby code (2-space indent, no semicolons in renderer files following existing files).
- **No new heavy dependencies** without discussion in an issue first. The P2P stack is intentionally lean.
- **Keep `src/p2p/` pure** — no `electron`, `window`, or DOM references.
- **Be honest in security-related code and docs.** Do not add comments or docs that overstate privacy guarantees. See the [Privacy & Security Model](./README.md#privacy--security-model).
- **Don't commit** `pear-social-data/`, `out/`, `release/`, or `node_modules/` (already in `.gitignore`).

---

## Commit & PR guidelines

**Commit messages** — use a short imperative summary, optionally with a type prefix:

```
feat: add reaction emojis to posts
fix: flush ICE candidates queued before remote description
docs: clarify TURN server privacy guarantees
test: cover removeFriend handler
```

**Pull Requests should:**
- Target the `main` branch.
- Describe *what* changed and *why*.
- Link the issue they close (`Closes #123`).
- Include test output if they touch P2P logic.
- Stay focused — split unrelated changes into separate PRs.

A maintainer will review, possibly request changes, and merge once tests pass and the change is sound.

---

## Security issues

**Do not open public issues for security vulnerabilities.** Follow the process in [SECURITY.md](./SECURITY.md) — report privately to piash.tanjin@gmail.com so the issue can be fixed before disclosure.

---

Thanks for helping build a social network that respects its users. 🍐
