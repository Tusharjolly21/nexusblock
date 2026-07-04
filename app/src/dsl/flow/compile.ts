import ELK from 'elkjs/lib/elk.bundled.js'
import { createShapeId, toRichText, type Editor, type TLShapeId } from 'tldraw'
import { createGroupFrame } from '../../canvas/createNode'
import { parseFlow, type FlowDoc, type FlowError } from './parse'
import { resolveIcon, type FlowShape, type FlowConnector } from './lib'

const elk = new ELK()

const DIR: Record<string, string> = { down: 'DOWN', up: 'UP', left: 'LEFT', right: 'RIGHT' }

/** Node size from label + shape. A high min-width keeps boxes visually even. */
function sizeFor(label: string, shape: FlowShape) {
  const w = Math.min(270, Math.max(170, label.length * 8.8 + 54))
  if (shape === 'diamond') return { w: Math.max(172, w), h: 116 }
  if (shape === 'ellipse' || shape === 'cylinder') return { w, h: 104 }
  if (shape === 'oval') return { w, h: 74 }
  return { w, h: 86 }
}

const ARROW: Record<FlowConnector, { start: 'none' | 'arrow'; end: 'none' | 'arrow'; dash: 'solid' | 'dotted' }> = {
  '>': { start: 'none', end: 'arrow', dash: 'solid' },
  '<': { start: 'arrow', end: 'none', dash: 'solid' },
  '<>': { start: 'arrow', end: 'arrow', dash: 'solid' },
  '-': { start: 'none', end: 'none', dash: 'solid' },
  '--': { start: 'none', end: 'none', dash: 'dotted' },
  '-->': { start: 'none', end: 'arrow', dash: 'dotted' },
}

const TLDRAW_COLORS = ['black', 'grey', 'blue', 'green', 'red', 'orange', 'yellow', 'violet', 'light-blue', 'light-green', 'light-red', 'light-violet'] as const
type TldrawColor = (typeof TLDRAW_COLORS)[number]
const TLDRAW_COLOR_SET = new Set<string>(TLDRAW_COLORS)
const arrowColor = (raw?: string): TldrawColor => {
  const color = raw?.toLowerCase()
  return color && TLDRAW_COLOR_SET.has(color) ? (color as TldrawColor) : 'black'
}

type ElkNode = { id: string; width?: number; height?: number; children?: ElkNode[]; layoutOptions?: Record<string, string>; x?: number; y?: number }

/**
 * Compile the flowchart DSL and draw it: flow-node shapes (with shape/icon/color),
 * nested group frames, and labelled connectors, laid out by ELK in the requested
 * direction. Replaces the current page (one-way, like the arch DSL).
 */
export async function applyFlow(editor: Editor, source: string): Promise<FlowError[]> {
  const doc = parseFlow(source)
  if (doc.nodes.size === 0) return doc.errors

  const isGroup = (name: string) => doc.groups.has(name)

  const buildChildren = (names: string[]): ElkNode[] =>
    names.map((name) => {
      if (isGroup(name)) {
        const g = doc.groups.get(name)!
        return {
          id: name,
          children: buildChildren(g.children),
          layoutOptions: {
            'elk.padding': '[top=58.0,left=34.0,bottom=34.0,right=34.0]',
            'elk.spacing.nodeNode': '72',
            'elk.layered.spacing.nodeNodeBetweenLayers': '96',
          },
        }
      }
      const n = doc.nodes.get(name)!
      const { w, h } = sizeFor(n.label, n.shape)
      return { id: name, width: w, height: h }
    })

  // Top-level = nodes without a group + groups without a parent, in declared order.
  const topLevel = doc.order.filter((name) =>
    isGroup(name) ? !doc.groups.get(name)!.parent : !doc.nodes.get(name)!.group,
  )

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': DIR[doc.direction] ?? 'DOWN',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      // Keep branch order stable (Yes before No, etc.) and chains centered.
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.spacing.nodeNode': '96',
      'elk.layered.spacing.nodeNodeBetweenLayers': '128',
      'elk.layered.spacing.edgeNodeBetweenLayers': '52',
      'elk.spacing.edgeNode': '42',
    },
    children: buildChildren(topLevel),
  }
  ;(graph as unknown as { edges: unknown[] }).edges = doc.edges.map((e, i) => ({
    id: `e${i}`,
    sources: [e.from],
    targets: [e.to],
  }))

  const laid = (await elk.layout(graph as never)) as unknown as ElkNode

  // Flatten to absolute coordinates.
  const box = new Map<string, { x: number; y: number; w: number; h: number }>()
  const collect = (node: ElkNode, ox: number, oy: number) => {
    for (const child of node.children ?? []) {
      const ax = ox + (child.x ?? 0)
      const ay = oy + (child.y ?? 0)
      box.set(child.id, { x: ax, y: ay, w: child.width ?? 140, h: child.height ?? 84 })
      if (child.children) collect(child, ax, ay)
    }
  }
  collect(laid, 0, 0)

  // Replace the page.
  const existing = Array.from(editor.getCurrentPageShapeIds())
  if (existing.length) editor.deleteShapes(existing)

  // Group frames first (outer → inner) so they sit behind nodes.
  const depthOf = (name: string): number => {
    let d = 0
    let p = doc.groups.get(name)?.parent
    while (p) { d++; p = doc.groups.get(p)?.parent }
    return d
  }
  const groupNames = [...doc.groups.keys()].filter((n) => box.has(n)).sort((a, b) => depthOf(a) - depthOf(b))
  for (const name of groupNames) {
    const g = doc.groups.get(name)!
    const b = box.get(name)!
    createGroupFrame(editor, { x: b.x, y: b.y, w: b.w, h: b.h, label: g.label, accent: 'grey', tint: g.color ?? '' })
  }

  // Nodes.
  const idMap = new Map<string, TLShapeId>()
  for (const [name, n] of doc.nodes) {
    const b = box.get(name)
    if (!b) continue
    const id = createShapeId()
    editor.createShape({
      id,
      type: 'flow-node',
      x: b.x,
      y: b.y,
      props: { w: b.w, h: b.h, shape: n.shape, label: n.label, icon: resolveIcon(n.icon), color: n.color ?? '' },
    })
    idMap.set(name, id)
  }

  // Connectors.
  for (const e of doc.edges) {
    const from = idMap.get(e.from)
    const to = idMap.get(e.to)
    if (!from || !to) continue
    const a = box.get(e.from)!
    const b = box.get(e.to)!
    const start = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
    const end = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    const spec = ARROW[e.connector]
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
        color: arrowColor(e.color),
        size: 's',
        dash: spec.dash,
        arrowheadStart: spec.start,
        arrowheadEnd: spec.end,
        ...(e.label ? { richText: toRichText(e.label) } : {}),
      } as never,
    })
    const bind = (terminal: 'start' | 'end', toShape: TLShapeId) =>
      editor.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: toShape,
        props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false, snap: 'none' },
      })
    bind('start', from)
    bind('end', to)
  }

  editor.selectNone()
  editor.zoomToFit({ animation: { duration: 200 } })
  return doc.errors
}

export type { FlowDoc }
