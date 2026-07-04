import { Icon } from '@iconify/react'
import { NODE_KINDS, type NodeKind } from '../shapes/ArchNodeShape'
import { createArchNode } from '../canvas/createNode'
import { useDocStore } from '../store/useDocStore'
import { KIND_ICON } from '../ui/icons'

const KIND_META: Record<NodeKind, { label: string; hint: string }> = {
  client: { label: 'Client', hint: 'Web / mobile app' },
  service: { label: 'Service', hint: 'API / worker' },
  db: { label: 'Database', hint: 'Store / cache' },
  queue: { label: 'Queue', hint: 'Jobs / stream' },
  external: { label: 'External', hint: 'Third-party' },
}

/** Insert-a-node panel: labelled architecture shapes (arch-node). */
export function ShapesTab() {
  const editor = useDocStore((s) => s.editor)

  const insert = (kind: NodeKind) => {
    if (editor) createArchNode(editor, { kind, label: KIND_META[kind].label })
  }

  return (
    <div className="flex flex-col gap-1.5 p-3">
      {NODE_KINDS.map((kind) => (
        <button
          key={kind}
          onClick={() => insert(kind)}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-ink"
        >
          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-line text-grey-4">
            <Icon icon={KIND_ICON[kind]} width={18} height={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{KIND_META[kind].label}</span>
            <span className="block truncate text-xs text-grey-3">{KIND_META[kind].hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
