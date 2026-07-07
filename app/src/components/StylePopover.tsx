import { useEffect, useState } from 'react'
import {
  react,
  DefaultColorStyle,
  DefaultSizeStyle,
  DefaultFillStyle,
  DefaultDashStyle,
  ArrowShapeKindStyle,
  ArrowShapeArrowheadStartStyle,
  ArrowShapeArrowheadEndStyle,
  type StyleProp,
} from 'tldraw'
import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi } from '../store/useEditorUi'
import { DEVICE_FRAME_SIZE, type DeviceFrameKind } from '../canvas/createNode'

/** Tools that create tldraw-styled shapes (so the style sections apply). */
const DRAW_TOOLS = new Set(['geo', 'draw', 'line', 'arrow', 'text', 'note', 'highlight', 'frame'])

const ICON_SIZES = [
  { v: 40, label: 'S' },
  { v: 56, label: 'M' },
  { v: 80, label: 'L' },
  { v: 120, label: 'XL' },
] as const

// Icon tints (CSS colors). '' clears the tint (monochrome icons fall back to ink).
const ICON_TINTS = ['', '#1d1d1d', '#e03131', '#e16919', '#f1ac4b', '#099268', '#4465e9', '#ae3ec9'] as const

const DEVICES: { v: DeviceFrameKind; icon: string; label: string }[] = [
  { v: 'phone', icon: 'lucide:smartphone', label: 'Phone' },
  { v: 'tablet', icon: 'lucide:tablet', label: 'Tablet' },
  { v: 'desktop', icon: 'lucide:monitor', label: 'Desktop' },
  { v: 'chrome', icon: 'lucide:app-window', label: 'Browser' },
]

// tldraw's default palette (solid swatch colors). The applied value is the
// color *name*; these hexes are just for the swatch preview.
const COLOR_HEX: Record<string, string> = {
  black: '#1d1d1d',
  grey: '#9fa8b2',
  'light-violet': '#e599f7',
  violet: '#ae3ec9',
  blue: '#4465e9',
  'light-blue': '#4ba1f1',
  yellow: '#f1ac4b',
  orange: '#e16919',
  green: '#099268',
  'light-green': '#4cb05e',
  'light-red': '#f87777',
  red: '#e03131',
  white: '#ffffff',
}
const COLORS = Object.keys(COLOR_HEX)

const SIZES = [
  { v: 's', label: 'S' },
  { v: 'm', label: 'M' },
  { v: 'l', label: 'L' },
  { v: 'xl', label: 'XL' },
] as const

const FILLS = [
  { v: 'none', icon: 'lucide:circle' },
  { v: 'semi', icon: 'lucide:circle-dashed' },
  { v: 'solid', icon: 'lucide:circle' },
  { v: 'pattern', icon: 'lucide:circle-dot' },
] as const

const DASHES = [
  { v: 'draw', icon: 'lucide:pencil' },
  { v: 'solid', icon: 'lucide:minus' },
  { v: 'dashed', icon: 'lucide:more-horizontal' },
  { v: 'dotted', icon: 'lucide:ellipsis' },
] as const

// Arrow-only styles (shown when an arrow is selected or the arrow tool is active).
const LINE_TYPES = [
  { v: 'straight', icon: 'lucide:minus', label: 'Straight' },
  { v: 'curved', icon: 'lucide:spline', label: 'Curved' },
  { v: 'elbow', icon: 'lucide:corner-down-right', label: 'Elbow' },
] as const

const HEADS = [
  { v: 'none', icon: 'lucide:minus' },
  { v: 'arrow', icon: 'lucide:chevron-right' },
  { v: 'triangle', icon: 'lucide:play' },
  { v: 'dot', icon: 'lucide:circle' },
  { v: 'diamond', icon: 'lucide:diamond' },
] as const

/**
 * Custom style panel (color · size · fill · dash) that replaces tldraw's fixed
 * top-right StylePanel. Applies to the current selection AND to next shapes.
 * Anchored under the toolbar's Style button; closeable.
 */
