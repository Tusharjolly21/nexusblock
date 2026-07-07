import { Icon } from '@iconify/react'
import {
  BaseBoxShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  HTMLContainer,
  Rectangle2d,
  T,
  type RecordProps,
  type TLBaseShape,
} from 'tldraw'
import { resolveColor } from '../dsl/flow/lib'

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
  fontFamily: string
}

const Versions = createShapePropsMigrationIds('erd-entity', { AddFontFamily: 1 })

const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: Versions.AddFontFamily,
      up: (props) => ({ ...props, fontFamily: '' }),
      down: (props) => {
        const { fontFamily: _fontFamily, ...rest } = props as ErdEntityProps
        return rest
      },
    },
  ],
})

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

  static override migrations = migrations

  static override props: RecordProps<ErdEntityShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    icon: T.string,
    color: T.string,
    rows: T.string,
    fontFamily: T.string,
  }

  override getDefaultProps(): ErdEntityProps {
    return { w: 220, h: ERD_HEADER_H, name: 'Entity', icon: '', color: '', rows: '[]', fontFamily: '' }
  }

  override canResize = () => false

  override getGeometry(shape: ErdEntityShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  component(shape: ErdEntityShape) {
    const { w, name, icon, color, fontFamily } = shape.props
    const rows = parseRows(shape.props.rows)
    const accent = resolveColor(color)
    const border = accent ?? 'var(--color-line)'
    const headerBg = 'rgba(255,255,255, 0.01)'
    const typeColor = 'var(--color-grey-3)'

    return (
      <HTMLContainer
        style={{
          width: w,
          height: shape.props.h,
          borderRadius: 10,
          border: `var(--shape-outline-thickness, 1.8px) solid ${border}`,
          background: 'var(--color-surface)',
          overflow: 'hidden',
          boxShadow: '0 4px 24px -10px rgba(0,0,0,.25)',
          fontFamily: fontFamily || "var(--font-sans)",
          pointerEvents: 'all',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header */}
        <div
          style={{
            height: ERD_HEADER_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
            gap: 8,
            padding: '0 12px',
            background: headerBg,
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </span>
          {icon && (
            <Icon
              icon={icon}
              width={14}
              height={14}
              style={{ color: accent ?? 'var(--color-grey-3)', opacity: 0.8 }}
            />
          )}
        </div>

        {/* rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
          {rows.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              style={{
                height: 28, // compact row height like Eraser
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--color-ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.type && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: typeColor }}>
                    {r.type}
                  </span>
                )}
                {r.pk && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#f59e0b', textTransform: 'lowercase' }}>
                    pk
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: ErdEntityShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 12)
    return path
  }
}
