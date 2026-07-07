import * as React from 'react'
import { motion } from 'framer-motion'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi } from '../store/useEditorUi'
import { setTool } from '../canvas/tools'
import { UIcon, type UIName } from '../ui/icons'

/**
 * Thin, icon-only left rail (Eraser/Figma-style). Holds Select plus the content
 * libraries, which open as closeable flyouts — so the canvas stays full-width by
 * default. lucide icons only (spec 2.4).
 */
export function IconRail() {
  const editor = useDocStore((s) => s.editor)
  const activeTool = useDocStore((s) => s.activeTool)
  const flyout = useDocStore((s) => s.flyout)
  const setFlyout = useDocStore((s) => s.setFlyout)
  const viewMode = useEditorUi((s) => s.viewMode)
  const setViewMode = useEditorUi((s) => s.setViewMode)
  const dslOpen = useEditorUi((s) => s.dslOpen)
  const setDslOpen = useEditorUi((s) => s.setDslOpen)
  const inspectorOpen = useEditorUi((s) => s.inspectorOpen)
  const setInspectorOpen = useEditorUi((s) => s.setInspectorOpen)

  const closePanels = () => {
    setFlyout(null)
    setDslOpen(false)
    setInspectorOpen(false)
  }

  const openFlyout = (next: Exclude<typeof flyout, null>) => {
    setDslOpen(false)
    setInspectorOpen(false)
    setViewMode('canvas')
    setFlyout(flyout === next ? null : next)
  }

  const toggleDocOnly = () => {
    setFlyout(null)
    setDslOpen(false)
    setInspectorOpen(false)
    setViewMode(viewMode === 'canvas' ? 'split' : 'canvas')
  }

  const toggleDslOnly = () => {
    setFlyout(null)
    setInspectorOpen(false)
    setViewMode('canvas')
    setDslOpen(!dslOpen)
  }

  const toggleInspectorOnly = () => {
    setFlyout(null)
    setDslOpen(false)
    setViewMode('canvas')
    setInspectorOpen(!inspectorOpen)
  }

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.metaKey || e.ctrlKey) return

      const key = e.key.toLowerCase()

      // Alt/Option shortcuts
      if (e.altKey) {
        if (key === 'd') {
          e.preventDefault()
          toggleDocOnly()
        } else if (key === 'c') {
          e.preventDefault()
          toggleDslOnly()
        } else if (key === 'i') {
          e.preventDefault()
          toggleInspectorOnly()
        }
        return
      }

      // Single-key shortcuts
      if (key === 'u') {
        e.preventDefault()
        openFlyout('insert')
      } else if (e.key === '/') {
        e.preventDefault()
        openFlyout('search')
      } else if (key === 'p') {
        e.preventDefault()
        openFlyout('snapshots')
      } else if (key === 'y') {
        e.preventDefault()
        openFlyout('layers')
      } else if (key === 'w') {
        e.preventDefault()
        openFlyout('shapes')
      } else if (key === 'i') {
        e.preventDefault()
        openFlyout('icons')
      } else if (key === 'z') {
        e.preventDefault()
        openFlyout('catalog')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flyout, viewMode, dslOpen, inspectorOpen, editor])

  return (
    <nav data-tour="left-rail" className="flex w-14 flex-none flex-col items-center gap-1 border-r border-line bg-paper py-3">
      <RailButton
        icon="select"
        label="Select — V"
        active={activeTool === 'select' && !flyout && viewMode === 'canvas' && !dslOpen && !inspectorOpen}
        onClick={() => {
          closePanels()
          setTool(editor, 'select')
        }}
      />

      <div className="my-1 h-px w-6 bg-line" />

      <RailButton icon="insert" label="Insert items — U" active={flyout === 'insert'} onClick={() => openFlyout('insert')} />
      <RailButton icon="searchCanvas" label="Search canvas — /" active={flyout === 'search'} onClick={() => openFlyout('search')} />
      <RailButton icon="snapshots" label="Snapshots — P" active={flyout === 'snapshots'} onClick={() => openFlyout('snapshots')} />
      <RailButton icon="layers" label="Layers — Y" active={flyout === 'layers'} onClick={() => openFlyout('layers')} />
      <RailButton icon="shapes" label="Device frames — W" active={flyout === 'shapes'} onClick={() => openFlyout('shapes')} />
      <RailButton icon="icons" label="Icons — I" active={flyout === 'icons'} onClick={() => openFlyout('icons')} />
      <RailButton icon="catalog" label="Diagram catalog — Z" active={flyout === 'catalog'} onClick={() => openFlyout('catalog')} />

      <div className="my-1 h-px w-6 bg-line" />

      <RailButton icon="doc" label="Document — Alt+D" active={viewMode !== 'canvas'} onClick={toggleDocOnly} />
      <RailButton icon="code" label="DSL — Alt+C" active={dslOpen} onClick={toggleDslOnly} tourId="dsl-toggle" />

      <div className="mt-auto" />
      <RailButton icon="panelRight" label="Inspector — Alt+I" active={inspectorOpen} onClick={toggleInspectorOnly} tourId="inspector-toggle" />
    </nav>
  )
}

function RailButton({
  icon,
  label,
  active,
  onClick,
  tourId,
}: {
  icon: UIName
  label: string
  active: boolean
  onClick: () => void
  tourId?: string
}) {
  return (
    <button
      data-tour={tourId}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={
        'group relative grid h-10 w-10 place-items-center rounded-xl transition-colors ' +
        (active ? 'text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
      }
    >
      {active && (
        <motion.span
          layoutId="rail-pill"
          className="absolute inset-0 rounded-xl bg-ink"
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        />
      )}
      <span className="relative z-10">
        <UIcon name={icon} size={19} />
      </span>
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs font-semibold text-paper opacity-0 shadow-[0_14px_34px_-18px_rgba(0,0,0,.55)] transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
        {label}
      </span>
    </button>
  )
}

const isEditableTarget = (target: EventTarget | null) => {
  const node = target as HTMLElement | null
  return !!node?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor, [data-canvas-editor-block="true"]')
}
