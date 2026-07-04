import { GeoShapeGeoStyle, type Editor } from 'tldraw'

/** Set a tldraw tool by id (select/hand/draw/line/arrow/text/note/frame/…). */
export function setTool(editor: Editor | null, id: string) {
  editor?.setCurrentTool(id)
}

/** Pick a specific geo shape, then activate the geo tool to draw it. */
export function setGeoShape(editor: Editor | null, geo: string) {
  if (!editor) return
  editor.setStyleForNextShapes(GeoShapeGeoStyle, geo as never)
  editor.setCurrentTool('geo')
}

export type ToolDef = { id: string; label: string; icon: string }

/** Direct-select tools shown in the floating cluster. */
export const TOOLBAR_TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select — V', icon: 'lucide:mouse-pointer-2' },
  { id: 'hand', label: 'Hand — H', icon: 'lucide:hand' },
  { id: 'draw', label: 'Draw — D', icon: 'lucide:pencil' },
  { id: 'line', label: 'Line — L', icon: 'lucide:slash' },
  { id: 'arrow', label: 'Arrow — A', icon: 'lucide:move-up-right' },
  { id: 'text', label: 'Text — T', icon: 'lucide:type' },
  { id: 'note', label: 'Sticky note — N', icon: 'lucide:sticky-note' },
  { id: 'highlight', label: 'Highlighter', icon: 'lucide:highlighter' },
  { id: 'eraser', label: 'Eraser — E', icon: 'lucide:eraser' },
]

/** Geo shapes available in the Shapes picker (value → icon). */
export const GEO_SHAPES: { geo: string; icon: string; label: string }[] = [
  { geo: 'triangle', icon: 'lucide:triangle', label: 'Triangle' },
  { geo: 'diamond', icon: 'lucide:diamond', label: 'Diamond' },
  { geo: 'rhombus', icon: 'lucide:square-asterisk', label: 'Rhombus' },
  { geo: 'hexagon', icon: 'lucide:hexagon', label: 'Hexagon' },
  { geo: 'octagon', icon: 'lucide:octagon', label: 'Octagon' },
  { geo: 'pentagon', icon: 'lucide:pentagon', label: 'Pentagon' },
  { geo: 'star', icon: 'lucide:star', label: 'Star' },
  { geo: 'cloud', icon: 'lucide:cloud', label: 'Cloud' },
  { geo: 'heart', icon: 'lucide:heart', label: 'Heart' },
  { geo: 'oval', icon: 'lucide:egg', label: 'Oval' },
  { geo: 'x-box', icon: 'lucide:square-x', label: 'X box' },
  { geo: 'check-box', icon: 'lucide:square-check', label: 'Check box' },
  { geo: 'arrow-right', icon: 'lucide:arrow-right', label: 'Arrow (block)' },
]

/** One-click primitives promoted to the main toolbar. Square uses tldraw's
 * rectangle geo tool; Shift while drawing constrains it to a square. */
export const QUICK_GEO_SHAPES: { geo: string; icon: string; label: string }[] = [
  { geo: 'rectangle', icon: 'lucide:rectangle-horizontal', label: 'Rectangle — R' },
  { geo: 'rectangle', icon: 'lucide:square', label: 'Square — hold Shift while drawing' },
  { geo: 'ellipse', icon: 'lucide:circle', label: 'Ellipse — O' },
]
