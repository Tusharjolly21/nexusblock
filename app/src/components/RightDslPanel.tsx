import { useRef } from 'react'
import { Icon } from '@iconify/react'
import { useEditorUi } from '../store/useEditorUi'
import { useApp, selectCurrentFile } from '../store/useApp'
import { CodePane } from './CodePane'

/**
 * Diagram-as-code as a right-side IDE panel (Eraser-style): traffic-light title
 * bar with a filename tab + language badge, a "How to use" link out to the guide,
 * the Monaco editor, and a bottom status bar. Resizable from its left edge.
 */
const DIAGRAM_TYPES = [
  { id: 'flow' as const, label: 'Flow chart', icon: 'lucide:git-branch' },
  { id: 'erd' as const, label: 'ERD', icon: 'lucide:table-2' },
]

export function RightDslPanel() {
  const width = useEditorUi((s) => s.dslWidth)
  const setWidth = useEditorUi((s) => s.setDslWidth)
  const setDslOpen = useEditorUi((s) => s.setDslOpen)
  const dslType = useEditorUi((s) => s.dslType)
  const setDslType = useEditorUi((s) => s.setDslType)
  const file = useApp(selectCurrentFile)
  const start = useRef<{ x: number; width: number } | null>(null)

  const slug = (file?.title ?? 'diagram').trim().replace(/[^\w-]+/g, '-').toLowerCase() || 'diagram'

  return (
    <div className="relative flex flex-none flex-col border-l border-line bg-surface" style={{ width }}>
      {/* left-edge resize handle */}
      <div
        className="group absolute -left-1 top-0 z-10 h-full w-2 cursor-ew-resize"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, width }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!start.current) return
          setWidth(start.current.width - (e.clientX - start.current.x))
        }}
        onPointerUp={() => {
          start.current = null
        }}
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-ink/20" />
      </div>

      {/* IDE title bar */}
      <div className="flex h-11 flex-none items-center gap-2 border-b border-line bg-paper px-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <div className="ml-1 flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1">
          <Icon icon="lucide:file-code-2" width={13} className="text-grey-4" />
          <span className="font-mono text-xs text-ink">{slug}.nbdsl</span>
        </div>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-grey-3">
          DSL
        </span>

        <div className="ml-auto flex items-center gap-1">
          <a
            href="/guide/diagram-as-code"
            target="_blank"
            rel="noopener noreferrer"
            title="How to use diagram-as-code (opens the guide)"
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-grey-4 transition-colors hover:border-ink hover:text-ink"
          >
            <Icon icon="lucide:book-open" width={13} /> How to use
          </a>
          <button
            onClick={() => setDslOpen(false)}
            title="Close panel"
            className="grid h-8 w-8 place-items-center rounded-lg text-grey-4 hover:bg-grey-1 hover:text-ink"
          >
            <Icon icon="lucide:x" width={15} />
          </button>
        </div>
      </div>

      {/* diagram-type selector */}
      <div className="flex flex-none items-center gap-1 border-b border-line bg-surface px-3 py-1.5">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">Type</span>
        {DIAGRAM_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setDslType(t.id)}
            className={
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ' +
              (dslType === t.id ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
            }
          >
            <Icon icon={t.icon} width={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* editor */}
      <div className="min-h-0 flex-1">
        <CodePane />
      </div>

      {/* bottom status bar */}
      <div className="flex h-7 flex-none items-center justify-between border-t border-line bg-paper px-3 font-mono text-[10px] text-grey-3">
        <span className="flex items-center gap-1.5">
          <Icon icon="lucide:git-branch" width={11} /> code → canvas
        </span>
        <a href="/guide/diagram-as-code" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-ink">
          <Icon icon="lucide:graduation-cap" width={11} /> Learn the syntax
        </a>
      </div>
    </div>
  )
}
