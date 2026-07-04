import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { ICON_CATEGORIES } from '../icons/catalog'
import { ICON_DND_TYPE, createIconShape, encodeIconDragPayload, labelFromIcon } from '../canvas/createNode'
import { useDocStore } from '../store/useDocStore'
import { useCustomIcons, type CustomIcon } from '../store/useCustomIcons'
import { LoadingAnimation } from './LoadingAnimation'

/**
 * Icon library, Eraser-style: a search bar on top, then hand-picked categories
 * to browse. Click or drag an icon to drop it on the canvas as an icon-only
 * shape. Search queries the Iconify index (200k+ icons); the source is isolated
 * here so it can be swapped for a self-hosted instance later (§6.6).
 */
export function IconLibrary() {
  const editor = useDocStore((s) => s.editor)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const customIcons = useCustomIcons((s) => s.icons)
  const hydrateCustomIcons = useCustomIcons((s) => s.hydrate)
  const addCustomIcons = useCustomIcons((s) => s.addFiles)
  const removeCustomIcon = useCustomIcons((s) => s.removeIcon)
  const renameCustomIcon = useCustomIcons((s) => s.renameIcon)

  useEffect(() => {
    hydrateCustomIcons()
  }, [hydrateCustomIcons])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=80`,
          { signal: ac.signal },
        )
        const data = (await res.json()) as { icons?: string[] }
        setResults(data.icons ?? [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const insert = (icon: string, label = '') => {
    if (editor) createIconShape(editor, { icon, label })
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await addCustomIcons(files)
    const skipped = result.skipped.length ? ` · ${result.skipped[0]}` : ''
    setNotice(result.added ? `${result.added} custom icon${result.added > 1 ? 's' : ''} added${skipped}` : skipped || 'No icons added')
    window.setTimeout(() => setNotice(''), 2800)
    if (fileRef.current) fileRef.current.value = ''
  }

  const customMatches = query.trim()
    ? customIcons.filter((icon) => icon.name.toLowerCase().includes(query.trim().toLowerCase()))
    : customIcons

  return (
    <div className="flex h-full min-h-0 flex-col">
      <input
        ref={fileRef}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(event) => void upload(event.currentTarget.files)}
      />

      {/* Search bar — pinned on top */}
      <div className="space-y-3 border-b border-line p-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-grey-3 focus-within:border-ink">
          <Icon icon="lucide:search" width={14} height={14} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 200k+ icons…"
            aria-label="Search icons"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-grey-3"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-grey-3 hover:text-ink"
            >
              <Icon icon="lucide:x" width={14} height={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink hover:bg-grey-1"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-paper">
            <Icon icon="lucide:upload-cloud" width={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Upload custom icons</span>
            <span className="block truncate text-xs text-grey-3">SVG, PNG, JPG, or WebP · stored in your library</span>
          </span>
          <span className="rounded-full border border-line bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">Pro</span>
        </button>
        {notice && <p className="rounded-lg bg-grey-1 px-2 py-1.5 text-xs text-grey-4">{notice}</p>}
      </div>

      {/* Results / categories */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {results !== null ? (
          loading && results.length === 0 && customMatches.length === 0 ? (
            <LoadingAnimation size="sm" label="Searching icons..." className="py-6" />
          ) : results.length === 0 && customMatches.length === 0 ? (
            <p className="px-1 py-2 text-xs text-grey-3">No icons found for “{query}”. Upload one to make it yours.</p>
          ) : (
            <div className="space-y-5">
              {customMatches.length > 0 && (
                <section>
                  <h4 className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">Your custom icons</h4>
                  <CustomIconGrid icons={customMatches} onPick={insert} onRemove={removeCustomIcon} onRename={renameCustomIcon} />
                </section>
              )}
              {results.length > 0 && (
                <section>
                  <h4 className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">Iconify results</h4>
                  <IconGrid icons={results} onPick={(icon) => insert(icon)} />
                </section>
              )}
            </div>
          )
        ) : (
          <>
            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between px-1">
                <h4 className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Your custom icons</h4>
                <button onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-ink hover:opacity-70">Upload</button>
              </div>
              {customIcons.length ? (
                <CustomIconGrid icons={customIcons} onPick={insert} onRemove={removeCustomIcon} onRename={renameCustomIcon} />
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line bg-surface p-3 text-left hover:border-ink"
                >
                  <Icon icon="lucide:sparkles" width={18} className="text-grey-3" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Create your private icon set</span>
                    <span className="block text-xs text-grey-3">Upload product, team, and internal service logos.</span>
                  </span>
                </button>
              )}
            </section>
            {ICON_CATEGORIES.map((cat) => (
              <section key={cat.name} className="mb-5 last:mb-0">
                <h4 className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">
                  {cat.name}
                </h4>
                <IconGrid icons={cat.icons} onPick={(icon) => insert(icon)} />
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function IconGrid({
  icons,
  onPick,
}: {
  icons: string[]
  onPick: (icon: string) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {icons.map((icon) => (
        <button
          key={icon}
          title={labelFromIcon(icon)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(ICON_DND_TYPE, encodeIconDragPayload(icon))
            e.dataTransfer.effectAllowed = 'copy'
          }}
          onClick={() => onPick(icon)}
          className="grid aspect-square place-items-center rounded-lg transition-colors hover:bg-grey-1"
        >
          <Icon icon={icon} width={22} height={22} />
        </button>
      ))}
    </div>
  )
}

function CustomIconGrid({
  icons,
  onPick,
  onRemove,
  onRename,
}: {
  icons: CustomIcon[]
  onPick: (icon: string, label?: string) => void
  onRemove: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {icons.map((icon) => (
        <div key={icon.id} className="group relative rounded-xl border border-line bg-surface p-2 transition-colors hover:border-ink">
          <button
            title={icon.name}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(ICON_DND_TYPE, encodeIconDragPayload({ icon: icon.src, label: icon.name }))
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => onPick(icon.src, icon.name)}
            className="grid aspect-square w-full place-items-center rounded-lg bg-paper"
          >
            <img src={icon.src} alt={icon.name} draggable={false} className="h-9 w-9 object-contain" />
          </button>
          <input
            value={icon.name}
            onChange={(event) => onRename(icon.id, event.currentTarget.value)}
            className="mt-1 w-full bg-transparent text-center text-[11px] font-semibold text-ink outline-none"
            title="Rename custom icon"
          />
          <button
            onClick={() => onRemove(icon.id)}
            aria-label={`Delete ${icon.name}`}
            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-lg bg-paper/95 text-grey-3 opacity-0 shadow-sm transition-opacity hover:text-ink group-hover:opacity-100"
          >
            <Icon icon="lucide:x" width={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
