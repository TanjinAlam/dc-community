import { v4 as uuidv4 } from 'uuid'
import b4a from 'b4a'

export function conversationKey(pubkeyA, pubkeyB) {
  return [pubkeyA, pubkeyB].sort().join('!')
}

export async function sendMessage(userCore, bee, myPubkeyHex, friendPubkeyHex, text) {
  const block = {
    type: 'dm',
    id: uuidv4(),
    to: friendPubkeyHex,
    from: myPubkeyHex,
    text,
    ts: Date.now()
  }
  await userCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
  const key = `dm!${conversationKey(myPubkeyHex, friendPubkeyHex)}!${block.ts}!${block.id}`
  await bee.put(key, { ...block })
  return block
}

export async function indexIncomingMessage(bee, block, senderPubkeyHex, myPubkeyHex) {
  const key = `dm!${conversationKey(senderPubkeyHex, myPubkeyHex)}!${block.ts}!${block.id}`
  await bee.put(key, { ...block })
}

export async function getMessages(bee, myPubkeyHex, friendPubkeyHex, limit = 50) {
  const convKey = conversationKey(myPubkeyHex, friendPubkeyHex)
  const messages = []
  for await (const entry of bee.createReadStream({
    gt: `dm!${convKey}!`,
    lt: `dm!${convKey}~`,
    limit,
    reverse: true
  })) {
    messages.push(entry.value)
  }
  return messages
}

export async function getConversations(bee, myPubkeyHex, friendPubkeys) {
  const conversations = []
  for (const friendPubkeyHex of friendPubkeys) {
    const msgs = await getMessages(bee, myPubkeyHex, friendPubkeyHex, 1)
    if (msgs.length === 0) continue
    const lastMessage = msgs[0]
    conversations.push({ friendPubkey: friendPubkeyHex, lastMessage, lastTs: lastMessage.ts })
  }
  conversations.sort((a, b) => b.lastTs - a.lastTs)
  return conversations
}
