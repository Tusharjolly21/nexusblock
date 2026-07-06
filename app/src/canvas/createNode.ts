import { createShapeId, type Editor, type TLShapeId, type VecLike } from 'tldraw'
import type { NodeKind } from '../shapes/ArchNodeShape'
import type { GroupAccent } from '../shapes/GroupFrameShape'
import { DEFAULT_TABLE_ROWS, TABLE_H, TABLE_W } from '../shapes/TableShape'
import { iconForTech } from '../icons/techMap'
import { useEditorUi, type ConnectorStyle } from '../store/useEditorUi'

/** Resolve a connector style into concrete arrow props (kind + bend). Curved's
 * bend scales with the span so it looks good at any distance. */
export function connectorProps(style: ConnectorStyle, span: number) {
  return {
    kind: style === 'elbow' ? ('elbow' as const) : ('arc' as const),
    bend: style === 'curved' ? Math.max(28, Math.min(130, span * 0.22)) : 0,
  }
}

/** Apply the connector line style to an existing arrow (kind + bend). */
export function styleConnector(editor: Editor, arrowId: TLShapeId, style: ConnectorStyle, span: number) {
  editor.updateShape({ id: arrowId, type: 'arrow', props: connectorProps(style, span) })
}

/** Drag payload key shared between the icon library and the canvas drop handler. */
export const ICON_DND_TYPE = 'application/x-drawdocs-icon'
export type IconDragPayload = { icon: string; label?: string }

export function encodeIconDragPayload(payload: IconDragPayload | string) {
  return typeof payload === 'string' ? payload : JSON.stringify(payload)
}

export function decodeIconDragPayload(raw: string): IconDragPayload | null {
  if (!raw) return null
  if (!raw.trim().startsWith('{')) return { icon: raw }
  try {
    const parsed = JSON.parse(raw) as Partial<IconDragPayload>
    return typeof parsed.icon === 'string' ? { icon: parsed.icon, label: parsed.label } : null
  } catch {
    return { icon: raw }
  }
}

/** nexusblock connector look: thin, ink-colored, single arrowhead. */
export const CONNECTOR_STYLE = {
  color: 'black',
  size: 's',
  arrowheadStart: 'none',
  arrowheadEnd: 'arrow',
} as const

const NODE_W = 210
const NODE_H = 68
const ICON_SIZE = 56
const CODE_BLOCK_W = 440
const CODE_BLOCK_H = 280
const EMBED_W = 620
const EMBED_H = 390

export type DeviceFrameKind = 'phone' | 'tablet' | 'desktop' | 'chrome'
export const DEVICE_FRAME_SIZE: Record<DeviceFrameKind, { w: number; h: number }> = {
  phone: { w: 156, h: 284 },
  tablet: { w: 232, h: 318 },
  desktop: { w: 372, h: 272 },
  chrome: { w: 390, h: 250 },
}

export type CreateNodeOpts = {
  kind?: NodeKind
  label?: string
  tech?: string
  icon?: string
  /** Page-space top-left target; defaults to viewport center. */
  point?: VecLike
}

/**
 * Single path for creating an ArchNode — used by the insert palette, the icon
 * picker (click), and canvas drops. The DSL/AI pipelines will call this too.
 */
export function createArchNode(editor: Editor, opts: CreateNodeOpts = {}) {
  const { kind = 'service', label = 'Node', tech = '', point } = opts
  // Auto-pick the real technology logo from tech/label when not explicitly set.
  const icon = opts.icon || iconForTech(tech, label)
  const center = point ?? centeredTopLeft(editor)
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'arch-node',
    x: center.x,
    y: center.y,
    props: { w: NODE_W, h: NODE_H, kind, label, tech, icon },
  })
  editor.select(id)
  return id
}

/** Create a tldraw geo shape (rectangle/ellipse/…) centered on a page point. */
export function createGeoShapeAt(editor: Editor, geo: string, center: VecLike, w = 120, h = 90) {
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'geo',
    x: center.x - w / 2,
    y: center.y - h / 2,
    props: { geo: geo as never, w, h },
  })
  editor.select(id)
  return id
}

/**
 * Create a titled group container. Call this BEFORE the nodes it wraps so it
 * renders behind them (tldraw stacks by creation order). Coordinates are the
 * page-space top-left corner and full width/height of the frame.
 */
export function createGroupFrame(
  editor: Editor,
  opts: { x: number; y: number; w: number; h: number; label?: string; accent?: GroupAccent; tint?: string },
) {
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'group-frame',
    x: opts.x,
    y: opts.y,
    props: { w: opts.w, h: opts.h, label: opts.label ?? 'Group', accent: opts.accent ?? 'amber', tint: opts.tint ?? '' },
  })
  return id
}

/** Create an icon-only shape (Icon library click / drop). */
export function createIconShape(
  editor: Editor,
  opts: { icon: string; label?: string; point?: VecLike },
) {
  const point =
    opts.point ?? centeredTopLeft(editor, ICON_SIZE, ICON_SIZE)
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'icon',
    x: point.x,
    y: point.y,
    props: { w: ICON_SIZE, h: ICON_SIZE, icon: opts.icon, label: opts.label ?? '' },
  })
  editor.select(id)
  return id
}

