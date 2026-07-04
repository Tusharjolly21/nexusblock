import {
  getArrowBindings,
  renderPlaintextFromRichText,
  type Editor,
  type TLArrowShape,
  type TLShape,
  type TLShapeId,
} from 'tldraw'

export type LintIssue = {
  id: string
  rule: 'orphan' | 'unlabeled' | 'dangling' | 'duplicate' | 'overlap'
  title: string
  detail: string
  shapeIds: TLShapeId[]
}

const NODE_TYPES = new Set(['arch-node', 'icon'])
const labelOf = (s: TLShape | undefined): string =>
  s ? String((s.props as { label?: unknown }).label ?? '').trim() : ''

/**
 * Diagram linter (spec #25 / P7 — "ours only"). Static analysis of the current
 * page: orphan nodes, unlabeled/dangling connectors, duplicate names, and
 * overlapping shapes. Pure + synchronous so it can run on every scene change.
 */
export function runLint(editor: Editor): LintIssue[] {
  const issues: LintIssue[] = []
  const shapes = editor.getCurrentPageShapes()
  const byId = new Map(shapes.map((s) => [s.id, s]))
  const arrows = shapes.filter((s): s is TLArrowShape => s.type === 'arrow')
  const nodes = shapes.filter((s) => NODE_TYPES.has(s.type))

  // --- connectors: connectivity, dangling ends, missing labels
  const connected = new Set<TLShapeId>()
  for (const a of arrows) {
    const b = getArrowBindings(editor, a)
    const startId = b.start?.toId
    const endId = b.end?.toId
    if (startId) connected.add(startId)
    if (endId) connected.add(endId)

    if (!startId || !endId) {
      issues.push({ id: `dangling-${a.id}`, rule: 'dangling', title: 'Dangling connector', detail: "One end isn't attached to a shape.", shapeIds: [a.id] })
    }

    const text = renderPlaintextFromRichText(editor, a.props.richText).trim()
    if (startId && endId && !text) {
      const from = labelOf(byId.get(startId)) || 'shape'
      const to = labelOf(byId.get(endId)) || 'shape'
      issues.push({ id: `unlabeled-${a.id}`, rule: 'unlabeled', title: 'Unlabeled connector', detail: `${from} → ${to}`, shapeIds: [a.id] })
    }
  }

  // --- orphan nodes
  for (const n of nodes) {
    if (!connected.has(n.id)) {
      issues.push({ id: `orphan-${n.id}`, rule: 'orphan', title: 'Orphan node', detail: `${labelOf(n) || 'This node'} isn't connected to anything.`, shapeIds: [n.id] })
    }
  }

  // --- duplicate names
  const byLabel = new Map<string, { name: string; ids: TLShapeId[] }>()
  for (const n of nodes) {
    const l = labelOf(n)
    if (!l) continue
    const entry = byLabel.get(l.toLowerCase()) ?? { name: l, ids: [] }
    entry.ids.push(n.id)
    byLabel.set(l.toLowerCase(), entry)
  }
  for (const { name, ids } of byLabel.values()) {
    if (ids.length > 1) {
      issues.push({ id: `duplicate-${name.toLowerCase()}`, rule: 'duplicate', title: 'Duplicate name', detail: `${ids.length} nodes named “${name}”.`, shapeIds: ids })
    }
  }

  // --- overlapping shapes
  const bounded = nodes
    .map((n) => ({ id: n.id, b: editor.getShapePageBounds(n.id) }))
    .filter((x): x is { id: TLShapeId; b: NonNullable<typeof x.b> } => !!x.b)
  for (let i = 0; i < bounded.length; i++) {
    for (let j = i + 1; j < bounded.length; j++) {
      const a = bounded[i].b
      const b = bounded[j].b
      const ix = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
      const iy = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
      const overlapArea = ix * iy
      const minArea = Math.min(a.width * a.height, b.width * b.height)
      if (minArea > 0 && overlapArea > minArea * 0.35) {
        issues.push({ id: `overlap-${bounded[i].id}-${bounded[j].id}`, rule: 'overlap', title: 'Overlapping shapes', detail: 'Two nodes visually overlap.', shapeIds: [bounded[i].id, bounded[j].id] })
      }
    }
  }

  return issues
}
