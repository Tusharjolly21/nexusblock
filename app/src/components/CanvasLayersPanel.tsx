import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { react, type Editor, type TLShape, type TLShapeId } from 'tldraw'
import { labelFromIcon } from '../canvas/createNode'
import { useDocStore } from '../store/useDocStore'

type LayerRow = {
  id: TLShapeId
  type: string
  name: string
  detail: string
  icon: string
  locked: boolean
  dimmed: boolean
  selected: boolean
}

export function CanvasLayersPanel() {
  const editor = useDocStore((s) => s.editor)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<LayerRow[]>([])

  useEffect(() => {
    if (!editor) return
    return react('canvas layers panel', () => {
      const selected = new Set(editor.getSelectedShapeIds())
      const next = editor
        .getCurrentPageShapesSorted()
        .slice()
        .reverse()
        .map((shape) => toLayerRow(shape, selected.has(shape.id)))
      setRows(next)
    })
  }, [editor])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => `${row.name} ${row.detail} ${row.type}`.toLowerCase().includes(q))
  }, [query, rows])

  if (!editor) {
    return (
      <div className="p-3 text-sm text-grey-3">
        Open a canvas to inspect layers.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-grey-3 focus-within:border-ink">
          <Icon icon="lucide:search" width={14} height={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search layers..."
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-grey-3"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-grey-3 hover:text-ink" aria-label="Clear search">
              <Icon icon="lucide:x" width={14} height={14} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">
          <span>{rows.length} layer{rows.length === 1 ? '' : 's'}</span>
          <span>top first</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-4 text-sm text-grey-3">
            No matching layers.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => (
              <LayerItem key={row.id} row={row} editor={editor} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LayerItem({ row, editor }: { row: LayerRow; editor: Editor }) {
  const selectAndZoom = () => {
    editor.select(row.id)
    editor.zoomToSelection({ animation: { duration: 280 } })
    editor.focus()
  }

  const act = (fn: () => void) => {
    fn()
    editor.focus()
  }

  return (
    <div
      className={
        'group rounded-xl border bg-surface p-2 transition-colors ' +
        (row.selected ? 'border-ink shadow-[0_12px_26px_-20px_rgba(0,0,0,.55)]' : 'border-line hover:border-grey-3')
      }
    >
      <button onClick={selectAndZoom} className="flex w-full items-center gap-2.5 text-left">
        <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper ' + (row.dimmed ? 'opacity-45' : '')}>
          <Icon icon={row.icon} width={18} height={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={'block truncate text-sm font-semibold ' + (row.dimmed ? 'text-grey-3' : 'text-ink')}>{row.name}</span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-grey-3">{row.detail}</span>
        </span>
        {row.locked && <Icon icon="lucide:lock" width={14} className="shrink-0 text-grey-3" />}
      </button>

      <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
        <LayerAction icon={row.locked ? 'lucide:lock-open' : 'lucide:lock'} label={row.locked ? 'Unlock' : 'Lock'} onClick={() => act(() => editor.toggleLock([row.id]))} />
        <LayerAction
          icon={row.dimmed ? 'lucide:eye' : 'lucide:eye-off'}
          label={row.dimmed ? 'Reveal' : 'Dim'}
          onClick={() => act(() => editor.updateShape({ id: row.id, type: row.type as never, opacity: row.dimmed ? 1 : 0.16 }))}
        />
        <span className="mx-1 h-5 w-px bg-line" />
        <LayerAction icon="lucide:bring-to-front" label="Bring to front" onClick={() => act(() => editor.bringToFront([row.id]))} />
        <LayerAction icon="lucide:send-to-back" label="Send to back" onClick={() => act(() => editor.sendToBack([row.id]))} />
        <span className="ml-auto" />
        <LayerAction icon="lucide:trash-2" label="Delete" danger onClick={() => act(() => editor.deleteShapes([row.id]))} />
      </div>
    </div>
  )
}

function LayerAction({ icon, label, danger, onClick }: { icon: string; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={
        'grid h-7 w-7 place-items-center rounded-lg transition-colors ' +
        (danger ? 'text-red-500 hover:bg-red-500/10' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
      }
    >
      <Icon icon={icon} width={14} height={14} />
    </button>
  )
}

function toLayerRow(shape: TLShape, selected: boolean): LayerRow {
  const props = shape.props as Record<string, unknown>
  const meta = shape.meta as Record<string, unknown>
  const label = text(props.label) || text(props.title) || text(meta.name)
  const kind = text(props.kind)
  const tech = text(props.tech) || text(props.language) || text(props.geo) || kind
  const icon = text(props.icon)
  return {
    id: shape.id,
    type: shape.type,
    name: label || fallbackName(shape),
    detail: detailFor(shape, tech),
    icon: iconFor(shape, icon),
    locked: shape.isLocked,
    dimmed: shape.opacity < 0.3,
    selected,
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function fallbackName(shape: TLShape) {
  const props = shape.props as Record<string, unknown>
  if (shape.type === 'icon') return labelFromIcon(text(props.icon) || 'Icon')
  if (shape.type === 'arrow') return 'Arrow'
  if (shape.type === 'geo') return titleCase(text(props.geo) || 'Shape')
  if (shape.type === 'table') return 'Table'
  if (shape.type === 'nb-embed') return 'Embed'
  if (shape.type === 'device-frame') return `${titleCase(text(props.kind) || 'Device')} frame`
  if (shape.type === 'code-block') return 'Code block'
  if (shape.type === 'group-frame') return 'Figure'
  return titleCase(shape.type.replace(/-/g, ' '))
}

function detailFor(shape: TLShape, tech: string) {
  const props = shape.props as Record<string, unknown>
  if (shape.type === 'table') {
    const rows = Array.isArray(props.rows) ? props.rows.length : 0
    const cols = Array.isArray(props.rows) && Array.isArray(props.rows[0]) ? props.rows[0].length : 0
    return `${rows} rows x ${cols} cols`
  }
  if (shape.type === 'arrow') return 'connector'
  if (shape.type === 'geo') return text(props.geo) || 'shape'
  if (shape.type === 'device-frame') return text(props.kind) || 'device frame'
  return tech || shape.type
}

function iconFor(shape: TLShape, icon: string) {
  if (icon) return icon
  if (shape.type === 'arrow') return 'lucide:arrow-right'
  if (shape.type === 'geo') return 'lucide:square'
  if (shape.type === 'table') return 'lucide:table'
  if (shape.type === 'nb-embed') return 'lucide:panel-top'
  if (shape.type === 'code-block') return 'lucide:square-code'
  if (shape.type === 'group-frame') return 'lucide:group'
  if (shape.type === 'device-frame') return 'lucide:monitor-smartphone'
  return 'lucide:box'
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}
