/**
 * Cross-document backlinks. A figure (canvas frame) can be embedded as a diagram
 * block in several docs across the workspace; these helpers scan every locally
 * cached doc (`nb-doc-<fileId>`) and count how many reference a given figure.
 */

type Block = { type?: string; props?: Record<string, unknown>; children?: Block[] }

const DOC_KEY_PREFIX = 'nb-doc-'

/** Count diagram blocks in a block tree that embed `figureId`. */
function countRefs(blocks: Block[], figureId: string): number {
  let n = 0
  for (const b of blocks) {
    if (b.type === 'diagram' && String(b.props?.figureId || '') === figureId) n++
    if (b.children?.length) n += countRefs(b.children, figureId)
  }
  return n
}

export type DocBacklink = { fileId: string; count: number }

/** Docs (by fileId) that embed `figureId`, with how many times each does. */
export function figureBacklinks(figureId: string): DocBacklink[] {
  if (!figureId) return []
  const out: DocBacklink[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(DOC_KEY_PREFIX)) continue
    try {
      const blocks = JSON.parse(localStorage.getItem(key) || '[]') as Block[]
      const count = countRefs(blocks, figureId)
      if (count > 0) out.push({ fileId: key.slice(DOC_KEY_PREFIX.length), count })
    } catch {
      /* skip malformed doc */
    }
  }
  return out
}
