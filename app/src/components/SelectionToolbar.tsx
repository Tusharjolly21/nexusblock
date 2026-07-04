import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { react } from 'tldraw'
import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'
import { useClickOutside } from '../hooks/useClickOutside'
import { StylePopover } from './StylePopover'

type Sel = { x: number; y: number; w: number; h: number; count: number; hasGroup: boolean; canCrop: boolean; linkedHeading: string }
type Menu = null | 'style' | 'align'

const ALIGNS = [
  { op: 'left', icon: 'lucide:align-start-vertical', kind: 'align' },
  { op: 'center-horizontal', icon: 'lucide:align-center-vertical', kind: 'align' },
  { op: 'right', icon: 'lucide:align-end-vertical', kind: 'align' },
  { op: 'top', icon: 'lucide:align-start-horizontal', kind: 'align' },
  { op: 'center-vertical', icon: 'lucide:align-center-horizontal', kind: 'align' },
  { op: 'bottom', icon: 'lucide:align-end-horizontal', kind: 'align' },
  { op: 'horizontal', icon: 'lucide:align-horizontal-space-around', kind: 'dist' },
  { op: 'vertical', icon: 'lucide:align-vertical-space-around', kind: 'dist' },
] as const

/**
 * Figma/eraser-style contextual toolbar that floats above the current selection.
 * Surfaces the useful tldraw actions we hid with the default chrome: style,
 * duplicate, reorder, group, lock, align/distribute, delete.
 */
export function SelectionToolbar() {
  const editor = useDocStore((s) => s.editor)
  const [sel, setSel] = useState<Sel | null>(null)
  const [menu, setMenu] = useState<Menu>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => setMenu(null), menu !== null)

  // Measure the rendered box (toolbar + any open submenu) so we can keep it on-screen.
  useLayoutEffect(() => {
    const el = ref.current
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight })
  }, [sel, menu])

  useEffect(() => {
    if (!editor) return
    return react('selection toolbar', () => {
      const ids = editor.getSelectedShapeIds()
      // Only when the select tool is idle (not while dragging/resizing/drawing/editing).
      if (ids.length === 0 || !editor.isIn('select.idle')) {
        setSel(null)
        return
      }
      const b = editor.getSelectionRotatedScreenBounds()
      if (!b) {
        setSel(null)
        return
      }
      // getSelectionRotatedScreenBounds is window-relative (adds screenBounds);
      // subtract the viewport origin so it's relative to our overlay container.
      const vsb = editor.getViewportScreenBounds()
      const selectedShapes = editor.getSelectedShapes()
      const hasGroup = selectedShapes.some((s) => editor.isShapeOfType(s, 'group'))
      const onlyShape = selectedShapes.length === 1 ? selectedShapes[0] : null
      const canCrop = !!onlyShape && editor.canCropShape(onlyShape)
      const linkedHeading =
        onlyShape && onlyShape.type === 'group-frame'
          ? String((onlyShape.meta as Record<string, unknown>)?.headingBlockId || '')
          : ''
      setSel({ x: b.x - vsb.x, y: b.y - vsb.y, w: b.width, h: b.height, count: ids.length, hasGroup, canCrop, linkedHeading })
    })
  }, [editor])

  // Close any open menu when the selection changes out from under it.
  useEffect(() => {
    if (!sel) setMenu(null)
  }, [sel])

  if (!editor || !sel) return null

  const ids = () => editor.getSelectedShapeIds()
  const act = (fn: () => void) => { fn(); editor.focus() }

  const multi = sel.count >= 2

  // Clamp within the canvas viewport so the palette + submenu never leave the screen.
  const vp = editor.getViewportScreenBounds()
  const M = 8
  const GAP = 10
  const w = size.w || 300
  const h = size.h || 44
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)))
  const left = clamp(sel.x + sel.w / 2 - w / 2, M, vp.width - w - M)
  // Prefer above the selection; flip below if there isn't room, then clamp.
  const roomAbove = sel.y - GAP - h >= M
  const above = roomAbove
  const top = clamp(above ? sel.y - GAP - h : sel.y + sel.h + GAP, M, vp.height - h - M)

  return (
    <div
      ref={ref}
      className={'pointer-events-auto absolute z-30 flex items-center gap-2 ' + (above ? 'flex-col-reverse' : 'flex-col')}
      style={{ left, top }}
    >
      <div className="flex items-center gap-0.5 rounded-xl border border-line bg-surface/95 p-1 shadow-[0_12px_30px_-14px_rgba(0,0,0,.35)] backdrop-blur">
        <TBtn icon="lucide:palette" label="Style" active={menu === 'style'} onClick={() => setMenu(menu === 'style' ? null : 'style')} />
        {sel.canCrop && (
          <TBtn
            icon="lucide:crop"
            label="Crop image"
            onClick={() => act(() => {
              const id = editor.getOnlySelectedShapeId()
              if (!id) return
              editor.setCroppingShape(id)
              editor.setCurrentTool('select.crop.idle')
            })}
          />
        )}
        <Sep />
        <TBtn icon="lucide:copy" label="Duplicate" onClick={() => act(() => editor.duplicateShapes(ids(), { x: 14, y: 14 }))} />
        <TBtn icon="lucide:bring-to-front" label="Bring to front" onClick={() => act(() => editor.bringToFront(ids()))} />
        <TBtn icon="lucide:send-to-back" label="Send to back" onClick={() => act(() => editor.sendToBack(ids()))} />
        {multi && (
          <>
            <Sep />
            <TBtn icon="lucide:layout-grid" label="Align" active={menu === 'align'} onClick={() => setMenu(menu === 'align' ? null : 'align')} />
            {sel.hasGroup ? (
              <TBtn icon="lucide:ungroup" label="Ungroup" onClick={() => act(() => editor.ungroupShapes(ids()))} />
            ) : (
              <TBtn icon="lucide:group" label="Group" onClick={() => act(() => editor.groupShapes(ids()))} />
            )}
          </>
        )}
        {!multi && sel.hasGroup && (
          <TBtn icon="lucide:ungroup" label="Ungroup" onClick={() => act(() => editor.ungroupShapes(ids()))} />
        )}
        {sel.linkedHeading && (
          <>
            <Sep />
            <TBtn
              icon="lucide:heading"
              label="Jump to linked heading"
              onClick={() => act(() => useDocStore.getState().docBridge?.jumpToHeading(sel.linkedHeading))}
            />
          </>
        )}
        <Sep />
        <TBtn icon="lucide:lock" label="Lock" onClick={() => act(() => editor.toggleLock(ids()))} />
        <TBtn icon="lucide:trash-2" label="Delete" onClick={() => act(() => editor.deleteShapes(ids()))} />
      </div>

      {menu === 'style' && (
        <div>
          <StylePopover onClose={() => setMenu(null)} />
        </div>
      )}
      {menu === 'align' && (
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-[0_20px_50px_-24px_rgba(0,0,0,.4)]">
          {ALIGNS.map((a) => (
            <button
              key={a.op}
              title={a.kind === 'dist' ? `Distribute ${a.op}` : `Align ${a.op}`}
              onClick={() => act(() => (a.kind === 'dist' ? editor.distributeShapes(ids(), a.op as 'horizontal' | 'vertical') : editor.alignShapes(ids(), a.op as 'left')))}
              className="grid h-9 w-9 place-items-center rounded-lg text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink"
            >
              <Icon icon={a.icon} width={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={
        'grid h-8 w-8 place-items-center rounded-lg transition-colors ' +
        (active ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
      }
    >
      <Icon icon={icon} width={16} />
    </button>
  )
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px bg-line" />
}
