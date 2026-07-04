import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { react, type TLShapeId } from 'tldraw'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi } from '../store/useEditorUi'

type HoverState = { id: TLShapeId; x: number; y: number } | null

export function HoverActions() {
  const editor = useDocStore((s) => s.editor)
  const readOnly = useEditorUi((s) => s.readOnly)
  const [hover, setHover] = useState<HoverState>(null)

  useEffect(() => {
    if (!editor || readOnly) {
      setHover(null)
      return
    }
    return react('hover actions', () => {
      const shape = editor.getHoveredShape()
      if (!shape || shape.type === 'arrow') {
        setHover(null)
        return
      }
      if (editor.getSelectedShapeIds().includes(shape.id)) {
        setHover(null)
        return
      }
      const b = editor.getShapePageBounds(shape.id)
      if (!b || !editor.isIn('select.idle')) {
        setHover(null)
        return
      }
      const p = editor.pageToScreen({ x: b.maxX, y: b.y })
      const vsb = editor.getViewportScreenBounds()
      setHover({ id: shape.id, x: p.x - vsb.x, y: p.y - vsb.y })
    })
  }, [editor, readOnly])

  if (!editor || !hover) return null

  const act = (fn: () => void) => {
    fn()
    editor.focus()
  }

  return (
    <div
      className="pointer-events-auto absolute z-30 flex items-center gap-0.5 rounded-xl border border-line bg-surface/95 p-1 shadow-[0_12px_30px_-14px_rgba(0,0,0,.35)] backdrop-blur"
      style={{ left: hover.x + 10, top: Math.max(10, hover.y - 8), transform: 'translateY(-100%)' }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <HBtn icon="lucide:copy" label="Duplicate" onClick={() => act(() => editor.duplicateShapes([hover.id], { x: 18, y: 18 }))} />
      <HBtn icon="lucide:lock" label="Lock" onClick={() => act(() => editor.toggleLock([hover.id]))} />
      <HBtn icon="lucide:bring-to-front" label="Bring to front" onClick={() => act(() => editor.bringToFront([hover.id]))} />
      <HBtn icon="lucide:send-to-back" label="Send to back" onClick={() => act(() => editor.sendToBack([hover.id]))} />
    </div>
  )
}

function HBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink"
    >
      <Icon icon={icon} width={15} />
    </button>
  )
}
