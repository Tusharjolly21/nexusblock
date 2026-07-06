import ELK from 'elkjs/lib/elk.bundled.js'
import { createShapeId, toRichText, type Editor, type TLShapeId } from 'tldraw'
import { parseUml, type UmlError } from './parse'
import { resolveIcon } from '../flow/lib'
import { ERD_HEADER_H, ERD_ROW_H } from '../../shapes/ErdEntityShape'

const elk = new ELK()

export async function applyUml(editor: Editor, source: string): Promise<UmlError[]> {
  const doc = parseUml(source)
  if (doc.classes.size === 0) return doc.errors

  const size = new Map<string, { w: number; h: number }>()
  for (const [name, c] of doc.classes) {
    const nameW = name.length * 8 + 52
    const rowW = Math.max(
      120,
      ...c.members.map((m) => m.name.length * 8 + (m.type ? m.type.length * 7 + 10 : 0) + 48),
    )
    const w = Math.min(340, Math.max(190, nameW, rowW))
    const h = ERD_HEADER_H + c.members.length * ERD_ROW_H
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
    },
    children: [...doc.classes.keys()].map((name) => {
      const s = size.get(name)!
      return { id: name, width: s.w, height: s.h }
    }),
    edges: doc.rels.map((r, i) => ({ id: `r${i}`, sources: [r.fromClass], targets: [r.toClass] })),
  }

  const laid = (await elk.layout(graph as never)) as any
  const box = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const c of laid.children ?? []) box.set(c.id, { x: c.x ?? 0, y: c.y ?? 0, w: c.width ?? 200, h: c.height ?? 80 })

  const existing = Array.from(editor.getCurrentPageShapeIds())
  if (existing.length) editor.deleteShapes(existing)

  const idMap = new Map<string, TLShapeId>()
  for (const [name, c] of doc.classes) {
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
        icon: resolveIcon(c.icon || 'box'),
        color: c.color ?? 'violet',
        rows: JSON.stringify(c.members.map(m => ({ name: m.name, type: m.type, pk: false }))),
      },
    })
    idMap.set(name, id)
  }

  const arrowIds: TLShapeId[] = []
  for (const r of doc.rels) {
    const fromId = idMap.get(r.fromClass)
    const toId = idMap.get(r.toClass)
    const fb = box.get(r.fromClass)
    const tb = box.get(r.toClass)
    if (!fromId || !toId || !fb || !tb) continue

    const fromRight = fb.x + fb.w / 2 <= tb.x + tb.w / 2
    const fnx = fromRight ? 1 : 0
    const tnx = fromRight ? 0 : 1
    const fny = 0.5
    const tny = 0.5
    const start = { x: fb.x + fnx * fb.w, y: fb.y + fny * fb.h }
    const end = { x: tb.x + tnx * tb.w, y: tb.y + tny * tb.h }

    const arrowId = createShapeId()
    arrowIds.push(arrowId)

    let arrowheadEnd = 'arrow'
    let arrowheadStart = 'none'
    if (r.type === '<|--') arrowheadEnd = 'triangle'

    editor.createShape({
      id: arrowId,
      type: 'arrow',
      x: start.x,
      y: start.y,
      props: {
        start: { x: 0, y: 0 },
        end: { x: end.x - start.x, y: end.y - start.y },
        kind: 'elbow',
        color: 'black',
        size: 's',
        arrowheadStart,
        arrowheadEnd,
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

    if (r.label) {
      const labelId = createShapeId()
      arrowIds.push(labelId)
      editor.createShape({
        id: labelId,
        type: 'text',
        x: (start.x + end.x) / 2 - 20,
        y: (start.y + end.y) / 2 - 10,
        props: { richText: toRichText(r.label), size: 's', color: 'black', font: 'mono', scale: 0.75 } as never,
      })
    }
  }

  if (arrowIds.length) editor.sendToBack(arrowIds)

  editor.selectNone()
  editor.zoomToFit({ animation: { duration: 200 } })
  return doc.errors
}
