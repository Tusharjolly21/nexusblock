import { useEffect, useRef, useState } from 'react'
import type { VecLike } from 'tldraw'
import { useDocStore } from '../store/useDocStore'
import { boundsFromPoints, createFigureAtBounds } from '../canvas/figures'

const MIN_SIZE = 28

const isEditableTarget = (target: EventTarget | null) => {
  const node = target as HTMLElement | null
  return !!node?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor, [data-canvas-editor-block="true"]')
}

export function FigureToolLayer() {
  const editor = useDocStore((s) => s.editor)
  const active = useDocStore((s) => s.figureToolActive)
  const setActive = useDocStore((s) => s.setFigureToolActive)
  const [drag, setDrag] = useState<{ start: VecLike; current: VecLike } | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.key === 'Escape' && useDocStore.getState().figureToolActive) {
        event.preventDefault()
        setActive(false)
        setDrag(null)
        return
      }
      if (event.key.toLowerCase() !== 'f' || event.metaKey || event.ctrlKey || event.altKey) return
      const currentEditor = useDocStore.getState().editor
      if (!currentEditor || currentEditor.getEditingShapeId()) return
      event.preventDefault()
      event.stopPropagation()
      currentEditor.setCurrentTool('select')
      setActive(true)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [setActive])

  if (!editor || !active) return null

  const toLayer = (p: VecLike) => {
    const screen = editor.pageToScreen(p)
    const rect = editor.getContainer().getBoundingClientRect()
    return { x: screen.x - rect.left, y: screen.y - rect.top }
  }

  const preview = drag
    ? (() => {
        const a = toLayer(drag.start)
        const b = toLayer(drag.current)
        return {
          left: Math.min(a.x, b.x),
          top: Math.min(a.y, b.y),
          width: Math.abs(a.x - b.x),
          height: Math.abs(a.y - b.y),
        }
      })()
    : null

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[12] cursor-crosshair"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        const p = editor.screenToPage({ x: event.clientX, y: event.clientY })
        setDrag({ start: p, current: p })
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return
        event.preventDefault()
        const p = editor.screenToPage({ x: event.clientX, y: event.clientY })
        setDrag((d) => (d ? { ...d, current: p } : d))
      }}
      onPointerUp={(event) => {
        const d = dragRef.current
        if (!d) return
        event.preventDefault()
        event.stopPropagation()
        const end = editor.screenToPage({ x: event.clientX, y: event.clientY })
        const bounds = boundsFromPoints(d.start, end)
        editor.markHistoryStoppingPoint('create figure')
        if (bounds.w >= MIN_SIZE && bounds.h >= MIN_SIZE) createFigureAtBounds(editor, bounds)
        setDrag(null)
        setActive(false)
      }}
    >
      {preview && (
        <div
          className="pointer-events-none absolute rounded-[18px] border border-sky-500/80 bg-sky-500/10 shadow-[0_0_0_4px_rgba(59,130,196,.08)]"
          style={preview}
        >
          <div className="absolute left-3 top-3 rounded-md border border-sky-500/70 bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-700">
            Figure
          </div>
        </div>
      )}
    </div>
  )
}
