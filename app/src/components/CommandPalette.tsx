import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { Icon } from '@iconify/react'
import { useCommand } from '../store/useCommand'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi, type ViewMode } from '../store/useEditorUi'
import { useTheme, TONES } from '../store/useTheme'
import { useApp, selectCurrentFile } from '../store/useApp'
import { NODE_KINDS, type NodeKind } from '../shapes/ArchNodeShape'
import { createArchNode, createIconShape, labelFromIcon } from '../canvas/createNode'
import { setTool } from '../canvas/tools'
import { exportImage, exportPdf, exportMarkdown } from '../canvas/exporters'

type Cmd = { id: string; label: string; icon: string; hint?: string; keywords?: string[]; run: () => void }

const KIND_LABEL: Record<NodeKind, string> = {
  client: 'Client', service: 'Service', db: 'Database', queue: 'Queue', external: 'External',
}
const KIND_ICON: Record<NodeKind, string> = {
  client: 'lucide:monitor', service: 'lucide:server', db: 'lucide:database', queue: 'lucide:layers', external: 'lucide:globe',
}

/** ⌘K command palette (spec 7.2 / P4). Keyboard-first surface over everything. */
export function CommandPalette() {
  const open = useCommand((s) => s.open)
  const setOpen = useCommand((s) => s.setOpen)
  const toggle = useCommand((s) => s.toggle)

  const [mode, setMode] = useState<'root' | 'icons'>('root')
  const [search, setSearch] = useState('')
  const [iconResults, setIconResults] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const setViewMode = useEditorUi((s) => s.setViewMode)
  const toggleDsl = useEditorUi((s) => s.toggleDsl)
  const toggleInspector = useEditorUi((s) => s.toggleInspector)
  const toggleFocusMode = useEditorUi((s) => s.toggleFocusMode)
  const toggleReadOnly = useEditorUi((s) => s.toggleReadOnly)
  const setConnectorStyle = useEditorUi((s) => s.setConnectorStyle)
  const setFlyout = useDocStore((s) => s.setFlyout)
  const setTone = useTheme((s) => s.setTone)
  const createFile = useApp((s) => s.createFile)
  const files = useApp((s) => s.files)
  const currentFile = useApp(selectCurrentFile)
  const navigate = useNavigate()

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  // Reset to root each time it opens.
  useEffect(() => {
    if (open) {
      setMode('root')
      setSearch('')
    }
  }, [open])

  // Icon search (Iconify) while in icon mode.
  useEffect(() => {
    if (mode !== 'icons') return
    const q = search.trim()
    if (!q) {
      setIconResults([])
      return
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=48`, { signal: ac.signal })
        const data = (await res.json()) as { icons?: string[] }
        setIconResults(data.icons ?? [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setIconResults([])
      }
    }, 220)
    return () => clearTimeout(t)
  }, [mode, search])

  const close = () => setOpen(false)
  const run = (fn: () => void) => {
    fn()
    close()
  }

  const editor = () => useDocStore.getState().editor
  const title = currentFile?.title ?? 'nexusblock'

  const groups = useMemo(() => {
    const tools: Cmd[] = [
      { id: 'select', label: 'Select', icon: 'lucide:mouse-pointer-2', hint: 'V', run: () => setTool(editor(), 'select') },
      { id: 'rect', label: 'Rectangle', icon: 'lucide:square', hint: 'R', run: () => setTool(editor(), 'geo') },
      { id: 'text', label: 'Text', icon: 'lucide:type', hint: 'T', run: () => setTool(editor(), 'text') },
      { id: 'note', label: 'Sticky note', icon: 'lucide:sticky-note', hint: 'N', run: () => setTool(editor(), 'note') },
      { id: 'draw', label: 'Draw', icon: 'lucide:pencil', hint: 'D', run: () => setTool(editor(), 'draw') },
      { id: 'arrow', label: 'Connector', icon: 'lucide:spline', hint: 'A', run: () => setTool(editor(), 'arrow') },
      { id: 'eraser', label: 'Eraser', icon: 'lucide:eraser', hint: 'E', run: () => setTool(editor(), 'eraser') },
    ]
    const insert: Cmd[] = [
      ...NODE_KINDS.map((k) => ({
        id: `insert-${k}`,
        label: `Insert ${KIND_LABEL[k]} node`,
        icon: KIND_ICON[k],
        keywords: ['node', 'shape', KIND_LABEL[k]],
        run: () => { const e = editor(); if (e) createArchNode(e, { kind: k, label: KIND_LABEL[k] }) },
      })),
    ]
    const view: Cmd[] = [
      ...(['canvas', 'split', 'doc'] as ViewMode[]).map((m) => ({
        id: `view-${m}`, label: `View: ${m[0].toUpperCase() + m.slice(1)}`, icon: m === 'doc' ? 'lucide:file-text' : m === 'split' ? 'lucide:columns-2' : 'lucide:pen-tool',
        keywords: ['layout', 'mode'], run: () => setViewMode(m),
      })),
      { id: 'toggle-dsl', label: 'Toggle diagram-as-code', icon: 'lucide:terminal', run: toggleDsl },
      { id: 'toggle-inspector', label: 'Toggle inspector', icon: 'lucide:panel-right', run: toggleInspector },
      { id: 'canvas-focus', label: 'Canvas focus', icon: 'lucide:screen-share', hint: 'Ctrl+\\', keywords: ['present', 'focus', 'hide ui'], run: toggleFocusMode },
      { id: 'review-mode', label: 'Toggle review mode', icon: 'lucide:shield-check', keywords: ['readonly', 'read only', 'present'], run: toggleReadOnly },
      { id: 'open-search', label: 'Open canvas search', icon: 'lucide:search', keywords: ['find', 'search'], run: () => setFlyout('search') },
      { id: 'open-snapshots', label: 'Open snapshots', icon: 'lucide:history', keywords: ['history', 'versions'], run: () => setFlyout('snapshots') },
      { id: 'open-layers', label: 'Open layers', icon: 'lucide:layers', keywords: ['layer panel'], run: () => setFlyout('layers') },
    ]
    const canvas: Cmd[] = [
      { id: 'fit', label: 'Zoom to fit', icon: 'lucide:maximize', hint: '⇧1', run: () => editor()?.zoomToFit({ animation: { duration: 200 } }) },
      { id: 'reset-zoom', label: 'Reset zoom to 100%', icon: 'lucide:scan', run: () => { const e = editor(); e?.resetZoom(e.getViewportScreenCenter(), { animation: { duration: 160 } }) } },
      { id: 'select-all', label: 'Select all', icon: 'lucide:box-select', hint: '⌘A', run: () => editor()?.selectAll() },
      { id: 'arrow-straight', label: 'Arrow style: straight', icon: 'lucide:minus', run: () => setConnectorStyle('straight') },
      { id: 'arrow-curved', label: 'Arrow style: curved', icon: 'lucide:route', run: () => setConnectorStyle('curved') },
      { id: 'arrow-elbow', label: 'Arrow style: elbow', icon: 'lucide:corner-down-right', run: () => setConnectorStyle('elbow') },
    ]
    const file: Cmd[] = [
      { id: 'new-file', label: 'New blank file', icon: 'lucide:file-plus', run: () => navigate(`/app/file/${createFile('blank')}`) },
      { id: 'all-files', label: 'Go to all files', icon: 'lucide:layout-grid', run: () => navigate('/app') },
      ...files.slice(0, 5).filter((f) => f.id !== currentFile?.id).map((f) => ({
        id: `open-${f.id}`, label: `Open: ${f.title}`, icon: 'lucide:file', keywords: ['file', 'switch'], run: () => navigate(`/app/file/${f.id}`),
      })),
    ]
    const exportG: Cmd[] = [
      { id: 'export-png', label: 'Export PNG', icon: 'lucide:image', run: () => { const e = editor(); if (e) exportImage(e, title, 'png') } },
      { id: 'export-svg', label: 'Export SVG', icon: 'lucide:file-image', run: () => { const e = editor(); if (e) exportImage(e, title, 'svg') } },
      { id: 'export-pdf', label: 'Export PDF', icon: 'lucide:file-text', run: () => { const e = editor(); if (e) exportPdf(e, title) } },
      { id: 'export-md', label: 'Export Markdown', icon: 'lucide:file-down', run: async () => { const d = useDocStore.getState().docExporter; if (d) exportMarkdown(await d.toMarkdown(), title) } },
    ]
    const appearance: Cmd[] = TONES.map((t) => ({
      id: `mode-${t.id}`, label: `${t.label} mode`, icon: t.dark ? 'lucide:moon' : 'lucide:sun', keywords: ['theme', 'appearance', 'mode', 'dark', 'light'], run: () => setTone(t.id),
    }))
    return { tools, insert, view, canvas, file, exportG, appearance }
  }, [files, currentFile, title, setViewMode, toggleDsl, toggleInspector, toggleFocusMode, toggleReadOnly, setConnectorStyle, setFlyout, setTone, createFile, navigate])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-sm" onClick={close}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,.5)]" onClick={(e) => e.stopPropagation()}>
        <Command
          shouldFilter={mode === 'root'}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              if (mode === 'icons') { setMode('root'); setSearch('') } else close()
            }
          }}
          className="flex flex-col"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            {mode === 'icons' && (
              <button onClick={() => { setMode('root'); setSearch('') }} title="Back" className="text-grey-3 hover:text-ink">
                <Icon icon="lucide:arrow-left" width={16} />
              </button>
            )}
            <Icon icon={mode === 'icons' ? 'lucide:search' : 'lucide:command'} width={16} className="text-grey-3" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={mode === 'icons' ? 'Search 200k icons to insert…' : 'Type a command or search…'}
              className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-grey-3"
            />
            <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-grey-3 sm:block">esc</kbd>
          </div>

          <Command.List className="max-h-[52vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-grey-3">No matches.</Command.Empty>

            {mode === 'root' ? (
              <>
                <Group heading="Tools" cmds={groups.tools} onRun={run} />
                <Group heading="Insert" cmds={groups.insert} onRun={run}>
                  <Row icon="lucide:image-plus" label="Insert icon by name…" hint="›" onSelect={() => { setMode('icons'); setSearch('') }} keywords={['icon', 'logo', 'aws', 'search']} />
                </Group>
                <Group heading="View" cmds={groups.view} onRun={run} />
                <Group heading="Canvas" cmds={groups.canvas} onRun={run} />
                <Group heading="File" cmds={groups.file} onRun={run} />
                <Group heading="Export" cmds={groups.exportG} onRun={run} />
                <Group heading="Appearance" cmds={groups.appearance} onRun={run} />
              </>
            ) : (
              <Command.Group heading={<Heading>Icons</Heading>}>
                {iconResults.length === 0 && search && <div className="px-3 py-6 text-center text-sm text-grey-3">Searching…</div>}
                {iconResults.map((icon) => (
                  <Row
                    key={icon}
                    iconify={icon}
                    label={labelFromIcon(icon)}
                    hint={icon.split(':')[0]}
                    keywords={[icon]}
                    onSelect={() => { const e = editor(); if (e) createIconShape(e, { icon }); close() }}
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

function Group({ heading, cmds, onRun, children }: { heading: string; cmds: Cmd[]; onRun: (fn: () => void) => void; children?: React.ReactNode }) {
  if (cmds.length === 0 && !children) return null
  return (
    <Command.Group heading={<Heading>{heading}</Heading>}>
      {cmds.map((c) => (
        <Row key={c.id} icon={c.icon} label={c.label} hint={c.hint} keywords={c.keywords} onSelect={() => onRun(c.run)} />
      ))}
      {children}
    </Command.Group>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-grey-3">{children}</div>
}

function Row({ icon, iconify, label, hint, keywords, onSelect }: { icon?: string; iconify?: string; label: string; hint?: string; keywords?: string[]; onSelect: () => void }) {
  return (
    <Command.Item
      value={label + ' ' + (keywords?.join(' ') ?? '')}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-grey-4 aria-selected:bg-grey-1 aria-selected:text-ink"
    >
      <Icon icon={iconify ?? icon ?? 'lucide:circle'} width={16} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {hint && <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-grey-3">{hint}</kbd>}
    </Command.Item>
  )
}
