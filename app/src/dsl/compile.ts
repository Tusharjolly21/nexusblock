import ELK from 'elkjs/lib/elk.bundled.js'
import type { Editor, TLShapeId } from 'tldraw'
import { createArchNode, connectShapes } from '../canvas/createNode'
import { iconForTech } from '../icons/techMap'
import { parseDsl, type DslError } from './parse'

const elk = new ELK()

const NODE_W = 210
const NODE_H = 68

/**
 * Compile the DSL and (re)draw it on the canvas with an ELK layered auto-layout —
 * native, editable shapes, never an image (arch doc §5). MVP is one-way
 * (code → canvas): applying replaces the current page's shapes. Scoped
 * regeneration that preserves manual edits is a roadmap item.
 */
export async function applyDsl(editor: Editor, source: string): Promise<DslError[]> {
  const { nodes, edges, errors } = parseDsl(source)
  if (nodes.length === 0) return errors

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '48',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
    },
    children: nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
    edges: edges
      .filter((e) => nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to))
      .map((e, i) => ({ id: `e${i}`, sources: [e.from], targets: [e.to] })),
  }

  const laid = await elk.layout(graph)
  const posOf = (id: string) => {
    const c = laid.children?.find((ch) => ch.id === id)
    return { x: c?.x ?? 0, y: c?.y ?? 0 }
  }

  // Replace the current page contents with the compiled diagram.
  const existing = Array.from(editor.getCurrentPageShapeIds())
  if (existing.length) editor.deleteShapes(existing)

  const idMap = new Map<string, TLShapeId>()
  for (const n of nodes) {
    const p = posOf(n.id)
    const shapeId = createArchNode(editor, {
      kind: n.kind,
      label: n.label,
      tech: n.tech,
      icon: iconForTech(n.tech, n.label),
      point: p,
    })
    idMap.set(n.id, shapeId)
  }
  for (const e of edges) {
    const a = idMap.get(e.from)
    const b = idMap.get(e.to)
    if (a && b) connectShapes(editor, a, b)
  }

  editor.selectNone()
  editor.zoomToFit({ animation: { duration: 200 } })
  return errors
}
