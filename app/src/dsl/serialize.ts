import {
  getArrowBindings,
  renderPlaintextFromRichText,
  type Editor,
  type TLArrowShape,
  type TLShape,
  type TLShapeId,
} from 'tldraw'
import type { FlowConnector, FlowShape } from './flow/lib'
import { FLOW_SHAPES } from './flow/lib'
import type { ErdRow } from '../shapes/ErdEntityShape'

type SerializableNode = {
  id: TLShapeId
  name: string
  shape: FlowShape
  icon: string
  color: string
  groupId?: TLShapeId
}

type SerializableGroup = {
  id: TLShapeId
  name: string
  color: string
}

const SIMPLE_NAME = /^[a-zA-Z][a-zA-Z0-9 _/+.-]*$/

function quoted(value: string) {
  const clean = value.trim() || 'Untitled'
  const escaped = clean.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return SIMPLE_NAME.test(clean) ? `"${escaped}"` : `"${escaped}"`
}

function sortedPageShapes(editor: Editor) {
  return [...editor.getCurrentPageShapes()].sort((a, b) => {
    const ay = editor.getShapePageBounds(a)?.y ?? a.y
    const by = editor.getShapePageBounds(b)?.y ?? b.y
    if (Math.abs(ay - by) > 12) return ay - by
    const ax = editor.getShapePageBounds(a)?.x ?? a.x
    const bx = editor.getShapePageBounds(b)?.x ?? b.x
    return ax - bx
  })
}

function archColor(kind: string) {
  if (kind === 'client') return 'blue'
  if (kind === 'db') return 'green'
  if (kind === 'queue') return 'pink'
  if (kind === 'external') return 'slate'
  return 'purple'
}

function tintColor(raw: unknown, accent: unknown) {
  const tint = String(raw || '').trim()
  if (tint) return tint
  if (accent === 'sky') return 'blue'
  if (accent === 'violet') return 'purple'
  if (accent === 'amber') return 'orange'
  return 'slate'
}

function toFlowNode(shape: TLShape, index: number): SerializableNode | null {
  const props = shape.props as Record<string, unknown>
  if (shape.type === 'flow-node') {
    const rawShape = String(props.shape || 'rectangle')
    return {
      id: shape.id,
      name: String(props.label || `Node ${index + 1}`),
      shape: (FLOW_SHAPES as readonly string[]).includes(rawShape) ? (rawShape as FlowShape) : 'rectangle',
      icon: String(props.icon || ''),
      color: String(props.color || ''),
    }
  }
  if (shape.type === 'arch-node') {
    return {
      id: shape.id,
      name: String(props.label || `Service ${index + 1}`),
      shape: (props.kind === 'db' || props.kind === 'queue') ? 'cylinder' : 'rectangle',
      icon: String(props.icon || ''),
      color: archColor(String(props.kind || 'service')),
    }
  }
  return null
}

function arrowLabel(editor: Editor, arrow: TLArrowShape) {
  const richText = arrow.props.richText
  if (!richText) return ''
  return renderPlaintextFromRichText(editor, richText).trim()
}

function flowConnector(arrow: TLArrowShape): FlowConnector {
  const start = arrow.props.arrowheadStart
  const end = arrow.props.arrowheadEnd
  const dash = arrow.props.dash
  if (start !== 'none' && end !== 'none') return '<>'
  if (start !== 'none') return '<'
  if (end === 'none') return dash === 'dashed' ? '--' : '-'
  return dash === 'dashed' || dash === 'dotted' ? '-->' : '>'
}

