/**
 * Lightweight full-text search across the note editor's content. Notes persist
 * as BlockNote JSON in localStorage under `nb-doc-<fileId>`; we walk the block
 * tree and flatten it to plain text so the dashboard can search inside docs
 * (Eraser's "search across text on canvas and notes").
 *
 * Canvas text lives in tldraw's IndexedDB store and isn't read here yet — that
 * arrives when the canvas store moves to a queryable backend (Phase 2).
 */

type InlineLike = string | { text?: string; content?: unknown } | Record<string, unknown>
type BlockLike = { content?: InlineLike[] | string; children?: BlockLike[] }

function flattenInline(content: BlockLike['content']): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content
    .map((c) => {
      if (typeof c === 'string') return c
      if (c && typeof c === 'object' && 'text' in c && typeof c.text === 'string') return c.text
      return ''
    })
    .join('')
}

function flattenBlocks(blocks: BlockLike[]): string {
  return blocks
    .map((b) => {
      const own = flattenInline(b.content)
      const kids = Array.isArray(b.children) && b.children.length ? ' ' + flattenBlocks(b.children) : ''
      return own + kids
    })
    .join(' ')
}

/** Full plain-text of a file's note, or '' if none/unparseable. */
export function docText(fileId: string): string {
  const raw = localStorage.getItem(`nb-doc-${fileId}`)
  if (!raw) return ''
  try {
    return flattenBlocks(JSON.parse(raw) as BlockLike[]).replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

/** A ~120-char snippet of `text` centered on the first match of `query`. */
export function matchSnippet(text: string, query: string): string | null {
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i === -1) return null
  const start = Math.max(0, i - 40)
  const end = Math.min(text.length, i + query.length + 60)
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '')
}
