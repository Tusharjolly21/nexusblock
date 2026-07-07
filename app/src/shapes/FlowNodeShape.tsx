import {
  BaseBoxShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  T,
  type RecordProps,
  type TLBaseShape,
  type TLResizeInfo,
} from 'tldraw'
import { FLOW_SHAPES, type FlowShape, resolveColor, pastelFill } from '../dsl/flow/lib'

/** Props for a flowchart node: a shaped, colored box with an icon + label. */
export type FlowNodeProps = {
  w: number
  h: number
  shape: FlowShape
  label: string
  icon: string
  /** Color name or #hex; '' = default ink/white. */
  color: string
  fontFamily: string
}

const Versions = createShapePropsMigrationIds('flow-node', { AddFontFamily: 1 })

const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: Versions.AddFontFamily,
      up: (props) => ({ ...props, fontFamily: '' }),
      down: (props) => {
        const { fontFamily: _fontFamily, ...rest } = props as FlowNodeProps
        return rest
      },
    },
  ],
})

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'flow-node': FlowNodeProps
  }
}

export type FlowNodeShape = TLBaseShape<'flow-node', FlowNodeProps>

/** SVG outline for a given shape, sized to w×h. */
function ShapeOutline({ shape, w, h, stroke, fill }: { shape: FlowShape; w: number; h: number; stroke: string; fill: string }) {
  const sw = 1.75
  const p = sw
  const common = { fill, stroke, style: { strokeWidth: 'var(--shape-outline-thickness, 1.8px)' }, strokeLinejoin: 'round' as const }
  const poly = (pts: [number, number][]) => <polygon points={pts.map(([x, y]) => `${x},${y}`).join(' ')} {...common} />

  let el: React.ReactNode
  switch (shape) {
    case 'oval':
      el = <rect x={p} y={p} width={w - 2 * p} height={h - 2 * p} rx={(h - 2 * p) / 2} {...common} />
      break
    case 'ellipse':
      el = <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - p} ry={h / 2 - p} {...common} />
      break
    case 'diamond':
      el = poly([[w / 2, p], [w - p, h / 2], [w / 2, h - p], [p, h / 2]])
      break
    case 'hexagon': {
      const hx = Math.min(28, w * 0.22)
      el = poly([[hx, p], [w - hx, p], [w - p, h / 2], [w - hx, h - p], [hx, h - p], [p, h / 2]])
      break
    }
    case 'parallelogram': {
      const sk = Math.min(28, w * 0.18)
      el = poly([[sk, p], [w - p, p], [w - sk, h - p], [p, h - p]])
      break
    }
    case 'trapezoid': {
      const ti = Math.min(30, w * 0.2)
      el = poly([[ti, p], [w - ti, p], [w - p, h - p], [p, h - p]])
      break
    }
    case 'triangle':
      el = poly([[w / 2, p], [w - p, h - p], [p, h - p]])
      break
    case 'star': {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - p, r = R * 0.42
      const pts: [number, number][] = []
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2
        const rad = i % 2 === 0 ? R : r
        pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)])
      }
      el = poly(pts)
      break
    }
    case 'cylinder': {
      const ry = Math.min(14, h * 0.12)
      el = (
        <path
          d={`M ${p},${ry + p} A ${w / 2 - p},${ry} 0 0 1 ${w - p},${ry + p} V ${h - ry - p} A ${w / 2 - p},${ry} 0 0 1 ${p},${h - ry - p} Z M ${p},${ry + p} A ${w / 2 - p},${ry} 0 0 0 ${w - p},${ry + p}`}
          {...common}
        />
      )
      break
    }
    case 'document': {
      const wv = h * 0.12
      el = (
        <path
          d={`M ${p},${p} H ${w - p} V ${h - wv} Q ${w * 0.75},${h - p} ${w / 2},${h - wv} T ${p},${h - wv} Z`}
          {...common}
        />
      )
      break
    }
    default: // rectangle
      el = <rect x={p} y={p} width={w - 2 * p} height={h - 2 * p} rx={10} {...common} />
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {el}
    </svg>
  )
}

import { Icon } from '@iconify/react'

export class FlowNodeShapeUtil extends BaseBoxShapeUtil<FlowNodeShape> {
  static override type = 'flow-node' as const

  static override props: RecordProps<FlowNodeShape> = {
    w: T.number,
    h: T.number,
    shape: T.literalEnum(...FLOW_SHAPES),
    label: T.string,
    icon: T.string,
    color: T.string,
    fontFamily: T.string,
  }

  static override migrations = migrations

  override getDefaultProps(): FlowNodeProps {
    return { w: 180, h: 80, shape: 'rectangle', label: 'Node', icon: '', color: '', fontFamily: '' }
  }

  override canResize = () => true
  override canEdit = () => true

  override getGeometry(shape: FlowNodeShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override onResize(shape: FlowNodeShape, info: TLResizeInfo<FlowNodeShape>) {
    return resizeBox(shape, info)
  }

  component(shape: FlowNodeShape) {
    const { w, h, icon, label, color, fontFamily } = shape.props
    const stroke = resolveColor(color) ?? 'var(--color-ink)'
    const fill = resolveColor(color) ? pastelFill(resolveColor(color)!) : 'var(--color-surface)'
    const editing = this.editor.getEditingShapeId() === shape.id

    return (
      <HTMLContainer style={{ width: w, height: h, pointerEvents: 'all' }}>
        <ShapeOutline shape={shape.props.shape} w={w} h={h} stroke={stroke} fill={fill} />

        {icon && (
          <div
            style={{
              position: 'absolute',
              top: -14,
              left: 12,
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'var(--shape-outline-thickness, 1.8px) solid var(--color-line)',
              background: 'var(--color-paper)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-ink)',
            }}
          >
            <Icon icon={icon} width={17} height={17} />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: '0 16px',
            textAlign: 'center',
            fontFamily: fontFamily || "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.2,
            color: 'var(--color-ink)',
          }}
        >
          {editing ? (
            <input
              autoFocus
              defaultValue={label}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => this.editor.updateShape<FlowNodeShape>({ id: shape.id, type: 'flow-node', props: { label: e.currentTarget.value } })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') this.editor.setEditingShape(null)
                e.stopPropagation()
              }}
              onBlur={() => this.editor.setEditingShape(null)}
              style={{ width: '100%', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit' }}
            />
          ) : (
            label
          )}
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: FlowNodeShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 10)
    return path
  }
}
