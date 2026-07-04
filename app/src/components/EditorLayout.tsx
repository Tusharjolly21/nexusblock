import { useRef } from 'react'
import { EditorShell } from './EditorShell'
import { DocView } from './DocView'
import { RightInspector } from './RightInspector'
import { RightDslPanel } from './RightDslPanel'
import { useEditorUi } from '../store/useEditorUi'

/**
 * The editor body, switching between three eraser-style surfaces:
 *   canvas → drawing surface (+ optional inspector)
 *   split  → canvas | draggable divider | document
 *   doc    → full-page document
 * Panes are keyed by fileId (passed via key from the parent) so they remount
 * per file.
 */
export function EditorLayout() {
  const viewMode = useEditorUi((s) => s.viewMode)
  const splitDocPct = useEditorUi((s) => s.splitDocPct)
  const setSplitDocPct = useEditorUi((s) => s.setSplitDocPct)
  const inspectorOpen = useEditorUi((s) => s.inspectorOpen)
  const dslOpen = useEditorUi((s) => s.dslOpen)
  const focusMode = useEditorUi((s) => s.focusMode)
  const rowRef = useRef<HTMLDivElement>(null)

  if (focusMode) {
    return (
      <div className="flex min-h-0 flex-1">
        <EditorShell />
      </div>
    )
  }

  if (viewMode === 'doc') {
    return (
      <div className="min-h-0 flex-1">
        <DocView full />
      </div>
    )
  }

  if (viewMode === 'split') {
    const startDrag = (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      const onMove = (ev: PointerEvent) => {
        const row = rowRef.current
        if (!row) return
        const r = row.getBoundingClientRect()
        setSplitDocPct(((r.right - ev.clientX) / r.width) * 100)
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }

    return (
      <div ref={rowRef} className="flex min-h-0 flex-1">
        <EditorShell />
        <div
          onPointerDown={startDrag}
          className="group relative w-1.5 flex-none cursor-ew-resize bg-line"
          title="Drag to resize"
        >
          <span className="absolute inset-y-0 -left-1 -right-1 transition-colors group-hover:bg-ink/10" />
        </div>
        <div className="min-w-0 flex-none" style={{ width: `${splitDocPct}%` }}>
          <DocView />
        </div>
        {dslOpen && <RightDslPanel />}
      </div>
    )
  }

  // canvas
  return (
    <div className="flex min-h-0 flex-1">
      <EditorShell />
      {dslOpen && <RightDslPanel />}
      {inspectorOpen && <RightInspector />}
    </div>
  )
}