export function StylePopover({ onClose }: { onClose: () => void }) {
  const editor = useDocStore((s) => s.editor)

  const shapeOutlineThickness = useEditorUi((s) => s.shapeOutlineThickness)
  const setShapeOutlineThickness = useEditorUi((s) => s.setShapeOutlineThickness)
  const arrowStrokeThickness = useEditorUi((s) => s.arrowStrokeThickness)
  const setArrowStrokeThickness = useEditorUi((s) => s.setArrowStrokeThickness)

  const [cur, setCur] = useState<{ color?: string; size?: string; fill?: string; dash?: string; hStart?: string; hEnd?: string }>({})
  const [showArrow, setShowArrow] = useState(false)
  const [selectedArrows, setSelectedArrows] = useState<any[]>([])
  const [lineType, setLineType] = useState<string | undefined>()
  // Which control groups are relevant to the current selection.
  const [ctx, setCtx] = useState<{ style: boolean; icon: boolean; device: boolean; figure: boolean; iconSize?: number; iconColor?: string; deviceKind?: string; figureTint?: string; figureScale?: number }>({ style: true, icon: false, device: false, figure: false })

  useEffect(() => {
    if (!editor) return
    const value = <T,>(style: StyleProp<T>): T | undefined => {
      const shared = editor.getSharedStyles().get(style)
      if (shared && shared.type === 'shared') return shared.value as T
      try {
        return editor.getStyleForNextShape(style)
      } catch {
        return undefined
      }
    }
    return react('style panel', () => {
      const sel = editor.getSelectedShapes()
      const arrows = sel.filter((s) => s.type === 'arrow')
      setShowArrow(editor.getCurrentToolId() === 'arrow' || arrows.length > 0)
      setSelectedArrows(arrows)

      // Context: does this selection support tldraw styles, or is it icons / devices / figures?
      const icons = sel.filter((s) => s.type === 'icon')
      const devices = sel.filter((s) => s.type === 'device-frame')
      const figures = sel.filter((s) => s.type === 'group-frame')
      const iconOnly = sel.length > 0 && icons.length === sel.length
      const deviceOnly = sel.length > 0 && devices.length === sel.length
      const figureOnly = sel.length > 0 && figures.length === sel.length
      const style =
        sel.length === 0
          ? DRAW_TOOLS.has(editor.getCurrentToolId())
          : editor.getSharedStyles().get(DefaultColorStyle) !== undefined
      const firstIcon = icons[0]?.props as { w?: number; color?: string } | undefined
      const firstDevice = devices[0]?.props as { kind?: string } | undefined
      const firstFigure = figures[0]?.props as { tint?: string; labelScale?: number } | undefined
      setCtx({
        style,
        icon: iconOnly,
        device: deviceOnly,
        figure: figureOnly,
        iconSize: firstIcon?.w,
        iconColor: firstIcon?.color ?? '',
        deviceKind: firstDevice?.kind,
        figureTint: firstFigure?.tint ?? '',
        figureScale: firstFigure?.labelScale ?? 1,
      })

      // Derive the effective line type from the selected arrows (kind + bend).
      let type: string | undefined
      if (arrows.length) {
        const props = arrows.map((a) => a.props as { kind?: string; bend?: number })
        if (props.every((p) => p.kind === 'elbow')) type = 'elbow'
        else if (props.every((p) => Math.abs(p.bend ?? 0) > 1)) type = 'curved'
        else if (props.every((p) => Math.abs(p.bend ?? 0) <= 1)) type = 'straight'
      } else {
        type = value(ArrowShapeKindStyle) === 'elbow' ? 'elbow' : 'straight'
      }
      setLineType(type)

      setCur({
        color: value(DefaultColorStyle),
        size: value(DefaultSizeStyle),
        fill: value(DefaultFillStyle),
        dash: value(DefaultDashStyle),
        hStart: value(ArrowShapeArrowheadStartStyle),
        hEnd: value(ArrowShapeArrowheadEndStyle),
      })
    })
  }, [editor])

  const apply = <T,>(style: StyleProp<T>, v: T) => {
    if (!editor) return
    editor.setStyleForSelectedShapes(style, v)
    editor.setStyleForNextShapes(style, v)
  }

  const applyIconSize = (px: number) => {
    if (!editor) return
    editor.updateShapes(
      editor.getSelectedShapes().filter((s) => s.type === 'icon').map((s) => ({ id: s.id, type: 'icon' as const, props: { w: px, h: px } })),
    )
  }
  const applyIconColor = (hex: string) => {
    if (!editor) return
    editor.updateShapes(
      editor.getSelectedShapes().filter((s) => s.type === 'icon').map((s) => ({ id: s.id, type: 'icon' as const, props: { color: hex } })),
    )
  }
  const applyDeviceKind = (kind: DeviceFrameKind) => {
    if (!editor) return
    const size = DEVICE_FRAME_SIZE[kind]
    editor.updateShapes(
      editor.getSelectedShapes().filter((s) => s.type === 'device-frame').map((s) => ({ id: s.id, type: 'device-frame' as const, props: { kind, w: size.w, h: size.h } })),
    )
  }
  const applyFigureTint = (tint: string) => {
    if (!editor) return
    editor.updateShapes(
      editor.getSelectedShapes().filter((s) => s.type === 'group-frame').map((s) => ({ id: s.id, type: 'group-frame' as const, props: { tint } })),
    )
  }
  const applyFigureScale = (labelScale: number) => {
    if (!editor) return
    editor.updateShapes(
      editor.getSelectedShapes().filter((s) => s.type === 'group-frame').map((s) => ({ id: s.id, type: 'group-frame' as const, props: { labelScale } })),
    )
  }

  /** Straight / Curved / Elbow — sets selected arrows AND the default for new ones. */
  const applyLineType = (type: 'straight' | 'curved' | 'elbow') => {
    if (!editor) return
    // Make this the default for future auto-connectors (eraser-like).
    useEditorUi.getState().setConnectorStyle(type)
    const kind = type === 'elbow' ? 'elbow' : 'arc'
    editor.setStyleForNextShapes(ArrowShapeKindStyle, kind)
    const arrows = editor.getSelectedShapes().filter((s) => s.type === 'arrow')
    if (arrows.length === 0) return
    // kind via the canonical style API; bend via updateShapes (it's a shape prop).
    editor.setStyleForSelectedShapes(ArrowShapeKindStyle, kind)
    editor.updateShapes(
      arrows.map((a) => {
        let bend = 0
        if (type === 'curved') {
          const b = editor.getShapePageBounds(a.id)
          const d = b ? Math.hypot(b.width, b.height) : 120
          bend = Math.max(30, Math.min(140, d * 0.28))
        }
        return { id: a.id, type: 'arrow' as const, props: { bend } }
      }),
    )
  }

  return (
    <div className="w-60 rounded-2xl border border-line bg-surface p-3 shadow-[0_20px_50px_-24px_rgba(0,0,0,.4)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Style</span>
        <button onClick={onClose} aria-label="Close" className="grid h-6 w-6 place-items-center rounded-md text-grey-3 hover:bg-grey-1 hover:text-ink">
          <Icon icon="lucide:x" width={13} />
        </button>
      </div>

      {ctx.style && (
        <>
          <Section label="Color">
            <div className="grid grid-cols-7 gap-1.5">
              {COLORS.map((c) => {
                const hex = COLOR_HEX[c]
                const active = cur.color === c
                return (
                  <button
                    key={c}
                    onClick={() => apply(DefaultColorStyle, c)}
                    title={c}
                    className={'grid h-6 w-6 place-items-center rounded-full border transition-transform hover:scale-110 ' + (active ? 'border-ink' : 'border-line')}
                  >
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: hex }} />
                  </button>
                )
              })}
            </div>
          </Section>

          <Section label="Size">
            <Segmented options={SIZES.map((s) => ({ v: s.v, node: s.label }))} active={cur.size} onPick={(v) => apply(DefaultSizeStyle, v)} />
          </Section>

          <Section label="Fill">
            <Segmented options={FILLS.map((f) => ({ v: f.v, node: <Icon icon={f.icon} width={15} /> }))} active={cur.fill} onPick={(v) => apply(DefaultFillStyle, v)} />
          </Section>

          <Section label="Dash">
            <Segmented options={DASHES.map((d) => ({ v: d.v, node: <Icon icon={d.icon} width={15} /> }))} active={cur.dash} onPick={(v) => apply(DefaultDashStyle, v)} />
          </Section>
        </>
      )}

      {ctx.icon && (
        <>
          <Section label="Icon size">
            <Segmented options={ICON_SIZES.map((s) => ({ v: String(s.v), node: s.label }))} active={ctx.iconSize ? String(ctx.iconSize) : undefined} onPick={(v) => applyIconSize(Number(v))} />
          </Section>
          <Section label="Color">
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_TINTS.map((hex) => {
                const active = (ctx.iconColor ?? '') === hex
                return (
                  <button
                    key={hex || 'none'}
                    onClick={() => applyIconColor(hex)}
                    title={hex || 'Original colors'}
                    className={'grid h-6 w-6 place-items-center rounded-full border transition-transform hover:scale-110 ' + (active ? 'border-ink' : 'border-line')}
                  >
                    {hex ? (
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: hex }} />
                    ) : (
                      <Icon icon="lucide:ban" width={13} className="text-grey-3" />
                    )}
                  </button>
                )
              })}
            </div>
          </Section>
        </>
      )}

      {ctx.figure && (
        <>
          <Section label="Figure color">
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_TINTS.map((hex) => {
                const active = (ctx.figureTint ?? '') === hex
                return (
                  <button
                    key={hex || 'none'}
                    onClick={() => applyFigureTint(hex)}
                    title={hex || 'Default'}
                    className={'grid h-6 w-6 place-items-center rounded-full border transition-transform hover:scale-110 ' + (active ? 'border-ink' : 'border-line')}
                  >
                    {hex ? (
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: hex }} />
                    ) : (
                      <Icon icon="lucide:ban" width={13} className="text-grey-3" />
                    )}
                  </button>
                )
              })}
            </div>
          </Section>
          <Section label={`Label scale (${(ctx.figureScale ?? 1).toFixed(2)}x)`}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.8"
                max="4.0"
                step="0.1"
                value={ctx.figureScale ?? 1}
                onChange={(e) => applyFigureScale(parseFloat(e.target.value))}
                className="h-1 flex-1 bg-grey-1 rounded-lg appearance-none cursor-pointer accent-ink"
              />
            </div>
          </Section>
        </>
      )}

      {ctx.device && (
        <Section label="Device">
          <div className="grid grid-cols-4 gap-1">
            {DEVICES.map((d) => (
              <button
                key={d.v}
                onClick={() => applyDeviceKind(d.v)}
                title={d.label}
                className={
                  'flex h-9 flex-col items-center justify-center gap-0.5 rounded-lg border text-[9px] font-semibold transition-colors ' +
                  (ctx.deviceKind === d.v ? 'border-ink bg-ink text-paper' : 'border-line text-grey-4 hover:border-ink hover:text-ink')
                }
              >
                <Icon icon={d.icon} width={15} />
                {d.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {!ctx.style && !ctx.icon && !ctx.device && !ctx.figure && !showArrow && (
        <div className="py-1 text-center text-xs text-grey-3">No style options for this shape.</div>
      )}

      {showArrow && (
        <>
          <div className="my-3 h-px bg-line" />
          <Section label="Line type">
            <div className="flex gap-1">
              {LINE_TYPES.map((k) => (
                <button
                  key={k.v}
                  onClick={() => applyLineType(k.v)}
                  className={
                    'flex h-9 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border text-[10px] font-semibold transition-colors ' +
                    (lineType === k.v ? 'border-ink bg-ink text-paper' : 'border-line text-grey-4 hover:border-ink hover:text-ink')
                  }
                >
                  <Icon icon={k.icon} width={15} />
                  {k.label}
                </button>
              ))}
            </div>
          </Section>
          <Section label="Arrowheads (start · end)">
            <div className="flex gap-2">
              <Segmented options={HEADS.map((h) => ({ v: h.v, node: <Icon icon={h.icon} width={14} /> }))} active={cur.hStart} onPick={(v) => apply(ArrowShapeArrowheadStartStyle, v)} />
              <Segmented options={HEADS.map((h) => ({ v: h.v, node: <Icon icon={h.icon} width={14} /> }))} active={cur.hEnd} onPick={(v) => apply(ArrowShapeArrowheadEndStyle, v)} />
            </div>
          </Section>

          {selectedArrows.length > 0 && (() => {
            const firstArrow = selectedArrows[0]
            const arrowSpeed = (firstArrow?.meta as any)?.flowSpeed ?? 2.2
            const arrowColor = (firstArrow?.meta as any)?.flowColor ?? '#3b82f6'
            const arrowStyle = (firstArrow?.meta as any)?.flowStyle ?? 'default'
            const arrowLabel = (firstArrow?.meta as any)?.flowLabel ?? ''

            const updateArrowsMeta = (patch: any) => {
              if (!editor || selectedArrows.length === 0) return
              editor.updateShapes(
                selectedArrows.map((arrow) => ({
                  id: arrow.id,
                  type: arrow.type,
                  meta: {
                    ...arrow.meta,
                    ...patch,
                  },
                }))
              )
            }

            const DEFAULT_STYLE = { v: 'default', label: 'Default', icon: 'lucide:settings-2' }

            const FLOW_STYLES = [
              { v: 'particle', label: 'Particle', icon: 'lucide:sparkles' },
              { v: 'droplet', label: 'Droplet', icon: 'lucide:droplet' },
              { v: 'aurora', label: 'Aurora', icon: 'lucide:wind' },
              { v: 'pill', label: 'Pill', icon: 'lucide:package' },
            ]

            const STROKE_STYLES = [
              { v: 'dashes', label: 'Dashes', icon: 'lucide:git-commit' },
              { v: 'laser', label: 'Laser', icon: 'lucide:zap' },
            ]

            const PRESET_COLORS = [
              '#3b82f6', '#06b6d4', '#10b981', '#a855f7', '#ec4899',
              '#ef4444', '#f97316', '#eab308', '#84cc16', '#14b8a6',
              '#6366f1', '#d946ef', '#f43f5e', '#64748b', '#ffffff', '#000000'
            ]

            return (
              <>
                <div className="my-3 h-px bg-line" />
                <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-grey-3">Connection Flow Settings</div>

                {/* Custom Flow style */}
                <Section label="Flow Style Override">
                  <div className="flex flex-col gap-2">
                    {/* Default */}
                    <div>
                      <button
                        onClick={() => updateArrowsMeta({ flowStyle: DEFAULT_STYLE.v })}
                        className={`flex h-8 w-full items-center gap-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                          arrowStyle === DEFAULT_STYLE.v ? 'border-ink bg-ink text-paper' : 'border-line text-grey-4 hover:border-ink hover:text-ink'
                        }`}
                      >
                        <Icon icon={DEFAULT_STYLE.icon} width={14} />
                        <span>System Default (Inherit Toolbar)</span>
                      </button>
                    </div>

                    {/* Flowing Elements Group */}
                    <div>
                      <div className="mb-1 text-[8.5px] uppercase tracking-wider text-grey-3 font-semibold">Flowing Elements</div>
                      <div className="grid grid-cols-4 gap-1">
                        {FLOW_STYLES.map((st) => (
                          <button
                            key={st.v}
                            onClick={() => updateArrowsMeta({ flowStyle: st.v })}
                            title={st.label}
                            className={`flex h-8 flex-col items-center justify-center rounded-lg border text-[8.5px] font-medium transition-colors ${
                              arrowStyle === st.v ? 'border-ink bg-ink text-paper' : 'border-line text-grey-4 hover:border-ink hover:text-ink'
                            }`}
                          >
                            <Icon icon={st.icon} width={13} />
                            <span className="truncate max-w-full px-0.5">{st.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stroke Animations Group */}
                    <div>
                      <div className="mb-1 text-[8.5px] uppercase tracking-wider text-grey-3 font-semibold">Stroke Animations</div>
                      <div className="grid grid-cols-2 gap-1">
                        {STROKE_STYLES.map((st) => (
                          <button
                            key={st.v}
                            onClick={() => updateArrowsMeta({ flowStyle: st.v })}
                            title={st.label}
                            className={`flex h-8 flex-col items-center justify-center rounded-lg border text-[8.5px] font-medium transition-colors ${
                              arrowStyle === st.v ? 'border-ink bg-ink text-paper' : 'border-line text-grey-4 hover:border-ink hover:text-ink'
                            }`}
                          >
                            <Icon icon={st.icon} width={13} />
                            <span className="truncate max-w-full px-0.5">{st.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Flow Speed */}
                <Section label={`Flow Speed (${arrowSpeed}s loop)`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1.0"
                      max="6.0"
                      step="0.2"
                      value={arrowSpeed}
                      onChange={(e) => updateArrowsMeta({ flowSpeed: parseFloat(e.target.value) })}
                      className="h-1 flex-1 bg-grey-1 rounded-lg appearance-none cursor-pointer accent-ink"
                    />
                  </div>
                </Section>

                {/* Flow Color */}
                <Section label="Flow Color">
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => updateArrowsMeta({ flowColor: col })}
                        className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                          arrowColor === col ? 'scale-110 ring-2 ring-ink ring-offset-2' : 'border-line'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                    <input
                      type="text"
                      placeholder="#hex"
                      value={arrowColor}
                      onChange={(e) => updateArrowsMeta({ flowColor: e.target.value })}
                      className="h-6 w-16 rounded-md border border-line bg-surface px-1.5 font-mono text-[9px] text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </Section>

                {/* Custom label for pill */}
                {arrowStyle === 'pill' && (
                  <Section label="Packet Label Text">
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="e.g. HTTPS"
                      value={arrowLabel}
                      onChange={(e) => updateArrowsMeta({ flowLabel: e.target.value })}
                      className="w-full h-8 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                    />
                  </Section>
                )}
              </>
            )
          })()}
        </>
      )}
      {/* General Stroke & Outline Thickness Sliders */}
      <div className="my-3 h-px bg-line" />
      
      <Section label={`Shape Outline (${shapeOutlineThickness.toFixed(1)}px)`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1.0"
            max="6.0"
            step="0.2"
            value={shapeOutlineThickness}
            onChange={(e) => setShapeOutlineThickness(parseFloat(e.target.value))}
            className="h-1 flex-1 bg-grey-1 rounded-lg appearance-none cursor-pointer accent-ink"
          />
        </div>
      </Section>

      <Section label={`Line Stroke (${arrowStrokeThickness.toFixed(1)}px)`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1.0"
            max="6.0"
            step="0.2"
            value={arrowStrokeThickness}
            onChange={(e) => setArrowStrokeThickness(parseFloat(e.target.value))}
            className="h-1 flex-1 bg-grey-1 rounded-lg appearance-none cursor-pointer accent-ink"
          />
        </div>
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-widest text-grey-3">{label}</div>
      {children}
    </div>
  )
}

function Segmented({ options, active, onPick }: { options: { v: string; node: React.ReactNode }[]; active?: string; onPick: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onPick(o.v)}
          className={
            'grid h-8 flex-1 place-items-center rounded-lg border text-xs font-semibold transition-colors ' +
            (active === o.v ? 'border-ink bg-ink text-paper' : 'border-line text-grey-4 hover:border-ink hover:text-ink')
          }
        >
          {o.node}
        </button>
      ))}
    </div>
  )
}
