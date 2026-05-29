export function tokenise(text) {
  const tokens = text.toLowerCase().split(/\W+/).filter(token => token.length >= 3)
  return [...new Set(tokens)]
}

export async function indexForSearch(bee, block, authorKey) {
  if (block.type !== 'post' && block.type !== 'comment') return
  for (const token of tokenise(block.text || '')) {
    await bee.put(`search!${token}!${block.ts}!${block.id}`,
      { id: block.id, type: block.type, authorKey, preview: (block.text || '').slice(0, 100) })
  }
}

export async function search(bee, query) {
  const token = tokenise(query)[0]
  if (!token) return []
  const results = []
  for await (const entry of bee.createReadStream({
    gt: `search!${token}!`,
    lt: `search!${token}~`,
    limit: 30,
    reverse: true
  })) {
    results.push(entry.value)
  }
  return results
}
