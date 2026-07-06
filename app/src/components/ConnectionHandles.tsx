import { useCallback, useEffect, useRef, useState } from 'react'
import { react, createShapeId, type Editor, type TLShape, type TLShapeId, GeoShapeGeoStyle } from 'tldraw'
import { useDocStore } from '../store/useDocStore'
import { CONNECTOR_STYLE, styleConnector, connectorProps } from '../canvas/createNode'
import { useEditorUi } from '../store/useEditorUi'

/** Shape types that expose hover-to-connect handles. */
const CONNECTABLE = new Set(['arch-node', 'icon', 'geo', 'note', 'device-frame', 'flow-node', 'erd-entity', 'code-block', 'group-frame', 'nb-3d-shape'])
/** Large / resizable shapes: show handles on hover only, so they don't collide
 * with tldraw's resize handles while selected. */
const HOVER_ONLY = new Set(['device-frame', 'code-block', 'group-frame'])

type Side = 'top' | 'right' | 'bottom' | 'left'
const SIDE_ANCHOR: Record<Side, { x: number; y: number }> = {
  top: { x: 0.5, y: 0 },
  right: { x: 1, y: 0.5 },
  bottom: { x: 0.5, y: 1 },
  left: { x: 0, y: 0.5 },
}
type Bounds = { id?: TLShapeId; x: number; y: number; w: number; h: number }
type Cam = { x: number; y: number; z: number }
type Guide = { orientation: 'v' | 'h'; value: number; from: number; to: number; label: string }
type DragState = {
  arrowId: TLShapeId
  sourceId: TLShapeId
  start: { x: number; y: number }
  source: Bounds
  target: Bounds | null
  targetSide: Side | null
  targetPoint: { x: number; y: number } | null
  pointer: { x: number; y: number }
}
type ActiveHandle = { bounds: Bounds; side: Side } | null

const GUIDE_COLOR = 'rgba(86, 156, 255, 0.42)'
const CONNECTOR_BLUE = 'rgba(28, 165, 255, 0.92)'
const CONNECTOR_BLUE_SOFT = 'rgba(28, 165, 255, 0.12)'
const CONNECTOR_BLUE_BORDER = 'rgba(28, 165, 255, 0.48)'

const center = (b: Bounds) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const oppositeSide = (side: Side): Side =>
  side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : side === 'left' ? 'right' : 'left'
const posFor = (b: Bounds, side: Side) => {
  switch (side) {
    case 'top':
      return { x: b.x + b.w / 2, y: b.y }
    case 'right':
      return { x: b.x + b.w, y: b.y + b.h / 2 }
    case 'bottom':
      return { x: b.x + b.w / 2, y: b.y + b.h }
    case 'left':
      return { x: b.x, y: b.y + b.h / 2 }
  }
}
const boundsOf = (editor: Editor, shape: TLShape): Bounds | null => {
  const b = editor.getShapePageBounds(shape.id)
  return b ? { id: shape.id, x: b.x, y: b.y, w: b.width, h: b.height } : null
}
const isConnectableShape = (shape: TLShape | undefined | null) =>
  !!shape && CONNECTABLE.has(shape.type) && shape.type !== 'arrow' && shape.type !== 'group'

const inInflatedBounds = (b: Bounds, p: { x: number; y: number }, margin: number) =>
  p.x >= b.x - margin && p.x <= b.x + b.w + margin && p.y >= b.y - margin && p.y <= b.y + b.h + margin

const canUseConnectHandles = (editor: Editor) =>
  !useEditorUi.getState().readOnly &&
  (editor.getCurrentToolId() === 'arrow' || editor.getCurrentToolId() === 'line')

const dragConnectorProps = (shiftKey: boolean, span = 0) =>
  shiftKey ? { kind: 'arc' as const, bend: 0 } : connectorProps(useEditorUi.getState().connectorStyle, span)

const axisLockedPoint = (start: { x: number; y: number }, point: { x: number; y: number }, side: Side) =>
  side === 'left' || side === 'right' ? { x: point.x, y: start.y } : { x: start.x, y: point.y }

