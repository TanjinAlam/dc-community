# TURN Server Setup Guide

Self-hosting a TURN relay for Pear Social calls.

---

## Why TURN?

WebRTC calls connect directly between peers (P2P) using STUN for NAT traversal. This works for roughly **90% of connections**. The remaining ~10% fail when both peers are behind symmetric NAT (common on corporate, university, and some mobile networks).

A TURN server acts as an encrypted relay for those cases. Critically:
- The TURN server **cannot decrypt** call content — WebRTC uses DTLS-SRTP encryption end-to-end
- TURN only sees encrypted packets and IP addresses — no audio, no video
- Users who hole-punch directly never touch TURN at all

---

## Minimum VPS Requirements

| Resource | Minimum |
|----------|---------|
| CPU | 1 vCPU |
| RAM | 512 MB |
| Storage | 10 GB |
| OS | Ubuntu 22.04 LTS |
| Bandwidth | ~$6/mo DigitalOcean droplet handles ~500 simultaneous relayed calls |

**Open these ports in your firewall:**

| Port | Protocol | Purpose |
|------|----------|---------|
| 3478 | UDP + TCP | TURN/STUN |
| 5349 | TCP (TLS) | TURN over TLS |
| 49152–65535 | UDP | Media relay |

---

## Installation

```bash
sudo apt update
sudo apt install -y coturn certbot
sudo systemctl enable coturn
```

### Get a TLS certificate (optional but recommended)

```bash
sudo certbot certonly --standalone -d your.domain.com
```

---

## Configuration

Edit `/etc/turnserver.conf`:

```conf
listening-port=3478
tls-listening-port=5349
listening-ip=YOUR_SERVER_IP
relay-ip=YOUR_SERVER_IP
realm=pear-social
server-name=pear-social

# Long-term credential mechanism
lt-cred-mech
user=pearsocial:CHOOSE_A_STRONG_PASSWORD

# TLS (comment out if no certificate)
cert=/etc/letsencrypt/live/your.domain.com/fullchain.pem
pkey=/etc/letsencrypt/live/your.domain.com/privkey.pem

# Logging
log-file=/var/log/turnserver.log
verbose

# Security
no-tcp-relay
no-multicast-peers
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

Start the server:

```bash
sudo systemctl start coturn
sudo systemctl status coturn
```

Test it is reachable:

```bash
# From your local machine:
turnutils_uclient -t -u pearsocial -w CHOOSE_A_STRONG_PASSWORD your.domain.com
```

---

## Add TURN to the App

Edit `src/p2p/webrtc.js` — add your server to the `ICE_SERVERS` array:

```js
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add your TURN server:
  {
    urls: 'turn:your.domain.com:3478',
    username: 'pearsocial',
    credential: 'CHOOSE_A_STRONG_PASSWORD'
  },
  // TLS variant (more reliable on restrictive networks):
  {
    urls: 'turns:your.domain.com:5349',
    username: 'pearsocial',
    credential: 'CHOOSE_A_STRONG_PASSWORD'
  }
]
```

Rebuild and redistribute the desktop app after this change.

---

## Privacy Guarantees

| Concern | Reality |
|---------|---------|
| Can TURN operator hear calls? | No — DTLS-SRTP encryption is mandatory in WebRTC |
| What does TURN log? | IP addresses and bandwidth usage only |
| Is audio/video stored? | No — TURN is a relay, not a recorder |
| Who uses TURN? | Only the ~10% of calls that fail NAT hole-punching |
| Can I verify this? | Yes — coturn is open source, you self-host it |

---

## Cost Estimate

| Scale | VPS | Monthly cost |
|-------|-----|-------------|
| Personal / small group | DigitalOcean $6 droplet | ~$6/mo |
| ~500 simultaneous relayed calls | DigitalOcean $12 droplet | ~$12/mo |
| Large community | Scale horizontally | Varies |

Remember: most calls (90%) never touch TURN. Only the worst-case NAT scenarios use it.

---

## Keeping Credentials Out of the Repo

Never commit TURN credentials to git. Options:

1. **Environment variable**: Set `TURN_CREDENTIAL` in the environment and read it in `webrtc.js`
2. **Config file**: Read from `~/.pear-social/turn.json` (outside the repo)
3. **App settings UI**: Let users enter their own TURN server in the app settings

Example using env var:

```js
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  ...(TURN_CREDENTIAL ? [{
    urls: 'turn:your.domain.com:3478',
    username: 'pearsocial',
    credential: TURN_CREDENTIAL
  }] : [])
]
```
