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
 *
 * Enhanced features:
 * - Search icons and download/copy them from the internet in one place.
 * - Auto-assign to selected shape when clicked.
 * - Copy raw SVG code to clipboard.
 * - Download SVG files directly.
 */
export function IconLibrary() {
  const editor = useDocStore((s) => s.editor)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  
  const customIcons = useCustomIcons((s) => s.icons)
  const groups = useCustomIcons((s) => s.groups)
  const hydrateCustomIcons = useCustomIcons((s) => s.hydrate)
  const addIconDirect = useCustomIcons((s) => s.addIconDirect)
  const removeCustomIcon = useCustomIcons((s) => s.removeIcon)
  const renameCustomIcon = useCustomIcons((s) => s.renameIcon)
  const createGroup = useCustomIcons((s) => s.createGroup)
  const deleteGroup = useCustomIcons((s) => s.deleteGroup)
  const moveIcon = useCustomIcons((s) => s.moveIcon)

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [customImportMode, setCustomImportMode] = useState<'upload' | 'url' | 'svg'>('upload')
  const [customName, setCustomName] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customSvg, setCustomSvg] = useState('')
  const [targetGroupId, setTargetGroupId] = useState('')
  const [removeBackground, setRemoveBackground] = useState(true)

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

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
    if (!editor) return
    const selectedIds = editor.getSelectedShapeIds()
    if (selectedIds.length === 1) {
      const shape = editor.getShape(selectedIds[0])
      if (shape && ['arch-node', 'flow-node', 'erd-entity'].includes(shape.type)) {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          props: { icon }
        } as any)
        setNotice(`Assigned icon to selected shape!`)
        window.setTimeout(() => setNotice(''), 2000)
        return
      }
    }
    createIconShape(editor, { icon, label })
    setNotice(`Created new icon shape on canvas!`)
    window.setTimeout(() => setNotice(''), 2000)
  }

  const copyToClipboard = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(msg)
      window.setTimeout(() => setNotice(''), 2200)
    } catch (err) {
      console.error('Failed to copy:', err)
      setNotice('Clipboard block or error.')
      window.setTimeout(() => setNotice(''), 2200)
    }
  }

  const handleCopyId = (icon: string) => {
    void copyToClipboard(icon, `Copied ID: "${icon}"`)
  }

  const handleCopySvg = async (icon: string) => {
    const formattedIcon = icon.replace(':', '/')
    setNotice('Fetching SVG XML...')
    try {
      const res = await fetch(`https://api.iconify.design/${formattedIcon}.svg`)
      if (!res.ok) throw new Error('Not found')
      const svgText = await res.text()
      await copyToClipboard(svgText, `Copied SVG XML code to clipboard!`)
    } catch {
      setNotice('Failed to fetch SVG code from internet.')
      window.setTimeout(() => setNotice(''), 2200)
    }
  }

  const handleDownloadSvg = async (icon: string) => {
    const formattedIcon = icon.replace(':', '/')
    setNotice('Downloading SVG...')
    try {
      const res = await fetch(`https://api.iconify.design/${formattedIcon}.svg`)
      if (!res.ok) throw new Error('Not found')
      const svgText = await res.text()
      const blob = new Blob([svgText], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${icon.replace(':', '_')}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setNotice(`Downloaded ${icon}.svg!`)
      window.setTimeout(() => setNotice(''), 2200)
    } catch {
      setNotice('Failed to download SVG.')
      window.setTimeout(() => setNotice(''), 2200)
    }
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setNotice('Processing uploaded icons...')
    const addedCount: string[] = []
    const skipped: string[] = []
    for (const file of Array.from(files)) {
      if (file.size > 921600) { // 900 KB limit
        skipped.push(`${file.name} is larger than 900 KB`)
        continue
      }
      let src = await fileToDataUrl(file)
      if (removeBackground) {
        try {
          src = await removeImageBackground(src)
        } catch (err) {
          console.warn('Failed to remove background for uploaded file', file.name, err)
        }
      }
      addIconDirect(cleanName(file.name), src, file.type || 'image/svg+xml', targetGroupId || undefined)
      addedCount.push(file.name)
    }
    const skippedStr = skipped.length ? ` · ${skipped[0]}` : ''
    setNotice(addedCount.length ? `${addedCount.length} custom icon${addedCount.length > 1 ? 's' : ''} added${skippedStr}` : skippedStr || 'No icons added')
    window.setTimeout(() => setNotice(''), 2800)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleCustomImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (customImportMode === 'url') {
      const url = customUrl.trim()
      if (!url) return
      setNotice('Importing and processing icon...')
      let src = url
      if (removeBackground) {
        try {
          src = await removeImageBackground(url)
        } catch (err) {
          console.warn('Failed to remove bg for URL', url, err)
        }
      }
      const name = customName.trim() || url.split('/').pop()?.split('?')[0] || 'Link Icon'
      addIconDirect(name, src, 'image/png', targetGroupId || undefined)
      setCustomUrl('')
      setCustomName('')
      setNotice(`Imported custom icon from URL!`)
      window.setTimeout(() => setNotice(''), 2200)
    } else if (customImportMode === 'svg') {
      const svgCode = customSvg.trim()
      if (!svgCode) return
      setNotice('Importing and processing SVG...')
      const name = customName.trim() || 'Custom SVG'
      const sanitized = svgCode
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\s(href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
      let src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sanitized)))}`
      if (removeBackground) {
        try {
          src = await removeImageBackground(src)
        } catch (err) {
          console.warn('Failed to remove bg for SVG', err)
        }
      }
      addIconDirect(name, src, 'image/svg+xml', targetGroupId || undefined)
      setCustomSvg('')
      setCustomName('')
      setNotice(`Imported custom icon from pasted SVG!`)
      window.setTimeout(() => setNotice(''), 2200)
    }
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    createGroup(newGroupName.trim())
    setNewGroupName('')
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
            placeholder="Search 200k+ icons from internet…"
            aria-label="Search icons"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-grey-3 font-semibold"
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
        
        {/* Notice alert */}
        {notice ? (
          <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-xs text-sky-600 font-semibold animate-pulse">
            <Icon icon="lucide:info" width={14} className="shrink-0" />
            <span className="truncate">{notice}</span>
          </div>
        ) : (
          <div className="rounded-xl bg-grey-1 px-3 py-2 text-[10px] text-grey-3 font-medium leading-relaxed">
            💡 Select any node/table shape on the canvas to update its icon instantly on click. Hover over an icon to copy its ID, SVG code, or download it.
          </div>
        )}
      </div>

      {/* Results / categories */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {results !== null ? (
          loading && results.length === 0 && customMatches.length === 0 ? (
            <LoadingAnimation size="sm" label="Searching internet..." className="py-6" />
          ) : results.length === 0 && customMatches.length === 0 ? (
            <p className="px-1 py-2 text-xs text-grey-3">No icons found for “{query}”.</p>
          ) : (
            <div className="space-y-5">
              {customMatches.length > 0 && (
                <section>
                  <h4 className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">Your custom icons</h4>
                  <CustomIconGrid icons={customMatches} groups={groups} onPick={insert} onRemove={removeCustomIcon} onRename={renameCustomIcon} onMove={moveIcon} />
                </section>
              )}
              {results.length > 0 && (
                <section>
                  <h4 className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">Internet Search Results</h4>
                  <IconGrid
                    icons={results}
                    onPick={(icon) => insert(icon)}
                    onCopyId={handleCopyId}
                    onCopySvg={handleCopySvg}
                    onDownloadSvg={handleDownloadSvg}
                  />
                </section>
              )}
            </div>
          )
        ) : (
          <>
            {/* Import Custom Icon Panel */}
            <section className="mb-5 border-b border-line pb-5 px-1">
              <h4 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-grey-3">Add Custom Icon</h4>
              
              {/* Selector Tabs */}
              <div className="mb-2.5 flex rounded-lg bg-grey-1 p-0.5 text-[10px] font-semibold text-grey-4">
                <button
                  type="button"
                  onClick={() => setCustomImportMode('upload')}
                  className={`flex-1 rounded-md py-1 transition-colors ${customImportMode === 'upload' ? 'bg-paper text-ink shadow-sm' : 'hover:text-ink'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setCustomImportMode('url')}
                  className={`flex-1 rounded-md py-1 transition-colors ${customImportMode === 'url' ? 'bg-paper text-ink shadow-sm' : 'hover:text-ink'}`}
                >
                  Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setCustomImportMode('svg')}
                  className={`flex-1 rounded-md py-1 transition-colors ${customImportMode === 'svg' ? 'bg-paper text-ink shadow-sm' : 'hover:text-ink'}`}
                >
                  Paste SVG
                </button>
              </div>

              {/* Remove Background Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8b8d98] mb-3 select-none pl-1">
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                  className="accent-ink rounded border-line h-3.5 w-3.5 cursor-pointer bg-surface"
                />
                <span className="font-semibold text-[10px] tracking-wide text-grey-3 uppercase">Auto-remove background</span>
              </label>

              {customImportMode === 'upload' ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/30 p-4 hover:bg-surface/50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
                  <Icon icon="lucide:upload-cloud" width={24} className="text-grey-3 mb-2" />
                  <span className="text-xs font-semibold text-grey-4">Click to select files</span>
                  <span className="text-[9px] text-grey-3 mt-1">SVG, PNG, JPG, WebP (Max 900KB)</span>
                </div>
              ) : (
                <form onSubmit={handleCustomImport} className="space-y-2.5">
                  <div>
                    <input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Icon name (e.g. My Database)..."
                      className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-ink placeholder:text-grey-2"
                    />
                  </div>

                  {customImportMode === 'url' ? (
                    <div>
                      <input
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="Image URL link (https://...)..."
                        required
                        className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-ink placeholder:text-grey-2"
                      />
                    </div>
                  ) : (
                    <div>
                      <textarea
                        value={customSvg}
                        onChange={(e) => setCustomSvg(e.target.value)}
                        placeholder="Paste raw SVG XML code (<svg>...</svg>)..."
                        required
                        rows={3}
                        className="w-full rounded-lg border border-line bg-[#18181b] p-2.5 text-xs text-white outline-none focus:border-ink placeholder:text-grey-3 font-mono resize-none"
                      />
                    </div>
                  )}

                  {/* Options row: folder group selector & Add button */}
                  <div className="flex items-center gap-2">
                    <select
                      value={targetGroupId}
                      onChange={(e) => setTargetGroupId(e.target.value)}
                      className="h-8 rounded-lg border border-line bg-surface px-2 text-[10px] font-semibold text-grey-4 outline-none focus:border-ink cursor-pointer flex-1"
                    >
                      <option value="">Uncategorized</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          Folder: {group.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="h-8 rounded-lg bg-ink px-4 text-xs font-bold text-paper hover:opacity-90 transition-opacity"
                    >
                      Add Icon
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="mb-5 border-b border-line pb-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <h4 className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Custom groups</h4>
              </div>
              
              {/* Add group input */}
              <form onSubmit={handleCreateGroup} className="mb-3 flex gap-1.5 px-1">
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="New folder group name..."
                  className="h-8 flex-1 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-ink placeholder:text-grey-2"
                />
                <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper hover:opacity-90">
                  <Icon icon="lucide:plus" width={14} />
                </button>
              </form>

              {/* Render groups */}
              <div className="space-y-4">
                {groups.map((group) => {
                  const matches = customIcons.filter((i) => i.groupId === group.id)
                  const isCollapsed = collapsedGroups[group.id] ?? false
                  return (
                    <div key={group.id} className="rounded-xl border border-line bg-surface/40 p-2">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <div
                          onClick={() => toggleGroupCollapse(group.id)}
                          className="flex-1 flex items-center gap-1.5 cursor-pointer hover:opacity-80 select-none"
                        >
                          <Icon icon={isCollapsed ? "lucide:chevron-right" : "lucide:chevron-down"} width={13} className="text-grey-3" />
                          <Icon icon={isCollapsed ? "lucide:folder" : "lucide:folder-open"} width={13} className="text-grey-3" />
                          <span className="text-xs font-semibold text-ink">
                            {group.name}
                          </span>
                          <span className="text-[10px] text-grey-3 font-normal">({matches.length})</span>
                        </div>
                        <button
                          onClick={() => deleteGroup(group.id)}
                          title="Delete group"
                          className="rounded p-0.5 text-grey-3 hover:bg-grey-1 hover:text-red-500"
                        >
                          <Icon icon="lucide:trash-2" width={12} />
                        </button>
                      </div>
                      {!isCollapsed && (
                        matches.length ? (
                          <CustomIconGrid
                            icons={matches}
                            groups={groups}
                            onPick={insert}
                            onRemove={removeCustomIcon}
                            onRename={renameCustomIcon}
                            onMove={moveIcon}
                          />
                        ) : (
                          <div className="py-3 text-center text-[10px] text-grey-3">Empty folder group. Move custom icons here.</div>
                        )
                      )}
                    </div>
                  )
                })}

                {/* Uncategorized group */}
                {(() => {
                  const uncategorized = customIcons.filter((i) => !i.groupId)
                  if (uncategorized.length === 0 && groups.length > 0) return null
                  const isCollapsed = collapsedGroups['uncategorized'] ?? false
                  return (
                    <div className="rounded-xl border border-line bg-surface/40 p-2">
                      <div
                        onClick={() => toggleGroupCollapse('uncategorized')}
                        className="mb-2 px-1 text-xs font-semibold text-ink flex items-center justify-between cursor-pointer hover:opacity-80 select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon icon={isCollapsed ? "lucide:chevron-right" : "lucide:chevron-down"} width={13} className="text-grey-3" />
                          <Icon icon={isCollapsed ? "lucide:folder" : "lucide:folder-open"} width={13} className="text-grey-3" />
                          Uncategorized
                          <span className="text-[10px] text-grey-3 font-normal">({uncategorized.length})</span>
                        </div>
                      </div>
                      {!isCollapsed && (
                        uncategorized.length ? (
                          <CustomIconGrid
                            icons={uncategorized}
                            groups={groups}
                            onPick={insert}
                            onRemove={removeCustomIcon}
                            onRename={renameCustomIcon}
                            onMove={moveIcon}
                          />
                        ) : (
                          <div className="py-3 text-center text-[10px] text-grey-3">No uncategorized custom icons.</div>
                        )
                      )}
                    </div>
                  )
                })()}
              </div>
            </section>
            
            {ICON_CATEGORIES.map((cat) => (
              <section key={cat.name} className="mb-5 last:mb-0">
                <h4 className="mb-2 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">
                  {cat.name}
                </h4>
                <IconGrid
                  icons={cat.icons}
                  onPick={(icon) => insert(icon)}
                  onCopyId={handleCopyId}
                  onCopySvg={handleCopySvg}
                  onDownloadSvg={handleDownloadSvg}
                />
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
  onCopyId,
  onCopySvg,
  onDownloadSvg,
}: {
  icons: string[]
  onPick: (icon: string) => void
  onCopyId: (icon: string) => void
  onCopySvg: (icon: string) => void
  onDownloadSvg: (icon: string) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {icons.map((icon, index) => (
        <IconGridItem
          key={icon}
          icon={icon}
          index={index}
          onPick={onPick}
          onCopyId={onCopyId}
          onCopySvg={onCopySvg}
          onDownloadSvg={onDownloadSvg}
        />
      ))}
    </div>
  )
}

function IconGridItem({
  icon,
  index,
  onPick,
  onCopyId,
  onCopySvg,
  onDownloadSvg,
}: {
  icon: string
  index?: number
  onPick: (icon: string) => void
  onCopyId: (icon: string) => void
  onCopySvg: (icon: string) => void
  onDownloadSvg: (icon: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  // Determine edge positioning to prevent overflow beyond sidebar boundaries
  const col = index !== undefined ? index % 4 : 1
  const isLeftEdge = col === 0
  const isRightEdge = col === 3

  let popoverStyle: React.CSSProperties = {
    bottom: 'calc(100% + 6px)',
    width: 130,
    pointerEvents: 'auto',
  }
  let arrowStyle: React.CSSProperties = {
    bottom: -4,
    width: 7,
    height: 7,
  }

  if (isLeftEdge) {
    popoverStyle = { ...popoverStyle, left: 0 }
    arrowStyle = { ...arrowStyle, left: 20, transform: 'rotate(45deg)' }
  } else if (isRightEdge) {
    popoverStyle = { ...popoverStyle, right: 0 }
    arrowStyle = { ...arrowStyle, right: 20, transform: 'rotate(45deg)' }
  } else {
    popoverStyle = { ...popoverStyle, left: '50%', transform: 'translateX(-50%)' }
    arrowStyle = { ...arrowStyle, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
  }

  return (
    <div
      className="relative flex aspect-square flex-col items-center justify-center rounded-xl border border-line/40 bg-surface/50 p-2.5 transition-all duration-200 hover:border-ink hover:bg-surface hover:shadow-md cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        title={labelFromIcon(icon)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(ICON_DND_TYPE, encodeIconDragPayload(icon))
          e.dataTransfer.effectAllowed = 'copy'
        }}
        onClick={() => onPick(icon)}
        className="grid flex-1 place-items-center text-ink transition-transform duration-200 hover:scale-110"
      >
        <Icon icon={icon} width={26} height={26} />
      </button>

      {hovered && (
        <div
          className="absolute z-20 flex flex-col items-center gap-1.5 rounded-lg border border-line bg-paper/95 p-1.5 shadow-lg transition-all animate-fade-in"
          style={popoverStyle}
        >
          {/* Arrow pointing down */}
          <div className="absolute border-b border-r border-line bg-paper" style={arrowStyle} />

          <span className="text-[9px] font-semibold text-grey-3 truncate w-full text-center">
            {icon.split(':').pop() || icon}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPick(icon)}
              title="Assign / Insert"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-paper hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:check" width={12} />
            </button>
            <button
              type="button"
              onClick={() => onCopyId(icon)}
              title="Copy ID (logos:name)"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface text-grey-4 hover:border-ink hover:text-ink hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:copy" width={12} />
            </button>
            <button
              type="button"
              onClick={() => onCopySvg(icon)}
              title="Copy SVG Code"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface text-grey-4 hover:border-ink hover:text-ink hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:code-2" width={12} />
            </button>
            <button
              type="button"
              onClick={() => onDownloadSvg(icon)}
              title="Download SVG file"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface text-grey-4 hover:border-ink hover:text-ink hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:download" width={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomIconGrid({
  icons,
  groups,
  onPick,
  onRemove,
  onRename,
  onMove,
}: {
  icons: CustomIcon[]
  groups: { id: string; name: string }[]
  onPick: (icon: string, label?: string) => void
  onRemove: (id: string) => void
  onRename: (id: string, name: string) => void
  onMove: (id: string, groupId: string | null) => void
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
          <div className="mt-1 flex justify-center">
            <select
              value={icon.groupId || ''}
              onChange={(e) => onMove(icon.id, e.currentTarget.value || null)}
              className="text-[9px] bg-paper text-grey-4 outline-none border border-line rounded px-1 py-0.5 cursor-pointer max-w-[80px]"
            >
              <option value="">Move...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
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

function cleanName(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || 'Custom icon'
}

async function fileToDataUrl(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    const raw = await file.text()
    const sanitized = raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\s(href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sanitized)))}`
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function removeImageBackground(imageSrc: string): Promise<string> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSrc
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  let imgData: ImageData
  try {
    imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  } catch (err) {
    // If CORS blocks canvas readback, log a warning and return the original source safely
    console.warn('CORS blocks background removal for cross-origin image link', err)
    return imageSrc
  }

  const data = imgData.data
  const w = canvas.width
  const h = canvas.height

  // Sample corner pixel as background color reference
  const bgR = data[0]
  const bgG = data[1]
  const bgB = data[2]
  const bgA = data[3]

  // If already transparent, return original
  if (bgA < 50) return imageSrc

  const visited = new Uint8Array(w * h)
  const queue: number[] = []

  // Push all border pixels to queue
  for (let x = 0; x < w; x++) {
    queue.push(x, 0)
    queue.push(x, h - 1)
    visited[x] = 1
    visited[x + (h - 1) * w] = 1
  }
  for (let y = 1; y < h - 1; y++) {
    queue.push(0, y)
    queue.push(w - 1, y)
    visited[y * w] = 1
    visited[w - 1 + y * w] = 1
  }

  const threshold = 40 // color distance threshold

  let head = 0
  while (head < queue.length) {
    const cx = queue[head++]
    const cy = queue[head++]
    const idx = (cx + cy * w) * 4

    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]

    // Calculate Euclidean color distance in RGB space
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)

    if (dist < threshold && a > 10) {
      data[idx + 3] = 0 // make pixel transparent

      // Check 4-way neighbors
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ]
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nidx = nx + ny * w
          if (!visited[nidx]) {
            visited[nidx] = 1
            queue.push(nx, ny)
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL('image/png')
}
