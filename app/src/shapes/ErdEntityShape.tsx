import { Icon } from '@iconify/react'
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  T,
  type RecordProps,
  type TLBaseShape,
} from 'tldraw'
import { resolveColor, pastelFill } from '../dsl/flow/lib'

export const ERD_HEADER_H = 42
export const ERD_ROW_H = 34

export type ErdRow = { name: string; type: string; pk: boolean }

/** Props for an ERD entity table. Rows are JSON-encoded to keep the schema flat. */
export type ErdEntityProps = {
  w: number
  h: number
  name: string
  icon: string
  color: string
  /** JSON string of ErdRow[]. */
  rows: string
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'erd-entity': ErdEntityProps
  }
}

export type ErdEntityShape = TLBaseShape<'erd-entity', ErdEntityProps>

function parseRows(json: string): ErdRow[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export class ErdEntityShapeUtil extends BaseBoxShapeUtil<ErdEntityShape> {
  static override type = 'erd-entity' as const

  static override props: RecordProps<ErdEntityShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    icon: T.string,
    color: T.string,
    rows: T.string,
  }

  override getDefaultProps(): ErdEntityProps {
    return { w: 220, h: ERD_HEADER_H, name: 'Entity', icon: '', color: '', rows: '[]' }
  }

  override canResize = () => false

  override getGeometry(shape: ErdEntityShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  component(shape: ErdEntityShape) {
    const { w, name, icon, color } = shape.props
    const rows = parseRows(shape.props.rows)
    const accent = resolveColor(color)
    const border = accent ?? 'var(--color-line)'
    const headerBg = accent ? pastelFill(accent) : 'var(--color-grey-1)'
    const typeColor = accent ?? 'var(--color-grey-3)'

    return (
      <HTMLContainer
        style={{
          width: w,
          height: shape.props.h,
          borderRadius: 12,
          border: `1.5px solid ${border}`,
          background: 'var(--color-surface)',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,.05), 0 10px 24px -16px rgba(0,0,0,.3)',
          fontFamily: "'Instrument Sans', sans-serif",
          pointerEvents: 'all',
          boxSizing: 'border-box',
        }}
      >
        {/* header */}
        <div
          style={{
            height: ERD_HEADER_H,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            background: headerBg,
            borderBottom: `1px solid ${border}`,
          }}
        >
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          {icon && <Icon icon={icon} width={16} height={16} style={{ color: accent ?? 'var(--color-grey-4)' }} />}
        </div>

        {/* rows */}
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            style={{
              height: ERD_ROW_H,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-line)',
              fontSize: 13,
            }}
          >
            <span style={{ flex: 1, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            {r.type && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: typeColor }}>{r.type}</span>
            )}
            {r.pk && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: '#f5820e' }}>pk</span>
            )}
          </div>
        ))}
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: ErdEntityShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 12)
    return path
  }
}
