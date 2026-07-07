import { Icon } from '@iconify/react'
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

/** The architecture node kinds nexusblock understands (maps to the DSL keywords). */
export const NODE_KINDS = ['client', 'service', 'db', 'queue', 'external'] as const
export type NodeKind = (typeof NODE_KINDS)[number]

/** Props for the custom node shape. */
export type ArchNodeProps = {
  w: number
  h: number
  kind: NodeKind
  label: string
  tech: string
  /** Iconify icon name, e.g. 'logos:aws-lambda'. Empty falls back to the kind icon. */
  icon: string
  fontFamily: string
}

/** Prop migrations — keep old persisted records loadable as props evolve. */
const Versions = createShapePropsMigrationIds('arch-node', {
  AddIcon: 1,
  AddFontFamily: 2,
})

const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: Versions.AddIcon,
      up: (props) => ({ ...props, icon: '' }),
      down: (props) => {
        const { icon: _icon, ...rest } = props as ArchNodeProps
        return rest
      },
    },
    {
      id: Versions.AddFontFamily,
      up: (props) => ({ ...props, fontFamily: '' }),
      down: (props) => {
        const { fontFamily: _fontFamily, ...rest } = props as ArchNodeProps
        return rest
      },
    },
  ],
})

/**
 * Register the shape in tldraw's type system. Per the tldraw 5.x docs, custom
 * shapes are defined by augmenting TLGlobalShapePropsMap — this makes
 * `arch-node` part of the TLShape union so createShape / snapshots are typed.
 */
declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'arch-node': ArchNodeProps
  }
}

/**
 * Custom tldraw shape for a system component. This is the primitive the DSL
 * compiler and AI generator will emit (arch doc §4, §5) — native, editable
 * shapes, never a static image.
 */
export type ArchNodeShape = TLBaseShape<'arch-node', ArchNodeProps>

const KIND_LABEL: Record<NodeKind, string> = {
  client: 'Client',
  service: 'Service',
  db: 'Database',
  queue: 'Queue',
  external: 'External',
}

// lucide fallback glyph per kind (used when a node has no tech logo).
const KIND_ICON: Record<NodeKind, string> = {
  client: 'lucide:monitor',
  service: 'lucide:server',
  db: 'lucide:database',
  queue: 'lucide:layers',
  external: 'lucide:globe',
}

function KindIcon({ kind }: { kind: NodeKind }) {
  return <Icon icon={KIND_ICON[kind]} width={22} height={22} />
}

export class ArchNodeShapeUtil extends BaseBoxShapeUtil<ArchNodeShape> {
  static override type = 'arch-node' as const

  static override props: RecordProps<ArchNodeShape> = {
    w: T.number,
    h: T.number,
    kind: T.literalEnum(...NODE_KINDS),
    label: T.string,
    tech: T.string,
    icon: T.string,
    fontFamily: T.string,
  }

  static override migrations = migrations

  override getDefaultProps(): ArchNodeProps {
    return { w: 210, h: 68, kind: 'service', label: 'Service', tech: '', icon: '', fontFamily: '' }
  }

  override canResize = () => true
  override canEdit = () => true

  override getGeometry(shape: ArchNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override onResize(shape: ArchNodeShape, info: TLResizeInfo<ArchNodeShape>) {
    return resizeBox(shape, info)
  }

  component(shape: ArchNodeShape) {
    const { kind, label, tech, icon, fontFamily } = shape.props
    const editing = this.editor.getEditingShapeId() === shape.id
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 14px',
          background: 'var(--color-surface)',
          border: 'var(--shape-outline-thickness, 1.8px) solid var(--color-line)',
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(0,0,0,.06), 0 8px 20px -12px rgba(0,0,0,.28)',
          fontFamily: fontFamily || "var(--font-sans)",
          color: 'var(--color-ink)',
          boxSizing: 'border-box',
          pointerEvents: 'all',
          overflow: 'hidden',
        }}
        title={KIND_LABEL[kind]}
      >
        {/* Logo tile — the real technology icon is the hero */}
        <div
          style={{
            flex: 'none',
            width: 40,
            height: 40,
            borderRadius: 10,
            background: icon ? 'var(--color-grey-1)' : 'var(--color-ink)',
            color: icon ? 'var(--color-ink)' : 'var(--color-surface)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon ? <Icon icon={icon} width={26} height={26} /> : <KindIcon kind={kind} />}
        </div>

        {/* Label + subtitle */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {editing ? (
            <input
              autoFocus
              defaultValue={label}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => this.editor.updateShape<ArchNodeShape>({ id: shape.id, type: 'arch-node', props: { label: e.currentTarget.value } })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') this.editor.setEditingShape(null)
                e.stopPropagation()
              }}
              onBlur={() => this.editor.setEditingShape(null)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.2,
                padding: 0,
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--color-grey-3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {tech || KIND_LABEL[kind]}
          </span>
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: ArchNodeShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 16)
    return path
  }
}