const clampPointToBounds = (b: Bounds, p: { x: number; y: number }) => ({
  x: Math.max(b.x, Math.min(b.x + b.w, p.x)),
  y: Math.max(b.y, Math.min(b.y + b.h, p.y)),
})

const normalizedAnchorForPoint = (b: Bounds, p: { x: number; y: number }) => {
  const clamped = clampPointToBounds(b, p)
  return {
    x: b.w === 0 ? 0.5 : Math.max(0, Math.min(1, (clamped.x - b.x) / b.w)),
    y: b.h === 0 ? 0.5 : Math.max(0, Math.min(1, (clamped.y - b.y) / b.h)),
  }
}

const pointForAnchor = (b: Bounds, anchor: { x: number; y: number }) => ({
  x: b.x + b.w * anchor.x,
  y: b.y + b.h * anchor.y,
})

const sideForDrop = (b: Bounds, p: { x: number; y: number }): Side => {
  const nx = Math.max(0, Math.min(1, (p.x - b.x) / b.w))
  const ny = Math.max(0, Math.min(1, (p.y - b.y) / b.h))
  const d = { left: nx, right: 1 - nx, top: ny, bottom: 1 - ny }
  const min = Math.min(d.left, d.right, d.top, d.bottom)
  if (min === d.left) return 'left'
  if (min === d.right) return 'right'
  if (min === d.top) return 'top'
  return 'bottom'
}

/** Computes the closest point on the rectangular boundary of the shape. */
const closestPointOnBoundary = (b: Bounds, p: { x: number; y: number }) => {
  const cx = Math.max(b.x, Math.min(b.x + b.w, p.x))
  const cy = Math.max(b.y, Math.min(b.y + b.h, p.y))

  const dLeft = cx - b.x
  const dRight = b.x + b.w - cx
  const dTop = cy - b.y
  const dBottom = b.y + b.h - cy
  const min = Math.min(dLeft, dRight, dTop, dBottom)

  if (min === dLeft) return { x: b.x, y: cy, side: 'left' as const }
  if (min === dRight) return { x: b.x + b.w, y: cy, side: 'right' as const }
  if (min === dTop) return { x: cx, y: b.y, side: 'top' as const }
  return { x: cx, y: b.y + b.h, side: 'bottom' as const }
}

/** Checks if the pointer coordinates are within a threshold distance of any of the shape corners. */
const isNearCorner = (b: Bounds, p: { x: number; y: number }, threshold: number) => {
  const corners = [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x, y: b.y + b.h },
    { x: b.x + b.w, y: b.y + b.h },
  ]
  return corners.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < threshold)
}

/**
 * Eraser-style sliding quick connection handles. Hover or select any shape →
 * blue selection outline and single sliding dot handle. Click and drag from ANY
 * perimeter location to draw a line.
 */
