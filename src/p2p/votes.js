import { v4 as uuidv4 } from 'uuid'
import b4a from 'b4a'

export async function castVote(userCore, bee, myPubkeyHex, targetId, value) {
  if (value !== 1 && value !== -1) {
    throw new Error('Vote value must be 1 or -1')
  }

  const key = `vote!${myPubkeyHex}!${targetId}`
  const existing = await bee.get(key)

  if (existing && existing.value.value === value) {
    return { changed: false }
  }

  await userCore.append(b4a.from(JSON.stringify({ type: 'vote', id: uuidv4(), targetId, value, ts: Date.now() }), 'utf-8'))
  await bee.put(key, { value, ts: Date.now() })

  return { changed: true, value }
}

export async function getVoteCounts(bee, targetId) {
  let up = 0
  let down = 0

  for await (const entry of bee.createReadStream({ gt: 'vote!', lt: 'vote~' })) {
    if (entry.key.endsWith(`!${targetId}`)) {
      if (entry.value.value === 1) up++
      else if (entry.value.value === -1) down++
    }
  }

  return { up, down, score: up - down }
}

export async function getMyVote(bee, myPubkeyHex, targetId) {
  const entry = await bee.get(`vote!${myPubkeyHex}!${targetId}`)
  return entry?.value?.value ?? 0
}
