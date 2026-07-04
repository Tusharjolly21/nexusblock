import type { Editor, TLShapeId, VecLike } from 'tldraw'
import { createGroupFrame } from './createNode'

export const FIGURE_EMBED_MIME = 'application/x-nexusblock-figure'
export const FIGURE_EMBED_PREFIX = 'nexusblock-figure:'

type Bounds = { x: number; y: number; w: number; h: number }

const PADDING = 36

export function isFigureId(editor: Editor, id: TLShapeId) {
  return editor.getShape(id)?.type === 'group-frame'
}

export function boundsFromPoints(a: VecLike, b: VecLike): Bounds {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}

export function getFigureContentIds(editor: Editor, figureId: TLShapeId) {
  const figureBounds = editor.getShapePageBounds(figureId)
  if (!figureBounds) return [figureId]

  const ids = [figureId]
  for (const shape of editor.getCurrentPageShapesSorted()) {
    if (shape.id === figureId || shape.type === 'group-frame') continue
    const b = editor.getShapePageBounds(shape.id)
    if (!b) continue
    const c = b.center
    if (
      c.x >= figureBounds.x &&
      c.x <= figureBounds.x + figureBounds.width &&
      c.y >= figureBounds.y &&
      c.y <= figureBounds.y + figureBounds.height
    ) {
      ids.push(shape.id)
    }
  }
  return ids
}

export function createFigureAtBounds(editor: Editor, bounds: Bounds, label = 'Figure') {
  const id = createGroupFrame(editor, {
    x: bounds.x,
    y: bounds.y,
    w: Math.max(80, bounds.w),
    h: Math.max(64, bounds.h),
    label,
    accent: 'sky',
  })
  editor.sendToBack([id])
  editor.select(id)
  return id
}

export function createFigureAroundSelection(editor: Editor) {
  const selected = editor.getSelectedShapeIds().filter((id) => editor.getShape(id)?.type !== 'group-frame')
  if (!selected.length) return null
  const bounds = editor.getSelectionPageBounds()
  if (!bounds) return null
  return createFigureAtBounds(editor, {
    x: bounds.x - PADDING,
    y: bounds.y - PADDING,
    w: bounds.width + PADDING * 2,
    h: bounds.height + PADDING * 2,
  })
}

export async function snapshotFigure(editor: Editor, figureId: TLShapeId) {
  const ids = getFigureContentIds(editor, figureId)
  const res = await editor.toImage(ids, { format: 'png', scale: 2, background: true, padding: 18 })
  if (!res?.blob) return null
  return blobToDataUrl(res.blob)
}

export async function captureFigureContent(editor: Editor, figureId: TLShapeId) {
  return captureShapeContent(editor, getFigureContentIds(editor, figureId))
}

export async function captureCanvasContent(editor: Editor) {
  return captureShapeContent(editor, editor.getCurrentPageShapesSorted().map((shape) => shape.id))
}

async function captureShapeContent(editor: Editor, ids: TLShapeId[]) {
  const content = editor.getContentFromCurrentPage(ids)
  if (!content) return ''
  try {
    const resolved = await editor.resolveAssetsInContent(content)
    return JSON.stringify(resolved ?? content)
  } catch {
    return JSON.stringify(content)
  }
}

export async function copyFigureEmbed(editor: Editor, figureId: TLShapeId) {
  const shape = editor.getShape(figureId)
  if (!shape || shape.type !== 'group-frame') return false
  const src = await snapshotFigure(editor, figureId)
  if (!src) return false
  const label = String(shape.props.label || 'Figure')
  const content = await captureFigureContent(editor, figureId)
  const payload = `${FIGURE_EMBED_PREFIX}${JSON.stringify({ src, caption: label, figureId, content })}`
  await navigator.clipboard.writeText(payload)
  return true
}

export function parseFigureEmbed(text: string) {
  if (!text.startsWith(FIGURE_EMBED_PREFIX)) return null
  try {
    const parsed = JSON.parse(text.slice(FIGURE_EMBED_PREFIX.length)) as { src?: string; caption?: string; figureId?: string; content?: string }
    if (!parsed.src) return null
    return { src: parsed.src, caption: parsed.caption || 'Figure', figureId: parsed.figureId || '', content: parsed.content || '' }
  } catch {
    return null
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
