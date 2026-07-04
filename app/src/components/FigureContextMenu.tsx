import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import type { TLShapeId } from 'tldraw'
import { useDocStore } from '../store/useDocStore'
import { copyFigureEmbed, createFigureAroundSelection, isFigureId } from '../canvas/figures'

type MenuState = {
  x: number
  y: number
  figureId: TLShapeId | null
  canCreate: boolean
}

export function FigureContextMenu() {
  const editor = useDocStore((s) => s.editor)
  const [menu, setMenu] = useState<MenuState | null>(null)

  useEffect(() => {
    if (!editor) return
    const container = editor.getContainer()
    const onContextMenu = (event: MouseEvent) => {
      const selected = editor.getSelectedShapeIds()
      const page = editor.screenToPage({ x: event.clientX, y: event.clientY })
      const hit = editor.getShapeAtPoint(page, { hitInside: true, margin: 6 })
      const figureId = hit && isFigureId(editor, hit.id) ? hit.id : selected.find((id) => isFigureId(editor, id)) ?? null
      const canCreate = selected.some((id) => editor.getShape(id)?.type !== 'group-frame')
      if (!figureId && !canCreate) return

      event.preventDefault()
      event.stopPropagation()
      const rect = container.getBoundingClientRect()
      setMenu({
        x: Math.min(event.clientX - rect.left, rect.width - 230),
        y: Math.min(event.clientY - rect.top, rect.height - 118),
        figureId,
        canCreate,
      })
    }

    const close = () => setMenu(null)
    container.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => {
      container.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [editor])

  if (!editor || !menu) return null

  return (
    <div
      className="pointer-events-auto absolute z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[0_20px_48px_-20px_rgba(0,0,0,.45)]"
      style={{ left: menu.x, top: menu.y }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {menu.canCreate && (
        <MenuButton
          icon="lucide:group"
          label="Create Figure"
          onClick={() => {
            editor.markHistoryStoppingPoint('create figure from selection')
            createFigureAroundSelection(editor)
            setMenu(null)
          }}
        />
      )}
      {menu.figureId && (
        <MenuButton
          icon="lucide:copy"
          label="Copy figure embed"
          onClick={async () => {
            await copyFigureEmbed(editor, menu.figureId!)
            setMenu(null)
          }}
        />
      )}
    </div>
  )
}

function MenuButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-grey-4 hover:bg-grey-1 hover:text-ink"
    >
      <Icon icon={icon} width={15} />
      {label}
    </button>
  )
}
