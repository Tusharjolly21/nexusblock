import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useEditorUi } from '../store/useEditorUi'
import { useDocStore } from '../store/useDocStore'
import { react } from 'tldraw'

type DiffBounds = { id: string; x: number; y: number; w: number; h: number; type: string; label: string }

export function VersionDiffOverlay() {
  const editor = useDocStore((s) => s.editor)
  const diffVersion = useEditorUi((s) => s.diffVersion)
  const setDiffVersion = useEditorUi((s) => s.setDiffVersion)

  const [added, setAdded] = useState<DiffBounds[]>([])
  const [deleted, setDeleted] = useState<DiffBounds[]>([])
  const [modified, setModified] = useState<DiffBounds[]>([])
  const [cam, setCam] = useState({ x: 0, y: 0, z: 1 })

  // Listen to camera updates to repaint overlay positions
  useEffect(() => {
    if (!editor || !diffVersion) return
    return react('diff-cam-listener', () => {
      const c = editor.getCamera()
      setCam({ x: c.x, y: c.y, z: c.z })
    })
  }, [editor, diffVersion])

  // Run the diff algorithm when the editor shapes or diff version changes
  useEffect(() => {
    if (!editor || !diffVersion) return

    return react('diff-calculator', () => {
      const currentShapes = editor.getCurrentPageShapes()
      const histStore = (diffVersion.snapshot as any).store || {}
      const histShapes = Object.values(histStore).filter(
        (r: any) => r.id && r.id.startsWith('shape:') && r.type !== 'page' && r.type !== 'group',
      ) as any[]

      const currentMap = new Map(currentShapes.map((s) => [s.id, s]))
      const histMap = new Map(histShapes.map((s) => [s.id, s]))

      const addedList: DiffBounds[] = []
      const deletedList: DiffBounds[] = []
      const modifiedList: DiffBounds[] = []

      // Added & Modified
      for (const shape of currentShapes) {
        if ((shape.type as string) === 'page' || (shape.type as string) === 'group') continue

        const hBounds = editor.getShapePageBounds(shape.id)
        if (!hBounds) continue
        const currentBounds = { id: shape.id, x: hBounds.x, y: hBounds.y, w: hBounds.width, h: hBounds.height, type: shape.type, label: (shape.props as any)?.label || '' }

        if (!histMap.has(shape.id)) {
          addedList.push(currentBounds)
        } else {
          const prev = histMap.get(shape.id)
          const isPosDiff = Math.abs(shape.x - prev.x) > 1.5 || Math.abs(shape.y - prev.y) > 1.5
          const isSizeDiff =
            Math.abs((shape.props as any)?.w - (prev.props as any)?.w) > 1.5 ||
            Math.abs((shape.props as any)?.h - (prev.props as any)?.h) > 1.5
          const isLabelDiff = (shape.props as any)?.label !== (prev.props as any)?.label

          if (isPosDiff || isSizeDiff || isLabelDiff) {
            modifiedList.push(currentBounds)
          }
        }
      }

      // Deleted
      for (const prev of histShapes) {
        if (!currentMap.has(prev.id)) {
          const px = prev.x ?? 0
          const py = prev.y ?? 0
          const pw = prev.props?.w ?? prev.props?.width ?? 180
          const ph = prev.props?.h ?? prev.props?.height ?? 80
          deletedList.push({
            id: prev.id,
            x: px,
            y: py,
            w: pw,
            h: ph,
            type: prev.type,
            label: prev.props?.label || '',
          })
        }
      }

      setAdded(addedList)
      setDeleted(deletedList)
      setModified(modifiedList)
    })
  }, [editor, diffVersion])

  if (!editor || !diffVersion) return null

  const toLayer = (p: { x: number; y: number }) => {
    const screen = editor.pageToScreen(p)
    const rect = editor.getContainer().getBoundingClientRect()
    return { x: screen.x - rect.left, y: screen.y - rect.top }
  }

  const renderOutline = (item: DiffBounds, color: string, glow: string, label: string, icon: string) => {
    const tl = toLayer({ x: item.x, y: item.y })
    const br = toLayer({ x: item.x + item.w, y: item.y + item.h })
    const z = cam.z || 1

    return (
      <div
        key={item.id}
        className="pointer-events-none absolute"
        style={{
          left: tl.x,
          top: tl.y,
          width: br.x - tl.x,
          height: br.y - tl.y,
          border: `2px ${label === 'Deleted' ? 'dashed' : 'solid'} ${color}`,
          borderRadius: 12,
          boxShadow: label === 'Deleted' ? 'none' : `0 0 0 4px ${glow}`,
          boxSizing: 'border-box',
        }}
      >
        <span
          className="absolute -top-3.5 -left-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-paper shadow-md"
          style={{ background: color, transform: `scale(${Math.max(0.75, Math.min(1.2, 1 / z))})`, transformOrigin: 'top left' }}
        >
          <Icon icon={icon} width={10} />
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {/* Visual Diff Elements */}
      {added.map((item) => renderOutline(item, '#10b981', 'rgba(16,185,129,.12)', 'Added', 'lucide:plus-circle'))}
      {deleted.map((item) => renderOutline(item, '#f97316', 'rgba(249,115,22,.12)', 'Deleted', 'lucide:minus-circle'))}
      {modified.map((item) => renderOutline(item, '#8b5cf6', 'rgba(139,92,246,.12)', 'Modified', 'lucide:edit-3'))}

      {/* Floating comparison status bar */}
      <div className="pointer-events-auto absolute top-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-line bg-surface/96 px-5 py-2.5 shadow-[0_20px_50px_-16px_rgba(0,0,0,.4)] backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-paper">
            <Icon icon="lucide:git-compare-arrows" width={15} />
          </span>
          <div className="leading-tight">
            <span className="block text-xs font-semibold">Comparing snapshot</span>
            <span className="block font-mono text-[9px] uppercase tracking-widest text-grey-3">{diffVersion.label}</span>
          </div>
        </div>

        <span className="h-5 w-px bg-line" />

        {/* Change counts */}
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
            +{added.length} Added
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-600">
            -{deleted.length} Deleted
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-600">
            ~{modified.length} Modified
          </span>
        </div>

        <span className="h-5 w-px bg-line" />

        {/* Action button */}
        <button
          onClick={() => setDiffVersion(null)}
          className="flex h-7 items-center gap-1 rounded-full bg-ink px-3 text-[11px] font-bold text-paper hover:opacity-90"
        >
          <Icon icon="lucide:x" width={11} />
          Exit
        </button>
      </div>
    </div>
  )
}
