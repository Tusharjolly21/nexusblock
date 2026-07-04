import { useEffect, useState } from 'react'
import { react } from 'tldraw'
import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'

/** Floating zoom control (eraser/figma-style): −  100%  +  fit. */
export function ZoomPill() {
  const editor = useDocStore((s) => s.editor)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!editor) return
    return react('zoom level', () => setZoom(editor.getZoomLevel()))
  }, [editor])

  if (!editor) return null

  const pct = Math.round(zoom * 100)

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-0.5 rounded-full border border-line bg-surface/95 p-1 shadow-[0_10px_28px_-14px_rgba(0,0,0,.35)] backdrop-blur">
      <PillBtn icon="lucide:minus" label="Zoom out" onClick={() => editor.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 120 } })} />
      <button
        onClick={() => editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 160 } })}
        title="Reset to 100%"
        className="min-w-[52px] rounded-full px-1 py-1 text-center font-mono text-xs font-medium text-grey-4 hover:text-ink"
      >
        {pct}%
      </button>
      <PillBtn icon="lucide:plus" label="Zoom in" onClick={() => editor.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 120 } })} />
      <span className="mx-0.5 h-5 w-px bg-line" />
      <PillBtn icon="lucide:maximize" label="Zoom to fit" onClick={() => editor.zoomToFit({ animation: { duration: 200 } })} />
    </div>
  )
}

function PillBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink"
    >
      <Icon icon={icon} width={15} />
    </button>
  )
}
