import ELK from 'elkjs/lib/elk.bundled.js'
import { createShapeId, toRichText, type Editor, type TLShapeId } from 'tldraw'
import { parseErd, type ErdError, type ErdConnector } from './parse'
import { resolveIcon } from '../flow/lib'
import { ERD_HEADER_H, ERD_ROW_H } from '../../shapes/ErdEntityShape'

const elk = new ELK()

const TLDRAW_COLORS = ['black', 'grey', 'blue', 'green', 'red', 'orange', 'yellow', 'violet'] as const
type TldrawColor = (typeof TLDRAW_COLORS)[number]
const arrowColor = (raw?: string): TldrawColor => {
  const c = raw?.toLowerCase()
  return c && (TLDRAW_COLORS as readonly string[]).includes(c) ? (c as TldrawColor) : 'black'
}

/** many/one markers per connector (Eraser: < one-to-many, > many-to-one, - 1:1, <> m:m). */
const CARD: Record<ErdConnector, [string, string]> = {
  '>': ['*', '1'],
  '<': ['1', '*'],
  '-': ['1', '1'],
  '<>': ['*', '*'],
}

type ElkNode = { id: string; width?: number; height?: number; x?: number; y?: number }

/** Compile the ERD DSL: entity tables + row-anchored relationship lines. */
export async function applyErd(editor: Editor, source: string): Promise<ErdError[]> {
  const doc = parseErd(source)
  if (doc.entities.size === 0) return doc.errors

  // Size each entity from its content.
  const size = new Map<string, { w: number; h: number }>()
  for (const [name, e] of doc.entities) {
    const nameW = name.length * 8 + 52
    const rowW = Math.max(
      120,
      ...e.attrs.map((a) => a.name.length * 8 + a.type.length * 7 + (a.pk ? 26 : 0) + 48),
    )
    const w = Math.min(320, Math.max(190, nameW, rowW))
    const h = ERD_HEADER_H + e.attrs.length * ERD_ROW_H
    size.set(name, { w, h })
  }

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '150',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
    },
    children: [...doc.entities.keys()].map((name) => {
      const s = size.get(name)!
      return { id: name, width: s.w, height: s.h }
    }),
    edges: doc.rels.map((r, i) => ({ id: `r${i}`, sources: [r.from.entity], targets: [r.to.entity] })),
  }

  const laid = (await elk.layout(graph as never)) as unknown as { children?: ElkNode[] }
  const box = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const c of laid.children ?? []) box.set(c.id, { x: c.x ?? 0, y: c.y ?? 0, w: c.width ?? 200, h: c.height ?? 80 })

  const existing = Array.from(editor.getCurrentPageShapeIds())
  if (existing.length) editor.deleteShapes(existing)

  // Entity tables.
  const idMap = new Map<string, TLShapeId>()
  for (const [name, e] of doc.entities) {
    const b = box.get(name)
    if (!b) continue
    const id = createShapeId()
    editor.createShape({
      id,
      type: 'erd-entity',
      x: b.x,
      y: b.y,
      props: {
        w: b.w,
        h: b.h,
        name,
        icon: resolveIcon(e.icon),
        color: e.color ?? '',
        rows: JSON.stringify(e.attrs),
      },
    })
    idMap.set(name, id)
  }

  // y-fraction of an attribute row's center (or header center when entity-level).
  const anchorY = (entity: string, attr: string | undefined, h: number) => {
    const e = doc.entities.get(entity)
    const idx = attr ? (e?.attrs.findIndex((a) => a.name === attr) ?? -1) : -1
    if (idx < 0) return ERD_HEADER_H / 2 / h
    return (ERD_HEADER_H + (idx + 0.5) * ERD_ROW_H) / h
  }

  // Relationships.
  for (const r of doc.rels) {
    const fromId = idMap.get(r.from.entity)
    const toId = idMap.get(r.to.entity)
    const fb = box.get(r.from.entity)
    const tb = box.get(r.to.entity)
    if (!fromId || !toId || !fb || !tb) continue

    // Anchor on the side facing the other entity.
    const fromRight = fb.x + fb.w / 2 <= tb.x + tb.w / 2
    const fnx = fromRight ? 1 : 0
    const tnx = fromRight ? 0 : 1
    const fny = anchorY(r.from.entity, r.from.attr, fb.h)
    const tny = anchorY(r.to.entity, r.to.attr, tb.h)
    const start = { x: fb.x + fnx * fb.w, y: fb.y + fny * fb.h }
    const end = { x: tb.x + tnx * tb.w, y: tb.y + tny * tb.h }

    const arrowId = createShapeId()
    editor.createShape({
      id: arrowId,
      type: 'arrow',
      x: start.x,
      y: start.y,
      props: {
        start: { x: 0, y: 0 },
        end: { x: end.x - start.x, y: end.y - start.y },
        kind: 'elbow',
        color: arrowColor(r.color),
        size: 's',
        arrowheadStart: 'dot',
        arrowheadEnd: 'dot',
      } as never,
    })
    const bind = (terminal: 'start' | 'end', toShape: TLShapeId, nx: number, ny: number) =>
      editor.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: toShape,
        props: { terminal, normalizedAnchor: { x: nx, y: ny }, isExact: false, isPrecise: true, snap: 'none' },
      })
    bind('start', fromId, fnx, fny)
    bind('end', toId, tnx, tny)

    // Cardinality labels just outside each anchor.
    const [fromCard, toCard] = CARD[r.connector]
    const mkCard = (text: string, at: { x: number; y: number }, right: boolean) => {
      const id = createShapeId()
      editor.createShape({
        id,
        type: 'text',
        x: at.x + (right ? 10 : -20),
        y: at.y - 15,
        props: { richText: toRichText(text), size: 's', color: arrowColor(r.color), font: 'mono', scale: 0.7 } as never,
      })
    }
    mkCard(fromCard, start, fnx === 1)
    mkCard(toCard, end, tnx === 1)
  }

  editor.selectNone()
  editor.zoomToFit({ animation: { duration: 200 } })
  return doc.errors
}