export function ConnectionHandles() {
  const editor = useDocStore((s) => s.editor)
  const [hover, setHover] = useState<Bounds | null>(null)
  const [selected, setSelected] = useState<Bounds | null>(null)
  const [activeHandle, setActiveHandle] = useState<ActiveHandle>(null)
  const [canShowHandles, setCanShowHandles] = useState(false)
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, z: 1 })
  const [drag, setDrag] = useState<DragState | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [alignGuides, setAlignGuides] = useState<Guide[]>([])
  const dragRef = useRef<DragState | null>(null)
  const activeHandleRef = useRef<ActiveHandle>(null)
  const lastHandleRef = useRef<ActiveHandle>(null)
  dragRef.current = drag
  activeHandleRef.current = activeHandle

  const createBoundArrow = useCallback(
    (source: Bounds, target: Bounds, sourceSide: Side, targetSide: Side) => {
      if (!editor || !source.id || !target.id) return null
      const start = posFor(source, sourceSide)
      const end = posFor(target, targetSide)
      const arrowId = createShapeId()
      const span = Math.hypot(end.x - start.x, end.y - start.y) || 160
      const kind = connectorProps(useEditorUi.getState().connectorStyle, span).kind
      editor.createShape({
        id: arrowId,
        type: 'arrow',
        x: start.x,
        y: start.y,
        props: {
          start: { x: 0, y: 0 },
          end: { x: end.x - start.x, y: end.y - start.y },
          ...CONNECTOR_STYLE,
          kind,
        },
      })
      editor.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: source.id,
        props: { terminal: 'start', normalizedAnchor: SIDE_ANCHOR[sourceSide], isExact: false, isPrecise: true, snap: 'none' },
      })
      editor.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: target.id,
        props: { terminal: 'end', normalizedAnchor: SIDE_ANCHOR[targetSide], isExact: false, isPrecise: true, snap: 'none' },
      })
      styleConnector(editor, arrowId, useEditorUi.getState().connectorStyle, span)

      // Send arrow behind nodes but keep in front of group frames
      editor.sendToBack([arrowId])
      const groups = editor.getCurrentPageShapesSorted().filter((s) => s.type === 'group-frame').map((s) => s.id)
      if (groups.length) editor.sendToBack(groups)

      return arrowId
    },
    [editor],
  )

  const findConnectableTarget = useCallback(
    (p: { x: number; y: number }, excludeId: TLShapeId | null, margin = 18): TLShape | undefined => {
      if (!editor) return undefined
      const hit = editor.getShapeAtPoint(p, { hitInside: true, margin })
      if (hit && isConnectableShape(hit) && hit.id !== excludeId) return hit

      let best: { shape: TLShape; d: number } | null = null
      for (const shape of editor.getCurrentPageShapesSorted().slice().reverse()) {
        if (!isConnectableShape(shape) || shape.id === excludeId) continue
        const b = boundsOf(editor, shape)
        if (!b || !inInflatedBounds(b, p, margin)) continue
        const cx = Math.max(b.x, Math.min(p.x, b.x + b.w))
        const cy = Math.max(b.y, Math.min(p.y, b.y + b.h))
        const d = Math.hypot(p.x - cx, p.y - cy)
        if (!best || d < best.d) best = { shape, d }
      }
      return best?.shape
    },
    [editor],
  )

  // Camera (reactive) — reposition dots on pan/zoom.
  useEffect(() => {
    if (!editor) return
    return react('connection-cam', () => {
      const c = editor.getCamera()
      setCam({ x: c.x, y: c.y, z: c.z })
      const nextCanShow = canUseConnectHandles(editor)
      setCanShowHandles(nextCanShow)
      if (!nextCanShow && !dragRef.current) {
        setHover(null)
        setSelected(null)
        setActiveHandle(null)
      }
    })
  }, [editor])

  // Keep custom blue guide overlays disabled.
  useEffect(() => {
    setAlignGuides([])
  }, [])

  // Selected single shapes should expose the same connection outline as hover.
  useEffect(() => {
    if (!editor) return
    return react('drawdocs-selected-connectable', () => {
      if (!canUseConnectHandles(editor) || dragRef.current) {
        setSelected(null)
        return
      }
      const ids = editor.getSelectedShapeIds()
      if (ids.length !== 1) {
        setSelected(null)
        return
      }
      const shape = editor.getShape(ids[0])
      if (!isConnectableShape(shape)) {
        setSelected(null)
        return
      }
      if (shape && HOVER_ONLY.has(shape.type)) {
        setSelected(null)
        return
      }
      const b = editor.getShapePageBounds(ids[0])
      setSelected(b ? { id: ids[0], x: b.x, y: b.y, w: b.width, h: b.height } : null)
    })
  }, [editor])

  // Global mouse tracking to avoid event blocking
  useEffect(() => {
    if (!editor) return
    const onMove = (e: PointerEvent) => {
      const p = editor.screenToPage({ x: e.clientX, y: e.clientY })
      setCursorPos(p)

      if (dragRef.current || !canUseConnectHandles(editor)) {
        if (!dragRef.current) setHover(null)
        return
      }

      const hit = findConnectableTarget(p, null, 34 / Math.max(0.2, editor.getCamera().z))
      const id = hit ? hit.id : null
      if (id) {
        const b = editor.getShapePageBounds(id)
        setHover(b ? { id, x: b.x, y: b.y, w: b.width, h: b.height } : null)
      } else {
        setHover(null)
      }
    }
    const onLeave = () => {
      setCursorPos(null)
      if (!dragRef.current) setHover(null)
    }
    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [editor, findConnectableTarget])

  const toLayer = (p: { x: number; y: number }) => {
    if (!editor) return { x: 0, y: 0 }
    const screen = editor.pageToScreen(p)
    const rect = editor.getContainer().getBoundingClientRect()
    return { x: screen.x - rect.left, y: screen.y - rect.top }
  }

  const startConnect = (e: React.PointerEvent, sourceBounds: Bounds, startPt: { x: number; y: number }, side: Side) => {
    if (!editor || !sourceBounds.id) return
    e.preventDefault()
    e.stopPropagation()
    const sourceId = sourceBounds.id
    const source = sourceBounds
    const start = startPt
    const sc = center(source)
    const snapTol = 8 / (cam.z || 1)

    const anchor = {
      x: source.w === 0 ? 0.5 : Math.max(0, Math.min(1, (start.x - source.x) / source.w)),
      y: source.h === 0 ? 0.5 : Math.max(0, Math.min(1, (start.y - source.y) / source.h)),
    }

    editor.markHistoryStoppingPoint('create connector')
    const arrowId = createShapeId()
    const initialLine = dragConnectorProps(e.shiftKey)
    editor.createShape({
      id: arrowId,
      type: 'arrow',
      x: start.x,
      y: start.y,
      props: { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, ...CONNECTOR_STYLE, ...initialLine },
    })

    // Send arrow behind nodes but keep in front of group frames
    editor.sendToBack([arrowId])
    const groups = editor.getCurrentPageShapesSorted().filter((s) => s.type === 'group-frame').map((s) => s.id)
    if (groups.length) editor.sendToBack(groups)

    editor.createBinding({
      type: 'arrow',
      fromId: arrowId,
      toId: sourceId,
      props: { terminal: 'start', normalizedAnchor: anchor, isExact: false, isPrecise: true, snap: 'none' },
    })
    setDrag({ arrowId, sourceId, start, source, target: null, targetSide: null, targetPoint: null, pointer: start })

    const move = (ev: PointerEvent) => {
      const p = editor.screenToPage({ x: ev.clientX, y: ev.clientY })
      const snapped = { x: p.x, y: p.y }
      if (Math.abs(p.x - sc.x) <= snapTol) snapped.x = sc.x
      if (Math.abs(p.y - sc.y) <= snapTol) snapped.y = sc.y
      const routed = ev.shiftKey ? axisLockedPoint(start, snapped, side) : snapped
      const hovered = findConnectableTarget(p, sourceId, 24)
      editor.setHintingShapes(hovered ? [hovered.id] : [])
      const tb = hovered ? editor.getShapePageBounds(hovered.id) : null
      const target = tb ? { id: hovered!.id, x: tb.x, y: tb.y, w: tb.width, h: tb.height } : null
      const targetPoint = target ? closestPointOnBoundary(target, ev.shiftKey ? routed : p) : null
      const end = targetPoint ?? routed
      const span = Math.hypot(end.x - start.x, end.y - start.y) || 160
      editor.updateShape({
        id: arrowId,
        type: 'arrow',
        props: { end: { x: end.x - start.x, y: end.y - start.y }, ...dragConnectorProps(ev.shiftKey, span) },
      })
      setDrag((d) =>
        d
          ? {
              ...d,
              pointer: routed,
              target,
              targetSide: target ? sideForDrop(target, p) : null,
              targetPoint,
            }
          : d,
      )
    }

    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      editor.setHintingShapes([])
      const p = editor.screenToPage({ x: ev.clientX, y: ev.clientY })
      const hit = findConnectableTarget(p, sourceId, 28)
      if (hit && hit.id !== sourceId) {
        const tb = editor.getShapePageBounds(hit.id)
        const targetBounds = tb ? { id: hit.id, x: tb.x, y: tb.y, w: tb.width, h: tb.height } : null
        const routed = ev.shiftKey ? axisLockedPoint(start, p, side) : p
        const anchor = targetBounds ? normalizedAnchorForPoint(targetBounds, routed) : { x: 0.5, y: 0.5 }
        const end = targetBounds ? pointForAnchor(targetBounds, anchor) : sc
        const span = Math.hypot(end.x - start.x, end.y - start.y) || 160
        editor.updateShape({
          id: arrowId,
          type: 'arrow',
          props: { end: { x: end.x - start.x, y: end.y - start.y }, ...dragConnectorProps(ev.shiftKey, span) },
        })
        editor.createBinding({
          type: 'arrow',
          fromId: arrowId,
          toId: hit.id,
          props: { terminal: 'end', normalizedAnchor: anchor, isExact: false, isPrecise: true, snap: 'none' },
        })
        if (!ev.shiftKey) styleConnector(editor, arrowId, useEditorUi.getState().connectorStyle, span)
        editor.select(arrowId)
      } else {
        const routed = ev.shiftKey ? axisLockedPoint(start, p, side) : p
        const span = Math.hypot(routed.x - start.x, routed.y - start.y)
        if (span < 18 / Math.max(0.2, editor.getCamera().z)) {
          editor.deleteShapes([arrowId])
        } else {
          editor.updateShape({
            id: arrowId,
            type: 'arrow',
            props: { end: { x: routed.x - start.x, y: routed.y - start.y }, ...dragConnectorProps(ev.shiftKey, span) },
          })
          if (!ev.shiftKey) styleConnector(editor, arrowId, useEditorUi.getState().connectorStyle, span)
          editor.select(arrowId)
        }
      }
      setDrag(null)
      setActiveHandle(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const growConnectedShape = useCallback(
    (direction: Side, requestedSource: Bounds | null) => {
      const sourceBounds = requestedSource ?? activeHandleRef.current?.bounds ?? lastHandleRef.current?.bounds ?? hover ?? selected
      if (!editor || !sourceBounds || !sourceBounds.id) return
      const source = editor.getShape(sourceBounds.id)
      if (!isConnectableShape(source)) return

      const side = direction
      const targetSide = oppositeSide(side)
      const gap = Math.max(96, Math.min(180, Math.max(sourceBounds.w, sourceBounds.h) * 0.75))
      const offset =
        direction === 'right'
          ? { x: sourceBounds.w + gap, y: 0 }
          : direction === 'left'
            ? { x: -(sourceBounds.w + gap), y: 0 }
            : direction === 'bottom'
              ? { x: 0, y: sourceBounds.h + gap }
              : { x: 0, y: -(sourceBounds.h + gap) }

      editor.markHistoryStoppingPoint('grow connected shape')
      const before = new Set(editor.getCurrentPageShapeIds())
      editor.duplicateShapes([sourceBounds.id], offset)
      const selectedAfter = editor.getSelectedShapeIds()
      const targetId = selectedAfter.find((id) => !before.has(id)) ?? editor.getCurrentPageShapesSorted().find((shape) => !before.has(shape.id))?.id
      if (!targetId || targetId === sourceBounds.id) return

      const targetPageBounds = editor.getShapePageBounds(targetId)
      if (!targetPageBounds) return
      const targetBounds: Bounds = {
        id: targetId,
        x: targetPageBounds.x,
        y: targetPageBounds.y,
        w: targetPageBounds.width,
        h: targetPageBounds.height,
      }

      createBoundArrow(sourceBounds, targetBounds, side, targetSide)
      editor.select(targetId)
      setHover(targetBounds)
      setSelected(targetBounds)
    },
    [createBoundArrow, editor, hover, selected],
  )

  useEffect(() => {
    if (!editor) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((!e.ctrlKey && !e.metaKey) || e.altKey || e.shiftKey) return
      const direction =
        e.key === 'ArrowUp' || e.code === 'ArrowUp'
          ? 'top'
          : e.key === 'ArrowRight' || e.code === 'ArrowRight'
            ? 'right'
            : e.key === 'ArrowDown' || e.code === 'ArrowDown'
              ? 'bottom'
              : e.key === 'ArrowLeft' || e.code === 'ArrowLeft'
                ? 'left'
                : null
      if (!direction) return
      const source = activeHandleRef.current?.bounds ?? lastHandleRef.current?.bounds ?? hover ?? selected
      if (!source) return
      e.preventDefault()
      e.stopPropagation()
      growConnectedShape(direction, source)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
}, [editor, growConnectedShape, hover, selected])

  if (!editor) return null

  const activeBounds = hover || (cursorPos ? null : selected)
  const nearCorner = activeBounds && cursorPos
    ? isNearCorner(activeBounds, cursorPos, 22 / (cam.z || 1))
    : false

  const activeTool = editor.getCurrentToolId()
  const isDrawingShape = new Set(['geo', 'note', 'text', 'frame']).has(activeTool) &&
    (editor.isIn('geo.idle') || editor.isIn('note.idle') || editor.isIn('text.idle') || editor.isIn('frame.idle'))

  const slidingDot = activeBounds && cursorPos && canShowHandles && !drag && !nearCorner
    ? closestPointOnBoundary(activeBounds, cursorPos)
    : null

  const guides: React.ReactNode[] = []
  for (const guide of alignGuides) {
    if (guide.orientation === 'v') {
      const a = toLayer({ x: guide.value, y: guide.from })
      const b = toLayer({ x: guide.value, y: guide.to })
      guides.push(
        <div
          key={`align-${guide.orientation}-${guide.value}-${guide.label}`}
          className="pointer-events-none absolute"
          style={{ left: a.x, top: a.y, height: b.y - a.y, borderLeft: `1px solid ${GUIDE_COLOR}`, opacity: 1 }}
        />,
      )
    } else {
      const a = toLayer({ x: guide.from, y: guide.value })
      const b = toLayer({ x: guide.to, y: guide.value })
      guides.push(
        <div
          key={`align-${guide.orientation}-${guide.value}-${guide.label}`}
          className="pointer-events-none absolute"
          style={{ left: a.x, top: a.y, width: b.x - a.x, borderTop: `1px solid ${GUIDE_COLOR}`, opacity: 1 }}
        />,
      )
    }
  }

  const targetPreview = drag?.target
    ? (() => {
        const tl = toLayer({ x: drag.target.x, y: drag.target.y })
        const br = toLayer({ x: drag.target.x + drag.target.w, y: drag.target.y + drag.target.h })
        const targetPoint = toLayer(drag.targetPoint ?? clampPointToBounds(drag.target, drag.pointer))
        return (
          <>
            <div
              className="pointer-events-none absolute"
              style={{
                left: tl.x,
                top: tl.y,
                width: br.x - tl.x,
                height: br.y - tl.y,
                border: `1px solid ${CONNECTOR_BLUE_BORDER}`,
                background: CONNECTOR_BLUE_SOFT,
                borderRadius: 14,
                boxShadow: '0 0 0 5px rgba(28, 165, 255, 0.05)',
              }}
            />
            <div
              className="pointer-events-none absolute grid place-items-center"
              style={{
                left: targetPoint.x,
                top: targetPoint.y,
                width: 18,
                height: 18,
                transform: 'translate(-50%, -50%)',
                borderRadius: 999,
                background: CONNECTOR_BLUE,
                border: `1px solid ${CONNECTOR_BLUE_BORDER}`,
                boxShadow: '0 0 0 5px rgba(28, 165, 255, 0.14), 0 8px 24px rgba(15, 23, 42, 0.14)',
              }}
            />
          </>
        )
      })()
    : null

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {guides}
      {targetPreview}

      {/* Selected/Hovered Shape outline box (Blue selected border) */}
      {activeBounds && canShowHandles && !drag && (() => {
        const tl = toLayer({ x: activeBounds.x, y: activeBounds.y })
        const br = toLayer({ x: activeBounds.x + activeBounds.w, y: activeBounds.y + activeBounds.h })
        return (
          <div
            className="pointer-events-none absolute"
            style={{
              left: tl.x - 2,
              top: tl.y - 2,
              width: br.x - tl.x + 4,
              height: br.y - tl.y + 4,
              border: `2px solid ${CONNECTOR_BLUE}`,
              borderRadius: 14,
              boxShadow: `0 0 0 3px rgba(28, 165, 255, 0.15)`,
            }}
          />
        )
      })()}

      {/* Boundary dragging zone (hollow SVG outline) */}
      {activeBounds && canShowHandles && !drag && (() => {
        const tl = toLayer({ x: activeBounds.x, y: activeBounds.y })
        const br = toLayer({ x: activeBounds.x + activeBounds.w, y: activeBounds.y + activeBounds.h })
        const w = br.x - tl.x
        const h = br.y - tl.y
        return (
          <svg
            style={{
              position: 'absolute',
              left: tl.x - 12,
              top: tl.y - 12,
              width: w + 24,
              height: h + 24,
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 25,
            }}
          >
            <rect
              x={12}
              y={12}
              width={w}
              height={h}
              rx={12}
              ry={12}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              style={{
                pointerEvents: nearCorner ? 'none' : 'stroke',
                cursor: nearCorner ? 'default' : 'crosshair',
              }}
              onPointerDown={(e) => {
                if (nearCorner) return
                const p = editor.screenToPage({ x: e.clientX, y: e.clientY })
                const bp = closestPointOnBoundary(activeBounds, p)
                startConnect(e, activeBounds, { x: bp.x, y: bp.y }, bp.side)
              }}
            />
          </svg>
        )
      })()}

      {/* Sliding Blue Handle Dot (tracks cursor along boundary) */}
      {slidingDot && activeBounds && (() => {
        const s = toLayer({ x: slidingDot.x, y: slidingDot.y })
        const size = 12
        return (
          <div
            onPointerDown={(e) => startConnect(e, activeBounds, { x: slidingDot.x, y: slidingDot.y }, slidingDot.side)}
            className="absolute grid place-items-center cursor-crosshair hover:scale-125 transition-transform"
            style={{
              left: s.x,
              top: s.y,
              width: size,
              height: size,
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              background: CONNECTOR_BLUE,
              border: `2.5px solid var(--color-surface)`,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.35)',
              pointerEvents: 'all',
              zIndex: 30,
            }}
          />
        )
      })()}

      {/* Shadow shape preview overlay centered on cursor before clicking/dragging */}
      {isDrawingShape && cursorPos && (() => {
        const cp = toLayer(cursorPos)
        const z = cam.z || 1
        const w = 120 * z
        const h = 100 * z
        const x = cp.x
        const y = cp.y

        let currentGeo = 'rectangle'
        try {
          currentGeo = editor.getStyleForNextShape(GeoShapeGeoStyle) || 'rectangle'
        } catch {}

        const stroke = 'rgba(28, 165, 255, 0.55)'
        const fill = 'rgba(28, 165, 255, 0.05)'
        const strokeDasharray = '5 5'

        return (
          <svg
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: h,
              pointerEvents: 'none',
              overflow: 'visible',
              zIndex: 5,
            }}
          >
            {activeTool === 'geo' && currentGeo === 'ellipse' ? (
              <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={strokeDasharray} />
            ) : activeTool === 'geo' && currentGeo === 'triangle' ? (
              <polygon points={`${w / 2},0 0,${h} ${w},${h}`} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={strokeDasharray} />
            ) : activeTool === 'geo' && currentGeo === 'diamond' ? (
              <polygon points={`${w / 2},0 0,${h / 2} ${w / 2},${h} ${w},${h / 2}`} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={strokeDasharray} />
            ) : (
              <rect x={0} y={0} width={w} height={h} rx={activeTool === 'note' ? 4 : 8} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={strokeDasharray} />
            )}
          </svg>
        )
      })()}
    </div>
  )
}
