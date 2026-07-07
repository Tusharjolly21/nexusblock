/** Shared lookups for the Eraser-style flowchart DSL: shapes, icons, colors. */

export const FLOW_SHAPES = [
  'rectangle', 'cylinder', 'diamond', 'document', 'ellipse', 'hexagon',
  'oval', 'parallelogram', 'star', 'trapezoid', 'triangle',
] as const
export type FlowShape = (typeof FLOW_SHAPES)[number]

export const FLOW_CONNECTORS = ['>', '<', '<>', '<->', '-', '--', '-->'] as const
export type FlowConnector = (typeof FLOW_CONNECTORS)[number]

/** Named colors → stroke hex. Fill is derived as a pastel tint of the stroke. */
const COLORS: Record<string, string> = {
  red: '#e5484d', green: '#30a46c', blue: '#3b82f6', orange: '#f5820e',
  yellow: '#f5d90a', purple: '#8b5cf6', violet: '#8b5cf6', pink: '#e93d82',
  teal: '#12a594', cyan: '#0ba5c7', gray: '#8b8d98', grey: '#8b8d98',
  black: '#1c1c1c', slate: '#64748b',
}

/** All named colors — used for autocomplete. */
export const FLOW_COLORS = Object.keys(COLORS)

/** Resolve a color name or "#hex" into a stroke hex, or null if unknown. */
export function resolveColor(raw?: string): string | null {
  if (!raw) return null
  const v = raw.trim().replace(/^["']|["']$/g, '')
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v
  return COLORS[v.toLowerCase()] ?? null
}

/** Light pastel fill for a stroke hex (Eraser's default colorMode: pastel). */
export function pastelFill(strokeHex: string): string {
  const h = strokeHex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, 0.16)`
}

/**
 * Map an Eraser icon name to an Iconify id. Most General icons are lucide names
 * (file-text, bug, repeat…); a few tech logos map to the logos: set.
 */
const ICON_ALIAS: Record<string, string> = {
  excel: 'logos:microsoft-excel',
  amazon: 'logos:amazon-icon',
  aws: 'logos:aws',
  'dollar-sign': 'lucide:dollar-sign',
  'check-square': 'lucide:check-square',
  'file-text': 'lucide:file-text',
}

export function resolveIcon(raw?: string): string {
  if (!raw) return ''
  const name = raw.trim()
  if (name.includes(':')) return name // already an iconify id
  if (ICON_ALIAS[name]) return ICON_ALIAS[name]
  // AWS/GCP/Azure prefixes map to the logos set; everything else tries lucide.
  if (/^(aws|gcp|google|azure)-/.test(name)) return `logos:${name}`
  return `lucide:${name}`
}

export const isFlowShape = (s: string): s is FlowShape => (FLOW_SHAPES as readonly string[]).includes(s)
