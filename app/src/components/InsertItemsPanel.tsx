import { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { createShapesForAssets, getAssetInfo, type TLAsset } from 'tldraw'
import { centerOn, createCodeBlock, createEmbed, createGroupFrame, createTable, EMBED_H, EMBED_W, TABLE_H, TABLE_W } from '../canvas/createNode'
import { createFigureAroundSelection } from '../canvas/figures'
import { useDocStore } from '../store/useDocStore'
import { LoadingAnimation } from './LoadingAnimation'

type InsertCard = {
  id: string
  label: string
  hint: string
  icon: string
  shortcut?: string
  run: () => void
}

export function InsertItemsPanel() {
  const editor = useDocStore((s) => s.editor)
  const setFlyout = useDocStore((s) => s.setFlyout)
  const [uploading, setUploading] = useState(false)
  const [show3DMenu, setShow3DMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const center = () => editor?.getViewportPageBounds().center

  const insert3D = (shapeType: 'cube' | 'pyramid' | 'cylinder' | 'prism' | 'sphere' | 'cone') => {
    if (!editor) return
    editor.setCurrentTool('select')
    const pt = center()
    const w = 140
    const h = 140
    editor.createShape({
      type: 'nb-3d-shape',
      x: pt ? pt.x - w / 2 : 100,
      y: pt ? pt.y - h / 2 : 100,
      props: {
        w,
        h,
        shapeType,
        color: 'blue',
        spinning: true,
        rotationX: -20,
        rotationY: 45,
        opacity: 0.25,
        borderWidth: 1.5,
        spinSpeed: 10,
      }
    })
  }

  const cards: InsertCard[] = [
    {
      id: 'table',
      label: 'Table',
      hint: 'Editable rows and columns',
      icon: 'lucide:table',
      shortcut: '⌘⌥T',
      run: () => {
        if (!editor) return
        editor.setCurrentTool('select')
        const point = center()
        createTable(editor, point ? { point: centerOn(point, TABLE_W, TABLE_H) } : undefined)
      },
    },
    {
      id: 'code',
      label: 'Code Block',
      hint: 'Syntax highlighted snippet',
      icon: 'lucide:square-code',
      run: () => {
        if (editor) {
          editor.setCurrentTool('select')
          createCodeBlock(editor)
        }
      },
    },
    {
      id: 'figure',
      label: 'Figure',
      hint: 'Container for canvas sections',
      icon: 'lucide:group',
      shortcut: 'F',
      run: () => {
        if (!editor) return
        editor.setCurrentTool('select')
        if (editor.getSelectedShapeIds().length) {
          createFigureAroundSelection(editor)
          return
        }
        const point = center()
        if (!point) return
        const w = 360
        const h = 260
        const id = createGroupFrame(editor, { x: point.x - w / 2, y: point.y - h / 2, w, h, label: 'Figure' })
        editor.select(id)
      },
    },
    {
      id: 'image',
      label: 'Image',
      hint: uploading ? 'Uploading...' : 'Upload from computer',
      icon: 'lucide:image',
      run: () => fileInputRef.current?.click(),
    },
    {
      id: 'embed',
      label: 'Embed',
      hint: 'Website, Figma, video, dashboard',
      icon: 'lucide:panel-top',
      run: () => {
        if (!editor) return
        const url = window.prompt('Paste an embed URL')
        if (!url?.trim()) return
        editor.setCurrentTool('select')
        const point = center()
        createEmbed(editor, {
          url: url.trim(),
          point: point ? centerOn(point, EMBED_W, EMBED_H) : undefined,
        })
      },
    },
    {
      id: '3d-shape',
      label: '3D Shape',
      hint: 'Cube, sphere, cylinder, pyramid...',
      icon: 'lucide:box',
      run: () => setShow3DMenu(true),
    },
  ]

  const handleFiles = async (files: FileList | null) => {
    if (!editor || !files?.length) return
    editor.setCurrentTool('select')
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
      if (assets.length) await createShapesForAssets(editor, assets, center() ?? editor.getViewportPageBounds().center)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void handleFiles(event.currentTarget.files)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {show3DMenu ? (
          <div className="p-3 space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShow3DMenu(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-paper text-grey-4 hover:text-ink hover:bg-grey-1"
                title="Go back"
              >
                <Icon icon="lucide:arrow-left" width={14} />
              </button>
              <span className="text-xs font-mono uppercase tracking-widest text-grey-3">Choose a 3D Shape</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['cube', 'pyramid', 'cylinder', 'prism', 'sphere', 'cone'] as const).map((shapeType) => {
                const labelMap = {
                  cube: '3D Cube',
                  pyramid: '3D Pyramid',
                  cylinder: '3D Cylinder',
                  prism: '3D Prism',
                  sphere: '3D Sphere',
                  cone: '3D Cone',
                }
                const iconMap = {
                  cube: 'lucide:box',
                  pyramid: 'lucide:triangle',
                  cylinder: 'lucide:database',
                  prism: 'lucide:layers',
                  sphere: 'lucide:globe',
                  cone: 'lucide:triangle',
                }
                const hintMap = {
                  cube: 'Spinning 3D block',
                  pyramid: 'Triangular 3D pyramid',
                  cylinder: 'Round 3D cylinder',
                  prism: 'Triangular 3D prism',
                  sphere: 'Holographic 3D sphere',
                  cone: '3D Cone shape',
                }
                return (
                  <button
                    key={shapeType}
                    onClick={() => {
                      insert3D(shapeType)
                      setShow3DMenu(false)
                    }}
                    className="group rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink hover:bg-grey-1"
                  >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-paper text-ink shadow-sm">
                      <Icon icon={iconMap[shapeType]} width={22} height={22} />
                    </span>
                    <span className="block text-sm font-semibold text-ink">{labelMap[shapeType]}</span>
                    <span className="mt-0.5 block truncate text-xs text-grey-3">{hintMap[shapeType]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 p-3">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={card.run}
                  className="group rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink hover:bg-grey-1"
                >
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-paper text-ink shadow-sm">
                    {uploading && card.id === 'image'
                      ? <LoadingAnimation size="sm" variant="rotate8" label="" />
                      : <Icon icon={card.icon} width={22} height={22} />}
                  </span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {card.label}
                    {card.shortcut && <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] font-medium text-grey-3">{card.shortcut}</kbd>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-grey-3">{card.hint}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-line p-3">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-grey-3">Browse libraries</div>
              <div className="space-y-1.5">
                <BrowseButton icon="lucide:monitor-smartphone" label="Device Frames" hint="Phone, tablet, desktop, browser" onClick={() => setFlyout('shapes')} />
                <BrowseButton icon="lucide:shapes" label="Icons & Logos" hint="Tech logos and cloud icons" onClick={() => setFlyout('icons')} />
                <BrowseButton icon="lucide:layout-grid" label="Diagram Catalog" hint="Architecture, ER, sequence, flows" onClick={() => setFlyout('catalog')} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-auto border-t border-line bg-surface px-3 py-2 font-mono text-[10px] text-grey-3">
        Press / for the full command insert menu.
      </div>
    </div>
  )
}

function BrowseButton({ icon, label, hint, onClick }: { icon: string; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-grey-1"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-paper text-ink">
        <Icon icon={icon} width={18} height={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{label}</span>
        <span className="block truncate text-xs text-grey-3">{hint}</span>
      </span>
      <Icon icon="lucide:chevron-right" width={15} height={15} className="text-grey-3" />
    </button>
  )
}
