import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { SEED_TEMPLATES, type NexusGraphIR } from '../catalog/seedTemplates'
import { TldrawRendererAdapter } from '../canvas/rendererAdapter'
import { useCatalogStore } from '../store/useCatalogStore'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi } from '../store/useEditorUi'

const KINDS = [
  { id: 'all', label: 'All', icon: 'lucide:layout-grid' },
  { id: 'architecture', label: 'Architecture', icon: 'lucide:network' },
  { id: 'erd', label: 'ERD', icon: 'lucide:database' },
  { id: 'flowchart', label: 'Flow', icon: 'lucide:workflow' },
  { id: 'sequence', label: 'Sequence', icon: 'lucide:git-branch' },
  { id: 'bpmn', label: 'BPMN', icon: 'lucide:boxes' },
  { id: 'security', label: 'Security', icon: 'lucide:shield-check' }
]

const COMPLEXITY_LEVELS = ['all', 'Starter', 'Team', 'Senior', 'Production']

export function DiagramCatalog() {
  const editor = useDocStore((s) => s.editor)
  const setFlyout = useDocStore((s) => s.setFlyout)
  const [filter, setFilter] = useState<string>('all')
  const [complexity, setComplexity] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NexusGraphIR[]>([])
  
  const favorites = useCatalogStore((s) => s.favorites)
  const setFavorites = useCatalogStore((s) => s.setFavorites)
  const recents = useCatalogStore((s) => s.recents)
  const setRecents = useCatalogStore((s) => s.setRecents)

  const hostUrl = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8787'

  // Debounced search query & filters (150ms performance target)
  useEffect(() => {
    let active = true
    const delayDebounce = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams()
        if (query) queryParams.set('query', query)
        if (filter !== 'all') queryParams.set('category', filter)
        if (complexity !== 'all') queryParams.set('complexity', complexity)

        const res = await fetch(`${hostUrl}/api/catalog/templates/search?${queryParams.toString()}`)
        const data = await res.json()
        if (active && data.success) {
          setResults(data.results)
        }
      } catch (err) {
        // Fallback to local SEED_TEMPLATES search on connection issues
        if (active) {
          const q = query.trim().toLowerCase()
          const localFiltered = SEED_TEMPLATES.filter((item) => {
            const inFilter = filter === 'all' || item.kind === filter
            const inComplexity = complexity === 'all' || item.metadata.complexity === complexity
            if (!inFilter || !inComplexity) return false
            if (!q) return true
            const haystack = [
              item.title,
              item.description,
              item.kind,
              ...(item.metadata.tags || []),
              ...(item.metadata.technologies || [])
            ].join(' ').toLowerCase()
            return haystack.includes(q)
          })
          setResults(localFiltered)
        }
      }
    }, 150)

    return () => {
      active = false
      clearTimeout(delayDebounce)
    }
  }, [query, filter, complexity])

  // Sync favorites & recents on boot
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const favRes = await fetch(`${hostUrl}/api/catalog/favorites`)
        const favData = await favRes.json()
        if (favData.success) setFavorites(favData.favorites)

        const recRes = await fetch(`${hostUrl}/api/catalog/recents`)
        const recData = await recRes.json()
        if (recData.success) setRecents(recData.recents)
      } catch {
        /* silent local fallback */
      }
    }
    fetchMeta()
  }, [])

  const handleFavoriteToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const isFav = favorites.includes(id)
    try {
      const method = isFav ? 'DELETE' : 'POST'
      const res = await fetch(`${hostUrl}/api/catalog/templates/${id}/favorite`, { method })
      const data = await res.json()
      if (data.success) setFavorites(data.favorites)
    } catch {
      // Local fallback
      setFavorites(isFav ? favorites.filter(x => x !== id) : [...favorites, id])
    }
  }

  const handleSelectTemplate = async (item: NexusGraphIR, openCodeEditor = false) => {
    if (!editor) return
    const center = editor.getViewportPageBounds().center
    // Shift slightly to left and up so it inserts nicely centered
    const origin = { x: center.x - 450, y: center.y - 200 }

    // Mount adapter and render shapes at viewport center
    const adapter = new TldrawRendererAdapter(editor, origin, item.id)
    adapter.render(item, 2) // default to Level 2 (Engineering)

    // Save insertion reference to Catalog store
    useCatalogStore.getState().addInsertedTemplate({
      templateId: item.id,
      origin,
      graph: item,
      detailLevel: 2,
      isAnimated: false,
      isPlaying: false,
    })

    setFlyout(null) // Close the catalog flyout immediately

    if (openCodeEditor) {
      useEditorUi.getState().setDslOpen(true)
      useEditorUi.getState().setDslType('flow')
    }

    // Add to recents
    try {
      const res = await fetch(`${hostUrl}/api/catalog/recents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })
      const data = await res.json()
      if (data.success) setRecents(data.recents)
    } catch {
      setRecents([item.id, ...recents.filter(x => x !== item.id)].slice(0, 20))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface font-body text-ink">
      {/* Header Panel */}
      <div className="border-b border-line bg-paper/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">System Diagram Catalog</h2>
            <p className="mt-0.5 text-xs text-grey-3">Select and insert senior-reviewed infrastructure, workflow and ERD templates.</p>
          </div>
        </div>

        {/* Fuzzy Search command bar */}
        <label className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-grey-3 focus-within:border-ink transition-colors">
          <Icon icon="lucide:search" width={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search k8s, Kafka, RAG, auth, multi-region..."
            className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-grey-3"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-grey-3 hover:text-ink">
              <Icon icon="lucide:x" width={12} />
            </button>
          )}
        </label>

        {/* Advanced Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Complexity dropdown */}
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[10px] text-grey-4">
            <span className="text-grey-3">Complexity:</span>
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              className="bg-transparent font-semibold outline-none cursor-pointer"
            >
              {COMPLEXITY_LEVELS.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories slider */}
        <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setFilter(k.id)}
              className={
                'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ' +
                (filter === k.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-surface text-grey-4 hover:border-grey-3 hover:text-ink')
              }
            >
              <Icon icon={k.icon} width={11} />
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List View */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center bg-paper/20">
            <Icon icon="lucide:search-x" width={24} className="mx-auto text-grey-3" />
            <p className="mt-2 text-xs font-semibold text-ink">No architecture templates found</p>
            <p className="mt-1 text-[11px] text-grey-3">Try checking spelling or adjusting custom filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {results.map((item) => {
              const isFav = favorites.includes(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectTemplate(item, false)}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:border-grey-3 hover:shadow-[0_12px_30px_-16px_rgba(0,0,0,.15)] cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-grey-4">
                          {item.kind}
                        </span>
                        <span className="text-[10px] text-grey-3">•</span>
                        <span className="text-[10px] font-semibold text-grey-3">
                          {item.metadata.complexity}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-xs font-bold leading-snug text-ink group-hover:text-sky-500 transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-grey-3">
                        {item.description}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleFavoriteToggle(e, item.id)}
                      className="shrink-0 p-1 text-grey-3 hover:text-amber-500 transition-colors"
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Icon icon={isFav ? 'lucide:star' : 'lucide:star'} className={isFav ? 'fill-amber-500 text-amber-500' : ''} width={14} />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {(item.metadata.technologies || []).slice(0, 3).map((tech) => (
                        <span key={tech} className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[9px] text-grey-4">
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectTemplate(item, false)
                        }}
                        className="flex items-center gap-1 rounded-lg bg-grey-1 hover:bg-grey-2 border border-line px-2 py-1 text-[10px] font-bold text-grey-4 transition-colors"
                      >
                        Insert Canvas <Icon icon="lucide:plus" width={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectTemplate(item, true)
                        }}
                        className="flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 px-2 py-1 text-[10px] font-bold text-white transition-colors"
                      >
                        Edit Code <Icon icon="lucide:code-2" width={11} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
