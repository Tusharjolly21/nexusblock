import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { react, renderPlaintextFromRichText, type TLShape, type TLShapeId } from 'tldraw'
import { labelFromIcon } from '../canvas/createNode'
import { useDocStore } from '../store/useDocStore'

type SearchHit = {
  id: TLShapeId
  title: string
  detail: string
  icon: string
  haystack: string
}

export function CanvasSearchPanel() {
  const editor = useDocStore((s) => s.editor)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])

  useEffect(() => {
    if (!editor) return
    return react('canvas search index', () => {
      setHits(editor.getCurrentPageShapesSorted().map((shape) => hitForShape(editor, shape)).filter(Boolean) as SearchHit[])
    })
  }, [editor])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return hits
    return hits.filter((hit) => hit.haystack.includes(q))
  }, [hits, query])

  const jump = (id: TLShapeId) => {
    if (!editor) return
    editor.select(id)
    editor.zoomToSelection({ animation: { duration: 320 } })
    editor.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-grey-3 focus-within:border-ink">
          <Icon icon="lucide:search" width={14} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search text, labels, tables..."
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-grey-3"
          />
          {query && <button onClick={() => setQuery('')} className="text-grey-3 hover:text-ink"><Icon icon="lucide:x" width={14} /></button>}
        </div>
        <div className="mt-2 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="space-y-2">
          {filtered.map((hit) => (
            <button
              key={hit.id}
              onClick={() => jump(hit.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper">
                <Icon icon={hit.icon} width={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{hit.title}</span>
                <span className="mt-0.5 block truncate text-xs text-grey-3">{hit.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function hitForShape(editor: NonNullable<ReturnType<typeof useDocStore.getState>['editor']>, shape: TLShape): SearchHit | null {
  const props = shape.props as Record<string, unknown>
  const pieces = [
    text(props.label),
    text(props.title),
    text(props.tech),
    text(props.kind),
    text(props.language),
    text(props.code),
    text(props.url),
    rich(editor, props.richText),
    tableText(props.rows),
  ].filter(Boolean)
  if (shape.type === 'icon') pieces.push(labelFromIcon(text(props.icon)))
  const title = pieces[0] || fallbackTitle(shape)
  const detail = pieces.slice(1).join(' · ') || shape.type
  const haystack = `${title} ${detail} ${shape.type}`.toLowerCase()
  return { id: shape.id, title, detail, icon: iconFor(shape), haystack }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function rich(editor: NonNullable<ReturnType<typeof useDocStore.getState>['editor']>, value: unknown) {
  try {
    return value ? renderPlaintextFromRichText(editor, value as never) : ''
  } catch {
    return ''
  }
}

function tableText(value: unknown) {
  return Array.isArray(value) ? value.flat().filter((v) => typeof v === 'string').join(' ') : ''
}

function fallbackTitle(shape: TLShape) {
  if (shape.type === 'arrow') return 'Arrow'
  if (shape.type === 'table') return 'Table'
  if (shape.type === 'nb-embed') return 'Embed'
  return shape.type.replace(/-/g, ' ')
}

function iconFor(shape: TLShape) {
  const props = shape.props as Record<string, unknown>
  if (typeof props.icon === 'string' && props.icon) return props.icon
  if (shape.type === 'table') return 'lucide:table'
  if (shape.type === 'nb-embed') return 'lucide:panel-top'
  if (shape.type === 'code-block') return 'lucide:square-code'
  if (shape.type === 'arrow') return 'lucide:arrow-right'
  return 'lucide:box'
}
