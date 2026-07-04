import type { Editor } from 'tldraw'

const thumbKey = (fileId: string) => `nb-thumb-${fileId}`

export const getThumb = (fileId: string): string | null =>
  localStorage.getItem(thumbKey(fileId))

/**
 * Export the current page as an SVG data URL and cache it per file, so the
 * dashboard can show a live preview. Cheap, offline, and non-fatal on error.
 */
export async function saveThumb(editor: Editor, fileId: string) {
  try {
    const ids = Array.from(editor.getCurrentPageShapeIds())
    if (ids.length === 0) {
      localStorage.removeItem(thumbKey(fileId))
      return
    }
    const res = await editor.getSvgString(ids, { scale: 0.5 })
    if (!res?.svg) return
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(res.svg)}`
    // Guard localStorage against very large diagrams.
    if (dataUrl.length < 600_000) localStorage.setItem(thumbKey(fileId), dataUrl)
  } catch {
    /* thumbnails are best-effort */
  }
}
