import { createShapeId, type Editor, type TLShapeId, type VecLike, toRichText } from 'tldraw'
import type { NexusGraphIR } from '../catalog/seedTemplates'
import { createArchNode, createGroupFrame, connectShapes } from './createNode'

export class TldrawRendererAdapter {
  private editor: Editor
  private origin: VecLike
  private templateId: string

  constructor(editor: Editor, origin: VecLike, templateId: string) {
    this.editor = editor
    this.origin = origin
    this.templateId = templateId
  }

  /** Render the template nodes, edges, groups at the origin filtered by detailLevel. */
  render(graph: NexusGraphIR, activeLevel: number = 2) {
    this.editor.markHistoryStoppingPoint('render-template-level')

    // 1. Delete all existing shapes tagged with any templateId to prevent overlaps when switching templates
    const existingShapes = this.editor.getCurrentPageShapes().filter((s) => {
      const meta = (s.meta as any) || {}
      return !!meta.templateId
    })
    if (existingShapes.length > 0) {
      this.editor.deleteShapes(existingShapes.map((s) => s.id))
    }

    // 2. Filter nodes & edges by active level (1 = Executive, 2 = Eng, 3 = Prod, 4 = Impl)
    const visibleNodes = graph.nodes.filter((n) => n.detailLevel <= activeLevel)
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))

    const visibleEdges = graph.edges.filter((e) => {
      const nodeOk = visibleNodeIds.has(e.sourceNodeId) && visibleNodeIds.has(e.targetNodeId)
      return nodeOk && e.detailLevel <= activeLevel
    })

    const idMap: Record<string, TLShapeId> = {}

    // 3. Render Groups (Frames)
    for (const g of graph.groups) {
      let mappedAccent: 'sky' | 'amber' | 'violet' | 'grey' = 'grey'
      if (g.accent === 'blue' || g.accent === 'cyan') {
        mappedAccent = 'sky'
      } else if (g.accent === 'orange' || g.accent === 'red') {
        mappedAccent = 'amber'
      } else if (g.accent === 'purple') {
        mappedAccent = 'violet'
      }

      const id = createGroupFrame(this.editor, {
        x: this.origin.x + g.x,
        y: this.origin.y + g.y,
        w: g.w,
        h: g.h,
        label: g.label,
        accent: mappedAccent,
      })
      this.editor.updateShape({
        id,
        type: 'group-frame',
        meta: { templateId: this.templateId, elementId: g.id },
      } as any)
    }

    // 4. Render Nodes
    for (const n of visibleNodes) {
      let id: TLShapeId
      const point = { x: this.origin.x + n.position.x, y: this.origin.y + n.position.y }

      if (graph.kind === 'erd') {
        id = createShapeId()
        const rowsStr = n.properties.rows || '[]'
        const rowsList = JSON.parse(rowsStr)
        const h = 42 + 8 + rowsList.length * 28
        this.editor.createShape({
          id,
          type: 'erd-entity',
          x: point.x,
          y: point.y,
          props: {
            w: 220,
            h,
            name: n.label,
            icon: n.icon || 'database',
            color: '',
            rows: rowsStr,
            fontFamily: '',
          },
        })
      } else {
        const validKinds = ['client', 'service', 'db', 'queue', 'external']
        let kind = n.semanticType
        if (!validKinds.includes(kind)) {
          if (['gateway', 'integration', 'reliability', 'notification', 'service', 'authentication', 'workflow', 'network', 'observability', 'governance'].includes(kind)) {
            kind = 'service'
          } else if (['cache', 'storage', 'db'].includes(kind)) {
            kind = 'db'
          } else {
            kind = 'service'
          }
        }
        id = createArchNode(this.editor, {
          kind: kind as any,
          label: n.label,
          tech: n.technology,
          icon: n.icon,
          point,
          w: n.size?.w,
          h: n.size?.h,
        })
      }

      // Tag metadata so we can delete/refresh them
      this.editor.updateShape({
        id,
        meta: { templateId: this.templateId, elementId: n.id },
      } as any)

      idMap[n.id] = id
    }

    // 5. Render Edges (Arrows)
    for (const e of visibleEdges) {
      const fromShapeId = idMap[e.sourceNodeId]
      const toShapeId = idMap[e.targetNodeId]
      if (!fromShapeId || !toShapeId) continue

      const arrowId = connectShapes(this.editor, fromShapeId, toShapeId)

      this.editor.updateShape({
        id: arrowId,
        type: 'arrow',
        props: {
          richText: toRichText(e.label || ''),
          dash: e.communication === 'async' ? 'dashed' : 'solid',
          arrowheadStart: e.direction === 'bidirectional' || e.direction === 'reverse' ? 'arrow' : 'none',
          arrowheadEnd: e.direction === 'bidirectional' || e.direction === 'forward' || !e.direction ? 'arrow' : 'none',
        } as any,
        meta: { templateId: this.templateId, elementId: e.id },
      } as any)
    }

    // Zoom to fit the newly rendered shapes for full responsiveness
    this.editor.zoomToFit({ animation: { duration: 250 } })
  }
}