/** Insert grouped black-screen device mockups from the left rail library. */
export function createDeviceFrame(editor: Editor, kind: DeviceFrameKind, point?: VecLike) {
  const size = DEVICE_FRAME_SIZE[kind]
  const topLeft = point ?? centeredTopLeft(editor, size.w, size.h)
  const id = createShapeId()
  editor.markHistoryStoppingPoint(`create ${kind} frame`)
  editor.createShape({
    id,
    type: 'device-frame',
    x: topLeft.x,
    y: topLeft.y,
    props: { kind, w: size.w, h: size.h },
  })
  editor.select(id)
  return id
}

export function createCodeBlock(
  editor: Editor,
  opts: { point?: VecLike; language?: string; title?: string; code?: string } = {},
) {
  const topLeft = opts.point ?? centeredTopLeft(editor, CODE_BLOCK_W, CODE_BLOCK_H)
  const id = createShapeId()
  editor.markHistoryStoppingPoint('create code block')
  editor.createShape({
    id,
    type: 'code-block',
    x: topLeft.x,
    y: topLeft.y,
    props: {
      w: CODE_BLOCK_W,
      h: CODE_BLOCK_H,
      language: opts.language ?? 'typescript',
      title: opts.title ?? 'handler.ts',
      code:
        opts.code ??
        `export async function handler(event: PaymentEvent) {
  await validate(event)
  await publish('payments.authorized', event)
}`,
    },
  })
  editor.select(id)
  return id
}

export function createTable(editor: Editor, opts: { point?: VecLike; rows?: string[][] } = {}) {
  const topLeft = opts.point ?? centeredTopLeft(editor, TABLE_W, TABLE_H)
  const id = createShapeId()
  editor.markHistoryStoppingPoint('create table')
  editor.createShape({
    id,
    type: 'table',
    x: topLeft.x,
    y: topLeft.y,
    props: {
      w: TABLE_W,
      h: TABLE_H,
      rows: opts.rows ?? DEFAULT_TABLE_ROWS,
      activeRow: 1,
      activeCol: 0,
    },
  })
  editor.select(id)
  return id
}

export function createEmbed(editor: Editor, opts: { point?: VecLike; url: string; title?: string }) {
  const topLeft = opts.point ?? centeredTopLeft(editor, EMBED_W, EMBED_H)
  const id = createShapeId()
  editor.markHistoryStoppingPoint('create embed')
  editor.createShape({
    id,
    type: 'nb-embed',
    x: topLeft.x,
    y: topLeft.y,
    props: {
      w: EMBED_W,
      h: EMBED_H,
      url: opts.url,
      title: opts.title ?? labelFromUrl(opts.url),
    },
  })
  editor.select(id)
  return id
}

export function createSlideFrame(editor: Editor, point?: VecLike) {
  const w = 800
  const h = 500
  const topLeft = point ?? centeredTopLeft(editor, w, h)
  const id = createShapeId()
  editor.markHistoryStoppingPoint('create slide frame')
  editor.createShape({
    id,
    type: 'slide-frame',
    x: topLeft.x,
    y: topLeft.y,
    props: {
      w,
      h,
      label: 'Slide Title',
    },
  })
  editor.select(id)
  return id
}


/** Top-left so a w×h box is centered in the current viewport. */
function centeredTopLeft(editor: Editor, w = NODE_W, h = NODE_H): VecLike {
  const c = editor.getViewportPageBounds().center
  return { x: c.x - w / 2, y: c.y - h / 2 }
}

/** Center a w×h box on a given page point (used for drops at the cursor). */
export function centerOn(point: VecLike, w = NODE_W, h = NODE_H): VecLike {
  return { x: point.x - w / 2, y: point.y - h / 2 }
}

export { ICON_SIZE, TABLE_H, TABLE_W, EMBED_H, EMBED_W }

/** Create an arrow bound at both ends between two shapes (used by templates & AI). */
export function connectShapes(editor: Editor, fromId: TLShapeId, toId: TLShapeId) {
  const a = editor.getShapePageBounds(fromId)
  const b = editor.getShapePageBounds(toId)
  const start = a ? a.center : { x: 0, y: 0 }
  const end = b ? b.center : { x: 100, y: 0 }
  const span = Math.hypot(end.x - start.x, end.y - start.y)
  const line = connectorProps(useEditorUi.getState().connectorStyle, span)
  const arrowId = createShapeId()
  editor.createShape({
    id: arrowId,
    type: 'arrow',
    x: start.x,
    y: start.y,
    props: { start: { x: 0, y: 0 }, end: { x: end.x - start.x, y: end.y - start.y }, ...CONNECTOR_STYLE, ...line },
  })
  const bind = (terminal: 'start' | 'end', toShape: TLShapeId) =>
    editor.createBinding({
      type: 'arrow',
      fromId: arrowId,
      toId: toShape,
      props: {
        terminal,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
        snap: 'none',
      },
    })
  bind('start', fromId)
  bind('end', toId)
  return arrowId
}

/** Turn an Iconify id like 'logos:aws-lambda' into a readable label 'Aws Lambda'. */
export function labelFromIcon(icon: string): string {
  if (icon.startsWith('data:image/')) return 'Custom Icon'
  const name = icon.includes(':') ? icon.split(':')[1] : icon
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

function labelFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Embed'
  }
}
