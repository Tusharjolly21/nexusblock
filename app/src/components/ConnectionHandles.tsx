import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { react, createShapeId, type Editor, type TLShape, type TLShapeId } from 'tldraw'
import { useDocStore } from '../store/useDocStore'
import { CONNECTOR_STYLE, styleConnector, connectorProps } from '../canvas/createNode'
import { useEditorUi } from '../store/useEditorUi'

/** Shape types that expose hover-to-connect handles. `geo` = every geometric
 * shape (rectangle, ellipse, diamond, triangle, hexagon, star, …). */
const CONNECTABLE = new Set(['arch-node', 'icon', 'geo', 'note', 'device-frame', 'flow-node', 'erd-entity', 'code-block'])
/** Large / resizable shapes: show handles on hover only, so they don't collide
 * with tldraw's resize handles while selected. */
const HOVER_ONLY = new Set(['device-frame', 'code-block'])

type Side = 'top' | 'right' | 'bottom' | 'left'
const SIDES: Side[] = ['top', 'right', 'bottom', 'left']
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
const handlePosFor = (b: Bounds, side: Side, offset: number) => {
  const p = posFor(b, side)
  switch (side) {
    case 'top':
      return { x: p.x, y: p.y - offset }
    case 'right':
      return { x: p.x + offset, y: p.y }
    case 'bottom':
      return { x: p.x, y: p.y + offset }
    case 'left':
      return { x: p.x - offset, y: p.y }
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

const canUseConnectHandles = (editor: Editor) => !useEditorUi.getState().readOnly && editor.getCurrentToolId() === 'select' && editor.isIn('select.idle')

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

/**
 * Eraser-style hover-to-connect (screen-space overlay). Hover any connectable
 * shape → 4 edge dots; drag from a dot → an arrow that exits that side and routes
 * neatly to the side you drop on; a dashed guide + snap appears when aligned.
 */
export function ConnectionHandles() {
  const editor = useDocStore((s) => s.editor)
  const [hover, setHover] = useState<Bounds | null>(null)
  const [selected, setSelected] = useState<Bounds | null>(null)
  const [activeHandle, setActiveHandle] = useState<ActiveHandle>(null)
  const [canShowHandles, setCanShowHandles] = useState(false)
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, z: 1 })
  const [drag, setDrag] = useState<DragState | null>(null)
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

  // Keep custom blue guide overlays disabled; native shape movement remains clean
  // without drawing long rails across the canvas.
  useEffect(() => {
    setAlignGuides([])
  }, [])

  // Selected single shapes should expose the same connection affordance as hover.
  // This makes the "I selected this, now connect it" flow feel deliberate.
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

  // Hover via getShapeAtPoint(hitInside) so unfilled geo shapes count everywhere.
  useEffect(() => {
    if (!editor) return
    const el = editor.getContainer()
    let lastId: TLShapeId | null = null
    const update = (clientX: number, clientY: number) => {
      if (dragRef.current || !canUseConnectHandles(editor)) {
        if (!dragRef.current) setHover(null)
        return
      }
      const p = editor.screenToPage({ x: clientX, y: clientY })
      // Margin keeps the shape "hovered" as the cursor reaches its edge dots,
      // so they don't flicker away right when you try to grab one.
      const hit = findConnectableTarget(p, null, 34 / Math.max(0.2, editor.getCamera().z))
      const id = hit ? hit.id : null
      if (id === lastId) return
      lastId = id
      if (id) {
        const b = editor.getShapePageBounds(id)
        setHover(b ? { id, x: b.x, y: b.y, w: b.width, h: b.height } : null)
      } else if (!activeHandleRef.current) setHover(null)
    }
    const onMove = (e: PointerEvent) => update(e.clientX, e.clientY)
    const onLeave = () => {
      if (dragRef.current) return
      lastId = null
      if (!activeHandleRef.current) setHover(null)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [editor, findConnectableTarget])

  const toLayer = (p: { x: number; y: number }) => {
    if (!editor) return { x: 0, y: 0 }
    const screen = editor.pageToScreen(p)
    const rect = editor.getContainer().getBoundingClientRect()
    return { x: screen.x - rect.left, y: screen.y - rect.top }
  }

  const startConnect = (e: React.PointerEvent, side: Side, sourceBounds: Bounds) => {
    if (!editor || !sourceBounds.id) return
    e.preventDefault()
    e.stopPropagation()
    const sourceId = sourceBounds.id
    const source = sourceBounds
    const start = posFor(source, side)
    const sc = center(source)
    const snapTol = 8 / (cam.z || 1)

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
    // Bind the start to the exact side the user grabbed (so it exits that side).
    editor.createBinding({
      type: 'arrow',
      fromId: arrowId,
      toId: sourceId,
      props: { terminal: 'start', normalizedAnchor: SIDE_ANCHOR[side], isExact: false, isPrecise: true, snap: 'none' },
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
      const targetPoint = target ? clampPointToBounds(target, ev.shiftKey ? routed : p) : null
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
        // Dropped on empty canvas: keep a real free-ended connector. Only
        // cancel tiny accidental drags that end back on the source handle.
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

  // Which shapes get dots: while dragging, keep the source side affordances quiet
  // and draw the drop target separately as a ghost/plus preview.
  const dotSets: { bounds: Bounds; interactive: boolean; opacity: number }[] = []
  if (drag) {
    dotSets.push({ bounds: drag.source, interactive: false, opacity: 0.24 })
  } else if (canShowHandles && (hover ?? selected)) {
    dotSets.push({ bounds: hover ?? selected!, interactive: true, opacity: 1 })
  }

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
      {dotSets.map((set, i) =>
        SIDES.map((side) => {
          const z = Math.max(0.2, cam.z || 1)
          const size = set.interactive ? 22 : 10
          const dotRadius = size / 2
          // Keep a clear gap between the shape edge and the handle so the "+"
          // never crowds the shape's border or a full-bleed icon inside it.
          // Smaller shapes get proportionally more room, so the four handles
          // stay legible and separated instead of colliding with the content.
          const minSideScreen = Math.min(set.bounds.w, set.bounds.h) * z
          const baseGap = set.interactive ? 12 : 6
          const smallBoost = set.interactive ? Math.max(0, (72 - minSideScreen) * 0.16) : 0
          const offset = (dotRadius + baseGap + smallBoost) / z
          const s = toLayer(handlePosFor(set.bounds, side, offset))
          return (
            <div
              key={`${i}-${side}`}
              onPointerEnter={
                set.interactive
                  ? () => {
                      setActiveHandle({ bounds: set.bounds, side })
                      lastHandleRef.current = { bounds: set.bounds, side }
                      setHover(set.bounds)
                    }
                  : undefined
              }
              onPointerLeave={set.interactive ? () => setActiveHandle(null) : undefined}
              onPointerDown={set.interactive ? (e) => startConnect(e, side, set.bounds) : undefined}
              className="group grid place-items-center"
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                width: size,
                height: size,
                opacity: set.opacity,
                transform: 'translate(-50%, -50%)',
                borderRadius: 999,
                color: CONNECTOR_BLUE,
                background: set.interactive ? 'var(--color-surface)' : CONNECTOR_BLUE,
                border: set.interactive ? `1px solid ${CONNECTOR_BLUE_BORDER}` : '0',
                boxShadow: set.interactive ? '0 5px 16px rgba(15, 23, 42, 0.10)' : 'none',
                cursor: set.interactive ? 'crosshair' : 'default',
                pointerEvents: set.interactive ? 'all' : 'none',
                transition: 'opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease',
              }}
            >
              {set.interactive ? (
                <>
                  <Icon icon="lucide:plus" width={12} height={12} />
                  <span className="pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 z-30 w-max -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left text-[11px] font-medium leading-tight text-ink opacity-0 shadow-[0_16px_34px_-20px_rgba(0,0,0,.45)] transition-opacity duration-150 group-hover:opacity-100">
                    <span className="block whitespace-nowrap">Drag to connect</span>
                    <span className="block whitespace-nowrap font-mono text-[10px] text-grey-3">Cmd/Ctrl + Arrow duplicates</span>
                  </span>
                </>
              ) : null}
            </div>
          )
        }),
      )}
    </div>
  )
}
