import { useEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { Icon } from '@iconify/react'
import {
  createShapesForAssets,
  getAssetInfo,
  type Editor,
  type TLAsset,
  type VecLike,
} from 'tldraw'
import { useDocStore } from '../store/useDocStore'
import {
  createCodeBlock,
  createDeviceFrame,
  createEmbed,
  createGeoShapeAt,
  createGroupFrame,
  createIconShape,
  createTable,
  centerOn,
  labelFromIcon,
  TABLE_H,
  TABLE_W,
  EMBED_H,
  EMBED_W,
  type DeviceFrameKind,
} from '../canvas/createNode'
import { GEO_SHAPES, QUICK_GEO_SHAPES } from '../canvas/tools'
import { ICON_CATEGORIES } from '../icons/catalog'
import { DIAGRAM_CATALOG } from '../catalog/diagramCatalog'
import { useEditorUi } from '../store/useEditorUi'
import { createFigureAroundSelection } from '../canvas/figures'
import { LoadingAnimation } from './LoadingAnimation'

type MenuMode = 'root' | 'diagram' | 'shape' | 'icon' | 'device'
type InsertAction = {
  id: string
  label: string
  description?: string
  icon: string
  keywords: string[]
  run?: (editor: Editor, at: VecLike) => unknown
  open?: MenuMode
}

const MENU_W = 340
const MENU_H = 460

const DEVICE_ITEMS: Array<{ kind: DeviceFrameKind; label: string; icon: string; keywords: string[] }> = [
  { kind: 'phone', label: 'Phone', icon: 'lucide:smartphone', keywords: ['mobile', 'iphone', 'screen'] },
  { kind: 'tablet', label: 'Tablet', icon: 'lucide:tablet', keywords: ['ipad', 'screen'] },
  { kind: 'desktop', label: 'Desktop', icon: 'lucide:monitor', keywords: ['monitor', 'wireframe'] },
  { kind: 'chrome', label: 'Browser', icon: 'lucide:panel-top', keywords: ['chrome', 'web', 'browser'] },
]

const DEVICE_SIZE: Record<DeviceFrameKind, { w: number; h: number }> = {
  phone: { w: 156, h: 284 },
  tablet: { w: 232, h: 318 },
  desktop: { w: 372, h: 272 },
  chrome: { w: 390, h: 250 },
}

const SHAPE_ITEMS: InsertAction[] = [
  ...QUICK_GEO_SHAPES.map((s) => ({
    id: `quick-${s.label}`,
    label: s.label.replace(/ — .*/, ''),
    description: s.label,
    icon: s.icon,
    keywords: ['shape', s.geo, s.label],
    run: (editor: Editor, at: VecLike) => {
      createGeoShapeAt(editor, s.geo, at)
    },
  })),
  ...GEO_SHAPES.map((s) => ({
    id: `shape-${s.geo}`,
    label: s.label,
    icon: s.icon,
    keywords: ['shape', s.geo, s.label],
    run: (editor: Editor, at: VecLike) => {
      createGeoShapeAt(editor, s.geo, at)
    },
  })),
  {
    id: 'shape-cylinder',
    label: 'Cylinder',
    icon: 'lucide:database',
    keywords: ['shape', 'database', 'cylinder'],
    run: (editor: Editor, at: VecLike) => {
      createGeoShapeAt(editor, 'cylinder', at, 120, 100)
    },
  },
  {
    id: 'shape-trapezoid',
    label: 'Trapezoid',
    icon: 'lucide:diamond',
    keywords: ['shape', 'trapezoid'],
    run: (editor: Editor, at: VecLike) => {
      createGeoShapeAt(editor, 'trapezoid', at, 130, 90)
    },
  },
]

const isEditableTarget = (el: EventTarget | null) => {
  const node = el as HTMLElement | null
  if (!node) return false
  return !!node.closest(
    'input, textarea, select, [contenteditable="true"], .monaco-editor, [data-canvas-editor-block="true"]',
  )
}

const matches = (item: InsertAction, q: string) =>
  !q ||
  item.label.toLowerCase().includes(q) ||
  item.description?.toLowerCase().includes(q) ||
  item.keywords.some((k) => k.toLowerCase().includes(q))

const defaultPagePoint = (editor: Editor) => editor.getViewportPageBounds().center

export function CanvasInsertMenu() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<MenuMode>('root')
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ x: 16, y: 16 })
  const [iconResults, setIconResults] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const pagePt = useRef<VecLike>({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const toggleDsl = useEditorUi((s) => s.toggleDsl)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || open) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return
      const editor = useDocStore.getState().editor
      if (!editor || editor.getEditingShapeId()) return
      if (editor.getCurrentToolId() !== 'select') return

      event.preventDefault()
      const container = editor.getContainer().getBoundingClientRect()
      const screen = editor.inputs.currentScreenPoint
      const page = editor.inputs.currentPagePoint
      const x = Number.isFinite(screen.x) ? screen.x : container.width / 2
      const y = Number.isFinite(screen.y) ? screen.y : container.height / 2
      pagePt.current = Number.isFinite(page.x) && Number.isFinite(page.y) ? { ...page } : defaultPagePoint(editor)
      setPos({
        x: Math.min(Math.max(10, x), Math.max(10, container.width - MENU_W - 10)),
        y: Math.min(Math.max(10, y), Math.max(10, container.height - MENU_H - 10)),
      })
      setMode('root')
      setQuery('')
      setIconResults([])
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'icon') return
    const q = query.trim()
    if (q.length < 2) {
      setIconResults([])
      return
    }
    const timeout = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=80`, { signal: ac.signal })
        const data = (await res.json()) as { icons?: string[] }
        setIconResults(data.icons ?? [])
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setIconResults([])
      }
    }, 220)
    return () => clearTimeout(timeout)
  }, [open, mode, query])

  const rootItems: InsertAction[] = useMemo(
    () => [
      {
        id: 'figure',
        label: 'Figure',
        description: 'Container for canvas organization',
        icon: 'lucide:group',
        keywords: ['container', 'group', 'figure', 'boundary'],
        run: (editor: Editor, at: VecLike) => {
          if (editor.getSelectedShapeIds().some((id) => editor.getShape(id)?.type !== 'group-frame')) {
            createFigureAroundSelection(editor)
            return
          }
          const w = 360
          const h = 260
          const id = createGroupFrame(editor, { x: at.x - w / 2, y: at.y - h / 2, w, h, label: 'Figure' })
          editor.select(id)
        },
      },
      {
        id: 'diagram-as-code',
        label: 'Diagram as Code',
        description: 'Create architecture, ER, and sequence diagrams',
        icon: 'lucide:git-branch',
        keywords: ['diagram', 'catalog', 'dsl', 'architecture', 'sequence', 'er'],
        open: 'diagram',
      },
      {
        id: 'shape',
        label: 'Shape',
        description: 'Rectangles, diamonds, cylinders, stars, and more',
        icon: 'lucide:shapes',
        keywords: ['shape', 'rectangle', 'diamond', 'cylinder'],
        open: 'shape',
      },
      {
        id: 'icon',
        label: 'Icon',
        description: 'General icons, tech logos, and cloud icons',
        icon: 'lucide:smile',
        keywords: ['icon', 'logo', 'aws', 'cloud', 'tech'],
        open: 'icon',
      },
      {
        id: 'code-block',
        label: 'Code Block',
        description: 'Syntax-highlighted code block',
        icon: 'lucide:square-code',
        keywords: ['code', 'snippet', 'monaco', 'syntax'],
        run: (editor: Editor, at: VecLike) => {
          createCodeBlock(editor, { point: centerOn(at, 440, 280) })
        },
      },
      {
        id: 'table',
        label: 'Table',
        description: 'Editable rows and columns for specs, issues, and data',
        icon: 'lucide:table',
        keywords: ['table', 'grid', 'rows', 'columns', 'spreadsheet'],
        run: (editor: Editor, at: VecLike) => {
          createTable(editor, { point: centerOn(at, TABLE_W, TABLE_H) })
        },
      },
      {
        id: 'image',
        label: 'Image',
        description: 'Upload an image from your computer',
        icon: 'lucide:image',
        keywords: ['image', 'upload', 'picture', 'png', 'jpg', 'svg'],
        run: () => fileInputRef.current?.click(),
      },
      {
        id: 'embed',
        label: 'Embed',
        description: 'Website, Figma, video, dashboard, or doc',
        icon: 'lucide:panel-top',
        keywords: ['embed', 'iframe', 'website', 'figma', 'video', 'dashboard'],
        run: (editor: Editor, at: VecLike) => {
          const url = window.prompt('Paste an embed URL')
          if (!url?.trim()) return
          createEmbed(editor, { url: url.trim(), point: centerOn(at, EMBED_W, EMBED_H) })
        },
      },
      {
        id: 'device-frame',
        label: 'Device Frame',
        description: 'Phone, tablet, desktop, and browser frames',
        icon: 'lucide:monitor-smartphone',
        keywords: ['device', 'frame', 'phone', 'browser', 'desktop'],
        open: 'device',
      },
    ],
    [],
  )

  const diagramItems: InsertAction[] = useMemo(
    () => [
      {
        id: 'open-dsl',
        label: 'Open diagram-as-code drawer',
        description: 'Write the DSL and compile it to native canvas shapes',
        icon: 'lucide:terminal',
        keywords: ['dsl', 'code', 'diagram as code'],
        run: () => toggleDsl(),
      },
      ...DIAGRAM_CATALOG.map((item) => ({
        id: item.id,
        label: item.title,
        description: item.subtitle,
        icon: item.icon,
        keywords: [item.kind, item.title, item.subtitle, 'schema', 'diagram', 'catalog'],
        run: (editor: Editor) => item.insert(editor),
      })),
    ],
    [toggleDsl],
  )

  const q = query.trim().toLowerCase()
  const close = () => setOpen(false)

  const run = async (item: InsertAction) => {
    if (item.open) {
      setMode(item.open)
      setQuery('')
      setIconResults([])
      return
    }
    const editor = useDocStore.getState().editor
    if (!editor || !item.run) return
    editor.markHistoryStoppingPoint(`insert ${item.label}`)
    await item.run(editor, pagePt.current)
    if (item.id !== 'image') close()
  }

  const handleFiles = async (files: FileList | null) => {
    const editor = useDocStore.getState().editor
    if (!editor || !files?.length) return
    setUploading(true)
    try {
      const assets: TLAsset[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const asset = await getAssetInfo(editor, file)
        if (!asset) continue
        const uploaded = await editor.uploadAsset(asset, file)
        ;(asset.props as { src?: string }).src = uploaded.src
        if (uploaded.meta) asset.meta = { ...asset.meta, ...uploaded.meta }
        assets.push(asset)
      }
      if (assets.length) {
        await createShapesForAssets(editor, assets, pagePt.current)
        close()
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!open) return null

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void handleFiles(event.currentTarget.files)}
      />
      <div className="pointer-events-auto absolute inset-0 z-30" onPointerDown={close} />
      <div
        className="pointer-events-auto absolute z-40 w-[340px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(0,0,0,.5)]"
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              if (mode === 'root') close()
              else {
                setMode('root')
                setQuery('')
              }
            }
          }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3">
            {mode !== 'root' && (
              <button
                onClick={() => {
                  setMode('root')
                  setQuery('')
                }}
                title="Back"
                className="text-grey-3 hover:text-ink"
              >
                <Icon icon="lucide:arrow-left" width={16} />
              </button>
            )}
            <Icon icon="lucide:search" width={15} className="text-grey-3" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={placeholderFor(mode)}
              className="h-11 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-grey-3"
            />
          </div>
          <Command.List className="max-h-[390px] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-sm text-grey-3">No matches.</Command.Empty>
            {mode === 'root' && (
              <>
                <Rows items={rootItems.filter((item) => matches(item, q))} onRun={run} />
                {q.length >= 2 && <IconSearchSection query={q} at={pagePt.current} onClose={close} />}
              </>
            )}
            {mode === 'diagram' && <Rows items={diagramItems.filter((item) => matches(item, q))} onRun={run} />}
            {mode === 'shape' && <ShapeGrid items={SHAPE_ITEMS.filter((item) => matches(item, q))} onRun={run} />}
            {mode === 'device' && (
              <DeviceGrid
                items={DEVICE_ITEMS.filter((item) => !q || item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)))}
                at={pagePt.current}
                onClose={close}
              />
            )}
            {mode === 'icon' && (
              <IconMode
                query={q}
                iconResults={iconResults}
                at={pagePt.current}
                onClose={close}
              />
            )}
            {uploading && (
              <div className="px-3 py-5">
                <LoadingAnimation size="sm" variant="rotate8" label="Uploading image..." />
              </div>
            )}
          </Command.List>
          <div className="flex items-center justify-between border-t border-line bg-paper px-3 py-2 font-mono text-[10px] text-grey-3">
            <span>{footerFor(mode)}</span>
            <span>↑↓ navigate · enter insert · esc back</span>
          </div>
        </Command>
      </div>
    </>
  )
}

function placeholderFor(mode: MenuMode) {
  if (mode === 'diagram') return 'Search architecture, ER, sequence...'
  if (mode === 'shape') return 'Search shapes...'
  if (mode === 'icon') return 'Search icons, tech logos, cloud icons...'
  if (mode === 'device') return 'Search device frames...'
  return 'Insert item'
}

function footerFor(mode: MenuMode) {
  if (mode === 'diagram') return 'Diagram as Code'
  if (mode === 'shape') return 'Shape'
  if (mode === 'icon') return 'Icon'
  if (mode === 'device') return 'Device Frame'
  return 'Insert'
}

function Rows({ items, onRun }: { items: InsertAction[]; onRun: (item: InsertAction) => void }) {
  return (
    <Command.Group>
      {items.map((item) => (
        <Row key={item.id} item={item} onSelect={() => void onRun(item)} />
      ))}
    </Command.Group>
  )
}

function Row({ item, onSelect }: { item: InsertAction; onSelect: () => void }) {
  return (
    <Command.Item
      value={[item.label, item.description, item.keywords.join(' ')].filter(Boolean).join(' ')}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-grey-4 aria-selected:bg-grey-1 aria-selected:text-ink"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-paper">
        <Icon icon={item.icon} width={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{item.label}</span>
        {item.description && <span className="block truncate text-xs text-grey-3">{item.description}</span>}
      </span>
      {item.open && <Icon icon="lucide:chevron-right" width={15} className="text-grey-3" />}
    </Command.Item>
  )
}

function ShapeGrid({ items, onRun }: { items: InsertAction[]; onRun: (item: InsertAction) => void }) {
  return (
    <Command.Group>
      <div className="grid grid-cols-4 gap-1 p-1">
        {items.map((item) => (
          <Command.Item
            key={item.id}
            value={[item.label, item.keywords.join(' ')].join(' ')}
            onSelect={() => void onRun(item)}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg p-2 text-center text-xs text-grey-4 aria-selected:bg-grey-1 aria-selected:text-ink"
          >
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-paper">
              <Icon icon={item.icon} width={24} />
            </span>
            <span className="max-w-full truncate">{item.label}</span>
          </Command.Item>
        ))}
      </div>
    </Command.Group>
  )
}

function DeviceGrid({
  items,
  at,
  onClose,
}: {
  items: typeof DEVICE_ITEMS
  at: VecLike
  onClose: () => void
}) {
  return (
    <Command.Group>
      <div className="grid grid-cols-4 gap-1 p-1">
        {items.map((item) => (
          <Command.Item
            key={item.kind}
            value={[item.label, item.keywords.join(' ')].join(' ')}
            onSelect={() => {
              const editor = useDocStore.getState().editor
              if (!editor) return
              const size = DEVICE_SIZE[item.kind]
              createDeviceFrame(editor, item.kind, centerOn(at, size.w, size.h))
              onClose()
            }}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg p-2 text-center text-xs text-grey-4 aria-selected:bg-grey-1 aria-selected:text-ink"
          >
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-paper">
              <Icon icon={item.icon} width={24} />
            </span>
            <span>{item.label}</span>
          </Command.Item>
        ))}
      </div>
    </Command.Group>
  )
}

function IconMode({
  query,
  iconResults,
  at,
  onClose,
}: {
  query: string
  iconResults: string[]
  at: VecLike
  onClose: () => void
}) {
  if (query.length >= 2) {
    return (
      <Command.Group>
        {iconResults.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-grey-3">Searching Iconify...</div>
        ) : (
          <IconRows icons={iconResults} at={at} onClose={onClose} />
        )}
      </Command.Group>
    )
  }

  return (
    <>
      {ICON_CATEGORIES.map((cat) => (
        <Command.Group key={cat.name} heading={<Heading>{cat.name}</Heading>}>
          <IconGrid icons={cat.icons.slice(0, 20)} at={at} onClose={onClose} />
        </Command.Group>
      ))}
    </>
  )
}

function IconSearchSection({ query, at, onClose }: { query: string; at: VecLike; onClose: () => void }) {
  const [icons, setIcons] = useState<string[]>([])

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=16`)
        const data = (await res.json()) as { icons?: string[] }
        setIcons(data.icons ?? [])
      } catch {
        setIcons([])
      }
    }, 180)
    return () => clearTimeout(timeout)
  }, [query])

  if (icons.length === 0) return null
  return (
    <Command.Group heading={<Heading>Icon results</Heading>}>
      <IconRows icons={icons} at={at} onClose={onClose} />
    </Command.Group>
  )
}

