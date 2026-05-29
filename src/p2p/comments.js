import { v4 as uuidv4 } from 'uuid'
import b4a from 'b4a'

export async function postComment(userCore, bee, myPubkeyHex, { parentId, communityKey, text }) {
  const block = { type: 'comment', id: uuidv4(), parentId, communityKey, text, ts: Date.now() }
  await userCore.append(b4a.from(JSON.stringify(block), 'utf-8'))
  const seqNo = userCore.length - 1
  const raw = await userCore.get(seqNo)
  const actual = JSON.parse(b4a.toString(raw, 'utf-8'))
  const key = `comment!${communityKey}!${parentId}!${actual.ts}!${actual.id}`
  await bee.put(key, { ...actual, author: myPubkeyHex })
  return actual
}

export async function getComments(bee, communityKey, parentId) {
  const results = []
  for await (const entry of bee.createReadStream({
    gt: `comment!${communityKey}!${parentId}!`,
    lt: `comment!${communityKey}!${parentId}~`
  })) {
    results.push(entry.value)
  }
  return results
}

export async function buildCommentTree(bee, communityKey, rootPostId, depth = 0) {
  if (depth >= 5) return []
  const comments = await getComments(bee, communityKey, rootPostId)
  for (const comment of comments) {
    comment.replies = await buildCommentTree(bee, communityKey, comment.id, depth + 1)
  }
  return comments
}
