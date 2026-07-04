import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { DIAGRAM_CATALOG, type DiagramCatalogItem, type DiagramCatalogKind } from '../catalog/diagramCatalog'
import { useDocStore } from '../store/useDocStore'

const FILTERS: Array<{ id: 'all' | DiagramCatalogKind; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: 'lucide:layout-grid' },
  { id: 'architecture', label: 'Architecture', icon: 'lucide:network' },
  { id: 'data', label: 'Data', icon: 'lucide:database' },
  { id: 'flow', label: 'Flow', icon: 'lucide:workflow' },
  { id: 'sequence', label: 'Sequence', icon: 'lucide:git-branch' },
  { id: 'security', label: 'Security', icon: 'lucide:shield-check' },
]

const ACCENT: Record<DiagramCatalogItem['accent'], { soft: string; text: string; ring: string }> = {
  blue: { soft: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/20' },
  green: { soft: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
  orange: { soft: 'bg-orange-500/10', text: 'text-orange-600', ring: 'ring-orange-500/20' },
  pink: { soft: 'bg-pink-500/10', text: 'text-pink-600', ring: 'ring-pink-500/20' },
  purple: { soft: 'bg-violet-500/10', text: 'text-violet-600', ring: 'ring-violet-500/20' },
  slate: { soft: 'bg-slate-500/10', text: 'text-slate-600', ring: 'ring-slate-500/20' },
  red: { soft: 'bg-red-500/10', text: 'text-red-600', ring: 'ring-red-500/20' },
  cyan: { soft: 'bg-cyan-500/10', text: 'text-cyan-600', ring: 'ring-cyan-500/20' },
}

export function DiagramCatalog() {
  const editor = useDocStore((s) => s.editor)
  const setFlyout = useDocStore((s) => s.setFlyout)
  const [filter, setFilter] = useState<'all' | DiagramCatalogKind>('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const map = new Map<'all' | DiagramCatalogKind, number>([['all', DIAGRAM_CATALOG.length]])
    for (const item of DIAGRAM_CATALOG) map.set(item.kind, (map.get(item.kind) ?? 0) + 1)
    return map
  }, [])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DIAGRAM_CATALOG.filter((item) => {
      const inFilter = filter === 'all' || item.kind === filter
      if (!inFilter) return false
      if (!q) return true
      const haystack = [item.title, item.subtitle, item.description, item.kind, item.complexity, ...item.tags].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [filter, query])

  const insert = (item: DiagramCatalogItem) => {
    if (!editor) return
    item.insert(editor)
    setFlyout(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line bg-paper p-3">
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-paper">
              <Icon icon="lucide:blocks" width={18} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">Diagram catalog</div>
              <p className="mt-1 text-xs leading-relaxed text-grey-3">
                Production-ready templates for architecture, data models, workflows, sequences, and security reviews.
              </p>
            </div>
          </div>
          <label className="mt-3 flex h-9 items-center gap-2 rounded-xl border border-line bg-paper px-3 text-grey-3 focus-within:border-ink">
            <Icon icon="lucide:search" width={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search templates, AWS, auth, Kafka..."
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-grey-3"
            />
          </label>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={
                'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ' +
                (filter === f.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-surface text-grey-4 hover:border-grey-3 hover:text-ink')
              }
            >
              <Icon icon={f.icon} width={12} />
              {f.label}
              <span className={filter === f.id ? 'text-paper/70' : 'text-grey-3'}>{counts.get(f.id) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <Icon icon="lucide:search-x" width={22} className="mx-auto text-grey-3" />
            <p className="mt-2 text-sm font-semibold text-ink">No templates found</p>
            <p className="mt-1 text-xs text-grey-3">Try architecture, auth, Kafka, ledger, rollout, or AWS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
            {items.map((item) => (
              <CatalogCard key={item.id} item={item} onInsert={() => insert(item)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CatalogCard({ item, onInsert }: { item: DiagramCatalogItem; onInsert: () => void }) {
  const accent = ACCENT[item.accent]
  return (
    <button
      onClick={onInsert}
      className="group w-full overflow-hidden rounded-2xl border border-line bg-surface text-left transition-all hover:-translate-y-0.5 hover:border-grey-3 hover:shadow-[0_18px_40px_-26px_rgba(0,0,0,.5)]"
    >
      <div
        className={'relative h-24 overflow-hidden border-b border-line ' + accent.soft}
        style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      >
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className={'grid h-8 w-8 place-items-center rounded-lg bg-surface shadow-sm ring-1 ' + accent.ring}>
            <Icon icon={item.icon} width={16} className={accent.text} />
          </span>
          <span className="rounded-full border border-line bg-surface/90 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-grey-3">
            {item.kind}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 flex -space-x-2">
          {item.logos.slice(0, 4).map((logo) => (
            <span key={logo} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface shadow-sm">
              <Icon icon={logo} width={21} height={21} />
            </span>
          ))}
        </div>
        <div className="absolute bottom-3 right-3 rounded-full bg-surface/90 px-2 py-1 text-[10px] font-semibold text-grey-4 shadow-sm">
          {item.complexity}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug text-ink">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-grey-3">{item.description}</p>
          </div>
          <Icon icon="lucide:arrow-right" width={15} className="mt-0.5 shrink-0 text-grey-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-medium text-grey-4">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