function IconRows({ icons, at, onClose }: { icons: string[]; at: VecLike; onClose: () => void }) {
  return (
    <>
      {icons.map((icon) => (
        <Command.Item
          key={icon}
          value={`${labelFromIcon(icon)} ${icon}`}
          onSelect={() => {
            const editor = useDocStore.getState().editor
            if (!editor) return
            createIconShape(editor, { icon, point: centerOn(at, 56, 56) })
            onClose()
          }}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-grey-4 aria-selected:bg-grey-1 aria-selected:text-ink"
        >
          <Icon icon={icon} width={18} className="shrink-0" />
          <span className="flex-1 truncate">{labelFromIcon(icon)}</span>
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-grey-3">{icon.split(':')[0]}</kbd>
        </Command.Item>
      ))}
    </>
  )
}

function IconGrid({ icons, at, onClose }: { icons: string[]; at: VecLike; onClose: () => void }) {
  return (
    <div className="grid grid-cols-5 gap-1 p-1">
      {icons.map((icon) => (
        <Command.Item
          key={icon}
          value={`${labelFromIcon(icon)} ${icon}`}
          onSelect={() => {
            const editor = useDocStore.getState().editor
            if (!editor) return
            createIconShape(editor, { icon, point: centerOn(at, 56, 56) })
            onClose()
          }}
          className="grid cursor-pointer place-items-center rounded-lg p-2 aria-selected:bg-grey-1"
        >
          <Icon icon={icon} width={23} height={23} />
        </Command.Item>
      ))}
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-grey-3">{children}</div>
}
