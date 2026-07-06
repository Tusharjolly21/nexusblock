import { Icon } from '@iconify/react'
import type { NodeKind } from '../shapes/ArchNodeShape'

/**
 * Central UI icon registry — spec Part 2.4: UI icons come exclusively from
 * Iconify's `lucide:*` set (never emojis, never hand-drawn one-offs). Canvas
 * tech logos stay on `logos:*`; this file is UI chrome only.
 */
export const UI = {
  select: 'lucide:mouse-pointer-2',
  hand: 'lucide:hand',
  text: 'lucide:type',
  note: 'lucide:sticky-note',
  draw: 'lucide:pencil',
  connector: 'lucide:spline',
  rectangle: 'lucide:square',
  ellipse: 'lucide:circle',
  eraser: 'lucide:eraser',
  insert: 'lucide:plus',
  searchCanvas: 'lucide:search',
  snapshots: 'lucide:history',
  layers: 'lucide:layers',
  shapes: 'lucide:monitor-smartphone',
  icons: 'lucide:smile',
  catalog: 'lucide:layout-grid',
  dsa: 'lucide:network',
  comment: 'lucide:message-circle',
  code: 'lucide:terminal',
  doc: 'lucide:file-text',
  search: 'lucide:search',
  close: 'lucide:x',
  trash: 'lucide:trash-2',
  history: 'lucide:history',
  export: 'lucide:download',
  panelRight: 'lucide:panel-right',
  plus: 'lucide:plus',
  check: 'lucide:check',
  chevronRight: 'lucide:chevron-right',
  appearance: 'lucide:palette',
} as const

export type UIName = keyof typeof UI

/** UI icon. Defaults to 1.8px stroke at 18px (spec Part 2.4). */
export function UIcon({ name, size = 18, className }: { name: UIName; size?: number; className?: string }) {
  return <Icon icon={UI[name]} width={size} height={size} className={className} />
}

/** lucide id for an architecture node kind (fallback when no tech logo). */
export const KIND_ICON: Record<NodeKind, string> = {
  client: 'lucide:monitor',
  service: 'lucide:server',
  db: 'lucide:database',
  queue: 'lucide:layers',
  external: 'lucide:globe',
}
