# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, or discussions.**

If you discover a security vulnerability in Pear Social, report it privately:

- **Email:** piash.tanjin@gmail.com
- **Subject line:** `[SECURITY] Pear Social — <short description>`

Please include:

1. A description of the vulnerability and its impact.
2. Step-by-step instructions to reproduce it.
3. The affected version / commit, and platform (macOS / Windows / Linux / PWA).
4. Any proof-of-concept code, if applicable.

You will receive an acknowledgement within **72 hours**. We will work with you to understand and resolve the issue promptly, and will credit you in the release notes unless you prefer to remain anonymous.

Please give us a reasonable window to release a fix before any public disclosure.

---

## Scope

Pear Social is a decentralized, peer-to-peer application. Before reporting, please review the [Privacy & Security Model](./README.md#privacy--security-model) in the README — some properties are **intentional design limitations, not bugs**:

**In scope (please report):**
- Bypassing the challenge/response authentication on the WebSocket/PWA bridge.
- Reading or forging another user's Hypercore data.
- Breaking the encryption of data replication or call media.
- Remote code execution, path traversal, or injection in the Electron main/renderer process.
- Leaking the user's private key off-device.
- Crashes triggerable by a malicious peer.

**Out of scope (known/by-design — see the README):**
- IP address visibility to peers and the Hyperswarm DHT (the app is decentralized, not anonymous).
- A friend retaining a copy of data you shared with them.
- Metadata observability (that you are using the network, when, and with whom).
- The optional STUN/TURN server seeing your IP address.
- Lack of traffic-analysis resistance (this is not Tor).

---

## Supported Versions

This project is in active early development. Security fixes are applied to the latest release on the `main` branch. There is no long-term-support branch yet.

| Version | Supported |
|---------|-----------|
| latest `main` | ✅ |
| older releases | ❌ |