export function serializeFlowFromCanvas(editor: Editor) {
  const shapes = sortedPageShapes(editor)
  const groups: SerializableGroup[] = shapes
    .filter((shape) => shape.type === 'group-frame')
    .map((shape, index) => {
      const props = shape.props as unknown as Record<string, unknown>
      return {
        id: shape.id,
        name: String(props.label || `Group ${index + 1}`),
        color: tintColor(props.tint, props.accent),
      }
    })
  const nodes = shapes.map(toFlowNode).filter(Boolean) as SerializableNode[]
  const names = new Map<TLShapeId, string>()
  const used = new Map<string, number>()
  const groupNames = new Map<TLShapeId, string>()
  const groupUsed = new Map<string, number>()

  for (const group of groups) {
    const count = groupUsed.get(group.name) ?? 0
    groupUsed.set(group.name, count + 1)
    groupNames.set(group.id, count === 0 ? group.name : `${group.name} ${count + 1}`)
  }

  for (const node of nodes) {
    const nodeBounds = editor.getShapePageBounds(node.id)
    if (nodeBounds) {
      const center = nodeBounds.center
      const parent = groups.find((group) => {
        const bounds = editor.getShapePageBounds(group.id)
        return bounds ? bounds.containsPoint(center) : false
      })
      if (parent) node.groupId = parent.id
    }
    const count = used.get(node.name) ?? 0
    used.set(node.name, count + 1)
    names.set(node.id, count === 0 ? node.name : `${node.name} ${count + 1}`)
  }

  const lines: string[] = [
    '// Generated from the canvas. Edit code here, or change the canvas and Pull canvas again.',
    'direction right',
    '',
  ]

  const nodeLine = (node: SerializableNode) => {
    const name = names.get(node.id) ?? node.name
    const props = [
      node.shape !== 'rectangle' ? `shape: ${node.shape}` : '',
      node.icon ? `icon: ${node.icon}` : '',
      node.color ? `color: ${node.color}` : '',
    ].filter(Boolean)
    return `${quoted(name)}${props.length ? ` [${props.join(', ')}]` : ''}`
  }

  const grouped = new Set<TLShapeId>()
  for (const group of groups) {
    const children = nodes.filter((node) => node.groupId === group.id)
    if (!children.length) continue
    const groupName = groupNames.get(group.id) ?? group.name
    lines.push(`${quoted(groupName)} [color: ${group.color}] {`)
    for (const child of children) {
      grouped.add(child.id)
      lines.push(`  ${nodeLine(child)}`)
    }
    lines.push('}', '')
  }

  for (const node of nodes) {
    if (!grouped.has(node.id)) lines.push(nodeLine(node))
  }

  const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
  const edgeLines: string[] = []
  for (const arrow of arrows) {
    const bindings = getArrowBindings(editor, arrow)
    const from = bindings.start?.toId ? names.get(bindings.start.toId) : undefined
    const to = bindings.end?.toId ? names.get(bindings.end.toId) : undefined
    if (!from || !to) continue
    const label = arrowLabel(editor, arrow)
    edgeLines.push(`${quoted(from)} ${flowConnector(arrow)} ${quoted(to)}${label ? `: ${label}` : ''}`)
  }

  if (edgeLines.length) lines.push('', ...edgeLines)
  if (!nodes.length) lines.push('// Select a catalog flow/architecture template or create diagram nodes, then Pull canvas.')
  return `${lines.join('\n')}\n`
}

function parseRows(json: string): ErdRow[] {
  try {
    const value = JSON.parse(json)
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function erdConnector(arrow: TLArrowShape) {
  const start = arrow.props.arrowheadStart
  const end = arrow.props.arrowheadEnd
  if (start !== 'none' && end !== 'none') return '<>'
  if (start !== 'none') return '<'
  if (end !== 'none') return '>'
  return '-'
}

export function serializeErdFromCanvas(editor: Editor) {
  const shapes = sortedPageShapes(editor)
  const entities = shapes.filter((shape) => shape.type === 'erd-entity')
  const names = new Map<TLShapeId, string>()
  const lines: string[] = ['// Generated from canvas ERD tables. Edit fields here or update tables in the inspector.', '']

  for (const entity of entities) {
    const props = entity.props as Record<string, unknown>
    const name = String(props.name || 'Entity')
    names.set(entity.id, name)
    const icon = String(props.icon || '')
    const color = String(props.color || '')
    const meta = [icon ? `icon: ${icon}` : '', color ? `color: ${color}` : ''].filter(Boolean)
    lines.push(`${quoted(name)}${meta.length ? ` [${meta.join(', ')}]` : ''} {`)
    for (const row of parseRows(String(props.rows || '[]'))) {
      lines.push(`  ${row.name}${row.type ? ` ${row.type}` : ''}${row.pk ? ' pk' : ''}`)
    }
    lines.push('}', '')
  }

  const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
  for (const arrow of arrows) {
    const bindings = getArrowBindings(editor, arrow)
    const from = bindings.start?.toId ? names.get(bindings.start.toId) : undefined
    const to = bindings.end?.toId ? names.get(bindings.end.toId) : undefined
    if (!from || !to) continue
    lines.push(`${quoted(from)} ${erdConnector(arrow)} ${quoted(to)}`)
  }

  if (!entities.length) lines.push('// No ERD tables found yet. Insert an ERD/catalog data diagram, customize it, then Pull canvas.')
  return `${lines.join('\n')}\n`
}
